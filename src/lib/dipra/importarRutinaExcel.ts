import ExcelJS from "exceljs";
import type { BloquePlan, DiaPlan, EjercicioPlan } from "./types";

// Lee una planilla de rutina armada con el formato que ya usa Nicolás
// (hoja "Plani <año>", columnas EJERCICIO/REP/SER/KG/RPE/TUT/DESC./PR/NOTA
// repetidas una vez por día, días repetidos una vez por semana) y la
// convierte a las mismas semanas/días/bloques/ejercicios que arma la app a
// mano — para no tener que transcribir rutina por ejercicio al migrar un
// cliente que ya tenía su plan en Excel.
//
// El parseo es por CONTENIDO (qué dice cada celda), no por posición fija de
// fila/columna — así sigue funcionando aunque un cliente tenga más o menos
// bloques, días o semanas que otro, mientras respete el mismo esquema de
// columnas por día.

export interface RutinaExcelResultado {
  objetivo: string;
  mesociclo: string;
  semanas: { numero: number; dias: DiaPlan[] }[];
}

const RE_SEMANA = /PLANIFICACI[ÓO]N\s*·\s*SEMANA\s*(\d+)/i;
const RE_DIA = /^D[ÍI]A\s*(\d+)\s*(?:[·.:-]\s*(.*))?$/i;

// Las celdas combinadas en ExcelJS "espejan" el valor de la celda maestra
// (arriba-izquierda) en TODAS las celdas que tapa — leer cualquiera de esas
// celdas devuelve el mismo texto del título, no un valor vacío. Sin esto,
// una fila de título de bloque (combinada de B a G, por ejemplo) parece
// tener "contenido" en las columnas de REP/SER/KG/etc., y se confunde con
// una fila de ejercicio real.
function celdasEsclavas(ws: ExcelJS.Worksheet): Set<string> {
  const esclavas = new Set<string>();
  const rangos = (ws.model.merges ?? []) as string[];
  for (const rango of rangos) {
    const m = rango.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!m) continue;
    const colInicio = colALetraANumero(m[1]);
    const filaInicio = Number(m[2]);
    const colFin = colALetraANumero(m[3]);
    const filaFin = Number(m[4]);
    for (let f = filaInicio; f <= filaFin; f++) {
      for (let c = colInicio; c <= colFin; c++) {
        if (f === filaInicio && c === colInicio) continue; // la maestra no es esclava
        esclavas.add(`${f},${c}`);
      }
    }
  }
  return esclavas;
}

function colALetraANumero(letras: string): number {
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function textoCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") {
    const v = valor as { richText?: { text: string }[]; result?: unknown; text?: string };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.result !== undefined) return textoCelda(v.result);
    if (typeof v.text === "string") return v.text;
    return "";
  }
  return String(valor).trim();
}

function numeroCelda(texto: string): number | null {
  const limpio = texto.replace(",", ".");
  if (!limpio || limpio === "—" || limpio === "-") return null;
  const n = Number(limpio.match(/-?\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : null;
}

// Separa "8/8/8" en [8,8,8] (peso o reps distintos por serie) — null si no
// tiene ese formato, para no confundir con un número normal.
function listaPorSerie(texto: string): number[] | null {
  if (!texto.includes("/")) return null;
  const partes = texto.split("/").map((p) => numeroCelda(p));
  if (partes.some((p) => p === null)) return null;
  return partes as number[];
}

// Columna REP: número normal, "5 c/l" (unilateral), "8/8/8" (por serie), o
// "30''"/"30 seg" (tiempo en vez de reps).
function parsearRep(texto: string): { reps: number; repsSeries?: number[]; unilateral: boolean; tiempoSerie?: string } {
  if (!texto || texto === "—") return { reps: 0, unilateral: false };
  const esTiempo = /\d\s*(''|"|seg|s\b)/i.test(texto) && !texto.includes("/") && !/c\s*\/?\s*l/i.test(texto);
  if (esTiempo) {
    return { reps: numeroCelda(texto) ?? 0, unilateral: false, tiempoSerie: texto };
  }
  const unilateral = /c\s*\/?\s*l\b/i.test(texto);
  const porSerie = listaPorSerie(texto);
  if (porSerie) return { reps: porSerie[0] ?? 0, repsSeries: porSerie, unilateral };
  return { reps: numeroCelda(texto) ?? 0, unilateral };
}

// Columna KG: número normal, "7,5 c/l" (peso c/u — cada implemento),
// "corporal"/"corp" (peso corporal), "banda ..." (banda elástica), o
// "30/40/40/40" (peso distinto por serie).
function parsearKg(texto: string): {
  kg: number;
  pesosSeries?: number[];
  pesoCadaUno: boolean;
  cargaTipo?: EjercicioPlan["cargaTipo"];
  tipoCarga?: string;
} {
  if (!texto || texto === "—") return { kg: 0, pesoCadaUno: false };
  if (/^corp/i.test(texto)) return { kg: 0, pesoCadaUno: false, cargaTipo: "peso_corporal", tipoCarga: "Peso corporal" };
  if (/^banda/i.test(texto)) return { kg: 0, pesoCadaUno: false, cargaTipo: "banda", tipoCarga: texto };
  const pesoCadaUno = /c\s*\/?\s*l\b/i.test(texto);
  const porSerie = listaPorSerie(texto);
  if (porSerie) return { kg: porSerie[0] ?? 0, pesosSeries: porSerie, pesoCadaUno };
  return { kg: numeroCelda(texto) ?? 0, pesoCadaUno };
}

function celda(ws: ExcelJS.Worksheet, esclavas: Set<string>, row: number, col: number): string {
  if (esclavas.has(`${row},${col}`)) return "";
  return textoCelda(ws.getCell(row, col).value);
}

function valoresFila(ws: ExcelJS.Worksheet, esclavas: Set<string>, row: number, colInicio: number): string[] {
  const vals: string[] = [];
  for (let i = 0; i < 9; i++) vals.push(celda(ws, esclavas, row, colInicio + i));
  return vals;
}

function parsearDia(
  ws: ExcelJS.Worksheet,
  esclavas: Set<string>,
  row: number,
  colInicio: number,
  label: string,
  foco: string
): DiaPlan {
  const bloques: BloquePlan[] = [];
  let bloqueActual: BloquePlan | null = null;

  const cerrarBloque = () => {
    if (bloqueActual && bloqueActual.exercises.length > 0) bloques.push(bloqueActual);
    bloqueActual = null;
  };

  for (let r = row + 1; r <= row + 400; r++) {
    const vals = valoresFila(ws, esclavas, r, colInicio);
    const [nombre, rep, ser, kg, rpe, tut, desc, pr, nota] = vals;
    const restoVacio = !rep && !ser && !kg && !rpe && !tut && !desc && !pr && !nota;

    if (!nombre && restoVacio) continue; // fila en blanco

    if (/^VOLUMEN TOTAL DE LA SESI[ÓO]N/i.test(nombre) || /^COMENTARIOS POST SESI[ÓO]N/i.test(nombre)) {
      cerrarBloque();
      break; // fin del día
    }
    if (/^VOLUMEN TOTAL DEL BLOQUE/i.test(nombre)) {
      cerrarBloque();
      continue;
    }
    if (nombre.toUpperCase() === "EJERCICIO") {
      continue; // encabezado de columnas (real, o la celda combinada suelta)
    }
    if (nombre && restoVacio) {
      // Título de bloque nuevo.
      cerrarBloque();
      bloqueActual = { id: crypto.randomUUID(), title: nombre, exercises: [] };
      continue;
    }
    if (!nombre) continue; // fila con datos sueltos sin nombre de ejercicio, no se puede importar

    // Fila de ejercicio.
    if (!bloqueActual) bloqueActual = { id: crypto.randomUUID(), title: "Bloque", exercises: [] };
    const repInfo = parsearRep(rep);
    const kgInfo = parsearKg(kg);
    const notas = [nota, pr && pr !== "—" && pr !== "0" ? `PR ref: ${pr}` : ""].filter(Boolean).join(" · ");
    const ejercicio: EjercicioPlan = {
      id: crypto.randomUUID(),
      nombre,
      series: numeroCelda(ser) ?? 1,
      reps: repInfo.reps,
      kg: kgInfo.kg,
      link: "",
      rpe: rpe === "—" ? "" : rpe,
      rir: "",
      tut: tut === "—" ? "" : tut,
      descanso: desc === "—" ? "" : desc,
      comentarioCliente: "",
      unilateral: repInfo.unilateral || undefined,
      pesoCadaUno: kgInfo.pesoCadaUno || undefined,
      ...(repInfo.repsSeries ? { repsSeries: repInfo.repsSeries } : {}),
      ...(kgInfo.pesosSeries ? { pesosSeries: kgInfo.pesosSeries } : {}),
      ...(repInfo.tiempoSerie ? { tiempoSerie: repInfo.tiempoSerie, cargaTipo: "tiempo" as const } : {}),
      ...(kgInfo.cargaTipo ? { cargaTipo: kgInfo.cargaTipo, tipoCarga: kgInfo.tipoCarga } : {}),
      ...(notas ? { notaReps: notas } : {}),
    };
    bloqueActual.exercises.push(ejercicio);
  }
  cerrarBloque();

  return { id: crypto.randomUUID(), label, foco, bloques };
}

export async function parsearRutinaExcel(buffer: Buffer): Promise<RutinaExcelResultado> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets.find((s) => /plani/i.test(s.name));
  if (!ws) throw new Error('No encontré una hoja con "Plani" en el nombre dentro de este Excel.');

  const esclavas = celdasEsclavas(ws);
  const objetivo = celda(ws, esclavas, 2, 3);
  const mesociclo = celda(ws, esclavas, 4, 3) || "Importado desde Excel";

  // `actualRowCount`/`actualColumnCount` pueden quedar desactualizados
  // (el `<dimension>` guardado en el XML no siempre refleja el contenido
  // real, sobre todo en hojas editadas muchas veces) — recorrer todas las
  // filas/celdas con contenido da el límite real, no el que dice la
  // planilla.
  let maxRow = 0;
  let maxCol = 0;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    maxRow = Math.max(maxRow, rowNumber);
    row.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      maxCol = Math.max(maxCol, colNumber);
    });
  });

  // Encuentra las filas "DIPRA · PLANIFICACIÓN · SEMANA N" — cada una marca
  // el inicio de una semana; el fin es la siguiente (o el final de la
  // hoja).
  const filasSemana: { row: number; numero: number }[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const m = celda(ws, esclavas, r, 2).match(RE_SEMANA);
    if (m) filasSemana.push({ row: r, numero: Number(m[1]) });
  }
  if (filasSemana.length === 0) {
    throw new Error('No encontré ninguna fila "SEMANA" en la hoja — revisá que sea el mismo formato de siempre.');
  }

  const semanas: RutinaExcelResultado["semanas"] = [];

  filasSemana.forEach((semana, i) => {
    const filaHasta = (filasSemana[i + 1]?.row ?? maxRow + 1) - 1;
    // Dentro del rango de filas de esta semana, busca cada "DÍA N · foco" y
    // en qué columna empieza su bloque de 9 columnas. Una vez encontrado un
    // día en una columna, se saltan las siguientes 8 (el ancho del bloque)
    // para no volver a matchear la misma celda combinada.
    const diasEncontrados: { row: number; col: number; numero: number; foco: string }[] = [];
    for (let r = semana.row; r <= filaHasta; r++) {
      let c = 2;
      while (c <= maxCol) {
        const m = celda(ws, esclavas, r, c).match(RE_DIA);
        if (m) {
          diasEncontrados.push({ row: r, col: c, numero: Number(m[1]), foco: (m[2] || "").trim() });
          c += 9;
        } else {
          c += 1;
        }
      }
      if (diasEncontrados.length > 0) break; // ya encontramos la fila de títulos de día
    }

    const dias = diasEncontrados.map((d) =>
      parsearDia(ws, esclavas, d.row, d.col, `Día ${d.numero}`, d.foco)
    );
    semanas.push({ numero: semana.numero, dias });
  });

  return { objetivo, mesociclo, semanas };
}

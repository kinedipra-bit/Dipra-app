// Extrae en vivo el resultado de seedData() desde dipra-app.jsx, sin copiar
// los datos clínicos reales a ningún archivo nuevo del repo. Se usa desde
// migrate-legacy-data.mjs (import) y desde cualquier chequeo puntual.
//
// Estrategia: dipra-app.jsx es un solo componente con JSX + varias funciones
// planas. seedData() y sus dependencias (uid, BLOCK_TEMPLATE, PILARES_KEYS,
// TIPOS_SESION, DAY_LABELS, nuevaSemana, emptySesion, emptyFms) viven todas
// en un bloque contiguo sin JSX (líneas ~99-498 al momento de escribir esto).
// Se recorta ese bloque por nombre de función (no por número de línea fijo)
// para tolerar pequeños cambios, se transpila por las dudas con esbuild
// (por si alguna dependencia tuviera JSX) y se ejecuta en un módulo aparte.

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(__dirname, "..", "dipra-app.jsx");

export async function extractLegacySeed() {
  const src = readFileSync(SOURCE_PATH, "utf8");

  const startMarker = "const uid = () =>";
  const endMarker = "return { clients, appts, biblioteca };";

  const startIdx = src.indexOf(startMarker);
  const endMarkerIdx = src.indexOf(endMarker);
  if (startIdx === -1 || endMarkerIdx === -1) {
    throw new Error(
      "No se encontraron los marcadores esperados en dipra-app.jsx. " +
        "El archivo cambió de forma que rompe la extracción automática — " +
        "revisar scripts/extract-legacy-seed.mjs manualmente."
    );
  }
  // cerrar el bloque después del `}` que cierra seedData()
  const afterEnd = src.indexOf("\n}", endMarkerIdx);
  const snippet = src.slice(startIdx, afterEnd + 2);

  const { code } = await esbuild.transform(snippet + "\nexport { seedData };\n", {
    loader: "jsx",
    format: "esm",
  });

  const tmpFile = path.join(os.tmpdir(), `dipra-legacy-seed-${Date.now()}.mjs`);
  writeFileSync(tmpFile, code);
  try {
    const mod = await import(`file://${tmpFile}`);
    const seed = mod.seedData();
    if (!Array.isArray(seed.clients) || seed.clients.length === 0) {
      throw new Error("seedData() no devolvió clientes — algo se rompió en la extracción.");
    }
    return seed;
  } finally {
    unlinkSync(tmpFile);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seed = await extractLegacySeed();
  console.log(
    `OK: ${seed.clients.length} clientes, ${seed.appts.length} citas, ${seed.biblioteca.length} ejercicios de biblioteca.`
  );
  console.log(seed.clients.map((c) => c.nombre).join(", "));
}

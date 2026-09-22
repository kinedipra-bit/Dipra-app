// Importa los datos reales de dipra-app.jsx (3 clientes piloto, sus citas y
// su biblioteca) al esquema nuevo de Supabase. Pensado para correrse UNA
// sola vez, después de aplicar las migraciones SQL de supabase/migrations.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-legacy-data.mjs
// (o completar .env.local y correr `node --env-file=.env.local scripts/migrate-legacy-data.mjs`)
//
// Es idempotente a nivel "no revienta si se corre dos veces", pero SÍ va a
// duplicar filas si se corre más de una vez — está pensado para una
// migración única de arranque, no para sincronización continua.

import { createClient } from "@supabase/supabase-js";
import { extractLegacySeed } from "./extract-legacy-seed.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Completá .env.local (ver .env.local.example) y corré con:\n" +
      "  node --env-file=.env.local scripts/migrate-legacy-data.mjs"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// mapea las claves con tilde del prototipo a columnas ascii de Postgres
const ESFERA_KEYS = { cráneo: "craneo", tórax: "torax", pelvis: "pelvis", tobillo: "tobillo" };

function mapPrHistorial(entry) {
  return {
    fecha: entry.fecha,
    mesociclo: entry.mesociclo ?? "",
    objetivo: entry.objetivo ?? "",
    sentadilla: entry.sentadilla ?? 0,
    peso_muerto: entry.pesoMuerto ?? 0,
    press_banca: entry.pressBanca ?? 0,
    press_militar: entry.pressMilitar ?? 0,
    broad_jump: entry.broadJump ?? 0,
    abalakov_jump: entry.abalakovJump ?? 0,
    cmj: entry.cmj ?? 0,
    squat_jump: entry.squatJump ?? 0,
    agarre_der: entry.agarreDer ?? 0,
    agarre_izq: entry.agarreIzq ?? 0,
    dead_hang: entry.deadHang ?? 0,
    pull_ups: entry.pullUps ?? 0,
    push_up: entry.pushUp ?? 0,
    plancha_frontal: entry.planchaFrontal ?? 0,
    plancha_lateral_der: entry.planchaLateralDer ?? 0,
    plancha_lateral_izq: entry.planchaLateralIzq ?? 0,
    pararse_del_suelo: entry.pararseDelSuelo ?? 0,
  };
}

function mapMovilidad(entry) {
  const row = { patron: entry.patron ?? "" };
  for (const [oldKey, newKey] of Object.entries(ESFERA_KEYS)) {
    row[newKey] = entry[oldKey] ?? "";
  }
  return row;
}

function mapComposicion(entry) {
  return {
    fecha: entry.fecha,
    talla: entry.talla ?? null,
    peso: entry.peso ?? null,
    grasa_pct: entry.grasaPct === "" ? null : entry.grasaPct,
    masa_muscular: entry.masaMuscular === "" ? null : entry.masaMuscular,
    agua_pct: entry.aguaPct === "" ? null : entry.aguaPct,
    masa_osea: entry.masaOsea === "" ? null : entry.masaOsea,
  };
}

function mapSesion(s) {
  return {
    fecha: s.fecha,
    tipo: s.tipo ?? "",
    dia_plan_label: s.diaPlanLabel ?? "",
    es_primera_sesion: !!s.esPrimeraSesion,
    comentarios_pre: s.comentariosPre ?? "",
    pilares: s.pilares ?? { sueno: "", nutricion: "", hidratacion: "", movimiento: "", estres: "" },
    comentarios: s.comentarios ?? "",
    ejercicios: s.ejercicios ?? [],
  };
}

async function main() {
  const seed = await extractLegacySeed();
  console.log(`Migrando ${seed.clients.length} clientes...`);

  const legacyIdToNewId = new Map();

  for (const c of seed.clients) {
    const { data: clientRow, error: clientErr } = await supabase
      .from("clients")
      .insert({
        nombre: c.nombre,
        iniciales: c.iniciales ?? "",
        telefono: c.telefono ?? "",
        correo: c.correo ?? "",
        categoria: c.categoria ?? "",
        ocupacion: c.ocupacion ?? "",
        objetivo: c.objetivo ?? "",
        inicio: c.inicio,
        pilares: c.pilares ?? {},
        antecedentes: c.antecedentes ?? {},
        campos_extra: c.camposExtra ?? [],
        dolor_alicia: c.dolorAlicia ?? {},
        fms: c.fms ?? {},
      })
      .select("id")
      .single();
    if (clientErr) throw new Error(`Insert cliente "${c.nombre}" falló: ${clientErr.message}`);

    const newClientId = clientRow.id;
    legacyIdToNewId.set(c.id, newClientId);
    console.log(`  cliente "${c.nombre}" -> ${newClientId}`);

    // Composición corporal
    const composicion = (c.composicionCorporal ?? []).map(mapComposicion);
    if (composicion.length) {
      await supabase
        .from("client_composicion_corporal")
        .insert(composicion.map((r) => ({ ...r, client_id: newClientId })));
    }

    // Historial de marcas
    const prHist = (c.prHistorial ?? []).map(mapPrHistorial);
    if (prHist.length) {
      await supabase
        .from("client_pr_historial")
        .insert(prHist.map((r) => ({ ...r, client_id: newClientId })));
    }

    // Movilidad por esferas
    const movilidad = (c.movilidadEsferas ?? []).map(mapMovilidad);
    if (movilidad.length) {
      await supabase
        .from("client_movilidad_esferas")
        .insert(movilidad.map((r) => ({ ...r, client_id: newClientId })));
    }

    // Evaluaciones específicas
    const evalCustom = c.evaluacionesCustom ?? [];
    if (evalCustom.length) {
      await supabase.from("client_evaluaciones_custom").insert(
        evalCustom.map((e) => ({
          client_id: newClientId,
          nombre: e.nombre ?? "",
          resultado: e.resultado ?? "",
        }))
      );
    }

    // Sesiones
    const sesiones = (c.sesiones ?? []).map(mapSesion);
    if (sesiones.length) {
      await supabase.from("sesiones").insert(sesiones.map((r) => ({ ...r, client_id: newClientId })));
    }

    // Plan (semanas)
    const semanas = c.plan?.semanas ?? [];
    let newSemanaActivaId = null;
    for (const semana of semanas) {
      const { data: semanaRow, error: semanaErr } = await supabase
        .from("plan_semanas")
        .insert({
          client_id: newClientId,
          numero: semana.numero ?? 1,
          mesociclo: semana.mesociclo ?? "",
          objetivo: semana.objetivo ?? "",
          dias: semana.dias ?? [],
        })
        .select("id")
        .single();
      if (semanaErr) throw new Error(`Insert semana falló para "${c.nombre}": ${semanaErr.message}`);
      if (semana.id === c.plan?.semanaActivaId) newSemanaActivaId = semanaRow.id;
    }
    if (newSemanaActivaId) {
      await supabase.from("clients").update({ semana_activa_id: newSemanaActivaId }).eq("id", newClientId);
    }
  }

  // Citas (agenda)
  const citas = seed.appts.map((a) => ({
    client_id: legacyIdToNewId.get(a.clienteId) ?? null,
    cliente_nombre: a.cliente ?? "",
    fecha: a.fecha,
    hora: a.hora,
    tipo: a.tipo ?? "",
    estado: a.estado ?? "pendiente",
  }));
  if (citas.length) {
    await supabase.from("citas").insert(citas);
    console.log(`  ${citas.length} citas migradas`);
  }

  console.log("Migración completa.");
  console.log(
    "Nota: la biblioteca de ejercicios ya se carga vía supabase/migrations/0002_seed_biblioteca.sql, no se duplica acá."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

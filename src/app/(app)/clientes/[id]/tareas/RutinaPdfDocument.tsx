import { Document, Page, View, Text, Image, Link, StyleSheet } from "@react-pdf/renderer";
import type { DiaPlan, EjercicioPlan } from "@/lib/dipra/types";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 16 },
  titulo: { fontSize: 18, fontWeight: "bold", marginBottom: 2 },
  subtitulo: { fontSize: 10, color: "#666666" },
  dia: { marginBottom: 14 },
  diaLabel: { fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "#1a5d1a" },
  bloque: { marginBottom: 8 },
  bloqueTitulo: { fontSize: 11, fontWeight: "bold", marginBottom: 3 },
  bloqueDesc: { fontSize: 9, color: "#888888", marginBottom: 3 },
  ejercicioBlock: { marginBottom: 6 },
  ejercicioRow: { flexDirection: "row", justifyContent: "space-between" },
  ejercicioNombre: { flex: 1 },
  ejercicioDatos: { color: "#444444" },
  ejercicioNota: { fontSize: 8, color: "#888888", fontStyle: "italic", marginTop: 1 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  qr: { width: 32, height: 32 },
  link: { fontSize: 8, color: "#1a5d1a", textDecoration: "underline" },
  indicaciones: { marginTop: 16, padding: 10, backgroundColor: "#f3f3f3", fontSize: 9 },
});

// Mismo criterio de texto que ExerciseRow/resumenEjercicioPlan (Plan), pero
// cubriendo también los tipos de carga sin kg (banda/peso corporal/tiempo/
// vueltas) — acá no hay columnas separadas por campo, va todo en una línea.
// Tiempo/vueltas no tienen "reps" real (quedan en 0), así que se muestran
// aparte en vez de como "3×0".
function resumenEjercicio(e: EjercicioPlan): string {
  if (e.cargaTipo === "tiempo") return `${e.series} × ${e.tiempoSerie || "tiempo"}`;
  if (e.cargaTipo === "vueltas") return `${e.series} × ${e.vueltas ?? ""} vueltas`;

  const reps = (e.repsSeries ?? []).some((r) => Number(r) > 0)
    ? (e.repsSeries ?? []).map((r) => Number(r) || 0).join("/")
    : String(e.reps ?? 0);
  const base = `${e.series}×${reps}${e.unilateral ? " c/u" : ""}`;
  if (e.cargaTipo === "peso_corporal") return `${base} — peso corporal`;
  if (e.cargaTipo === "banda") return `${base} — ${e.tipoCarga || "banda"}`;
  const pesosActivo = (e.pesosSeries ?? []).some((p) => Number(p) > 0);
  const kgTexto = pesosActivo ? (e.pesosSeries ?? []).map((p) => Number(p) || 0).join("/") : String(e.kg ?? 0);
  return `${base} — ${kgTexto}kg${e.pesoCadaUno ? " c/u" : ""}`;
}

/**
 * PDF para dejarle al cliente una rutina consolidada (ej. al terminar un
 * proceso de kinesiología) — en vez de intentar dibujar cada ejercicio
 * (poco confiable con IA, mucho trabajo a mano con una biblioteca propia),
 * cada ejercicio con video cargado lleva un QR + link al video real. Vive
 * en Tareas (plan_kine), no en Plan de fuerza — ver route.tsx que arma
 * `qrPorLink` antes de renderizar esto.
 */
export function RutinaPdfDocument({
  clienteNombre,
  dias,
  indicacionesTexto,
  qrPorLink,
}: {
  clienteNombre: string;
  dias: DiaPlan[];
  indicacionesTexto: string;
  qrPorLink: Map<string, string>;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.titulo}>Rutina de {clienteNombre}</Text>
          <Text style={styles.subtitulo}>
            DIPRA ·{" "}
            {new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
          </Text>
        </View>

        {dias.map((dia) => (
          <View key={dia.id} style={styles.dia} wrap={false}>
            <Text style={styles.diaLabel}>
              {dia.label}
              {dia.foco ? ` — ${dia.foco}` : ""}
            </Text>
            {dia.bloques.map((bloque) => (
              <View key={bloque.id} style={styles.bloque}>
                <Text style={styles.bloqueTitulo}>{bloque.title}</Text>
                {(bloque.grupoMuscular || bloque.cualidad) && (
                  <Text style={styles.bloqueDesc}>
                    {[bloque.grupoMuscular, bloque.cualidad].filter(Boolean).join(" · ")}
                  </Text>
                )}
                {bloque.exercises.map((ex) => (
                  <View key={ex.id} style={styles.ejercicioBlock}>
                    <View style={styles.ejercicioRow}>
                      <Text style={styles.ejercicioNombre}>{ex.nombre}</Text>
                      <Text style={styles.ejercicioDatos}>{resumenEjercicio(ex)}</Text>
                    </View>
                    {ex.notaReps && <Text style={styles.ejercicioNota}>{ex.notaReps}</Text>}
                    {ex.link.trim() && (
                      <View style={styles.linkRow}>
                        {qrPorLink.get(ex.link) && (
                          // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer (PDF), no <img> HTML; no tiene prop alt.
                          <Image src={qrPorLink.get(ex.link)!} style={styles.qr} />
                        )}
                        <Link src={ex.link} style={styles.link}>
                          Ver ejecución del ejercicio
                        </Link>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}

        {indicacionesTexto.trim() && (
          <View style={styles.indicaciones}>
            <Text>{indicacionesTexto}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

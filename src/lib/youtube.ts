// Extrae el id de video de los formatos de URL de YouTube que aparecen en
// la biblioteca de ejercicios: watch?v=, youtu.be/, shorts/.
export function youtubeEmbedUrl(link: string): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    if (!/(^|\.)youtube\.com$|^youtu\.be$/.test(url.hostname)) return null;

    let id: string | null = null;
    if (url.hostname === "youtu.be") {
      id = url.pathname.slice(1);
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2];
    } else if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    }
    if (!id) return null;
    // loop=1 + playlist=<mismo id> es el truco que pide la API de YouTube
    // para loopear un solo video — sin playlist, loop=1 no hace nada. Así
    // un clip corto se repite solo, sin que el atleta tenga que buscar el
    // botón de play de nuevo cada vez que termina.
    return `https://www.youtube.com/embed/${id}?loop=1&playlist=${id}`;
  } catch {
    return null;
  }
}

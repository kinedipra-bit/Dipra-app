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
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

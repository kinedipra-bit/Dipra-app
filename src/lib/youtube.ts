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
    // botón de play de nuevo cada vez que termina. autoplay=1 (con mute=1,
    // obligatorio para que el navegador lo permita) arranca el clip solo en
    // vez de dejarlo pausado con el ícono de play tapando la imagen;
    // playsinline=1 evita que en iPhone se vaya a pantalla completa en su
    // propio reproductor.
    return `https://www.youtube.com/embed/${id}?loop=1&playlist=${id}&autoplay=1&mute=1&playsinline=1`;
  } catch {
    return null;
  }
}

// Los Shorts son verticales (9:16) — mostrarlos en un marco horizontal
// (16:9, el de un video normal) los deja chicos con franjas negras a los
// costados. Se usa para elegir el aspect ratio del contenedor del video.
export function esYoutubeVertical(link: string): boolean {
  if (!link) return false;
  try {
    const url = new URL(link);
    return url.pathname.startsWith("/shorts/");
  } catch {
    return false;
  }
}

export function getStableTutorialLink(exerciseName: string, link?: string | null): string {
  const trimmedLink = link?.trim();

  if (trimmedLink && !isDirectYoutubeVideoUrl(trimmedLink)) {
    return trimmedLink;
  }

  const query = encodeURIComponent(`${exerciseName} exercise tutorial proper form`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

function isDirectYoutubeVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    return host === 'youtu.be' || (host === 'youtube.com' && parsed.pathname === '/watch');
  } catch {
    return false;
  }
}

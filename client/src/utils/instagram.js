export function parseInstagramUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const match = raw.match(/instagram\.com\/(reel|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (!match) return null;

  const type = match[1].toLowerCase();
  const code = match[2];
  const permalink = `https://www.instagram.com/${type}/${code}/`;
  const embedUrl = `${permalink}embed/?hidecaption=1`;

  return { type, code, permalink, embedUrl };
}

export function getInstagramEmbedUrl(input) {
  return parseInstagramUrl(input)?.embedUrl || null;
}

export function isInstagramUrl(input) {
  return Boolean(parseInstagramUrl(input));
}

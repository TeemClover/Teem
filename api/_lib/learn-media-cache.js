// Only validated, immutable video bytes receive a browser validator. Course
// authorization still runs on every request, including conditional requests.
export const PRIVATE_VIDEO_CACHE = 'private, max-age=0, must-revalidate';

export function videoETag(asset, row) {
  return asset?.kind === 'video' && /^[a-f0-9]{64}$/.test(row?.sha256 || '')
    ? `"sha256-${row.sha256}"` : null;
}

function entityTags(header) {
  if (typeof header !== 'string' || header.length > 16384) return null;
  const input = header.trim();
  if (input === '*') return ['*'];
  const tags = [], pattern = /(?:W\/)?"[\x21\x23-\x7e\x80-\xff]*"/y;
  let position = 0;
  while (position < input.length) {
    // HTTP list fields permit empty elements. Do not split on commas: a comma
    // inside an opaque entity tag is part of that tag, not a list separator.
    while (/[\t ,]/.test(input[position] || '\n')) position++;
    if (position === input.length) break;
    pattern.lastIndex = position;
    const match = pattern.exec(input);
    if (!match) return null;
    tags.push(match[0]); position = pattern.lastIndex;
    while (/[\t ]/.test(input[position] || '\n')) position++;
    if (position < input.length && input[position] !== ',') return null;
  }
  return tags.length ? tags : null;
}

// RFC 9110: If-Match is evaluated before If-None-Match; GET/HEAD validation
// uses weak comparison for If-None-Match, and strong comparison for If-Match.
export function videoPreconditionStatus(headers, etag) {
  if (!etag) return null;
  if (headers?.['if-match'] !== undefined) {
    const tags = entityTags(headers['if-match']);
    if (!tags || (!tags.includes('*') && !tags.includes(etag))) return 412;
  }
  const tags = entityTags(headers?.['if-none-match']);
  return tags?.some(tag => tag === '*' || tag.replace(/^W\//, '') === etag) ? 304 : null;
}

// No Last-Modified is advertised: registry verification time is not the file's
// modification time. A date, weak tag or different tag must cause a full 200.
export function ifRangeMatches(header, etag) {
  return header === undefined || (typeof header === 'string' && !!etag && header.trim() === etag);
}

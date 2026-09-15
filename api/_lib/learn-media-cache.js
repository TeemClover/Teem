// Only validated, immutable video bytes receive a browser validator. Course
// authorization still runs on every request, including conditional requests.
export const PRIVATE_VIDEO_CACHE = 'private, max-age=0, must-revalidate';

export function videoETag(asset, row) {
  return asset?.kind === 'video' && /^[a-f0-9]{64}$/.test(row?.sha256 || '')
    ? `"sha256-${row.sha256}"` : null;
}

function requestHeader(headers, name) {
  if (typeof headers?.get === 'function') return headers.get(name) ?? undefined;
  const values = Object.entries(headers || {}).filter(([key]) => key.toLowerCase() === name).map(([, value]) => value);
  // Ambiguous casing in a non-Node adapter must not silently choose a validator.
  return values.length > 1 ? null : values[0];
}

export function mediaConditionalRequest(input, { allowForwarded = true } = {}) {
  const headers = { range: requestHeader(input, 'range') };
  let validatorSource = 'missing';
  for (const name of ['if-none-match', 'if-match', 'if-range']) {
    const native = requestHeader(input, name), forwarded = allowForwarded ? requestHeader(input, 'x-myclover-media-' + name) : undefined;
    headers[name] = native !== undefined ? native : forwarded;
    if (name === 'if-none-match') validatorSource = native !== undefined ? 'native' : forwarded !== undefined ? 'forwarded' : 'missing';
  }
  // Forwarded values are conditional request hints, never identity or access.
  // Middleware overwrites aliases from the real headers on the exact media API.
  return { headers, validatorSource };
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

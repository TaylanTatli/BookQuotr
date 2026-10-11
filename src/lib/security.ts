/**
 * Dependency-free security helpers shared by API routes, the cover cache and
 * the test suite. Keeping these pure makes them safe to import from anywhere
 * (including the edge runtime) and easy to unit test.
 */

/** Book identifiers we accept in cover paths/files: cuid, uuid, or similar. */
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * True when `id` is a plain identifier. Rejects path traversal (`..`), slashes,
 * backslashes, NUL bytes and anything that could escape the covers directory.
 */
export function isSafeCoverId(id: unknown): id is string {
  return typeof id === "string" && SAFE_ID_PATTERN.test(id);
}

/** Loopback / private / link-local / metadata hostnames we must never fetch. */
export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  // Any IPv6 literal (loopback, link-local fe80::, unique-local fc00::, ...).
  if (h.includes(":")) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // Single-label hostnames (e.g. "metadata", "intranet") are almost always internal.
  if (!h.includes(".")) return true;
  return false;
}

/** Only public http(s) URLs may be fetched server-side (SSRF guard). */
export function isAllowedRemoteUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return !isPrivateHostname(url.hostname);
}

export interface ImageType {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  ext: "jpg" | "png" | "webp" | "gif";
}

/** Detects the image type from magic bytes; returns null for anything else. */
export function sniffImageType(buf: Uint8Array): ImageType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return { mime: "image/gif", ext: "gif" };
  }
  return null;
}

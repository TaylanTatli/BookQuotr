import fs from "fs/promises";
import path from "path";
import {
  isAllowedRemoteUrl,
  isSafeCoverId,
  sniffImageType,
} from "./security";

const COVERS_DIR = path.join(process.cwd(), "data", "covers");
const COVERS_API_PREFIX = "/api/covers/";
const MAX_COVER_BYTES = 10 * 1024 * 1024; // 10 MB
const DOWNLOAD_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** Returns true if the thumbnail is already stored locally. */
export function isLocalCover(thumbnail: string | null | undefined): boolean {
  return !!thumbnail && thumbnail.startsWith(COVERS_API_PREFIX);
}

function coverPath(bookId: string): string {
  // Defence in depth: never build a path from an unvalidated identifier.
  if (!isSafeCoverId(bookId)) {
    throw new Error("Invalid cover identifier");
  }
  return path.join(COVERS_DIR, `${bookId}.jpg`);
}

async function writeCoverFile(bookId: string, buffer: Buffer): Promise<void> {
  await fs.mkdir(COVERS_DIR, { recursive: true });
  await fs.writeFile(coverPath(bookId), buffer);
}

/** Reads a response body, refusing payloads larger than `limit` bytes. */
async function readBodyWithLimit(
  res: Response,
  limit: number
): Promise<Buffer | null> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;

  if (!res.body) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > limit ? null : buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

/**
 * Fetches a remote image with SSRF guards: only public http(s) URLs, redirects
 * are validated hop-by-hop, a timeout is enforced and the body size is capped.
 */
async function fetchRemoteImage(url: string): Promise<Buffer | null> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedRemoteUrl(current)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        current = new URL(location, current).toString();
        continue;
      }

      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) return null;

      return await readBodyWithLimit(res, MAX_COVER_BYTES);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}

/**
 * Downloads a remote cover image and saves it to data/covers/<bookId>.jpg.
 * Returns the local API path ("/api/covers/<bookId>") on success,
 * or the original URL as a fallback if the download fails.
 */
export async function downloadAndSaveCover(
  bookId: string,
  thumbnailUrl: string | null | undefined
): Promise<string | null | undefined> {
  if (!thumbnailUrl) return thumbnailUrl;

  // Already local — nothing to do
  if (isLocalCover(thumbnailUrl)) return thumbnailUrl;
  if (!isSafeCoverId(bookId)) return thumbnailUrl;
  if (!isAllowedRemoteUrl(thumbnailUrl)) return thumbnailUrl;

  const buffer = await fetchRemoteImage(thumbnailUrl).catch(() => null);
  // Reject anything that is not a real image, whatever the server claimed.
  if (!buffer || !sniffImageType(buffer)) return thumbnailUrl;

  try {
    await writeCoverFile(bookId, buffer);
  } catch {
    // Disk error — keep the original URL so the user still sees a cover.
    return thumbnailUrl;
  }
  return `${COVERS_API_PREFIX}${bookId}`;
}

/**
 * Persists an uploaded image buffer to data/covers/<bookId>.jpg.
 * Returns the local API path.
 */
export async function saveUploadedCover(
  bookId: string,
  buffer: Buffer
): Promise<string> {
  await writeCoverFile(bookId, buffer);
  return `${COVERS_API_PREFIX}${bookId}`;
}

/**
 * Deletes the locally cached cover for a book if it exists.
 * Safe to call even if the file doesn't exist or the id is invalid.
 */
export async function deleteCover(bookId: string): Promise<void> {
  if (!isSafeCoverId(bookId)) return;
  try {
    await fs.unlink(coverPath(bookId));
  } catch {
    // File doesn't exist — ignore
  }
}

/**
 * Reads the cover file and returns it as a Buffer, or null if not found.
 */
export async function readCoverFile(bookId: string): Promise<Buffer | null> {
  if (!isSafeCoverId(bookId)) return null;
  try {
    return await fs.readFile(coverPath(bookId));
  } catch {
    // File not found is expected (not yet cached) — return null to trigger download
    return null;
  }
}

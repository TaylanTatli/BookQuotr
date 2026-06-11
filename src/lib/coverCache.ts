import fs from "fs/promises";
import path from "path";

const COVERS_DIR = path.join(process.cwd(), "data", "covers");
const COVERS_API_PREFIX = "/api/covers/";

/** Returns true if the thumbnail is already stored locally. */
export function isLocalCover(thumbnail: string | null | undefined): boolean {
  return !!thumbnail && thumbnail.startsWith(COVERS_API_PREFIX);
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(thumbnailUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return thumbnailUrl; // fallback to original

    const buffer = Buffer.from(await res.arrayBuffer());

    await fs.mkdir(COVERS_DIR, { recursive: true });
    await fs.writeFile(path.join(COVERS_DIR, `${bookId}.jpg`), buffer);

    return `${COVERS_API_PREFIX}${bookId}`;
  } catch {
    // Network error or timeout — keep original URL so user still sees a cover
    return thumbnailUrl;
  }
}

/**
 * Saves an uploaded file buffer directly to data/covers/<bookId>.jpg.
 * Returns the local API path.
 */
export async function saveUploadedCover(
  bookId: string,
  buffer: Buffer
): Promise<string> {
  await fs.mkdir(COVERS_DIR, { recursive: true });
  await fs.writeFile(path.join(COVERS_DIR, `${bookId}.jpg`), buffer);
  return `${COVERS_API_PREFIX}${bookId}`;
}

/**
 * Deletes the locally cached cover for a book if it exists.
 * Safe to call even if the file doesn't exist.
 */
export async function deleteCover(bookId: string): Promise<void> {
  try {
    await fs.unlink(path.join(COVERS_DIR, `${bookId}.jpg`));
  } catch {
    // File doesn't exist — ignore
  }
}

/**
 * Reads the cover file and returns it as a Buffer, or null if not found.
 */
export async function readCoverFile(bookId: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(COVERS_DIR, `${bookId}.jpg`));
  } catch {
    // File not found is expected (not yet cached) — return null to trigger download
    return null;
  }
}

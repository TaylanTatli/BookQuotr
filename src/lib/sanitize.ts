import { isAllowedRemoteUrl } from "./security.ts";

/**
 * Pure input sanitisers for book/quote writes and JSON import. They only emit
 * fields with known names and valid types, so untrusted request bodies can never
 * set arbitrary Prisma columns (mass assignment) or smuggle non-http thumbnails
 * (`javascript:`, `file:`, private hosts) into the database.
 */

const BOOK_STRING_FIELDS = [
  "title",
  "subtitle",
  "author",
  "publisher",
  "publishedDate",
  "description",
  "isbn",
  "language",
  "readingStatus",
] as const;

const BOOK_DATE_FIELDS = ["startedAt", "finishedAt"] as const;
const BOOK_EXTERNAL_ID_FIELDS = ["googleBooksId", "openLibraryId"] as const;

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toRating(value: unknown): number | null {
  const n = toInt(value);
  return n !== null && n >= 1 && n <= 5 ? n : null;
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toExternalId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Thumbnails may be local cover paths or public http(s) URLs; nothing else. */
export function sanitizeThumbnail(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("/api/covers/")) return value;
  return isAllowedRemoteUrl(value) ? value : null;
}

export interface SanitizeBookOptions {
  /** Permit `id` and `createdAt` (used for JSON import only). */
  allowId?: boolean;
}

/**
 * Returns a plain object containing only known book fields present in `raw`.
 * `title`/`author` are only emitted when they are non-empty strings.
 */
export function sanitizeBookFields(
  raw: unknown,
  options: SanitizeBookOptions = {}
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (options.allowId) {
    if (typeof src.id === "string" && src.id.trim()) out.id = src.id.trim();
    const createdAt = toDate(src.createdAt);
    if (createdAt) out.createdAt = createdAt;
  }

  for (const key of BOOK_STRING_FIELDS) {
    if (!(key in src)) continue;
    const value = src[key];
    if (value === null) {
      out[key] = null;
    } else if (typeof value === "string") {
      if ((key === "title" || key === "author") && !value.trim()) continue;
      out[key] = key === "title" || key === "author" ? value.trim() : value;
    }
  }

  if ("thumbnail" in src) out.thumbnail = sanitizeThumbnail(src.thumbnail);
  if ("pageCount" in src) out.pageCount = toInt(src.pageCount);
  if ("rating" in src) out.rating = toRating(src.rating);
  if ("isFavorite" in src) out.isFavorite = src.isFavorite === true;
  for (const key of BOOK_DATE_FIELDS) {
    if (key in src) out[key] = toDate(src[key]);
  }
  for (const key of BOOK_EXTERNAL_ID_FIELDS) {
    if (key in src) out[key] = toExternalId(src[key]);
  }

  return out;
}

export interface SanitizedQuote {
  id?: string;
  content: string;
  page: number | null;
  chapter: string | null;
  note: string | null;
}

/** Returns null when a quote has no usable content. */
export function sanitizeQuoteFields(raw: unknown): SanitizedQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const content = typeof src.content === "string" ? src.content.trim() : "";
  if (!content) return null;

  const quote: SanitizedQuote = {
    content,
    page: toInt(src.page),
    chapter: typeof src.chapter === "string" ? src.chapter : null,
    note: typeof src.note === "string" ? src.note : null,
  };
  if (typeof src.id === "string" && src.id.trim()) quote.id = src.id.trim();
  return quote;
}

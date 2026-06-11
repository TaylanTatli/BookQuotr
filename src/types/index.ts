import type { Book, Quote } from "@prisma/client";

export type { Quote };

/**
 * Base Book type augmented with fields added in migration
 * (startedAt, finishedAt, rating, isFavorite).
 * We re-declare these here so the IDE always sees them,
 * regardless of Prisma client cache state.
 */
export interface BookBase extends Book {
  startedAt: Date | null;
  finishedAt: Date | null;
  rating: number | null;
  isFavorite: boolean;
  readingStatus: string | null;
}

export type ReadingStatus = "reading" | "finished" | "abandoned"

export type { Book };

export interface BookWithQuoteCount extends BookBase {
  _count: { quotes: number };
}

export interface BookWithQuotes extends BookBase {
  quotes: Quote[];
}

export interface SearchResult {
  source: "google" | "openlibrary";
  externalId: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  isbn?: string;
  pageCount?: number;
  language?: string;
  thumbnail?: string;
}

export interface ExportPayload {
  books: BookWithQuotes[];
}

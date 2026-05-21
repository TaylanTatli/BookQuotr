import type { Book, Quote } from "@prisma/client";

export type { Book, Quote };

export interface BookWithQuoteCount extends Book {
  _count: { quotes: number };
}

export interface BookWithQuotes extends Book {
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

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCoverUrl(book: { id: string, thumbnail?: string | null, updatedAt?: string | Date | number }): string | null {
  if (!book.thumbnail) return null;
  if (book.thumbnail.startsWith("http")) {
    const v = book.updatedAt ? new Date(book.updatedAt).getTime() : Date.now();
    return `/api/covers/${book.id}?v=${v}`;
  }
  return book.thumbnail;
}

import type { SearchResult } from "@/types";

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json";

function parseQuery(query: string) {
  const terms = query.match(/(?:title|author|isbn|publisher):\s*(?:"[^"]*"|\S+)/gi) || [];
  let raw = query;
  const filters: Record<string, string> = {};

  for (const term of terms) {
    raw = raw.replace(term, "");
    const colonIdx = term.indexOf(":");
    const key = term.substring(0, colonIdx).toLowerCase().trim();
    let value = term.substring(colonIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    filters[key] = value;
  }

  return { raw: raw.trim(), filters };
}

export async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  const { raw, filters } = parseQuery(query);
  
  let q = raw;
  if (filters.title) q += ` intitle:"${filters.title}"`;
  if (filters.author) q += ` inauthor:"${filters.author}"`;
  if (filters.publisher) q += ` inpublisher:"${filters.publisher}"`;
  if (filters.isbn) q += ` isbn:${filters.isbn}`;
  q = q.trim();

  if (!q) return [];

  const params = new URLSearchParams({ q, maxResults: "10" });
  if (process.env.GOOGLE_BOOKS_API_KEY) {
    params.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(`${GOOGLE_BOOKS_URL}?${params}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.items) return [];

  return (data.items as GoogleBooksItem[]).map((item) => {
    const info = item.volumeInfo;
    return {
      source: "google",
      externalId: item.id,
      title: info.title ?? "Unknown Title",
      subtitle: info.subtitle,
      authors: info.authors ?? [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      isbn: info.industryIdentifiers?.find(
        (id) => id.type === "ISBN_13" || id.type === "ISBN_10"
      )?.identifier,
      pageCount: info.pageCount,
      language: info.language,
      thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://"),
    };
  });
}

export async function searchOpenLibrary(query: string): Promise<SearchResult[]> {
  const { raw, filters } = parseQuery(query);
  
  const params = new URLSearchParams({ limit: "10" });
  if (raw) params.set("q", raw);
  if (filters.title) params.set("title", filters.title);
  if (filters.author) params.set("author", filters.author);
  if (filters.isbn) params.set("isbn", filters.isbn);
  if (filters.publisher) params.set("publisher", filters.publisher);

  if (Array.from(params.keys()).length === 1) return [];

  const res = await fetch(`${OPEN_LIBRARY_URL}?${params}`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.docs) return [];

  return (data.docs as OpenLibraryDoc[]).map((doc) => ({
    source: "openlibrary",
    externalId: doc.key,
    title: doc.title ?? "Unknown Title",
    subtitle: doc.subtitle,
    authors: doc.author_name ?? [],
    publisher: doc.publisher?.[0],
    publishedDate: doc.first_publish_year?.toString(),
    isbn: doc.isbn?.[0],
    pageCount: doc.number_of_pages_median,
    language: doc.language?.[0],
    thumbnail: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
  }));
}

// --- Private types for API responses ---

interface GoogleBooksItem {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    pageCount?: number;
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

interface OpenLibraryDoc {
  key: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  language?: string[];
  cover_i?: number;
}

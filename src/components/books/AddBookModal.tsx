"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { SearchResult, BookWithQuotes } from "@/types";

interface AddBookModalProps {
  children: React.ReactElement;
  onBookAdded: () => void;
  existingBook?: BookWithQuotes;
}

type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type?: string;
};

const FIELDS: FieldDef[] = [
  { key: "title", label: "Title", required: true },
  { key: "author", label: "Author", required: true },
  { key: "publisher", label: "Publisher" },
  { key: "publishedDate", label: "Published Date" },
  { key: "isbn", label: "ISBN" },
  { key: "pageCount", label: "Page Count", type: "number" },
  { key: "language", label: "Language" },
  { key: "thumbnail", label: "Cover URL" },
];

type BookFormData = Record<string, string>;

export function AddBookModal({ children, onBookAdded, existingBook }: AddBookModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<BookFormData>(
    existingBook
      ? {
          title: existingBook.title,
          author: existingBook.author,
          publisher: existingBook.publisher ?? "",
          publishedDate: existingBook.publishedDate ?? "",
          isbn: existingBook.isbn ?? "",
          pageCount: existingBook.pageCount?.toString() ?? "",
          language: existingBook.language ?? "",
          thumbnail: existingBook.thumbnail ?? "",
        }
      : {}
  );

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }, [query]);

  function handleSelectResult(result: SearchResult) {
    setFormData({
      title: result.title,
      author: result.authors.join(", "),
      publisher: result.publisher ?? "",
      publishedDate: result.publishedDate ?? "",
      isbn: result.isbn ?? "",
      pageCount: result.pageCount?.toString() ?? "",
      language: result.language ?? "",
      thumbnail: result.thumbnail ?? "",
      ...(result.source === "google"
        ? { googleBooksId: result.externalId }
        : { openLibraryId: result.externalId }),
    });
    setResults([]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.author) {
      toast.error("Title and author are required");
      return;
    }
    setSaving(true);
    try {
      const url = existingBook ? `/api/books/${existingBook.id}` : "/api/books";
      const method = existingBook ? "PATCH" : "POST";
      const payload = {
        ...formData,
        pageCount: formData.pageCount ? parseInt(formData.pageCount) : undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(existingBook ? "Book updated" : "Book added");
      onBookAdded();
      setOpen(false);
      if (!existingBook) {
        setFormData({});
        setQuery("");
        setResults([]);
      }
    } catch {
      toast.error("Failed to save book");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingBook ? "Edit Book" : "Add Book"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Search */}
          {!existingBook && (
            <>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search by title, author, or ISBN…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="outline" disabled={searching}>
                  {searching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                </Button>
              </form>

              {/* Search results */}
              {searching && (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 rounded-md border p-3">
                      <Skeleton className="size-12 rounded" />
                      <div className="flex flex-col gap-1.5 pt-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {results.length > 0 && (
                <ScrollArea className="max-h-48">
                  <div className="flex flex-col gap-1">
                    {results.map((r) => (
                      <button
                        key={`${r.source}-${r.externalId}`}
                        type="button"
                        onClick={() => handleSelectResult(r)}
                        className="flex items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div className="size-10 shrink-0 overflow-hidden rounded">
                          {r.thumbnail ? (
                            <Image
                              src={r.thumbnail}
                              alt={r.title}
                              width={40}
                              height={40}
                              className="size-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-muted text-xs">
                              {r.title.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.authors.join(", ")} · {r.publishedDate ?? ""}
                          </p>
                          <p className="text-xs text-muted-foreground/60 capitalize">
                            {r.source === "google" ? "Google Books" : "Open Library"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {results.length > 0 && <Separator />}
            </>
          )}

          {/* Manual form */}
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(({ key, label, required, type }) => (
                <div key={key} className={key === "thumbnail" ? "col-span-2" : ""}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label} {required && <span className="text-destructive">*</span>}
                  </label>
                  <Input
                    type={type ?? "text"}
                    value={formData[key] ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
                {existingBook ? "Save Changes" : "Add Book"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

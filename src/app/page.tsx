"use client";

import { useState, useEffect, useCallback } from "react";
import { BookSidebar } from "@/components/layout/BookSidebar";
import { QuotesPanel } from "@/components/layout/QuotesPanel";
import type { BookWithQuoteCount, BookWithQuotes, Quote } from "@/types";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function HomePage() {
  const [books, setBooks] = useState<BookWithQuoteCount[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookWithQuotes | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch("/api/books");
      const data = await res.json();
      setBooks(data.books ?? []);
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  const fetchQuotes = useCallback(async (bookId: string) => {
    setLoadingQuotes(true);
    try {
      const [bookRes, quotesRes] = await Promise.all([
        fetch(`/api/books/${bookId}`),
        fetch(`/api/quotes?bookId=${bookId}`),
      ]);
      const bookData = await bookRes.json();
      const quotesData = await quotesRes.json();
      setSelectedBook(bookData.book ?? null);
      setQuotes(quotesData.quotes ?? []);
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    if (selectedBookId) {
      fetchQuotes(selectedBookId);
    } else {
      setSelectedBook(null);
      setQuotes([]);
    }
  }, [selectedBookId, fetchQuotes]);

  const handleBookAdded = useCallback(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleBookDeleted = useCallback(
    (id: string) => {
      setBooks((prev) => prev.filter((b) => b.id !== id));
      if (selectedBookId === id) {
        setSelectedBookId(null);
      }
    },
    [selectedBookId]
  );

  const handleQuoteAdded = useCallback(() => {
    if (selectedBookId) fetchQuotes(selectedBookId);
    fetchBooks();
  }, [selectedBookId, fetchQuotes, fetchBooks]);

  const handleQuoteDeleted = useCallback(
    (id: string) => {
      setQuotes((prev) => prev.filter((q) => q.id !== id));
      setBooks((prev) =>
        prev.map((b) =>
          b.id === selectedBookId
            ? { ...b, _count: { quotes: b._count.quotes - 1 } }
            : b
        )
      );
    },
    [selectedBookId]
  );

  const handleQuoteUpdated = useCallback((updated: Quote) => {
    setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <BookSidebar
          books={books}
          selectedBookId={selectedBookId}
          loading={loadingBooks}
          onSelectBook={setSelectedBookId}
          onBookAdded={handleBookAdded}
          onBookDeleted={handleBookDeleted}
          onImportSuccess={fetchBooks}
        />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="absolute left-2 top-2 z-10">
            <SidebarTrigger />
          </div>
          <QuotesPanel
            book={selectedBook}
            quotes={quotes}
            loading={loadingQuotes}
            onQuoteAdded={handleQuoteAdded}
            onQuoteDeleted={handleQuoteDeleted}
            onQuoteUpdated={handleQuoteUpdated}
            onBookUpdated={() => selectedBookId && fetchQuotes(selectedBookId)}
            onBookDeleted={handleBookDeleted}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

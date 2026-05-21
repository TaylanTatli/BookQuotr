"use client";

import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BookDetail } from "@/components/books/BookDetail";
import { QuoteList } from "@/components/quotes/QuoteList";
import { AddQuoteModal } from "@/components/quotes/AddQuoteModal";
import type { BookWithQuotes, Quote } from "@/types";

interface QuotesPanelProps {
  book: BookWithQuotes | null;
  quotes: Quote[];
  loading: boolean;
  onQuoteAdded: () => void;
  onQuoteDeleted: (id: string) => void;
  onQuoteUpdated: (quote: Quote) => void;
  onBookUpdated: () => void;
  onBookDeleted: (id: string) => void;
}

export function QuotesPanel({
  book,
  quotes,
  loading,
  onQuoteAdded,
  onQuoteDeleted,
  onQuoteUpdated,
  onBookUpdated,
  onBookDeleted,
}: QuotesPanelProps) {
  if (!book) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <BookOpen className="size-12 opacity-20" />
        <p className="text-sm">Select a book to see its quotes</p>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-background">
      {/* Book metadata header */}
      <div className="shrink-0 p-6 pb-0">
        <BookDetail
          book={book}
          onBookUpdated={onBookUpdated}
          onBookDeleted={onBookDeleted}
        />
      </div>

      <Separator className="mx-6 mt-4" />

      {/* Quotes list */}
      <ScrollArea className="flex-1 px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-3 h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <QuoteList
            quotes={quotes}
            onQuoteDeleted={onQuoteDeleted}
            onQuoteUpdated={onQuoteUpdated}
          />
        )}
      </ScrollArea>

      {/* Add Quote FAB */}
      <div className="absolute bottom-6 right-6">
        <AddQuoteModal bookId={book.id} onQuoteAdded={onQuoteAdded}>
          <Button>
            <Plus data-icon="inline-start" />
            Add Quote
          </Button>
        </AddQuoteModal>
      </div>
    </main>
  );
}

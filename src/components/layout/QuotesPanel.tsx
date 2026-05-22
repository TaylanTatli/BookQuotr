"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BookDetail } from "@/components/books/BookDetail";
import { QuoteList } from "@/components/quotes/QuoteList";
import { AddQuoteModal } from "@/components/quotes/AddQuoteModal";
import { QuoteViewOptions, type QuoteViewMode } from "@/components/quotes/QuoteViewOptions";
import { useTranslation } from "@/i18n/client";
import type { BookWithQuotes, Quote } from "@/types";

const VIEW_MODE_KEY = "bq_quote_view_mode";

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
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<QuoteViewMode>("default");

  // Persist view mode and sync with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(VIEW_MODE_KEY) as QuoteViewMode | null;
      if (saved) setViewMode(saved);
    };

    handleStorageChange();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage-update", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage-update", handleStorageChange);
    };
  }, []);

  function handleViewModeChange(mode: QuoteViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
    // Dispatch events to notify other components (e.g. SettingsModal)
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("local-storage-update"));
  }

  if (!book) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <BookOpen className="size-12 opacity-20" />
        <p className="text-sm">{t("quotes.emptySelection")}</p>
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

      {/* Toolbar: count + view options */}
      <div className="shrink-0 flex items-center justify-between px-6 py-2">
        <p className="text-xs text-muted-foreground">
          {quotes.length} {quotes.length === 1 ? t("books.quoteCount") : t("books.quotesCount")}
        </p>
        <QuoteViewOptions value={viewMode} onChange={handleViewModeChange} />
      </div>

      {/* Quotes list */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
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
            viewMode={viewMode}
          />
        )}
      </div>

      {/* Add Quote FAB */}
      <div className="absolute bottom-6 right-6">
        <AddQuoteModal bookId={book.id} onQuoteAdded={onQuoteAdded}>
          <Button>
            <Plus data-icon="inline-start" />
            {t("quotes.addQuote")}
          </Button>
        </AddQuoteModal>
      </div>
    </main>
  );
}

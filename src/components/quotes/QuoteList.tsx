"use client";

import { QuoteCard } from "@/components/quotes/QuoteCard";
import { useTranslation } from "@/i18n/client";
import type { Quote, BookWithQuotes } from "@/types";
import type { QuoteViewMode } from "@/components/quotes/QuoteViewOptions";

interface QuoteListProps {
  quotes: Quote[];
  book?: BookWithQuotes | null;
  onQuoteDeleted: (id: string) => void;
  onQuoteUpdated: (quote: Quote) => void;
  viewMode?: QuoteViewMode;
}

export function QuoteList({
  quotes,
  book,
  onQuoteDeleted,
  onQuoteUpdated,
  viewMode = "default",
}: QuoteListProps) {
  const { t } = useTranslation();

  if (quotes.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">{t("quotes.noQuotesTitle")}</p>
        <p className="text-xs">{t("quotes.noQuotesDesc")}</p>
      </div>
    );
  }

  if (viewMode === "two-column") {
    return (
      <div className="grid grid-cols-1 gap-3 pb-20 sm:grid-cols-2">
        {quotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            bookId={quote.bookId}
            book={book}
            onDeleted={onQuoteDeleted}
            onUpdated={onQuoteUpdated}
          />
        ))}
      </div>
    );
  }

  if (viewMode === "centered") {
    return (
      <div className="flex flex-col gap-3 pb-20">
        {quotes.map((quote) => (
          <div key={quote.id} className="mx-auto w-full max-w-2xl">
            <QuoteCard
              quote={quote}
              bookId={quote.bookId}
              book={book}
              onDeleted={onQuoteDeleted}
              onUpdated={onQuoteUpdated}
            />
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "masonry") {
    return (
      <div
        className="pb-20"
        style={{
          columnCount: 2,
          columnGap: "0.75rem",
        }}
      >
        {quotes.map((quote) => (
          <div key={quote.id} className="mb-3 break-inside-avoid">
            <QuoteCard
              quote={quote}
              bookId={quote.bookId}
              book={book}
              onDeleted={onQuoteDeleted}
              onUpdated={onQuoteUpdated}
            />
          </div>
        ))}
      </div>
    );
  }

  // default: single column
  return (
    <div className="flex flex-col gap-3 pb-20">
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          bookId={quote.bookId}
          book={book}
          onDeleted={onQuoteDeleted}
          onUpdated={onQuoteUpdated}
        />
      ))}
    </div>
  );
}

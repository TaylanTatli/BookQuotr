"use client";

import { QuoteCard } from "@/components/quotes/QuoteCard";
import { useTranslation } from "@/i18n/client";
import type { Quote } from "@/types";

interface QuoteListProps {
  quotes: Quote[];
  onQuoteDeleted: (id: string) => void;
  onQuoteUpdated: (quote: Quote) => void;
}

export function QuoteList({ quotes, onQuoteDeleted, onQuoteUpdated }: QuoteListProps) {
  const { t } = useTranslation();

  if (quotes.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">{t("quotes.noQuotesTitle")}</p>
        <p className="text-xs">{t("quotes.noQuotesDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-20">
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          bookId={quote.bookId}
          onDeleted={onQuoteDeleted}
          onUpdated={onQuoteUpdated}
        />
      ))}
    </div>
  );
}

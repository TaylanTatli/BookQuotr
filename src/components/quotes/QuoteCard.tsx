"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddQuoteModal } from "@/components/quotes/AddQuoteModal";
import type { Quote } from "@/types";

interface QuoteCardProps {
  quote: Quote;
  bookId: string;
  onDeleted: (id: string) => void;
  onUpdated: (quote: Quote) => void;
}

export function QuoteCard({ quote, bookId, onDeleted, onUpdated }: QuoteCardProps) {
  const [hovered, setHovered] = useState(false);

  async function handleDelete() {
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(quote.id);
      toast.success("Quote deleted");
    } catch {
      toast.error("Failed to delete quote");
    }
  }

  return (
    <div
      className="group relative rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Markdown content */}
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{quote.content}</ReactMarkdown>
      </div>

      {/* Meta badges */}
      {(quote.page || quote.chapter || quote.note) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quote.page && (
            <Badge variant="secondary" className="text-xs">
              p. {quote.page}
            </Badge>
          )}
          {quote.chapter && (
            <Badge variant="secondary" className="text-xs">
              {quote.chapter}
            </Badge>
          )}
          {quote.note && (
            <Badge variant="outline" className="max-w-[200px] truncate text-xs italic">
              {quote.note}
            </Badge>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div
        className={cn(
          "absolute right-2 top-2 flex gap-1 transition-opacity",
          "opacity-100 md:opacity-0",
          hovered && "md:opacity-100"
        )}
      >
        <AddQuoteModal bookId={bookId} existingQuote={quote} onQuoteAdded={() => { }}>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="size-3" />
          </Button>
        </AddQuoteModal>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <Trash2 className="size-3" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

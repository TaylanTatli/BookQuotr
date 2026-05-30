"use client"

import { useState } from "react"
import { Pencil, Trash2, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n/client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import { AddQuoteModal } from "@/components/quotes/AddQuoteModal"
import type { Quote } from "@/types"

interface QuoteCardProps {
  quote: Quote
  bookId: string
  onDeleted: (id: string) => void
  onUpdated: (quote: Quote) => void
}

export function QuoteCard({
  quote,
  bookId,
  onDeleted,
  onUpdated,
}: QuoteCardProps) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()

  async function handleDelete() {
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onDeleted(quote.id)
      toast.success(t("quotes.deleteSuccess"))
    } catch {
      toast.error(t("quotes.deleteError"))
    }
  }

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(quote.content)
      setCopied(true)
      toast.success(t("quotes.copySuccess"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("quotes.copyError"))
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
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {quote.content}
        </ReactMarkdown>
      </div>

      {/* Bottom row: meta badges + action buttons */}
      <div className="mt-3 flex items-end justify-between gap-2">
        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5">
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
            <Badge
              variant="outline"
              className="max-w-[200px] truncate text-xs italic"
            >
              {quote.note}
            </Badge>
          )}
        </div>

        {/* Action buttons — always visible on mobile, hover on desktop */}
        <div
          className={cn(
            "flex shrink-0 gap-1 transition-opacity",
            "opacity-100 md:opacity-0",
            hovered && "md:opacity-100"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="size-3 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>

          <AddQuoteModal
            bookId={bookId}
            existingQuote={quote}
            onQuoteAdded={() => onUpdated(quote)}
          >
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
                  className="size-6 text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <Trash2 className="size-3" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("quotes.deleteTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("quotes.deleteDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  {t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

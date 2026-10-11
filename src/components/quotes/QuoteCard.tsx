"use client"

import { useState, useEffect, useRef } from "react"
import { Pencil, Trash2, Copy, Check, ImageDown } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n/client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import remarkSmartypants from "remark-smartypants"
import rehypeSanitize from "rehype-sanitize"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
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
import { QuoteExportModal } from "@/components/quotes/QuoteExportModal"
import type { Quote, BookWithQuotes } from "@/types"

interface QuoteCardProps {
  quote: Quote
  bookId: string
  book?: BookWithQuotes | null
  onDeleted: (id: string) => void
  onUpdated: (quote: Quote) => void
  isHighlighted?: boolean
}

export function QuoteCard({
  quote,
  bookId,
  book,
  onDeleted,
  onUpdated,
  isHighlighted,
}: QuoteCardProps) {
  const [copied, setCopied] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Scroll into view and show ring animation when highlighted
  useEffect(() => {
    if (!isHighlighted) return
    const scrollTimer = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      setShowHighlight(true)
    }, 150)
    return () => clearTimeout(scrollTimer)
  }, [isHighlighted])

  // Fade out the highlight after 2.5s
  useEffect(() => {
    if (!showHighlight) return
    const fadeTimer = setTimeout(() => setShowHighlight(false), 2500)
    return () => clearTimeout(fadeTimer)
  }, [showHighlight])

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
      ref={cardRef}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-4 pb-12 md:pb-4 transition-all duration-700 hover:shadow-sm",
        showHighlight && "ring-2 ring-primary/70 shadow-md"
      )}
    >
      {/* Quote content */}
      <div className="prose prose-sm max-w-none dark:prose-invert [&_p+p]:mt-[1.2em]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks, remarkSmartypants]}
          rehypePlugins={[rehypeSanitize]}
        >
          {quote.content
            .split(/\n\n/)
            .map((block) => block.replace(/\n/g, "&nbsp; \n"))
            .join("\n\n")}
        </ReactMarkdown>
      </div>

      {/* Meta badges — only rendered when at least one exists */}
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
            <Badge
              variant="outline"
              className="max-w-[200px] truncate text-xs italic"
            >
              {quote.note}
            </Badge>
          )}
        </div>
      )}

      {/* Action buttons — absolute positioned, no layout impact.
          Mobile: always visible in the pb-12 bottom padding space.
          Desktop: invisible, fade in on hover. */}
      <ButtonGroup className="absolute bottom-3 right-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 backdrop-blur-xs">
        {/* Export as image */}
        <QuoteExportModal quote={quote} book={book}>
          <Button
            variant="outline"
            size="icon-sm"
            className="cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageDown />
          </Button>
        </QuoteExportModal>

        {/* Copy */}
        <Button
          variant="outline"
          size="icon-sm"
          className="cursor-pointer"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="text-green-600 dark:text-green-400" />
          ) : (
            <Copy />
          )}
        </Button>

        {/* Edit */}
        <AddQuoteModal
          bookId={bookId}
          existingQuote={quote}
          onQuoteAdded={onUpdated}
        >
          <Button
            variant="outline"
            size="icon-sm"
            className="cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil />
          </Button>
        </AddQuoteModal>

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                className="cursor-pointer text-destructive hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <Trash2 />
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
      </ButtonGroup>
    </div>
  )
}

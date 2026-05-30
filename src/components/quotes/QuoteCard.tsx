"use client"

import { useState, useRef, useCallback } from "react"
import { Pencil, Trash2, Copy, Check, ImageDown, Moon, Sun, Monitor } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n/client"
import { useTheme } from "next-themes"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import remarkSmartypants from "remark-smartypants"
import rehypeSanitize from "rehype-sanitize"
import { toPng } from "html-to-image"
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
import { QuoteImageTemplate } from "@/components/quotes/QuoteImageTemplate"
import type { Quote } from "@/types"

interface QuoteCardProps {
  quote: Quote
  bookId: string
  book?: { title: string; author: string } | null
  onDeleted: (id: string) => void
  onUpdated: (quote: Quote) => void
}

export function QuoteCard({
  quote,
  bookId,
  book,
  onDeleted,
  onUpdated,
}: QuoteCardProps) {
  const [hovered, setHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const exportDarkRef = useRef<HTMLDivElement>(null)
  const exportLightRef = useRef<HTMLDivElement>(null)

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

  const handleShare = useCallback(
    async (themeOverride?: "dark" | "light") => {
      const isDark =
        themeOverride !== undefined
          ? themeOverride === "dark"
          : resolvedTheme === "dark"

      const ref = isDark ? exportDarkRef : exportLightRef
      if (!ref.current) return

      setExporting(true)
      setShowExportOptions(false)
      try {
        const png = await toPng(ref.current, { pixelRatio: 2, quality: 1.0 })
        const link = document.createElement("a")
        link.download = `quote-${quote.id.slice(0, 8)}.png`
        link.href = png
        link.click()
        toast.success(t("quotes.shareSuccess"))
      } catch {
        toast.error(t("quotes.shareError"))
      } finally {
        setExporting(false)
      }
    },
    [resolvedTheme, quote.id, t]
  )

  return (
    <>
      {/* Hidden off-screen export templates (dark + light) */}
      {[true, false].map((isDark) => (
        <div
          key={String(isDark)}
          style={{
            position: "fixed",
            top: "-9999px",
            left: "-9999px",
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <QuoteImageTemplate
            ref={isDark ? exportDarkRef : exportLightRef}
            content={quote.content}
            bookTitle={book?.title}
            author={book?.author}
            page={quote.page}
            chapter={quote.chapter}
            isDark={isDark}
          />
        </div>
      ))}

      <div
        className="group relative rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-sm"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          setShowExportOptions(false)
        }}
      >
        {/* Markdown content */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks, remarkSmartypants]}
            rehypePlugins={[rehypeSanitize]}
          >
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
              "flex shrink-0 items-center gap-1 transition-opacity",
              "opacity-100 md:opacity-0",
              hovered && "md:opacity-100"
            )}
          >
            {/* Inline theme picker — appears when share icon is clicked */}
            {showExportOptions && (
              <div className="flex items-center gap-0.5 rounded-md border border-border bg-card px-1 mr-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  title="System theme"
                  disabled={exporting}
                  onClick={(e) => { e.stopPropagation(); handleShare() }}
                >
                  <Monitor className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  title="Light"
                  disabled={exporting}
                  onClick={(e) => { e.stopPropagation(); handleShare("light") }}
                >
                  <Sun className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  title="Dark"
                  disabled={exporting}
                  onClick={(e) => { e.stopPropagation(); handleShare("dark") }}
                >
                  <Moon className="size-3" />
                </Button>
              </div>
            )}

            {/* Share / export button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={exporting}
              onClick={(e) => {
                e.stopPropagation()
                setShowExportOptions((v) => !v)
              }}
            >
              <ImageDown className="size-3" />
            </Button>

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
    </>
  )
}

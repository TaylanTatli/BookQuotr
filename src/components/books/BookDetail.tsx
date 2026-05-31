"use client"

import Image from "next/image"
import { Trash2, Pencil, Star, Heart, ChevronDown } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { AddBookModal } from "@/components/books/AddBookModal"
import { useTranslation } from "@/i18n/client"
import { useIsMobile } from "@/hooks/use-mobile"
import { getLanguageName } from "@/lib/languageMap"
import { cn } from "@/lib/utils"
import type { BookWithQuotes } from "@/types"

interface BookDetailProps {
  book: BookWithQuotes
  onBookUpdated: () => void
  onBookDeleted: (id: string) => void
}

function formatDate(
  dateStr: string | Date | null | undefined,
  locale: string
): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function calcReadingDays(
  startedAt: Date | null | undefined,
  finishedAt: Date | null | undefined
): number | null {
  if (!startedAt || !finishedAt) return null
  const start = new Date(startedAt)
  const end = new Date(finishedAt)
  const diff = Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )
  return diff >= 0 ? diff + 1 : null
}

export function BookDetail({
  book,
  onBookUpdated,
  onBookDeleted,
}: BookDetailProps) {
  const { t, locale } = useTranslation()
  const isMobile = useIsMobile()
  const [rating, setRating] = useState<number | null>(book.rating ?? null)
  const [isFavorite, setIsFavorite] = useState(book.isFavorite ?? false)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [savingRating, setSavingRating] = useState(false)
  const [savingFavorite, setSavingFavorite] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  async function handleDelete() {
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onBookDeleted(book.id)
      toast.success(t("books.deleteSuccess", { title: book.title }))
    } catch {
      toast.error(t("books.deleteError"))
    }
  }

  async function handleRating(newRating: number) {
    // Toggle off if same star clicked
    const value = newRating === rating ? null : newRating
    setRating(value)
    setSavingRating(true)
    try {
      await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      })
    } catch {
      toast.error(t("books.saveError"))
      setRating(book.rating ?? null)
    } finally {
      setSavingRating(false)
    }
  }

  async function handleFavorite() {
    const newValue = !isFavorite
    setIsFavorite(newValue)
    setSavingFavorite(true)
    try {
      await fetch(`/api/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      })
      toast.success(
        newValue ? t("books.addedToFavorites") : t("books.removedFromFavorites")
      )
    } catch {
      toast.error(t("books.saveError"))
      setIsFavorite(book.isFavorite ?? false)
    } finally {
      setSavingFavorite(false)
    }
  }

  const readingDays = calcReadingDays(book.startedAt, book.finishedAt)

  const hasCollapsibleContent =
    rating !== null ||
    book.publishedDate ||
    book.publisher ||
    (book.pageCount || 0) > 0 ||
    book.language ||
    book.isbn ||
    book.startedAt ||
    book.finishedAt ||
    book.description

  // The collapsible details section (ratings, meta, dates, description)
  const detailsContent = (
    <>
      {/* Star rating */}
      <div
        className="mt-2 flex items-center gap-0.5"
        aria-label={t("books.rating")}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (hoveredStar ?? rating ?? 0) >= star
          return (
            <button
              key={star}
              type="button"
              disabled={savingRating}
              onClick={() => handleRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              className="text-muted-foreground transition-colors hover:text-yellow-400 disabled:opacity-50"
              aria-label={`${star} ${t("books.stars")}`}
            >
              <Star
                className={cn(
                  "size-4 transition-colors",
                  filled ? "fill-yellow-400 text-yellow-400" : "fill-none"
                )}
              />
            </button>
          )
        })}
      </div>

      {/* Meta badges */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {book.publishedDate && (
          <Badge variant="outline" className="text-xs">
            {book.publishedDate}
          </Badge>
        )}
        {book.publisher && (
          <Badge variant="outline" className="text-xs">
            {book.publisher}
          </Badge>
        )}
        {(book.pageCount || 0) > 0 && (
          <Badge variant="outline" className="text-xs">
            {book.pageCount} {t("books.pages")}
          </Badge>
        )}
        {book.language && (
          <Badge variant="outline" className="text-xs">
            {getLanguageName(book.language, locale)}
          </Badge>
        )}
        {book.isbn && (
          <Badge variant="outline" className="font-mono text-xs">
            {book.isbn}
          </Badge>
        )}
      </div>

      {/* Reading dates */}
      {(book.startedAt || book.finishedAt) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {book.startedAt && (
            <Badge variant="secondary" className="text-xs">
              📖 {t("books.startedAt")}: {formatDate(book.startedAt, locale)}
            </Badge>
          )}
          {book.finishedAt && (
            <Badge variant="secondary" className="text-xs">
              ✅ {t("books.finishedAt")}:{" "}
              {formatDate(book.finishedAt, locale)}
            </Badge>
          )}
          {readingDays !== null && (
            <Badge variant="secondary" className="text-xs">
              ⏱ {t("books.readingDuration", { days: readingDays })}
            </Badge>
          )}
        </div>
      )}

      {/* Description */}
      {book.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {book.description}
        </p>
      )}
    </>
  )

  return (
    <div className="flex items-start gap-5">
      {/* Cover */}
      <div className="h-30 w-auto shrink-0 overflow-hidden rounded-lg shadow-md">
        {book.thumbnail ? (
          <Image
            src={book.thumbnail}
            alt={book.title}
            width={96}
            height={96}
            className="size-full w-auto object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-2xl font-bold text-muted-foreground">
            {book.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-xl leading-tight font-semibold">
              {book.title}
            </h2>
            <p className="text-sm text-muted-foreground">{book.author}</p>
          </div>
          {/* Actions */}
          <div className="flex shrink-0 gap-1">
            {/* Favorite button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-7",
                isFavorite && "text-red-500 hover:text-red-500"
              )}
              onClick={handleFavorite}
              disabled={savingFavorite}
              title={isFavorite ? t("books.unfavorite") : t("books.favorite")}
            >
              <Heart className={cn("size-3.5", isFavorite && "fill-current")} />
            </Button>
            <AddBookModal existingBook={book} onBookAdded={onBookUpdated}>
              <Button variant="ghost" size="icon" className="size-7">
                <Pencil className="size-3.5" />
              </Button>
            </AddBookModal>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-7" />
                }
              >
                <Trash2 className="size-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("books.deleteTitle", { title: book.title })}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("books.deleteDesc")}
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

        {/* Mobile: collapsible details */}
        {isMobile && hasCollapsibleContent ? (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  detailsOpen && "rotate-180"
                )}
              />
              {detailsOpen ? t("books.hideDetails") : t("books.showDetails")}
            </CollapsibleTrigger>
            <CollapsibleContent>{detailsContent}</CollapsibleContent>
          </Collapsible>
        ) : (
          detailsContent
        )}
      </div>
    </div>
  )
}

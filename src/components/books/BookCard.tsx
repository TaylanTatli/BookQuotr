import { useState } from "react"
import Image from "next/image"
import { Trash2, Heart, BookOpen, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n/client"
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
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import type { BookWithQuoteCount } from "@/types"

interface BookCardProps {
  book: BookWithQuoteCount
  isSelected: boolean
  onClick: () => void
  onDeleted: () => void
}

export function BookCard({
  book,
  isSelected,
  onClick,
  onDeleted,
}: BookCardProps) {
  const { t } = useTranslation()
  const [imgLoaded, setImgLoaded] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onDeleted()
      toast.success(t("books.deleteSuccess", { title: book.title }))
    } catch {
      toast.error(t("books.deleteError"))
    }
  }

  return (
    <Item
      role="button"
      variant={isSelected ? "muted" : "default"}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group/item relative cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted"
    >
      {/* Thumbnail */}
      <ItemMedia
        variant="default"
        className="relative h-16 w-12 shrink-0 self-start overflow-hidden rounded bg-muted"
      >
        {book.thumbnail ? (
          <Image
            src={book.thumbnail}
            alt={book.title}
            width={50}
            height={100}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              imgLoaded ? "scale-100 blur-0" : "scale-110 blur-md"
            )}
            onLoad={() => setImgLoaded(true)}
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
            {book.title.charAt(0).toUpperCase()}
          </div>
        )}
      </ItemMedia>

      {/* Info */}
      <ItemContent className="min-w-0 flex-1">
        <ItemTitle className="flex w-full items-start justify-between gap-1">
          <span className="min-w-0 flex-1 truncate text-sm leading-tight font-medium">
            {book.title}
            {book.subtitle && (
              <span className="ml-1.5 font-normal text-muted-foreground/80">
                ({book.subtitle})
              </span>
            )}
          </span>
          {book.isFavorite && (
            <Heart className="mt-0.5 size-3 shrink-0 fill-red-500 text-red-500" />
          )}
        </ItemTitle>
        <ItemDescription className="truncate text-xs text-muted-foreground">
          {book.author}
        </ItemDescription>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {book._count.quotes}{" "}
            {book._count.quotes === 1
              ? t("books.quoteCount")
              : t("books.quotesCount")}
          </Badge>
          {book.readingStatus === "reading" && (
            <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <BookOpen className="size-3" />
              {t("books.readingStatus.reading")}
            </Badge>
          )}
          {book.readingStatus === "finished" && (
            <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="size-3" />
              {t("books.readingStatus.finished")}
            </Badge>
          )}
          {book.readingStatus === "abandoned" && (
            <Badge variant="outline" className="gap-1 border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300">
              <XCircle className="size-3" />
              {t("books.readingStatus.abandoned")}
            </Badge>
          )}
        </div>
      </ItemContent>

      {/* Delete button */}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 size-6 opacity-0 transition-opacity group-hover/item:opacity-100"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <Trash2 className="size-3" />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("books.deleteTitle", { title: book.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("books.deleteDescWithCount", { count: book._count.quotes })}
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
    </Item>
  )
}

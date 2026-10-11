"use client"

import { useState } from "react"
import { AddBookModal } from "@/components/books/AddBookModal"
import { BookCard } from "@/components/books/BookCard"
import { SettingsModal } from "@/components/settings/SettingsModal"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useTranslation } from "@/i18n/client"
import { ItemGroup } from "@/components/ui/item"
import type { BookWithQuoteCount } from "@/types"
import { LogOut, Plus, Settings, Search, ListFilter } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

type SortKey = "createdAt" | "finishedAt" | "title" | "author" | "rating" | "quoteCount" | "readingStatus"

const SORT_OPTIONS: { value: SortKey; labelKey: string }[] = [
  { value: "createdAt", labelKey: "books.sortByAdded" },
  { value: "quoteCount", labelKey: "books.sortByQuoteCount" },
  { value: "readingStatus", labelKey: "books.sortByReadingStatus" },
  { value: "finishedAt", labelKey: "books.sortByFinished" },
  { value: "title", labelKey: "books.sortByTitle" },
  { value: "author", labelKey: "books.sortByAuthor" },
  { value: "rating", labelKey: "books.sortByRating" },
]

function sortBooks(
  books: BookWithQuoteCount[],
  sortKey: SortKey
): BookWithQuoteCount[] {
  const copy = [...books]
  return copy.sort((a, b) => {
    // Always pin "reading" books to the top
    const aIsReading = a.readingStatus === "reading"
    const bIsReading = b.readingStatus === "reading"
    if (aIsReading && !bIsReading) return -1
    if (!aIsReading && bIsReading) return 1

    switch (sortKey) {
      case "quoteCount": {
        const diff = b._count.quotes - a._count.quotes
        if (diff !== 0) return diff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      case "readingStatus": {
        // "reading" is already at top. Let's order the rest: finished, abandoned, null
        const order: Record<string, number> = { finished: 1, abandoned: 2, null: 3 }
        const aStatus = order[a.readingStatus ?? "null"] ?? 4
        const bStatus = order[b.readingStatus ?? "null"] ?? 4
        if (aStatus !== bStatus) return aStatus - bStatus
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      case "finishedAt":
        if (a.finishedAt && b.finishedAt)
          return new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime()
        if (a.finishedAt) return -1
        if (b.finishedAt) return 1
        return a.title.localeCompare(b.title)
      case "title":
        return a.title.localeCompare(b.title)
      case "author":
        return a.author.localeCompare(b.author)
      case "rating": {
        const ra = a.rating ?? 0
        const rb = b.rating ?? 0
        if (rb !== ra) return rb - ra
        return a.title.localeCompare(b.title)
      }
      case "createdAt":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })
}

interface BookSidebarProps {
  books: BookWithQuoteCount[]
  selectedBookId: string | null
  loading: boolean
  onSelectBook: (id: string) => void
  onBookAdded: () => void
  onBookDeleted: (id: string) => void
  onImportSuccess: () => void
  onSearchOpen: () => void
}

export function BookSidebar({
  books,
  selectedBookId,
  loading,
  onSelectBook,
  onBookAdded,
  onBookDeleted,
  onImportSuccess,
  onSearchOpen,
}: BookSidebarProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const sortedBooks = sortBooks(books, sortKey)
  const totalQuotes = books.reduce((sum, b) => sum + b._count.quotes, 0)

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex items-center gap-2 px-2">
          <Image
            src="/favicon.svg"
            alt="BookQuotr"
            width={28}
            height={28}
            className="text-primary"
          />
          <h1 className="text-lg font-semibold tracking-tight">BookQuotr</h1>
        </div>
        <div className="flex gap-2 px-1">
          <AddBookModal onBookAdded={onBookAdded}>
            <Button size="sm" className="flex-1">
              <Plus className="mr-2 size-4" />
              {t("sidebar.addBook")}
            </Button>
          </AddBookModal>
          <SettingsModal onImportSuccess={onImportSuccess}>
            <Button size="sm" variant="outline">
              <Settings className="size-4" />
            </Button>
          </SettingsModal>
        </div>

        {/* Search + Sort — same row */}
        <div className="flex gap-2 px-1">
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 flex-1 justify-start text-muted-foreground"
            onClick={onSearchOpen}
          >
            <Search className="mr-1.5 size-3.5 shrink-0" />
            <span className="flex-1 truncate text-left text-xs">
              {t("search.buttonLabel")}
            </span>
            <kbd className="ml-1 shrink-0 text-xs opacity-50">Ctrl K</kbd>
          </Button>

          {books.length > 1 && (
            <Select
              value={sortKey}
              onValueChange={(v) => setSortKey(v as SortKey)}
            >
              <SelectTrigger
                className="shrink-0 text-xs"
                aria-label="Sort order"
                size="sm"
              >
                <ListFilter className="size-3.5 shrink-0 text-muted-foreground" />
              </SelectTrigger>
              <SelectContent
                side="bottom"
                align="center"
                alignItemWithTrigger={false}
              >
                <SelectGroup>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats row */}
      {!loading && books.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{books.length}</span>{" "}
            {books.length === 1 ? t("books.quoteCount") : t("sidebar.books")}
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{totalQuotes}</span>{" "}
            {totalQuotes === 1 ? t("books.quoteCount") : t("books.quotesCount")}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <ItemGroup className="gap-1 p-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-md p-2">
                <Skeleton className="size-12 shrink-0 rounded" />
                <div className="flex flex-1 flex-col gap-1.5 pt-1">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))
          ) : books.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              {t("sidebar.noBooks")}
            </p>
          ) : (
            sortedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isSelected={book.id === selectedBookId}
                onClick={() => onSelectBook(book.id)}
                onDeleted={() => onBookDeleted(book.id)}
              />
            ))
          )}
        </ItemGroup>
      </div>

      <div className="mt-auto border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 size-4" />
          {t("sidebar.logout")}
        </Button>
      </div>
    </div>
  )
}

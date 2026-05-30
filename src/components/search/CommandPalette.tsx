"use client"

import { useState, useEffect, useRef } from "react"
import { BookOpen, Quote, Loader2 } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useTranslation } from "@/i18n/client"

interface BookResult {
  id: string
  title: string
  author: string
  _count: { quotes: number }
}

interface QuoteResult {
  id: string
  content: string
  chapter?: string | null
  note?: string | null
  book: { id: string; title: string; author: string }
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectBook: (id: string) => void
}

export function CommandPalette({ open, onOpenChange, onSelectBook }: CommandPaletteProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [books, setBooks] = useState<BookResult[]>([])
  const [quotes, setQuotes] = useState<QuoteResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Register Ctrl+K / Cmd+K globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange])

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setQuery("")
      setBooks([])
      setQuotes([])
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (!q) {
      setBooks([])
      setQuotes([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/db-search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setBooks(data.books ?? [])
        setQuotes(data.quotes ?? [])
      } catch {
        setBooks([])
        setQuotes([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleSelectBook(id: string) {
    onSelectBook(id)
    onOpenChange(false)
  }

  function handleSelectQuote(bookId: string) {
    onSelectBook(bookId)
    onOpenChange(false)
  }

  const hasResults = books.length > 0 || quotes.length > 0
  const showEmpty = !loading && query.trim().length > 0 && !hasResults

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("search.title")}
      description={t("search.description")}
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder={t("search.placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty state */}
          {showEmpty && <CommandEmpty>{t("search.empty")}</CommandEmpty>}

          {/* Idle hint */}
          {!loading && !query.trim() && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("search.hint")}
            </p>
          )}

          {/* Book results */}
          {!loading && books.length > 0 && (
            <CommandGroup heading={t("search.books")}>
              {books.map((book) => (
                <CommandItem
                  key={book.id}
                  value={book.id}
                  onSelect={() => handleSelectBook(book.id)}
                  className="gap-3"
                >
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{book.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {book.author}
                    </span>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {book._count.quotes}{" "}
                    {book._count.quotes === 1
                      ? t("books.quoteCount")
                      : t("books.quotesCount")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Separator between sections */}
          {!loading && books.length > 0 && quotes.length > 0 && (
            <CommandSeparator />
          )}

          {/* Quote results */}
          {!loading && quotes.length > 0 && (
            <CommandGroup heading={t("search.quotes")}>
              {quotes.map((quote) => (
                <CommandItem
                  key={quote.id}
                  value={quote.id}
                  onSelect={() => handleSelectQuote(quote.book.id)}
                  className="gap-3 items-start"
                >
                  <Quote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 text-sm leading-snug">
                      {quote.content}
                    </span>
                    <span className="mt-1 truncate text-xs text-muted-foreground italic">
                      {quote.book.title}
                      {quote.chapter && ` · ${quote.chapter}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

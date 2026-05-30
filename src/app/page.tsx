"use client"

import { useState, useEffect, useCallback } from "react"
import { BookSidebar } from "@/components/layout/BookSidebar"
import { QuotesPanel } from "@/components/layout/QuotesPanel"
import { CommandPalette } from "@/components/search/CommandPalette"
import type { BookWithQuoteCount, BookWithQuotes, Quote } from "@/types"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useIsMobile } from "@/hooks/use-mobile"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet"

export default function HomePage() {
  const [books, setBooks] = useState<BookWithQuoteCount[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookWithQuotes | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightedQuoteId, setHighlightedQuoteId] = useState<string | null>(
    null
  )

  const [isMounted, setIsMounted] = useState(false)
  const [sidebarSize, setSidebarSize] = useState<number>(25)

  useEffect(() => {
    setIsMounted(true)
    const saved = window.localStorage.getItem("bq_sidebar_width")
    if (saved && saved !== "undefined" && saved !== "NaN") {
      const parsed = Number(saved)
      if (!isNaN(parsed) && parsed > 0) {
        setSidebarSize(parsed)
      }
    }
  }, [])

  const isMobile = useIsMobile()

  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true)
    try {
      const res = await fetch("/api/books")
      const data = await res.json()
      setBooks(data.books ?? [])
    } finally {
      setLoadingBooks(false)
    }
  }, [])

  const fetchQuotes = useCallback(async (bookId: string) => {
    setLoadingQuotes(true)
    try {
      const [bookRes, quotesRes] = await Promise.all([
        fetch(`/api/books/${bookId}`),
        fetch(`/api/quotes?bookId=${bookId}`),
      ])
      const bookData = await bookRes.json()
      const quotesData = await quotesRes.json()
      setSelectedBook(bookData.book ?? null)
      setQuotes(quotesData.quotes ?? [])
    } finally {
      setLoadingQuotes(false)
    }
  }, [])

  useEffect(() => {
    fetchBooks()
  }, [fetchBooks])

  useEffect(() => {
    if (selectedBookId) {
      fetchQuotes(selectedBookId)
    } else {
      setSelectedBook(null)
      setQuotes([])
    }
  }, [selectedBookId, fetchQuotes])

  const handleBookAdded = useCallback(() => {
    fetchBooks()
  }, [fetchBooks])

  // Selecting a book directly clears any active quote highlight
  const handleSelectBook = useCallback((id: string) => {
    setSelectedBookId(id)
    setHighlightedQuoteId(null)
  }, [])

  const handleBookDeleted = useCallback(
    (id: string) => {
      setBooks((prev) => prev.filter((b) => b.id !== id))
      if (selectedBookId === id) {
        setSelectedBookId(null)
      }
    },
    [selectedBookId]
  )

  const handleQuoteAdded = useCallback(() => {
    if (selectedBookId) fetchQuotes(selectedBookId)
    fetchBooks()
  }, [selectedBookId, fetchQuotes, fetchBooks])

  const handleQuoteDeleted = useCallback(
    (id: string) => {
      setQuotes((prev) => prev.filter((q) => q.id !== id))
      setBooks((prev) =>
        prev.map((b) =>
          b.id === selectedBookId
            ? { ...b, _count: { quotes: b._count.quotes - 1 } }
            : b
        )
      )
    },
    [selectedBookId]
  )

  const handleQuoteUpdated = useCallback((updated: Quote) => {
    setQuotes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
  }, [])

  // Separate, mobile-first layout using a drawer
  if (isMobile) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <CommandPalette
          open={searchOpen}
          onOpenChange={setSearchOpen}
          onSelectBook={handleSelectBook}
          onSelectQuote={(bookId, quoteId) => {
            setSelectedBookId(bookId)
            setHighlightedQuoteId(quoteId)
          }}
        />
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-sidebar px-4">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-sidebar-foreground"
                />
              }
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[85vw] p-0"
              showCloseButton={true}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <BookSidebar
                books={books}
                selectedBookId={selectedBookId}
                loading={loadingBooks}
                onSelectBook={handleSelectBook}
                onBookAdded={handleBookAdded}
                onBookDeleted={handleBookDeleted}
                onImportSuccess={fetchBooks}
                onSearchOpen={() => setSearchOpen(true)}
              />
            </SheetContent>
          </Sheet>
          <div className="font-semibold text-sidebar-foreground">BookQuotr</div>
        </header>
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <QuotesPanel
            book={selectedBook}
            quotes={quotes}
            loading={loadingQuotes}
            onQuoteAdded={handleQuoteAdded}
            onQuoteDeleted={handleQuoteDeleted}
            onQuoteUpdated={handleQuoteUpdated}
            highlightedQuoteId={highlightedQuoteId}
            onBookUpdated={() => selectedBookId && fetchQuotes(selectedBookId)}
            onBookDeleted={handleBookDeleted}
          />
        </main>
      </div>
    )
  }

  if (!isMounted) return null

  // Desktop layout using resizable panels
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <CommandPalette
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectBook={handleSelectBook}
        onSelectQuote={(bookId, quoteId) => {
          setSelectedBookId(bookId)
          setHighlightedQuoteId(quoteId)
        }}
      />
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel 
          minSize="20%" 
          defaultSize={`${sidebarSize}%`} 
          maxSize="40%"
          onResize={(size: any) => {
            const newSize = typeof size === 'number' ? size : size.asPercentage
            if (newSize) {
              setSidebarSize(newSize)
              window.localStorage.setItem("bq_sidebar_width", String(newSize))
            }
          }}
        >
          <BookSidebar
            books={books}
            selectedBookId={selectedBookId}
            loading={loadingBooks}
            onSelectBook={handleSelectBook}
            onBookAdded={handleBookAdded}
            onBookDeleted={handleBookDeleted}
            onImportSuccess={fetchBooks}
            onSearchOpen={() => setSearchOpen(true)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={`${100 - sidebarSize}%`}>
          <main className="relative flex h-full min-w-0 flex-col overflow-hidden">
            <QuotesPanel
              book={selectedBook}
              quotes={quotes}
              loading={loadingQuotes}
              onQuoteAdded={handleQuoteAdded}
              onQuoteDeleted={handleQuoteDeleted}
              onQuoteUpdated={handleQuoteUpdated}
              highlightedQuoteId={highlightedQuoteId}
              onBookUpdated={() =>
                selectedBookId && fetchQuotes(selectedBookId)
              }
              onBookDeleted={handleBookDeleted}
            />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

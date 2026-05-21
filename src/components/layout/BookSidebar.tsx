"use client";

import { BookOpen, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCard } from "@/components/books/BookCard";
import { AddBookModal } from "@/components/books/AddBookModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import type { BookWithQuoteCount } from "@/types";

interface BookSidebarProps {
  books: BookWithQuoteCount[];
  selectedBookId: string | null;
  loading: boolean;
  onSelectBook: (id: string) => void;
  onBookAdded: () => void;
  onBookDeleted: (id: string) => void;
  onImportSuccess: () => void;
}

export function BookSidebar({
  books,
  selectedBookId,
  loading,
  onSelectBook,
  onBookAdded,
  onBookDeleted,
  onImportSuccess,
}: BookSidebarProps) {
  return (
    <aside className="flex w-[30%] min-w-[260px] max-w-[360px] flex-col border-r border-border bg-muted/20">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">BookQuotr</h1>
        </div>
        <div className="flex gap-2">
          <AddBookModal onBookAdded={onBookAdded}>
            <Button size="sm" className="flex-1">
              <Plus data-icon="inline-start" />
              Add Book
            </Button>
          </AddBookModal>
          <SettingsModal onImportSuccess={onImportSuccess}>
            <Button size="sm" variant="outline">
              <Settings className="size-4" />
            </Button>
          </SettingsModal>
        </div>
      </div>

      <Separator />

      {/* Book list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
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
              No books yet. Add your first book!
            </p>
          ) : (
            books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isSelected={book.id === selectedBookId}
                onClick={() => onSelectBook(book.id)}
                onDeleted={() => onBookDeleted(book.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

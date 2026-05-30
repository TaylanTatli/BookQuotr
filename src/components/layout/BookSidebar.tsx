"use client";

import { useState } from "react";
import { AddBookModal } from "@/components/books/AddBookModal";
import { BookCard } from "@/components/books/BookCard";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/client";
import { ItemGroup } from "@/components/ui/item";
import type { BookWithQuoteCount } from "@/types";
import { LogOut, Plus, Settings, Search, ListFilter } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type SortKey = "createdAt" | "finishedAt" | "title" | "author" | "rating";

const SORT_OPTIONS: { value: SortKey; labelKey: string }[] = [
  { value: "createdAt", labelKey: "books.sortByAdded" },
  { value: "finishedAt", labelKey: "books.sortByFinished" },
  { value: "title", labelKey: "books.sortByTitle" },
  { value: "author", labelKey: "books.sortByAuthor" },
  { value: "rating", labelKey: "books.sortByRating" },
];

function sortBooks(books: BookWithQuoteCount[], sortKey: SortKey): BookWithQuoteCount[] {
  const copy = [...books];
  switch (sortKey) {
    case "finishedAt":
      return copy.sort((a, b) => {
        if (a.finishedAt && b.finishedAt)
          return new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime();
        if (a.finishedAt) return -1;
        if (b.finishedAt) return 1;
        return a.title.localeCompare(b.title);
      });
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "author":
      return copy.sort((a, b) => a.author.localeCompare(b.author));
    case "rating":
      return copy.sort((a, b) => {
        const ra = a.rating ?? 0;
        const rb = b.rating ?? 0;
        if (rb !== ra) return rb - ra;
        return a.title.localeCompare(b.title);
      });
    case "createdAt":
    default:
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

interface BookSidebarProps {
  books: BookWithQuoteCount[];
  selectedBookId: string | null;
  loading: boolean;
  onSelectBook: (id: string) => void;
  onBookAdded: () => void;
  onBookDeleted: (id: string) => void;
  onImportSuccess: () => void;
  onSearchOpen: () => void;
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
  const router = useRouter();
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const sortedBooks = sortBooks(books, sortKey);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="flex items-center gap-2 px-2">
          <Image src="/favicon.svg" alt="BookQuotr" width={28} height={28} className="text-primary" />
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
            className="flex-1 min-w-0 justify-start text-muted-foreground"
            onClick={onSearchOpen}
          >
            <Search className="mr-1.5 size-3.5 shrink-0" />
            <span className="flex-1 truncate text-left text-xs">{t("search.buttonLabel")}</span>
            <kbd className="ml-1 shrink-0 text-xs opacity-50">Ctrl K</kbd>
          </Button>

          {books.length > 1 && (
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger
                className="h-8 w-8 shrink-0 px-0 text-xs [&>svg:last-child]:hidden"
                aria-label="Sort order"
              >
                <ListFilter className="size-3.5 text-muted-foreground" />
              </SelectTrigger>
              <SelectContent>
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
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 size-4" />
          {t("sidebar.logout")}
        </Button>
      </div>
    </div>
  );
}

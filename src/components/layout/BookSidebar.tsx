"use client";

import { BookOpen, Plus, Settings, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCard } from "@/components/books/BookCard";
import { AddBookModal } from "@/components/books/AddBookModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useTranslation } from "@/i18n/client";
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
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex flex-col gap-3 p-4 border-b">
        <div className="flex items-center gap-2 px-2">
          <BookOpen className="size-5 text-primary" />
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
      </div>

      <div className="flex-1 overflow-auto">
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
              {t("sidebar.noBooks")}
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

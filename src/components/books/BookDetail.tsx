"use client";

import Image from "next/image";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { AddBookModal } from "@/components/books/AddBookModal";
import type { BookWithQuotes } from "@/types";

interface BookDetailProps {
  book: BookWithQuotes;
  onBookUpdated: () => void;
  onBookDeleted: (id: string) => void;
}

export function BookDetail({ book, onBookUpdated, onBookDeleted }: BookDetailProps) {
  async function handleDelete() {
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onBookDeleted(book.id);
      toast.success(`"${book.title}" deleted`);
    } catch {
      toast.error("Failed to delete book");
    }
  }

  return (
    <div className="flex gap-5">
      {/* Cover */}
      <div className="size-24 shrink-0 overflow-hidden rounded-lg shadow-md">
        {book.thumbnail ? (
          <Image
            src={book.thumbnail}
            alt={book.title}
            width={96}
            height={96}
            className="size-full object-cover"
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
            <h2 className="truncate text-xl font-semibold leading-tight">{book.title}</h2>
            <p className="text-sm text-muted-foreground">{book.author}</p>
          </div>
          {/* Actions */}
          <div className="flex shrink-0 gap-1">
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
                  <AlertDialogTitle>Delete &quot;{book.title}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the book and all its quotes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
          {book.pageCount && (
            <Badge variant="outline" className="text-xs">
              {book.pageCount} pages
            </Badge>
          )}
          {book.language && (
            <Badge variant="outline" className="text-xs uppercase">
              {book.language}
            </Badge>
          )}
          {book.isbn && (
            <Badge variant="outline" className="font-mono text-xs">
              {book.isbn}
            </Badge>
          )}
        </div>

        {/* Description */}
        {book.description && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {book.description}
          </p>
        )}
      </div>
    </div>
  );
}

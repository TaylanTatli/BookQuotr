"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import type { BookWithQuoteCount } from "@/types";

interface BookCardProps {
  book: BookWithQuoteCount;
  isSelected: boolean;
  onClick: () => void;
  onDeleted: () => void;
}

export function BookCard({ book, isSelected, onClick, onDeleted }: BookCardProps) {
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted();
      toast.success(`"${book.title}" deleted`);
    } catch {
      toast.error("Failed to delete book");
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      {/* Thumbnail */}
      <div className="size-12 shrink-0 overflow-hidden rounded">
        {book.thumbnail ? (
          <Image
            src={book.thumbnail}
            alt={book.title}
            width={48}
            height={48}
            className="size-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            {book.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{book.title}</p>
        <p className="truncate text-xs text-muted-foreground">{book.author}</p>
        <Badge variant="secondary" className="mt-1 text-xs">
          {book._count.quotes} {book._count.quotes === 1 ? "quote" : "quotes"}
        </Badge>
      </div>

      {/* Delete button */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="size-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{book.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the book and all {book._count.quotes} of its
              quotes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

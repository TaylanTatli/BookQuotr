"use client";

import { useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Quote } from "@/types";

interface AddQuoteModalProps {
  children: React.ReactElement;
  bookId: string;
  onQuoteAdded: () => void;
  existingQuote?: Quote;
}

export function AddQuoteModal({
  children,
  bookId,
  onQuoteAdded,
  existingQuote,
}: AddQuoteModalProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(existingQuote?.content ?? "");
  const [page, setPage] = useState(existingQuote?.page?.toString() ?? "");
  const [chapter, setChapter] = useState(existingQuote?.chapter ?? "");
  const [note, setNote] = useState(existingQuote?.note ?? "");
  const [showExtra, setShowExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Quote content is required");
      return;
    }
    setSaving(true);
    try {
      if (existingQuote) {
        // Update existing quote
        const res = await fetch(`/api/quotes/${existingQuote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            page: page ? parseInt(page) : null,
            chapter: chapter || null,
            note: note || null,
          }),
        });
        if (!res.ok) throw new Error();
        onQuoteAdded();
        toast.success("Quote updated");
        setOpen(false);
      } else {
        // Create new quote(s)
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            content,
            page: page ? parseInt(page) : null,
            chapter: chapter || null,
            note: note || null,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        onQuoteAdded();
        toast.success(
          data.count > 1
            ? `${data.count} quotes saved`
            : "Quote saved"
        );
        setContent("");
        setPage("");
        setChapter("");
        setNote("");
        setOpen(false);
      }
    } catch {
      toast.error("Failed to save quote");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existingQuote ? "Edit Quote" : "Add Quote"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Main textarea */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter quote content (Markdown supported)…"
              className="min-h-36 resize-none font-mono text-sm"
              autoFocus
            />
            {!existingQuote && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tip: separate multiple quotes with{" "}
                <code className="rounded bg-muted px-1 py-0.5">---</code> on its own
                line to bulk import.
              </p>
            )}
          </div>

          {/* Optional fields toggle */}
          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${showExtra ? "rotate-180" : ""}`}
            />
            {showExtra ? "Hide" : "Show"} optional fields
          </button>

          {showExtra && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Page
                </label>
                <Input
                  type="number"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="e.g. 42"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Chapter
                </label>
                <Input
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  placeholder="Chapter title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Note
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Personal note"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              )}
              {existingQuote ? "Save Changes" : "Save Quote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

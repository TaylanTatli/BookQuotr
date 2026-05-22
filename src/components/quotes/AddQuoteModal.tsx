"use client";

import { useState, useEffect } from "react";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { useTranslation } from "@/i18n/client";
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(existingQuote?.content ?? "");
  const [page, setPage] = useState(existingQuote?.page?.toString() ?? "");
  const [chapter, setChapter] = useState(existingQuote?.chapter ?? "");
  const [note, setNote] = useState(existingQuote?.note ?? "");
  const [showExtra, setShowExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens with existingQuote (edit bug fix is in AddBookModal,
  // but mirror the pattern here for consistency)
  useEffect(() => {
    if (open) {
      setContent(existingQuote?.content ?? "");
      setPage(existingQuote?.page?.toString() ?? "");
      setChapter(existingQuote?.chapter ?? "");
      setNote(existingQuote?.note ?? "");
    }
  }, [open, existingQuote]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast.error(t("addQuote.required"));
      return;
    }
    setSaving(true);
    try {
      if (existingQuote) {
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
        toast.success(t("quotes.updateSuccess"));
        setOpen(false);
      } else {
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
            ? t("quotes.saveMultipleSuccess", { count: data.count })
            : t("quotes.saveSuccess")
        );
        setContent("");
        setPage("");
        setChapter("");
        setNote("");
        setOpen(false);
      }
    } catch {
      toast.error(t("quotes.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="flex max-h-[90vh] w-[min(calc(100vw-2rem),42rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle>{existingQuote ? t("addQuote.editTitle") : t("addQuote.addTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <FieldGroup>
              {/* Main textarea */}
              <Field>
                <FieldContent>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t("addQuote.placeholder")}
                    className="min-h-40 resize-y font-mono text-sm"
                    autoFocus
                  />
                </FieldContent>
                {!existingQuote && (
                  <FieldDescription>
                    <span dangerouslySetInnerHTML={{ __html: t("addQuote.tip").replace('<0>', '<code class="rounded bg-muted px-1 py-0.5">').replace('</0>', '</code>') }} />
                  </FieldDescription>
                )}
              </Field>

              {/* Optional fields toggle */}
              <button
                type="button"
                onClick={() => setShowExtra((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={`size-3.5 transition-transform ${showExtra ? "rotate-180" : ""}`}
                />
                {showExtra ? t("addQuote.hideOptional") : t("addQuote.showOptional")}
              </button>

              {showExtra && (
                <FieldGroup className="grid grid-cols-3 gap-3">
                  <Field>
                    <FieldLabel>{t("addQuote.page")}</FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        value={page}
                        onChange={(e) => setPage(e.target.value)}
                        placeholder={t("addQuote.pagePlaceholder")}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>{t("addQuote.chapter")}</FieldLabel>
                    <FieldContent>
                      <Input
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder={t("addQuote.chapterPlaceholder")}
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>{t("addQuote.note")}</FieldLabel>
                    <FieldContent>
                      <Input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("addQuote.notePlaceholder")}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              )}
            </FieldGroup>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t px-6 py-4">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                )}
                {existingQuote ? t("addQuote.saveChanges") : t("addQuote.saveQuote")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

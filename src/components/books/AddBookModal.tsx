"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Search,
  Loader2,
  Link2,
  Upload,
  Trash2,
  BookOpen,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { ButtonGroup } from "@/components/ui/button-group"
import { useTranslation } from "@/i18n/client"
import type { SearchResult, BookWithQuotes } from "@/types"

interface AddBookModalProps {
  children: React.ReactElement
  onBookAdded: () => void
  existingBook?: BookWithQuotes
}

type FieldDef = {
  key: string
  label: string
  required?: boolean
  type?: string
  colSpan?: boolean
}

const FIELDS: FieldDef[] = [
  { key: "title", label: "addBook.title", required: true },
  { key: "subtitle", label: "addBook.subtitle" },
  { key: "author", label: "addBook.author", required: true },
  { key: "publisher", label: "addBook.publisher" },
  { key: "publishedDate", label: "addBook.publishedDate" },
  { key: "isbn", label: "addBook.isbn" },
  { key: "pageCount", label: "addBook.pageCount", type: "number" },
  { key: "language", label: "addBook.language" },
  { key: "startedAt", label: "addBook.startedAt", type: "date" },
  { key: "finishedAt", label: "addBook.finishedAt", type: "date" },
]

type BookFormData = Record<string, string>

function buildInitialFormData(book?: BookWithQuotes): BookFormData {
  if (!book) return {}
  return {
    title: book.title,
    subtitle: book.subtitle ?? "",
    author: book.author,
    publisher: book.publisher ?? "",
    publishedDate: book.publishedDate ?? "",
    isbn: book.isbn ?? "",
    pageCount: book.pageCount?.toString() ?? "",
    language: book.language ?? "",
    thumbnail: book.thumbnail ?? "",
    startedAt: book.startedAt
      ? new Date(book.startedAt).toISOString().split("T")[0]
      : "",
    finishedAt: book.finishedAt
      ? new Date(book.finishedAt).toISOString().split("T")[0]
      : "",
    readingStatus: book.readingStatus ?? "",
  }
}

export function AddBookModal({
  children,
  onBookAdded,
  existingBook,
}: AddBookModalProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<BookFormData>(() =>
    buildInitialFormData(existingBook)
  )
  const [uploadMode, setUploadMode] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fix: Reset formData with latest existingBook data whenever modal opens
  // This prevents stale data from a previously opened book
  useEffect(() => {
    if (open) {
      setFormData(buildInitialFormData(existingBook))
      if (!existingBook) {
        setQuery("")
        setResults([])
      }
    }
  }, [open, existingBook])

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!query.trim()) return
      setSearching(true)
      setResults([])
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } finally {
        setSearching(false)
      }
    },
    [query]
  )

  function handleSelectResult(result: SearchResult) {
    setFormData({
      title: result.title,
      subtitle: result.subtitle ?? "",
      author: result.authors.join(", "),
      publisher: result.publisher ?? "",
      publishedDate: result.publishedDate ?? "",
      // Ensure isbn is correctly mapped from search result
      isbn: result.isbn ?? "",
      pageCount: result.pageCount?.toString() ?? "",
      language: result.language ?? "",
      thumbnail: result.thumbnail ?? "",
      startedAt: "",
      finishedAt: "",
      readingStatus: "",
      ...(result.source === "google"
        ? { googleBooksId: result.externalId }
        : { openLibraryId: result.externalId }),
    })
    setResults([])
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Existing book update needs to happen when saving,
    // but we can pre-upload the file to get the path
    const uploadFormData = new FormData()
    uploadFormData.append("file", file)
    // Use existing book ID or a temporary one (server handles it)
    const tempId = existingBook?.id || crypto.randomUUID()
    uploadFormData.append("bookId", tempId)

    setUploadingCover(true)
    try {
      const res = await fetch("/api/covers/upload", {
        method: "POST",
        body: uploadFormData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      setFormData((prev) => ({ ...prev, thumbnail: data.path }))
      toast.success(t("addBook.coverUploaded"))
    } catch {
      toast.error(t("addBook.coverUploadError"))
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title || !formData.author) {
      toast.error(t("addBook.required"))
      return
    }
    setSaving(true)
    try {
      const url = existingBook ? `/api/books/${existingBook.id}` : "/api/books"
      const method = existingBook ? "PATCH" : "POST"
      const payload = {
        ...formData,
        pageCount: formData.pageCount
          ? parseInt(formData.pageCount)
          : undefined,
        startedAt: formData.startedAt
          ? new Date(formData.startedAt).toISOString()
          : null,
        finishedAt: formData.finishedAt
          ? new Date(formData.finishedAt).toISOString()
          : null,
        readingStatus: formData.readingStatus || null,
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      toast.success(
        existingBook ? t("books.updateSuccess") : t("books.addSuccess")
      )
      onBookAdded()
      setOpen(false)
    } catch {
      toast.error(t("books.saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="flex max-h-[90vh] w-[min(calc(100vw-2rem),42rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-0">
          <DialogTitle>
            {existingBook ? t("addBook.editTitle") : t("addBook.addTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Search */}
            {!existingBook && (
              <>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    placeholder={t("addBook.searchPlaceholder")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline" disabled={searching}>
                    {searching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                  </Button>
                </form>

                {/* Search results */}
                {searching && (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3 rounded-md border p-3">
                        <Skeleton className="size-12 rounded" />
                        <div className="flex flex-col gap-1.5 pt-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {results.length > 0 && (
                  <ScrollArea className="max-h-48">
                    <div className="flex max-h-48 flex-col gap-1">
                      {results.map((r) => (
                        <button
                          key={`${r.source}-${r.externalId}`}
                          type="button"
                          onClick={() => handleSelectResult(r)}
                          className="flex w-full min-w-0 items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-secondary"
                        >
                          <div className="h-14 w-auto shrink-0 overflow-hidden rounded">
                            {r.thumbnail ? (
                              <Image
                                src={r.thumbnail}
                                alt={r.title}
                                width={50}
                                height={100}
                                className="size-full w-auto object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center bg-muted text-xs">
                                {r.title.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {r.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {r.authors.join(", ")} · {r.publishedDate ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground/60 capitalize">
                              {r.source === "google"
                                ? t("addBook.sourceGoogle")
                                : t("addBook.sourceOpenLibrary")}
                              {r.isbn && ` · ISBN: ${r.isbn}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {results.length > 0 && <Separator />}
              </>
            )}

            {/* Manual form */}
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              <FieldGroup className="grid grid-cols-2 gap-3">
                <Field className="col-span-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel>{t("addBook.coverUrl")}</FieldLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setUploadMode(!uploadMode)}
                    >
                      {uploadMode ? (
                        <>
                          <Link2 className="mr-1 size-3" />
                          {t("addBook.useUrl")}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1 size-3" />
                          {t("addBook.uploadFile")}
                        </>
                      )}
                    </Button>
                  </div>
                  <FieldContent className="flex gap-2">
                    {uploadMode ? (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          disabled={uploadingCover}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingCover ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 size-4" />
                          )}
                          {formData.thumbnail &&
                          formData.thumbnail.startsWith("/api/covers")
                            ? t("addBook.changeCover")
                            : t("addBook.selectFile")}
                        </Button>
                        {formData.thumbnail && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                thumbnail: "",
                              }))
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Input
                        value={formData.thumbnail ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            thumbnail: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                      />
                    )}
                  </FieldContent>
                </Field>

                <Field className="col-span-2">
                  <FieldLabel>
                    {t("addBook.readingStatus") || "Status"}
                  </FieldLabel>
                  <FieldContent>
                    <ButtonGroup className="w-full">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          formData.readingStatus === "reading"
                            ? "default"
                            : "outline"
                        }
                        className="flex-1"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            readingStatus:
                              prev.readingStatus === "reading" ? "" : "reading",
                          }))
                        }
                      >
                        <BookOpen className="mr-2 size-4" />
                        {t("books.readingStatus.reading")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          formData.readingStatus === "finished"
                            ? "default"
                            : "outline"
                        }
                        className="flex-1"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            readingStatus:
                              prev.readingStatus === "finished"
                                ? ""
                                : "finished",
                            // Set finishedAt to today if switching to finished and no date is set
                            ...(prev.readingStatus !== "finished" &&
                            !prev.finishedAt
                              ? {
                                  finishedAt: new Date()
                                    .toISOString()
                                    .split("T")[0],
                                }
                              : {}),
                          }))
                        }}
                      >
                        <CheckCircle2 className="mr-2 size-4" />
                        {t("books.readingStatus.finished")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          formData.readingStatus === "abandoned"
                            ? "default"
                            : "outline"
                        }
                        className="flex-1"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            readingStatus:
                              prev.readingStatus === "abandoned"
                                ? ""
                                : "abandoned",
                          }))
                        }
                      >
                        <XCircle className="mr-2 size-4" />
                        {t("books.readingStatus.abandoned")}
                      </Button>
                    </ButtonGroup>
                  </FieldContent>
                </Field>

                {FIELDS.map(
                  ({ key, label, required, type, colSpan }: FieldDef) => {
                    if (key === "thumbnail") return null // Handled specially above
                    return (
                      <Field key={key} className={colSpan ? "col-span-2" : ""}>
                        <FieldLabel>
                          {t(label)}{" "}
                          {required && (
                            <span className="text-destructive">*</span>
                          )}
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            type={type ?? "text"}
                            value={formData[key] ?? ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder={type === "date" ? undefined : t(label)}
                          />
                        </FieldContent>
                      </Field>
                    )
                  }
                )}
              </FieldGroup>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  )}
                  {existingBook
                    ? t("addBook.saveChanges")
                    : t("addBook.addTitle")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Copy, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n/client"
import {
  buildMarkdown,
  DEFAULT_MARKDOWN_CONFIG,
  type MarkdownBook,
  type MarkdownExportConfig,
  type MarkdownExportMode,
} from "@/lib/markdownExport"

const MODE_KEY = "bq_markdown_export_mode"
const PREFIX_KEY = "bq_markdown_export_prefix"
const SUFFIX_KEY = "bq_markdown_export_suffix"
const SEPARATOR_KEY = "bq_markdown_export_separator"
const BLANK_LINE_KEY = "bq_markdown_export_blank_line"
const QUOTES_ONLY_KEY = "bq_markdown_export_quotes_only"

function readToggle(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "false"
  } catch {
    return true
  }
}

function loadConfig(): MarkdownExportConfig {
  try {
    return {
      mode: localStorage.getItem(MODE_KEY) === "wrapper" ? "wrapper" : "standard",
      prefix: localStorage.getItem(PREFIX_KEY) ?? "",
      suffix: localStorage.getItem(SUFFIX_KEY) ?? "",
      separator: readToggle(SEPARATOR_KEY),
      blankLine: readToggle(BLANK_LINE_KEY),
      quotesOnly: localStorage.getItem(QUOTES_ONLY_KEY) === "true",
    }
  } catch {
    return { ...DEFAULT_MARKDOWN_CONFIG }
  }
}

interface MarkdownExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Quotes to export; loaded once when the dialog opens. */
  loadBooks: () => Promise<MarkdownBook[]>
  getFilename: () => string
  /** Only single-book exports may drop titles and metadata. */
  allowQuotesOnly?: boolean
}

export function MarkdownExportModal({
  open,
  onOpenChange,
  loadBooks,
  getFilename,
  allowQuotesOnly = false,
}: MarkdownExportModalProps) {
  const { t } = useTranslation()
  const [config, setConfig] = useState<MarkdownExportConfig>(loadConfig)
  const [books, setBooks] = useState<MarkdownBook[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, config.mode)
      localStorage.setItem(PREFIX_KEY, config.prefix)
      localStorage.setItem(SUFFIX_KEY, config.suffix)
      localStorage.setItem(SEPARATOR_KEY, String(config.separator !== false))
      localStorage.setItem(BLANK_LINE_KEY, String(config.blankLine !== false))
      localStorage.setItem(QUOTES_ONLY_KEY, String(config.quotesOnly === true))
    } catch {}
  }, [config])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // The dialog is controlled by its caller, so opening it never fires
    // onOpenChange: load the quotes here and refresh shared settings.
    async function load() {
      setConfig(loadConfig())
      setLoading(true)
      try {
        const list = await loadBooks()
        if (!cancelled) setBooks(list)
      } catch {
        if (cancelled) return
        setBooks([])
        toast.error(t("markdownExport.loadError"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // Callers pass fresh loadBooks/t closures each render; reload only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Full-library exports never expose the option; ignore a saved preference there.
  const exportConfig: MarkdownExportConfig = allowQuotesOnly
    ? config
    : { ...config, quotesOnly: false }

  /** Single source for both actions so copy and download stay identical. */
  function generateMarkdown(): string {
    return buildMarkdown(books, exportConfig)
  }

  async function handleDownload() {
    setExporting(true)
    try {
      const markdown = generateMarkdown()
      if (!markdown) {
        toast.error(t("markdownExport.empty"))
        return
      }
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = getFilename()
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t("markdownExport.success"))
      onOpenChange(false)
    } catch {
      toast.error(t("markdownExport.error"))
    } finally {
      setExporting(false)
    }
  }

  async function handleCopy() {
    setCopying(true)
    try {
      const markdown = generateMarkdown()
      if (!markdown) {
        toast.error(t("markdownExport.empty"))
        return
      }
      await navigator.clipboard.writeText(markdown)
      toast.success(t("markdownExport.copySuccess"))
    } catch {
      toast.error(t("markdownExport.copyError"))
    } finally {
      setCopying(false)
    }
  }

  // Preview the first book's shape: two quotes make the separation toggles visible
  // and the heading shows whether titles/metadata are included.
  const previewQuotes = (books[0]?.quotes ?? [])
    .filter((quote) => quote.content.trim())
    .slice(0, 2)
    .map((quote) => ({ content: quote.content }))
  while (previewQuotes.length < 2) {
    previewQuotes.push({ content: t("markdownExport.previewSample") })
  }
  const preview = buildMarkdown(
    [
      {
        title: books[0]?.title ?? t("markdownExport.previewTitleSample"),
        author: books[0]?.author,
        quotes: previewQuotes,
      },
    ],
    exportConfig
  ).trimEnd()

  const modes: { value: MarkdownExportMode; labelKey: string }[] = [
    { value: "standard", labelKey: "markdownExport.modeStandard" },
    { value: "wrapper", labelKey: "markdownExport.modeWrapper" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("markdownExport.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("markdownExport.mode")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((mode) => (
                <Button
                  key={mode.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig((c) => ({ ...c, mode: mode.value }))}
                  className={cn(
                    "text-xs",
                    config.mode === mode.value &&
                      "border-primary bg-accent ring-1 ring-primary"
                  )}
                >
                  {t(mode.labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {config.mode === "wrapper" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="md-export-prefix"
                  className="text-xs text-muted-foreground"
                >
                  {t("markdownExport.prefix")}
                </Label>
                <Input
                  id="md-export-prefix"
                  value={config.prefix}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, prefix: e.target.value }))
                  }
                  placeholder="<Bookquote>"
                  className="h-8 font-mono text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="md-export-suffix"
                  className="text-xs text-muted-foreground"
                >
                  {t("markdownExport.suffix")}
                </Label>
                <Input
                  id="md-export-suffix"
                  value={config.suffix}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, suffix: e.target.value }))
                  }
                  placeholder="</Bookquote>"
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {allowQuotesOnly && (
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="md-export-quotes-only"
                  className="text-xs font-normal text-muted-foreground"
                >
                  {t("markdownExport.quotesOnly")}
                </Label>
                <Switch
                  id="md-export-quotes-only"
                  size="sm"
                  checked={config.quotesOnly === true}
                  onCheckedChange={(v) =>
                    setConfig((c) => ({ ...c, quotesOnly: v }))
                  }
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="md-export-separator"
                className="text-xs font-normal text-muted-foreground"
              >
                {t("markdownExport.separator")}
              </Label>
              <Switch
                id="md-export-separator"
                size="sm"
                checked={config.separator !== false}
                onCheckedChange={(v) =>
                  setConfig((c) => ({ ...c, separator: v }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="md-export-blank-line"
                className="text-xs font-normal text-muted-foreground"
              >
                {t("markdownExport.blankLine")}
              </Label>
              <Switch
                id="md-export-blank-line"
                size="sm"
                checked={config.blankLine !== false}
                onCheckedChange={(v) =>
                  setConfig((c) => ({ ...c, blankLine: v }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("markdownExport.preview")}
            </Label>
            <pre className="max-h-40 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs break-words whitespace-pre-wrap">
              {loading ? "…" : preview}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={copying || loading}
          >
            {copying ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Copy className="size-4" data-icon="inline-start" />
            )}
            {t("markdownExport.copy")}
          </Button>
          <Button onClick={handleDownload} disabled={exporting || loading}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Download className="size-4" data-icon="inline-start" />
            )}
            {t("markdownExport.download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

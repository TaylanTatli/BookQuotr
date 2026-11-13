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
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n/client"
import {
  buildMarkdown,
  formatQuote,
  type MarkdownBook,
  type MarkdownExportConfig,
  type MarkdownExportMode,
} from "@/lib/markdownExport"

const MODE_KEY = "bq_markdown_export_mode"
const PREFIX_KEY = "bq_markdown_export_prefix"
const SUFFIX_KEY = "bq_markdown_export_suffix"

function loadConfig(): MarkdownExportConfig {
  try {
    return {
      mode: localStorage.getItem(MODE_KEY) === "wrapper" ? "wrapper" : "standard",
      prefix: localStorage.getItem(PREFIX_KEY) ?? "",
      suffix: localStorage.getItem(SUFFIX_KEY) ?? "",
    }
  } catch {
    return { mode: "standard", prefix: "", suffix: "" }
  }
}

interface MarkdownExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Quotes to export; loaded once when the dialog opens. */
  loadBooks: () => Promise<MarkdownBook[]>
  getFilename: () => string
}

export function MarkdownExportModal({
  open,
  onOpenChange,
  loadBooks,
  getFilename,
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

  /** Single source for both actions so copy and download stay identical. */
  function generateMarkdown(): string {
    return buildMarkdown(books, config)
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

  const firstQuote = books.flatMap((b) => b.quotes).find((q) => q.content.trim())
  const preview = formatQuote(
    firstQuote?.content ?? t("markdownExport.previewSample"),
    config
  )

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

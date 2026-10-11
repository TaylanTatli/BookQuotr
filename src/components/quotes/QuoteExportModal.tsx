"use client"

import { useState, useRef, useCallback } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { toPng } from "html-to-image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  QuoteImageTemplate,
  type ExportColors,
} from "@/components/quotes/QuoteImageTemplate"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n/client"
import { useTheme } from "next-themes"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Quote, BookWithQuotes } from "@/types"

// ─── Presets ────────────────────────────────────────────────────
const PRESETS = [
  {
    id: "dark",
    label: "Koyu",
    bg: "#1c1a17",
    fg: "#ede8e0",
    accent: "#c49a5a",
    muted: "#8a8070",
    border: "#2e2a24",
    watermark: "#4a4540",
  },
  {
    id: "light",
    label: "Açık",
    bg: "#faf8f5",
    fg: "#2a2520",
    accent: "#8b5e2a",
    muted: "#7a7060",
    border: "#e8e0d4",
    watermark: "#c8bfb0",
  },
  {
    id: "cream",
    label: "Krem",
    bg: "#f2ebdc",
    fg: "#3a3025",
    accent: "#9c6f3a",
    muted: "#8a7060",
    border: "#ddd0bb",
    watermark: "#c0b090",
  },
  {
    id: "forest",
    label: "Orman",
    bg: "#0d2117",
    fg: "#e8f0e4",
    accent: "#4caf82",
    muted: "#6a8a70",
    border: "#1a3525",
    watermark: "#2a5035",
  },
  {
    id: "ocean",
    label: "Okyanus",
    bg: "#0a1628",
    fg: "#e0eaf8",
    accent: "#5b8fd4",
    muted: "#607080",
    border: "#162038",
    watermark: "#20304a",
  },
] as const

type PresetId = (typeof PRESETS)[number]["id"] | "custom"

// ─── Font presets ────────────────────────────────────────
const FONT_PRESETS = [
  {
    id: "sans",
    label: "Sans",
    value:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  {
    id: "serif",
    label: "Serif",
    value: "Georgia, 'Times New Roman', Cambria, serif",
  },
  {
    id: "system",
    label: "System",
    value: "system-ui, -apple-system, sans-serif",
  },
  { id: "custom", label: "Custom", value: "" },
] as const

type FontPresetId = (typeof FONT_PRESETS)[number]["id"]

// ─── Aspect ratios ───────────────────────────────────────────────
const RATIOS = [
  { id: "1:1", label: "1:1", width: 1080, height: 1080 },
  { id: "4:5", label: "4:5", width: 1080, height: 1350 },
  { id: "16:9", label: "16:9", width: 1920, height: 1080 },
  { id: "9:16", label: "9:16", width: 1080, height: 1920 },
  { id: "custom", label: "Özel", width: 1080, height: 1080 },
] as const

type RatioId = (typeof RATIOS)[number]["id"]

// ─── Props ───────────────────────────────────────────────────────
interface QuoteExportModalProps {
  children: React.ReactElement
  quote: Quote
  book?: BookWithQuotes | null
}

// ─── Component ──────────────────────────────────────────────────
export function QuoteExportModal({
  children,
  quote,
  book,
}: QuoteExportModalProps) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const isMobile = useIsMobile()
  const exportRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("dark")
  const [colors, setColors] = useState<ExportColors>({ ...PRESETS[0] })
  const [ratioId, setRatioId] = useState<RatioId>("1:1")
  const [customWidth, setCustomWidth] = useState("1080")
  const [customHeight, setCustomHeight] = useState("1080")
  const [showWatermark, setShowWatermark] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [fontPresetId, setFontPresetId] = useState<FontPresetId>("sans")
  const [customFont, setCustomFont] = useState("")
  const [fontSizeScale, setFontSizeScale] = useState(1)

  // Resolved font family string
  const fontFamily =
    fontPresetId === "custom"
      ? customFont.trim() || "sans-serif"
      : FONT_PRESETS.find((f) => f.id === fontPresetId)!.value

  // Export dimensions
  const baseRatio = RATIOS.find((r) => r.id === ratioId)!
  const exportWidth =
    ratioId === "custom"
      ? Math.max(400, parseInt(customWidth) || 1080)
      : baseRatio.width
  const exportHeight =
    ratioId === "custom"
      ? Math.max(400, parseInt(customHeight) || 1080)
      : baseRatio.height

  // Responsive preview: fit the image into the actual available preview area
  // (measured from the layout with ResizeObserver) instead of fixed assumptions.
  // A callback ref attaches the observer exactly when the (portalled) node mounts.
  const [previewArea, setPreviewArea] = useState({ width: 0, height: 0 })
  const previewObserverRef = useRef<ResizeObserver | null>(null)
  const previewAreaRef = useCallback((node: HTMLDivElement | null) => {
    previewObserverRef.current?.disconnect()
    previewObserverRef.current = null
    if (!node) return
    const update = () => {
      const rect = node.getBoundingClientRect()
      setPreviewArea({ width: rect.width, height: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    previewObserverRef.current = observer
  }, [])

  const previewScale =
    previewArea.width > 0 && previewArea.height > 0
      ? Math.min(
          previewArea.width / exportWidth,
          previewArea.height / exportHeight
        )
      : 0
  const previewW = Math.round(exportWidth * previewScale)
  const previewH = Math.round(exportHeight * previewScale)

  // Handlers
  function selectPreset(preset: (typeof PRESETS)[number]) {
    setSelectedPreset(preset.id)
    setColors({
      bg: preset.bg,
      fg: preset.fg,
      accent: preset.accent,
      muted: preset.muted,
      border: preset.border,
      watermark: preset.watermark,
    })
  }

  function handleColorChange(key: keyof ExportColors, value: string) {
    setSelectedPreset("custom")
    setColors((prev) => ({ ...prev, [key]: value }))
  }

  const handleDownload = useCallback(async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const png = await toPng(exportRef.current, {
        pixelRatio: 2,
        quality: 1.0,
      })
      const link = document.createElement("a")
      link.download = `quote-${quote.id.slice(0, 8)}.png`
      link.href = png
      link.click()
      toast.success(t("quotes.shareSuccess"))
      setOpen(false)
    } catch {
      toast.error(t("quotes.shareError"))
    } finally {
      setExporting(false)
    }
  }, [quote.id, t])

  function handleOpenChange(val: boolean) {
    if (val) {
      const preset = resolvedTheme === "dark" ? PRESETS[0] : PRESETS[1]
      setSelectedPreset(preset.id)
      setColors({ ...preset })
    }
    setOpen(val)
  }

  // ─── Shared settings sections ──────────────────────────────────
  const settingsContent = (
    <>
      {/* Theme presets */}
      <section className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("quotes.exportTheme")}
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => selectPreset(preset)}
              className={[
                "flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[11px] transition-all",
                selectedPreset === preset.id
                  ? "border-primary bg-accent ring-1 ring-primary"
                  : "border-border hover:bg-accent/50",
              ].join(" ")}
            >
              <div
                className="size-7 rounded border border-border/50 shadow-sm"
                style={{ backgroundColor: preset.bg }}
              />
              <span className="text-foreground/80">{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Color pickers */}
      <section className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("quotes.exportColors")}
        </p>
        <div className="flex flex-col gap-2">
          {(
            [
              { key: "bg" as const, label: t("quotes.exportBg") },
              { key: "fg" as const, label: t("quotes.exportFg") },
              { key: "accent" as const, label: t("quotes.exportAccent") },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {colors[key]}
                </span>
                <label className="relative size-6 cursor-pointer overflow-hidden rounded border border-border shadow-sm">
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: colors[key] }}
                  />
                  <input
                    type="color"
                    value={colors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Aspect ratio */}
      <section className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("quotes.exportSize")}
        </p>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-3">
          {RATIOS.map((ratio) => (
            <Button
              key={ratio.id}
              variant="outline"
              size="sm"
              onClick={() => setRatioId(ratio.id)}
              className={cn(
                "text-xs",
                ratioId === ratio.id &&
                  "border-primary bg-accent ring-1 ring-primary"
              )}
            >
              {ratio.label}
            </Button>
          ))}
        </div>
        {ratioId === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              placeholder="Genişlik"
              min={400}
              className="h-7 text-xs"
            />
            <span className="shrink-0 text-xs text-muted-foreground">×</span>
            <Input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              placeholder="Yükseklik"
              min={400}
              className="h-7 text-xs"
            />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {exportWidth} × {exportHeight} px
        </p>
      </section>

      {/* Font */}
      <section className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("quotes.exportFont")}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {FONT_PRESETS.map((fp) => (
            <Button
              key={fp.id}
              variant="outline"
              size="sm"
              onClick={() => setFontPresetId(fp.id)}
              className={cn(
                "text-xs",
                fontPresetId === fp.id &&
                  "border-primary bg-accent ring-1 ring-primary"
              )}
              style={{
                fontFamily: fp.id !== "custom" ? fp.value : undefined,
              }}
            >
              {fp.label}
            </Button>
          ))}
        </div>
        {fontPresetId === "custom" && (
          <Input
            type="text"
            value={customFont}
            onChange={(e) => setCustomFont(e.target.value)}
            placeholder={t("quotes.exportFontCustomPlaceholder")}
            className="h-7 text-xs"
            style={{ fontFamily: customFont || undefined }}
          />
        )}
      </section>

      {/* Font size scale */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("quotes.exportFontSize")}
          </p>
          <span
            className="cursor-pointer font-mono text-[11px] text-muted-foreground"
            onDoubleClick={() => setFontSizeScale(1)}
            title={t("quotes.exportFontSizeHint")}
          >
            {Math.round(fontSizeScale * 100)}%
          </span>
        </div>
        <Slider
          min={60}
          max={150}
          step={1}
          value={[
            isFinite(fontSizeScale) ? Math.round(fontSizeScale * 100) : 100,
          ]}
          onValueChange={(v) => {
            const val = Array.isArray(v) ? v[0] : v
            if (typeof val === "number" && isFinite(val))
              setFontSizeScale(val / 100)
          }}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("quotes.exportFontSizeHint")}
        </p>
      </section>

      {/* Watermark toggle */}
      <section className="flex items-center justify-between">
        <Label
          className="cursor-pointer text-xs font-normal text-muted-foreground"
          htmlFor="watermark-switch"
        >
          {t("quotes.exportWatermark")}
        </Label>
        <Switch
          id="watermark-switch"
          checked={showWatermark}
          onCheckedChange={setShowWatermark}
        />
      </section>
    </>
  )

  // ─── Preview box (shared) ──────────────────────────────────────
  const previewBox = (
    <div
      style={{
        width: previewW,
        height: previewH,
        overflow: "hidden",
        borderRadius: "8px",
        boxShadow:
          "0 4px 6px -1px rgb(0 0 0 / 0.15), 0 10px 32px -4px rgb(0 0 0 / 0.3)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          transform: `scale(${previewScale})`,
          transformOrigin: "top left",
          width: exportWidth,
          height: exportHeight,
        }}
      >
        <QuoteImageTemplate
          content={quote.content}
          bookTitle={book?.title}
          author={book?.author}
          page={quote.page}
          chapter={quote.chapter}
          colors={colors}
          width={exportWidth}
          height={exportHeight}
          showWatermark={showWatermark}
          fontFamily={fontFamily}
          fontSizeScale={fontSizeScale}
        />
      </div>
    </div>
  )

  return (
    <>
      {/* Hidden full-res export template */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <QuoteImageTemplate
          ref={exportRef}
          content={quote.content}
          bookTitle={book?.title}
          author={book?.author}
          page={quote.page}
          chapter={quote.chapter}
          colors={colors}
          width={exportWidth}
          height={exportHeight}
          showWatermark={showWatermark}
          fontFamily={fontFamily}
          fontSizeScale={fontSizeScale}
        />
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={children} />

        <DialogContent
          className="flex flex-col gap-0 overflow-hidden p-0"
          style={{
            width: "min(calc(100vw - 1.5rem), 60rem)",
            maxWidth: "min(calc(100vw - 1.5rem), 60rem)",
            maxHeight: "92dvh",
          }}
        >
          <DialogHeader className="shrink-0 px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
            <DialogTitle>{t("quotes.exportTitle")}</DialogTitle>
          </DialogHeader>

          {/* ── Mobile layout: preview top, settings below ── */}
          {isMobile ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-b">
              {/* Preview strip (fixed height so it can be measured and fitted) */}
              <div className="flex h-[38dvh] shrink-0 items-center justify-center border-b bg-muted/20 p-4">
                <div
                  ref={previewAreaRef}
                  className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden"
                >
                  {previewBox}
                </div>
              </div>
              {/* Settings scroll */}
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
                {settingsContent}
              </div>
            </div>
          ) : (
            /* ── Desktop layout: settings left, preview right ── */
            <div className="flex min-h-0 flex-1 overflow-hidden border-t border-b">
              {/* Settings panel — capped so it shrinks on narrow dialogs / large fonts */}
              <div className="flex w-72 max-w-[45%] shrink-0 flex-col gap-5 overflow-y-auto border-r p-6">
                {settingsContent}
              </div>
              {/* Preview panel */}
              <div className="flex min-w-0 flex-1 items-center justify-center bg-muted/20 p-6">
                <div
                  ref={previewAreaRef}
                  className="flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden"
                >
                  {previewBox}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="m-0 shrink-0 px-5 py-4 sm:px-6">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleDownload} disabled={exporting}>
              {exporting ? (
                <Loader2
                  className="size-4 animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Download className="size-4" data-icon="inline-start" />
              )}
              {t("quotes.exportDownload")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

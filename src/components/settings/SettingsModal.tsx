"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Upload, Loader2, Trash2 } from "lucide-react";
import type { QuoteViewMode } from "@/components/quotes/QuoteViewOptions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/client";
import { useTheme } from "next-themes";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "tr", label: "Türkçe" },
];

const THEME_OPTIONS = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

interface SettingsModalProps {
  children: React.ReactElement;
  onImportSuccess: () => void;
}

const FONT_SIZE_KEY = "bq_font_size";
const FONT_MODE_KEY = "bq_font_mode";

type FontMode = "fixed" | "responsive";

function computeFontSize(size: number, mode: FontMode): string {
  if (mode === "fixed") return `${size}px`;
  const min = Math.max(12, size - 2);
  const max = Math.min(26, size + 4);
  const spread = max - min;
  return `clamp(${min}px, calc(${min - 4}px + ${((spread / 16) * 100).toFixed(2)}vw), ${max}px)`;
}



const VIEW_MODE_KEY = "bq_quote_view_mode";

const VIEW_MODE_OPTIONS: { value: QuoteViewMode; labelKey: string }[] = [
  { value: "default", labelKey: "quotes.viewDefault" },
  { value: "two-column", labelKey: "quotes.viewTwoColumn" },
  { value: "centered", labelKey: "quotes.viewCentered" },
  { value: "masonry", labelKey: "quotes.viewMasonry" },
];

export function SettingsModal({ children, onImportSuccess }: SettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [defaultViewMode, setDefaultViewMode] = useState<QuoteViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY) as QuoteViewMode | null;
      return saved || "default";
    } catch {
      return "default";
    }
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY);
      const n = saved ? parseFloat(saved) : 16;
      return isNaN(n) ? 16 : n;
    } catch {
      return 16;
    }
  });
  const [fontMode, setFontMode] = useState<FontMode>(() => {
    try {
      return (localStorage.getItem(FONT_MODE_KEY) as FontMode) || "fixed";
    } catch {
      return "fixed";
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [displaySize, setDisplaySize] = useState<string>(`${fontSize}px`);

  // Apply font size to root and persist
  useEffect(() => {
    const value = computeFontSize(fontSize, fontMode);
    document.documentElement.style.fontSize = value;
    // Read back the computed value so the UI shows real px, not the formula
    const computed = parseFloat(
      window.getComputedStyle(document.documentElement).fontSize
    );
    setDisplaySize(
      fontMode === "fixed"
        ? `${fontSize}px`
        : `~${isNaN(computed) ? fontSize : computed.toFixed(1)}px`
    );
    try {
      localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
      localStorage.setItem(FONT_MODE_KEY, fontMode);
    } catch {}
  }, [fontSize, fontMode]);

  // Sync state when Modal is opened
  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem(VIEW_MODE_KEY) as QuoteViewMode | null;
        if (saved) setDefaultViewMode(saved);
      } catch {}
    }
  }, [open]);

  // Sync with storage changes in the same tab
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(VIEW_MODE_KEY) as QuoteViewMode | null;
        if (saved) setDefaultViewMode(saved);
      } catch {}
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("local-storage-update", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage-update", handleStorageChange);
    };
  }, []);

  function handleDefaultViewChange(newMode: string | null) {
    if (!newMode) return;
    const mode = newMode as QuoteViewMode;
    setDefaultViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
    // Dispatch events to notify other components instantly
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("local-storage-update"));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `bookquotr-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onImportSuccess();
      toast.success(
        `Imported ${data.importedBooks} books and ${data.importedQuotes} quotes`
      );
    } catch {
      toast.error("Import failed — make sure the file is a valid BookQuotr backup");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDeleteAll() {
    try {
      const res = await fetch("/api/books");
      const { books } = await res.json();
      await Promise.all(
        books.map((b: { id: string }) =>
          fetch(`/api/books/${b.id}`, { method: "DELETE" })
        )
      );
      onImportSuccess();
      setDeleteConfirm("");
      setOpen(false);
      toast.success("All data deleted");
    } catch {
      toast.error("Failed to delete data");
    }
  }

  function handleLanguageChange(newLocale: string | null) {
    if (!newLocale) return;
    document.cookie = `bq_locale=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <FieldGroup className="mt-4">
          {/* Language Selection */}
          <Field orientation="horizontal">
            <FieldLabel>{t("settings.language")}</FieldLabel>
            <FieldContent>
              <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[180px]">
                  {LANGUAGES.find((l) => l.value === locale)?.label ?? "Select language"}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Separator />

          {/* Theme Selection */}
          <Field orientation="horizontal">
            <FieldLabel>{t("settings.theme")}</FieldLabel>
            <FieldContent>
              <Select value={mounted ? theme : "system"} onValueChange={(val) => setTheme(val || "system")}>
                <SelectTrigger className="w-[180px]">
                  {mounted && theme ? t(THEME_OPTIONS.find((t) => t.value === theme)?.labelKey || "settings.themeSystem") : t("settings.themeSystem")}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {THEME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Separator />

          {/* Font size */}
          <Field>
            <div className="flex flex-col gap-1">
              <FieldLabel>{t("settings.fontSize")}</FieldLabel>
              <FieldDescription className="font-mono">
                {displaySize}
              </FieldDescription>
            </div>
            <FieldContent className="flex min-w-48 flex-col gap-3">
              {/* Mode toggle */}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="font-mode-switch"
                  className={cn(
                    "text-xs transition-colors",
                    fontMode === "fixed" ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t("settings.fontModeFixed")}
                </Label>
                <Switch
                  id="font-mode-switch"
                  size="sm"
                  checked={fontMode === "responsive"}
                  onCheckedChange={(v) => setFontMode(v ? "responsive" : "fixed")}
                />
                <Label
                  htmlFor="font-mode-switch"
                  className={cn(
                    "text-xs transition-colors",
                    fontMode === "responsive" ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t("settings.fontModeResponsive")}
                </Label>
              </div>
              {/* Size slider */}
              <Slider
                min={12}
                max={24}
                step={1}
                value={[fontSize]}
                onValueChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v;
                  if (typeof val === "number" && isFinite(val)) setFontSize(val);
                }}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>12px</span>
                <span className="font-mono font-semibold text-foreground">{fontSize}px</span>
                <span>24px</span>
              </div>
            </FieldContent>
          </Field>

          <Separator />

          {/* Default quote view */}
          <Field orientation="horizontal">
            <FieldLabel>{t("settings.defaultQuoteView")}</FieldLabel>
            <FieldContent>
              <Select value={defaultViewMode} onValueChange={handleDefaultViewChange}>
                <SelectTrigger className="w-[180px]">
                  {VIEW_MODE_OPTIONS.find((o) => o.value === defaultViewMode) ? t(VIEW_MODE_OPTIONS.find((o) => o.value === defaultViewMode)!.labelKey) : "Select"}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {VIEW_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Separator />

          {/* Backup */}
          <Field>
            <FieldLabel>{t("settings.backupRestore")}</FieldLabel>
            <FieldContent className="flex flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Download data-icon="inline-start" />
                )}
                {t("settings.exportJson")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                ) : (
                  <Upload data-icon="inline-start" />
                )}
                {t("settings.importJson")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </FieldContent>
          </Field>

          <Separator />

          {/* Danger zone */}
          <Field>
            <div className="flex flex-col gap-1">
              <FieldLabel className="text-destructive">{t("settings.dangerZone")}</FieldLabel>
              <FieldDescription>{t("settings.dangerDescription")}</FieldDescription>
            </div>
            
            <FieldContent>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button variant="destructive" size="sm" className="w-fit" />
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  {t("settings.deleteAll")}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("settings.deleteAllConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      <span dangerouslySetInnerHTML={{ __html: t("settings.deleteAllConfirmDesc").replace('<0>', '<strong>').replace('</0>', '</strong>') }} />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={t("settings.typeToDelete")}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirm("")}>
                      {t("settings.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      disabled={deleteConfirm !== "DELETE"}
                    >
                      {t("settings.deleteAll")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </FieldContent>
          </Field>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}

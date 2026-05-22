"use client";

import { LayoutList, Columns2, AlignCenter, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/client";

export type QuoteViewMode = "default" | "two-column" | "centered" | "masonry";

const VIEW_OPTIONS: { mode: QuoteViewMode; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { mode: "default", icon: LayoutList, labelKey: "quotes.viewDefault" },
  { mode: "two-column", icon: Columns2, labelKey: "quotes.viewTwoColumn" },
  { mode: "centered", icon: AlignCenter, labelKey: "quotes.viewCentered" },
  { mode: "masonry", icon: LayoutGrid, labelKey: "quotes.viewMasonry" },
];

interface QuoteViewOptionsProps {
  value: QuoteViewMode;
  onChange: (mode: QuoteViewMode) => void;
}

export function QuoteViewOptions({ value, onChange }: QuoteViewOptionsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-0.5">
      {VIEW_OPTIONS.map(({ mode, icon: Icon, labelKey }) => (
        <Tooltip key={mode}>
          <TooltipTrigger render={
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-7", value === mode && "bg-accent text-accent-foreground")}
              onClick={() => onChange(mode)}
              aria-label={t(labelKey)}
            />
          }>
            <Icon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t(labelKey)}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

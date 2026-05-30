import React from "react"

interface QuoteImageTemplateProps {
  content: string
  bookTitle?: string
  author?: string
  page?: number | null
  chapter?: string | null
  isDark: boolean
}

const THEME = {
  dark: {
    bg: "#1c1a17",
    fg: "#ede8e0",
    muted: "#8a8070",
    accent: "#c49a5a",
    border: "#2e2a24",
    watermark: "#4a4540",
  },
  light: {
    bg: "#faf8f5",
    fg: "#2a2520",
    muted: "#7a7060",
    accent: "#8b5e2a",
    border: "#e8e0d4",
    watermark: "#c8bfb0",
  },
}

export const QuoteImageTemplate = React.forwardRef<
  HTMLDivElement,
  QuoteImageTemplateProps
>(function QuoteImageTemplate(
  { content, bookTitle, author, page, chapter, isDark },
  ref
) {
  const t = isDark ? THEME.dark : THEME.light

  const attribution = [bookTitle, author].filter(Boolean).join(", ")
  const meta = [chapter, page ? `s. ${page}` : null].filter(Boolean).join(" · ")

  return (
    <div
      ref={ref}
      style={{
        width: "800px",
        backgroundColor: t.bg,
        color: t.fg,
        padding: "72px 80px 56px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          width: "40px",
          height: "3px",
          backgroundColor: t.accent,
          borderRadius: "2px",
          marginBottom: "40px",
          flexShrink: 0,
        }}
      />

      {/* Decorative opening quote mark */}
      <div
        style={{
          fontSize: "96px",
          lineHeight: "0.6",
          color: t.accent,
          opacity: 0.3,
          fontFamily: "Georgia, 'Times New Roman', serif",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        &ldquo;
      </div>

      {/* Quote content */}
      <div
        style={{
          fontSize: "20px",
          lineHeight: "1.85",
          fontWeight: "400",
          whiteSpace: "pre-wrap",
          letterSpacing: "-0.01em",
          color: t.fg,
          marginBottom: "48px",
        }}
      >
        {content}
      </div>

      {/* Attribution */}
      {(attribution || meta) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            paddingTop: "24px",
            borderTop: `1px solid ${t.border}`,
          }}
        >
          {attribution && (
            <span
              style={{
                fontSize: "15px",
                color: t.accent,
                fontWeight: "500",
                letterSpacing: "0.01em",
              }}
            >
              — {attribution}
            </span>
          )}
          {meta && (
            <span
              style={{
                fontSize: "12px",
                color: t.muted,
                letterSpacing: "0.02em",
              }}
            >
              {meta}
            </span>
          )}
        </div>
      )}

      {/* BookQuotr watermark */}
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          right: "32px",
          fontSize: "11px",
          color: t.watermark,
          fontWeight: "600",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        BookQuotr
      </div>
    </div>
  )
})

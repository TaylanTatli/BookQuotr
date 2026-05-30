import React from "react"

export interface ExportColors {
  bg: string
  fg: string
  accent: string
  muted: string
  border: string
  watermark: string
}

interface QuoteImageTemplateProps {
  content: string
  bookTitle?: string
  author?: string
  page?: number | null
  chapter?: string | null
  colors: ExportColors
  width: number
  height: number
  showWatermark?: boolean
}

/**
 * Iterative font-size solver: adjusts font size until the total content
 * block (accent bar + quote mark + text + attribution) fills ~72% of the
 * inner height. This ensures text always "fills" the image regardless of
 * quote length or box dimensions.
 *
 * Char-width approximation: ~0.52 × fontSize for mixed Latin/Turkish text.
 */
function solveFontSize(
  content: string,
  width: number,
  height: number,
  hasAttribution: boolean
): number {
  const chars       = Math.max(content.length, 1)
  const paddingH    = width  * 0.08
  const paddingV    = height * 0.08
  const availW      = width  - 2 * paddingH
  const innerH      = height - 2 * paddingV
  const targetH     = innerH * 0.72   // fill 72 % of inner height

  let fs = 18 // starting guess

  for (let i = 0; i < 8; i++) {
    // Accent bar: 3px bar + gap below
    const accentH    = 3 + fs * 1.6
    // Quote mark: proportional to width, plus gap below
    const quoteMarkH = width * 0.052 + fs * 0.6
    // Text block
    const charsPerLine = Math.max(1, Math.floor(availW / (fs * 0.52)))
    const numLines     = Math.ceil(chars / charsPerLine)
    const textH        = numLines * fs * 1.85
    // Margin between text and attribution
    const gapH = fs * 2
    // Attribution: one line of smaller text + top border padding
    const attrH = hasAttribution ? fs * (0.72 * 1.85 + 1.0) : 0

    const totalH = accentH + quoteMarkH + textH + gapH + attrH

    if (Math.abs(totalH - targetH) < 1) break
    fs = fs * (targetH / totalH)
  }

  // Clamp: 12–34 px
  return Math.max(12, Math.min(34, Math.round(fs)))
}

export const QuoteImageTemplate = React.forwardRef<
  HTMLDivElement,
  QuoteImageTemplateProps
>(function QuoteImageTemplate(
  { content, bookTitle, author, page, chapter, colors, width, height, showWatermark = true },
  ref
) {
  const attribution = [bookTitle, author].filter(Boolean).join(", ")
  const meta        = [chapter, page ? `s. ${page}` : null].filter(Boolean).join(" · ")
  const hasAttr     = Boolean(attribution || meta)
  const fontSize    = solveFontSize(content, width, height, hasAttr)

  const paddingH     = Math.round(width  * 0.08)
  const paddingV     = Math.round(height * 0.08)
  const accentGap    = Math.round(fontSize * 1.6)
  const quoteMarkSz  = Math.round(width   * 0.08)
  const quoteMarkGap = Math.round(fontSize * 0.6)
  const contentGap   = Math.round(fontSize * 2)

  return (
    <div
      ref={ref}
      style={{
        width:  `${width}px`,
        height: `${height}px`,
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
        padding:        `${paddingV}px ${paddingH}px`,
        position:       "relative",
        boxSizing:      "border-box",
        overflow:       "hidden",
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width:           "40px",
          height:          "3px",
          backgroundColor: colors.accent,
          borderRadius:    "2px",
          marginBottom:    `${accentGap}px`,
          flexShrink:      0,
        }}
      />

      {/* Decorative opening quote mark */}
      <div
        style={{
          fontSize:     `${quoteMarkSz}px`,
          lineHeight:   "0.65",
          color:        colors.accent,
          opacity:      0.22,
          fontFamily:   "Georgia, 'Times New Roman', serif",
          marginBottom: `${quoteMarkGap}px`,
          flexShrink:   0,
        }}
      >
        &ldquo;
      </div>

      {/* Quote content */}
      <div
        style={{
          fontSize:      `${fontSize}px`,
          lineHeight:    "1.85",
          fontWeight:    "400",
          whiteSpace:    "pre-wrap",
          letterSpacing: "-0.01em",
          color:         colors.fg,
          marginBottom:  `${contentGap}px`,
        }}
      >
        {content}
      </div>

      {/* Attribution */}
      {hasAttr && (
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           "6px",
            paddingTop:    `${Math.round(fontSize * 1.0)}px`,
            borderTop:     `1px solid ${colors.border}`,
            flexShrink:    0,
          }}
        >
          {attribution && (
            <span
              style={{
                fontSize:      `${Math.round(fontSize * 0.72)}px`,
                color:         colors.accent,
                fontWeight:    "500",
                letterSpacing: "0.01em",
              }}
            >
              — {attribution}
            </span>
          )}
          {meta && (
            <span
              style={{
                fontSize:      `${Math.round(fontSize * 0.60)}px`,
                color:         colors.muted,
                letterSpacing: "0.02em",
              }}
            >
              {meta}
            </span>
          )}
        </div>
      )}

      {/* Watermark */}
      {showWatermark && (
        <div
          style={{
            position:      "absolute",
            bottom:        `${Math.round(paddingV * 0.5)}px`,
            right:         `${Math.round(paddingH * 0.6)}px`,
            fontSize:      `${Math.round(fontSize * 0.46)}px`,
            color:         colors.watermark,
            fontWeight:    "600",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          BookQuotr
        </div>
      )}
    </div>
  )
})

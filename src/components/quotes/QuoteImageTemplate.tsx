import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"

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
  fontFamily?: string
  fontSizeScale?: number
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
  const chars = Math.max(content.length, 1)
  const paddingH = width * 0.08
  const paddingV = height * 0.08
  const availW = width - 2 * paddingH
  const innerH = height - 2 * paddingV
  const targetH = innerH * 0.72 // fill 72 % of inner height

  let fs = 18 // starting guess

  for (let i = 0; i < 8; i++) {
    // Accent bar: 3px bar + gap below
    const accentH = 3 + fs * 1.6
    // Quote mark: proportional to width, plus gap below
    const quoteMarkH = width * 0.052 + fs * 0.6
    // Text block
    const charsPerLine = Math.max(1, Math.floor(availW / (fs * 0.52)))
    const numLines = Math.ceil(chars / charsPerLine)
    const textH = numLines * fs * 1.85
    // Margin between text and attribution
    const gapH = fs * 2
    // Attribution: one line of smaller text + top border padding
    const attrH = hasAttribution ? fs * (0.72 * 1.85 + 1.0) : 0

    const totalH = accentH + quoteMarkH + textH + gapH + attrH

    if (Math.abs(totalH - targetH) < 1) break
    fs = fs * (targetH / totalH)
  }

  // Clamp: 12–34 px (keep 1 decimal so sub-pixel scale steps are visible)
  return Math.max(12, Math.min(34, parseFloat(fs.toFixed(1))))
}

export const QuoteImageTemplate = React.forwardRef<
  HTMLDivElement,
  QuoteImageTemplateProps
>(function QuoteImageTemplate(
  {
    content,
    bookTitle,
    author,
    page,
    chapter,
    colors,
    width,
    height,
    showWatermark = true,
    fontFamily = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSizeScale = 1,
  },
  ref
) {
  const attribution = [bookTitle, author].filter(Boolean).join(", ")
  const meta = [chapter, page ? `s. ${page}` : null].filter(Boolean).join(" · ")
  const hasAttr = Boolean(attribution || meta)
  const fontSize = parseFloat((solveFontSize(content, width, height, hasAttr) * fontSizeScale).toFixed(1))

  const paddingH = Math.round(width * 0.08)
  const paddingV = Math.round(height * 0.08)
  const accentGap = Math.round(fontSize * 1.6)
  const quoteMarkSz = Math.round(width * 0.12)
  const quoteMarkGap = Math.round(fontSize * 0.6)
  const contentGap = Math.round(fontSize * 2)

  return (
    <div
      ref={ref}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: colors.bg,
        color: colors.fg,
        fontFamily,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${paddingV}px ${paddingH}px`,
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          width: "60px",
          height: "3px",
          backgroundColor: colors.accent,
          borderRadius: "2px",
          marginBottom: `${accentGap}px`,
          flexShrink: 0,
        }}
      />

      {/* Decorative opening quote mark */}
      <div
        style={{
          fontSize: `${quoteMarkSz}px`,
          lineHeight: "0.65",
          color: colors.accent,
          opacity: 0.22,
          fontFamily: "Georgia, 'Times New Roman', serif",
          marginBottom: `${quoteMarkGap}px`,
          flexShrink: 0,
        }}
      >
        &ldquo;
      </div>

      {/* Quote content – rendered as markdown */}
      <div
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: "1.85",
          fontWeight: "400",
          letterSpacing: "-0.01em",
          color: colors.fg,
          marginBottom: `${contentGap}px`,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            // Paragraphs: inline, no extra margin (layout handled by parent)
            p: ({ children }) => (
              <p
                style={{
                  margin: 0,
                  marginBottom: `${Math.round(fontSize * 0.5)}px`,
                }}
              >
                {children}
              </p>
            ),
            // Bold
            strong: ({ children }) => (
              <strong style={{ fontWeight: "700", color: colors.fg }}>
                {children}
              </strong>
            ),
            // Italic
            em: ({ children }) => (
              <em style={{ fontStyle: "italic" }}>{children}</em>
            ),
            // Strikethrough
            del: ({ children }) => (
              <del style={{ textDecoration: "line-through", opacity: 0.6 }}>
                {children}
              </del>
            ),
            // Unordered list
            ul: ({ children }) => (
              <ul
                style={{
                  listStyle: "disc",
                  margin: 0,
                  paddingLeft: `${Math.round(fontSize * 1.2)}px`,
                  marginBottom: `${Math.round(fontSize * 0.5)}px`,
                }}
              >
                {children}
              </ul>
            ),
            // Ordered list
            ol: ({ children }) => (
              <ol
                style={{
                  listStyle: "decimal",
                  margin: 0,
                  paddingLeft: `${Math.round(fontSize * 1.2)}px`,
                  marginBottom: `${Math.round(fontSize * 0.5)}px`,
                }}
              >
                {children}
              </ol>
            ),
            // List item
            li: ({ children }) => (
              <li style={{ marginBottom: `${Math.round(fontSize * 0.2)}px` }}>
                {children}
              </li>
            ),
            // Blockquote
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  borderLeft: `3px solid ${colors.accent}`,
                  paddingLeft: `${Math.round(fontSize * 0.75)}px`,
                  margin: `0 0 ${Math.round(fontSize * 0.5)}px 0`,
                  opacity: 0.85,
                }}
              >
                {children}
              </blockquote>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Attribution */}
      {hasAttr && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            paddingTop: `${Math.round(fontSize * 1.0)}px`,
            borderTop: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          {attribution && (
            <span
              style={{
                fontSize: `${Math.round(fontSize * 0.85)}px`,
                color: colors.accent,
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
                fontSize: `${Math.round(fontSize * 0.6)}px`,
                color: colors.muted,
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
            position: "absolute",
            bottom: `${Math.round(paddingV * 0.5)}px`,
            right: `${Math.round(paddingH * 0.6)}px`,
            display: "flex",
            alignItems: "center",
            gap: `${Math.round(fontSize * 0.25)}px`,
            opacity: 0.55,
          }}
        >
          {/* Logo icon – original two-tone favicon colours */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 7.8 7.8"
            style={{
              width: `${Math.round(fontSize * 0.9)}px`,
              height: `${Math.round(fontSize * 0.9)}px`,
              flexShrink: 0,
            }}
          >
            {/* Book cover */}
            <path
              fill="#292d32"
              stroke="#f3e4d0"
              strokeWidth="0.113525"
              d="M 5.4878469,0.1167487 H 2.3159253 c -1.3777798,0 -2.19914852,0.82096553 -2.19914852,2.198069 V 5.481399 c 0,1.3808868 0.82136872,2.2018523 2.19914852,2.2018523 h 3.1681365 c 1.3777798,0 2.1991485,-0.8209655 2.1991485,-2.198069 V 2.3148177 C 7.6869954,0.93771423 6.8656267,0.1167487 5.4878469,0.1167487 Z"
            />
            {/* Left page */}
            <path
              fill="#f3e4d0"
              d="M 3.664082,2.0310906 V 6.381431 c 0,0.1709741 -0.171058,0.2849568 -0.3278613,0.2184669 C 2.7612947,6.3529353 2.0105351,6.1249699 1.4878578,6.05848 L 1.3975768,6.04898 C 1.1077288,6.0109872 0.87015292,5.7402782 0.87015292,5.4458229 V 1.7888725 c 0,-0.3609452 0.29460468,-0.6316494 0.65572728,-0.6031538 0.5939515,0.047493 1.4730236,0.3324544 2.0242106,0.6459069 0.071274,0.033245 0.1139912,0.1139779 0.1139912,0.199465 z"
            />
            {/* Right page */}
            <path
              fill="#f3e4d0"
              d="m 6.9336188,1.8457879 v 3.5951907 c 0,0.2944554 -0.2375804,0.5651643 -0.5274288,0.6031585 l -0.099784,0.0095 C 5.7884804,6.1248749 5.0424772,6.3480911 4.4675321,6.5903043 4.3107289,6.6567943 4.1396709,6.5428115 4.1396709,6.3718375 V 2.0262463 c 0,-0.085487 0.042765,-0.1662105 0.1187903,-0.2089541 C 4.8096482,1.508589 5.6696901,1.2331166 6.2541384,1.1808745 h 0.019006 c 0.3658741,0.00475 0.6604739,0.2992189 0.6604744,0.6649134 z"
            />
            {/* Right quote mark – closing ❜ shape from dark icon */}
            <path
              fill="#292d32"
              d="m 6.3348,3.8492 c 0,0.91511 -0.19916,1.1201 -0.73126,1.4351 -0.035671,0.020797 -0.074315,0.02971 -0.11296,0.02971 -0.077287,0 -0.1516,-0.038625 -0.19322,-0.10993 -0.062425,-0.10696 -0.026753,-0.24363 0.077287,-0.30603 0.35968,-0.21392 0.48453,-0.29117 0.50831,-0.82895 h -0.56777 c -0.32401,0 -0.57668,-0.25255 -0.57668,-0.5764 v -0.43973 c 0,-0.32385 0.25267,-0.5764 0.57668,-0.5764 h 0.44292 c 0.31807,0 0.57668,0.25849 0.57668,0.5764 z"
            />
            {/* Left quote mark */}
            <path
              fill="#292d32"
              d="m 1.4719467,3.9474451 c 0,-0.915111 0.1991642,-1.1201197 0.7312595,-1.4350606 0.035671,-0.020797 0.074315,-0.02971 0.1129586,-0.02971 0.077288,0 0.1516028,0.038625 0.1932193,0.1099322 0.062424,0.106961 0.026753,0.2436336 -0.077288,0.3060273 C 2.0724118,3.1125561 1.9475626,3.1898059 1.9237819,3.7275822 h 0.5647939 c 0.3240133,0 0.5766841,0.2525468 0.5766841,0.5764011 v 0.4397272 c 0,0.3238542 -0.2526708,0.5764011 -0.5766841,0.5764011 H 2.0456586 c -0.318068,0 -0.5766839,-0.2584892 -0.5766839,-0.5764011 V 3.9474451 Z"
            />
          </svg>
          <span
            style={{
              fontSize: `${Math.round(fontSize * 0.66)}px`,
              fontWeight: "600",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colors.watermark,
            }}
          >
            BookQuotr
          </span>
        </div>
      )}
    </div>
  )
})

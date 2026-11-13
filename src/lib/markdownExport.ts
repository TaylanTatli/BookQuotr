export type MarkdownExportMode = "standard" | "wrapper"

export interface MarkdownExportConfig {
  mode: MarkdownExportMode
  prefix: string
  suffix: string
}

export interface MarkdownQuote {
  content: string
  page?: number | null
  chapter?: string | null
}

export interface MarkdownBook {
  title: string
  author?: string | null
  quotes: MarkdownQuote[]
}

export const DEFAULT_MARKDOWN_CONFIG: MarkdownExportConfig = {
  mode: "standard",
  prefix: "",
  suffix: "",
}

const QUOTE_SEPARATOR = "\n\n---\n\n"

function normalize(content: string): string {
  return content.replace(/\r\n?/g, "\n").trim()
}

/** Escapes Markdown control characters so generated titles and metadata stay literal. */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\r?\n/g, " ")
    .replace(/([\\`*_{}[\]()<>#+\-.!|])/g, "\\$1")
}

/**
 * In MDX mode the quote body is JSX children: `<`, `{` and `}` would otherwise be
 * parsed as tags or expressions. A backslash keeps them literal and renders as the
 * original character in both Markdown and MDX.
 */
function escapeMdx(text: string): string {
  return text.replace(/([<{}])/g, "\\$1")
}

function toBlockquote(content: string): string {
  return content
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n")
}

/** Formats a single quote body according to the selected export mode. */
export function formatQuote(
  content: string,
  config: MarkdownExportConfig
): string {
  const body = normalize(content)
  if (!body) return ""

  if (config.mode === "standard") return toBlockquote(body)

  const safe = escapeMdx(body)
  const parts = [config.prefix, safe, config.suffix].filter(
    (part) => part.length > 0
  )
  // Multiline quotes read better with the wrappers on their own lines.
  return safe.includes("\n") ? parts.join("\n") : parts.join("")
}

function formatQuoteMeta(quote: MarkdownQuote): string | null {
  const parts: string[] = []
  const chapter = quote.chapter?.trim()
  if (chapter) parts.push(escapeMarkdown(chapter))
  if (typeof quote.page === "number" && quote.page > 0) {
    parts.push(`Page ${quote.page}`)
  }
  return parts.length > 0 ? `*${parts.join(" · ")}*` : null
}

function bookToMarkdown(
  book: MarkdownBook,
  config: MarkdownExportConfig
): string {
  const header: string[] = [
    `# ${escapeMarkdown(book.title.trim()) || "Untitled"}`,
  ]

  const author = book.author?.trim()
  if (author) header.push(`**Author:** ${escapeMarkdown(author)}`)

  const quoteBlocks: string[] = []
  for (const quote of book.quotes) {
    const formatted = formatQuote(quote.content, config)
    if (!formatted) continue
    const meta = formatQuoteMeta(quote)
    // Metadata belongs to its quote, so the separator only sits between quotes.
    quoteBlocks.push(meta ? `${formatted}\n\n${meta}` : formatted)
  }

  const body = quoteBlocks.join(QUOTE_SEPARATOR)
  return body ? `${header.join("\n\n")}\n\n${body}` : header.join("\n\n")
}

/** Builds the full document; a selection without any quote content yields "". */
export function buildMarkdown(
  books: MarkdownBook[],
  config: MarkdownExportConfig
): string {
  const hasQuotes = books.some((book) =>
    book.quotes.some((quote) => quote.content.trim() !== "")
  )
  // Never emit a document that is only book metadata.
  if (!hasQuotes) return ""

  const sections = books
    .map((book) => bookToMarkdown(book, config))
    .filter((section) => section.length > 0)

  return sections.length > 0 ? `${sections.join(QUOTE_SEPARATOR)}\n` : ""
}

/** Filesystem-safe `.md` filename derived from a book title (Turkish chars transliterated). */
export function markdownFilename(title: string): string {
  const ascii = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")

  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")

  return `${slug || "book"}.md`
}

/** `bookquotr-quotes-YYYY-MM-DD.md`, matching the JSON backup's date format. */
export function libraryMarkdownFilename(date: Date = new Date()): string {
  return `bookquotr-quotes-${date.toISOString().split("T")[0]}.md`
}

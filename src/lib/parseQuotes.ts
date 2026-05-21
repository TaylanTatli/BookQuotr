/**
 * Splits a raw string into individual quote segments.
 * Separator: a line containing only 3 or more hyphens (---) with optional surrounding whitespace.
 * Trims each segment; discards empty segments.
 */
export function parseQuotes(raw: string): string[] {
  return raw
    .split(/\n\s*-{3,}\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

---
activation: always_on
description: BookQuotr API contracts, bulk quote parsing, UI layout, component behaviour, styling, and Docker configuration.
---

# BookQuotr — API, UI & Docker Rules

## API Route Contracts

### Books

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/books` | All books ordered by `createdAt DESC`, includes `_count.quotes` |
| POST | `/api/books` | Create book. Body: `{ title, author, ...optionalFields }` |
| GET | `/api/books/[id]` | Single book with all quotes |
| PATCH | `/api/books/[id]` | Update any subset of book fields |
| DELETE | `/api/books/[id]` | Delete book (quotes cascade) |

### Quotes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/quotes?bookId=<id>` | All quotes for a book, ordered `createdAt ASC` |
| POST | `/api/quotes` | Create single or bulk quotes |
| PATCH | `/api/quotes/[id]` | Update `content`, `page`, `chapter`, `note` |
| DELETE | `/api/quotes/[id]` | Delete single quote |

**POST `/api/quotes` body:**
```ts
{
  bookId:   string;
  content:  string;  // May contain \n---\n bulk separators
  page?:    number;
  chapter?: string;
  note?:    string;
}
```
The route calls `parseQuotes(content)` and inserts all segments via `prisma.quote.createMany`.
Response: `{ quotes: Quote[]; count: number }`

### Search

`GET /api/search?q=<query>&source=all|google|openlibrary`

Proxies to:
- **Google Books** — `https://www.googleapis.com/books/v1/volumes?q={q}&key={KEY}`
- **Open Library** — `https://openlibrary.org/search.json?q={q}&limit=10`

Normalise both responses into:
```ts
interface SearchResult {
  source:         'google' | 'openlibrary';
  externalId:     string;
  title:          string;
  authors:        string[];
  publisher?:     string;
  publishedDate?: string;
  description?:  string;
  isbn?:          string;
  pageCount?:     number;
  language?:      string;
  thumbnail?:     string;
}
```

### Export / Import

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/export` | Full JSON dump: `{ books: (Book & { quotes: Quote[] })[] }` |
| POST | `/api/export` | Import same JSON structure; upsert books and quotes by `id` |

---

## Bulk Quote Parsing (`lib/parseQuotes.ts`)

```ts
/**
 * Splits raw string into individual quote segments.
 * Separator: a line with only 3+ hyphens (---) with optional whitespace.
 * Trims each segment; discards empty segments.
 */
export function parseQuotes(raw: string): string[] {
  return raw
    .split(/\n\s*-{3,}\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
}
```

Called **server-side** in `POST /api/quotes` before `createMany`.

---

## UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  BookQuotr                                               │
├──────────────┬───────────────────────────────────────────┤
│  Book List   │  Quote Panel                              │
│  (30% width) │  (70% width)                              │
│              │                                           │
│  ┌─────────┐ │  ┌─────────────────────────────────────┐ │
│  │ BookCard│ │  │ BookDetail (cover + full metadata)  │ │
│  │ ...     │ │  └─────────────────────────────────────┘ │
│  └─────────┘ │                                           │
│  [+ Add Book]│  ┌─────────────────────────────────────┐ │
│  [Settings]  │  │ QuoteCard (Markdown rendered)       │ │
│              │  └─────────────────────────────────────┘ │
│              │                         [+ Add Quote]    │
└──────────────┴───────────────────────────────────────────┘
```

**Layout rules:**
- Left column: `min-h-screen`, sticky header, scrollable book list.
- Right column: `flex-1`, scrollable quote list, `Add Quote` button pinned to bottom-right.
- Both columns have **independent scroll** (`overflow-y-auto`).
- **Responsive**: on mobile (`<768px`) stack vertically — book list becomes a horizontal scrollable strip at the top.

---

## Component Behaviour Rules

### `AddBookModal`
1. Search input → calls `GET /api/search?q=...` on submit.
2. Results list → clicking pre-fills all metadata fields.
3. User can edit any field before saving.
4. Save → `POST /api/books` → close modal → refresh sidebar.

### `AddQuoteModal`
1. Large `<textarea>` with monospace font.
2. Live hint: *"Separate multiple quotes with `---` on its own line"*.
3. Optional collapsible fields: **Page**, **Chapter**, **Note**.
4. Submit → `POST /api/quotes` → response shows how many quotes were saved.
5. On success → refresh quote list.

### `SettingsModal`
1. **Export**: `GET /api/export` → file download named `bookquotr-backup-YYYY-MM-DD.json`.
2. **Import**: `<input type="file" accept=".json">` → reads file → `POST /api/export` → shows result.
3. **Danger zone**: "Delete All Data" — requires user to type `DELETE` to confirm.

### `QuoteCard`
- Renders `content` via `react-markdown` with `remark-gfm`.
- Shows `page`, `chapter`, `note` as small meta badges if present.
- Edit (pencil) + delete (trash) icons — visible on hover.
- Edit: reuse `AddQuoteModal` pre-filled, or inline edit form.

---

## Styling Rules

- **Tailwind v4** — use `@theme inline` in `globals.css`. There is **no** `tailwind.config.ts`.
- **Dark mode by default** — configure via shadcn theme / CSS vars in the global CSS file (the `tailwindCssFile` from `components.json`).
- **Semantic tokens always** — `bg-primary`, `bg-muted`, `text-muted-foreground`, `border`, etc. Never raw Tailwind palette classes like `bg-zinc-800` or `text-blue-500`.
- **shadcn/ui components first** — before writing any styled `<div>`, check if `Dialog`, `ScrollArea`, `Card`, `Badge`, `Separator`, `Skeleton`, etc. covers the need.
- **`cn()` utility** — always use `cn()` from `@/lib/utils` for conditional `className` composition. Never manual template literal ternaries.
- **No `space-x-*` / `space-y-*`** — use `flex gap-*` or `flex flex-col gap-*`.
- **Equal dimensions** — use `size-*` shorthand, not `w-* h-*`.
- **No custom font stack** — font is configured via shadcn init / preset. Do not add Google Fonts manually.
- **No manual `z-index`** on overlay components — `Dialog`, `Popover`, `Sheet` manage their own stacking context.

---

## Docker Configuration Rules

### `Dockerfile` — multi-stage build

```
Stage 1 (deps):     node:20-alpine — install production deps only
Stage 2 (builder):  node:20-alpine — copy deps + source, run prisma generate + next build
Stage 3 (runner):   node:20-alpine — copy built output, NODE_ENV=production, EXPOSE 3000
```

Critical:
- `data/` directory is **NOT** copied into the image — it is volume-mounted.
- `prisma migrate deploy` must run at container start (entrypoint script or CMD chain).
- `COPY prisma ./prisma` must happen **before** `RUN npx prisma generate`.

### `docker-compose.yml`

```yaml
services:
  bookquotr:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data      # SQLite persistence — never loses data
    environment:
      - DATABASE_URL=file:./data/bookquotr.db
      - NODE_ENV=production
    restart: unless-stopped
```

---

## Development Workflow

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev

# Docker
docker-compose up --build
```

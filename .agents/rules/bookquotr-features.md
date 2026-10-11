---
activation: always_on
description: BookQuotr API contracts, auth, bulk quote parsing, UI layout, and Docker configuration.
---

# BookQuotr — API, Auth, UI & Docker Rules

## Authentication

- `src/proxy.ts` gates every route except static assets and:
  `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/health`.
- Auth is **enabled by default in production**; set `AUTH_ENABLED=false` for a
  trusted local deployment. If enabled without `AUTH_USERNAME`, `AUTH_PASSWORD`
  and a strong `AUTH_SECRET` (>= 32 chars), requests are rejected (503) with a
  clear server log.
- `POST /api/auth/login` validates credentials (constant-time) and rate-limits
  failed attempts (5 per 15 min per IP). The session JWT lives in an httpOnly,
  SameSite=Lax cookie (`Secure` only over HTTPS).
- `/api/quotes/random` is public **only** when `PUBLIC_RANDOM_QUOTES=true`, and
  never returns the private `note` field.

## API Route Contracts

### Books

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/books` | All books, ordered by `createdAt DESC`, includes `_count.quotes` |
| POST | `/api/books` | Create book (`title`, `author` required; other fields sanitized) |
| GET | `/api/books/[id]` | Single book with all quotes |
| PATCH | `/api/books/[id]` | Update a subset of allowed book fields |
| DELETE | `/api/books/[id]` | Delete book (quotes cascade; cover removed) |

### Quotes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/quotes?bookId=<id>` | Quotes for a book, ordered `createdAt ASC` |
| POST | `/api/quotes` | Create single or bulk quotes (`---` separated) |
| PATCH | `/api/quotes/[id]` | Update `content`, `page`, `chapter`, `note` |
| DELETE | `/api/quotes/[id]` | Delete single quote |

### Covers

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/covers/[bookId]` | Serve cached cover; downloads on-the-fly if the book has a remote URL. **Requires auth.** |
| POST | `/api/covers/upload` | Upload a cover (multipart `file`, `bookId`). **Requires auth.** |
| POST | `/api/admin/migrate-covers` | Cache remote covers for all books. **Requires auth.** |

Cover security: ids must match `^[A-Za-z0-9_-]{1,64}$`; remote URLs must be public
http(s) (SSRF guard in `lib/security.ts`); uploads are validated by magic bytes,
size-capped, and stored under `data/covers/`. Content type is derived from the
bytes, never trusted from the client.

### Search

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/search?q=&source=all\|google\|openlibrary` | Proxy to Google Books / Open Library |
| GET | `/api/db-search?q=` | Search local books and quotes |

### Export / Import

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/export` | Full JSON dump: `{ books: (Book & { quotes: Quote[] })[] }` |
| POST | `/api/export` | Import the same shape; sanitized upsert by unique id |

### Misc

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Public health check (`{ status: "ok" }`) |
| POST | `/api/auth/login` / `/api/auth/logout` | Session cookie management |

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
│  Book List   │  Quote Panel (BookDetail + QuoteList)     │
│  (resizable) │                                           │
│  [+ Add Book]│                         [+ Add Quote]      │
│  [Settings]  │                                           │
└──────────────┴───────────────────────────────────────────┘
```

- Desktop: resizable split panels (`ResizablePanelGroup`), width persisted in
  `localStorage`.
- Mobile (`<768px`): the sidebar becomes a `Sheet` drawer.
- Both columns scroll independently.

---

## Component Behaviour

- **AddBookModal**: search (Google/Open Library) → prefill → edit → save.
- **AddQuoteModal**: textarea with `---` bulk separators + optional page/chapter/note.
- **QuoteCard**: Markdown (`rehype-sanitize`) + copy / edit / delete / export image.
- **SettingsModal**: language, theme, font size, default view, JSON backup/restore,
  delete-all (type `DELETE`), and the project attribution link.

---

## Styling Rules

- **Tailwind v4** — `@theme inline` in `globals.css`; no `tailwind.config.ts`.
- **Semantic tokens only** — `bg-primary`, `text-muted-foreground`, `border`, …
- **shadcn/ui components first**; use `cn()` for conditional classes.
- **No `space-x-*` / `space-y-*`** — use `flex gap-*`.
- **Equal dimensions** — use `size-*`, not `w-* h-*`.

---

## Docker Configuration

### `Dockerfile` — multi-stage build

```
Stage 1 (builder): node:22-alpine — pnpm install, prisma generate, next build
Stage 2 (runner):  node:22-alpine — global prisma, standalone output, USER node
```

- `data/` is **not** copied into the image; it is volume-mounted.
- `.dockerignore` keeps `.env`, `data/`, `.git` and other artifacts out of the build.
- `prisma migrate deploy` runs in `entrypoint.sh` before `node server.js`.

### `docker-compose.yml`

```yaml
services:
  bookquotr:
    image: ghcr.io/taylantatli/bookquotr:latest
    ports: ["3000:3000"]
    volumes:
      - ./data:/app/data          # SQLite + covers — never lose this
    environment:
      DATABASE_URL: file:/app/data/bookquotr.db
      AUTH_ENABLED / AUTH_USERNAME / AUTH_PASSWORD / AUTH_SECRET: …
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "-Y", "off", "http://127.0.0.1:3000/api/health"]
```

Environment values are interpolated from a `.env` file next to the compose file.

---

## Development Workflow

```bash
pnpm install
cp .env.example .env
pnpm exec prisma migrate deploy
pnpm dev

pnpm typecheck && pnpm lint && pnpm test && pnpm build

# Docker
docker compose up -d --build
```

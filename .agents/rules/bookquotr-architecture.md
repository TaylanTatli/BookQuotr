---
activation: always_on
description: BookQuotr core architecture, tech stack, database schema, and coding conventions.
---

# BookQuotr — Architecture & Conventions

## Overview

BookQuotr is a self-hosted, single-user web app for managing book quotes and metadata. Zero external service dependencies except Google Books / Open Library for metadata fetching.

---

## Tech Stack

| Layer          | Choice                       | Notes                                             |
|----------------|------------------------------|---------------------------------------------------|
| Framework      | Next.js 14+ (App Router)     | Server Components + API Routes                    |
| UI Components  | shadcn/ui (Base UI)          | **Primary UI layer** — use before any custom code |
| Styling        | Tailwind CSS **v4**          | `@theme inline` blocks, no `tailwind.config.js`   |
| Primitives     | Base UI (not Radix)          | `base` field in `components.json`                 |
| Icons          | Lucide React                 | Configured via shadcn `iconLibrary`               |
| Database       | SQLite via Prisma ORM        | Single `.db` file, easy backup                    |
| Markdown       | react-markdown + remark-gfm  | Render quote content as GFM Markdown              |
| HTTP Client    | Native `fetch` (no axios)    | Both internal and external API calls              |
| Container      | Docker + docker-compose      | Production-ready multi-stage Dockerfile           |

---

## Project File Structure

```
BookQuotr/
├── .agents/rules/               ← Antigravity rules (this file)
├── .agents/skills/shadcn/       ← shadcn skill (auto-loaded)
├── components.json              ← shadcn/ui config (base: "base", tailwindVersion: "v4")
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── tsconfig.json
├── package.json
├── prisma/
│   └── schema.prisma
├── data/                        ← SQLite .db lives here (gitignored, volume-mounted)
│   └── bookquotr.db
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx           ← Root layout (fonts, metadata)
    │   ├── page.tsx             ← Main two-column split view
    │   ├── globals.css          ← Tailwind directives + custom CSS vars
    │   └── api/
    │       ├── books/
    │       │   ├── route.ts         ← GET (list), POST (create)
    │       │   └── [id]/route.ts    ← GET, PATCH, DELETE
    │       ├── quotes/
    │       │   ├── route.ts         ← GET (?bookId=), POST (create / bulk)
    │       │   └── [id]/route.ts    ← GET, PATCH, DELETE
    │       ├── search/route.ts      ← Proxy: Google Books + Open Library
    │       └── export/route.ts      ← GET → JSON dump, POST → import JSON
    ├── components/
    │   ├── ui/                      ← shadcn/ui generated components (DO NOT edit manually)
    │   │   ├── button.tsx
    │   │   ├── dialog.tsx
    │   │   ├── input.tsx
    │   │   ├── scroll-area.tsx
    │   │   ├── badge.tsx
    │   │   ├── skeleton.tsx
    │   │   ├── separator.tsx
    │   │   └── ... (added via `pnpm dlx shadcn@latest add`)
    │   ├── layout/
    │   │   ├── BookSidebar.tsx      ← Left 30% column
    │   │   └── QuotesPanel.tsx      ← Right 70% column
    │   ├── books/
    │   │   ├── BookCard.tsx         ← Single book item in sidebar
    │   │   ├── BookDetail.tsx       ← Full metadata header in quotes panel
    │   │   └── AddBookModal.tsx     ← Search + manual edit + save (uses Dialog)
    │   ├── quotes/
    │   │   ├── QuoteCard.tsx        ← Single rendered Markdown quote
    │   │   ├── QuoteList.tsx        ← Scrollable quote list (uses ScrollArea)
    │   │   └── AddQuoteModal.tsx    ← Textarea + bulk parse + save (uses Dialog)
    │   └── settings/
    │       └── SettingsModal.tsx    ← Export / Import JSON (uses Dialog + AlertDialog)
    ├── lib/
    │   ├── prisma.ts               ← Prisma client singleton
    │   ├── parseQuotes.ts          ← Bulk quote splitting logic
    │   └── bookSearch.ts           ← Google Books + Open Library helpers
    └── types/
        └── index.ts                ← Shared TS types (Book, Quote, SearchResult)
```

---

## Database Schema (Prisma)

File: `prisma/schema.prisma`

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3-0-x"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Book {
  id            String   @id @default(cuid())
  title         String
  author        String
  publisher     String?
  publishedDate String?
  description   String?
  isbn          String?
  pageCount     Int?
  language      String?
  thumbnail     String?
  googleBooksId String?  @unique
  openLibraryId String?  @unique
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  quotes        Quote[]
}

model Quote {
  id        String   @id @default(cuid())
  content   String
  page      Int?
  chapter   String?
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  bookId    String
  book      Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
}
```

Key decisions:
- `onDelete: Cascade` — deleting a book removes all its quotes automatically.
- `binaryTargets` includes `linux-musl-openssl-3-0-x` for Alpine-based Docker images.

---

## Environment Variables

```env
# .env.example
DATABASE_URL="file:./data/bookquotr.db"
GOOGLE_BOOKS_API_KEY=""   # Optional — increases quota from 100 to 1000 req/day
```

- `DATABASE_URL` must always point inside `./data/` so it maps to the Docker volume.
- The search route must work without `GOOGLE_BOOKS_API_KEY`.

---

## Coding Conventions

### shadcn/ui First (Critical)

1. **shadcn/ui before custom markup** — always check `pnpm dlx shadcn@latest search` before writing a custom component.
2. **Never edit `components/ui/`** — these are shadcn-managed files. Compose them, don't modify them.
3. **Base UI primitives** — `components.json` must have `"base": "base"` (not `"radix"`). Use `render` prop pattern instead of `asChild`.
4. **Semantic Tailwind tokens only** — use `bg-primary`, `text-muted-foreground`, etc. Never raw colors like `bg-blue-500`.
5. **Tailwind v4 syntax** — use `@theme inline` blocks in the global CSS file. No `tailwind.config.js` or `tailwind.config.ts`.
6. **`cn()` for conditional classes** — never manual template literal ternaries.
7. **Overlays via `Dialog`** — use shadcn `Dialog` for all modals. Never custom modal wrappers.
8. **Toasts via `sonner`** — `toast()` from `sonner`. Never custom toast markup.
9. **Icon sizing** — use `data-icon` inside `Button`, never add `size-4` or `w-4 h-4` to icons inside components.

### General

10. **TypeScript everywhere** — no `.js` files in `src/`. Strict mode on.
11. **Server Components by default** — add `"use client"` only for event handlers / hooks.
12. **API routes** return `NextResponse.json(...)` with appropriate HTTP status codes.
13. **Error handling** — all API routes wrapped in `try/catch`; return `{ error: string }` on failure.
14. **Prisma client** — singleton pattern in `lib/prisma.ts` to avoid dev connection pool exhaustion.
15. **No `any`** — use proper types or `unknown` with type guards.
16. **Imports** — use `@/` alias for `src/` (configured in `tsconfig.json`).
17. **Form validation** — basic client-side required-field checks; server-side validates before DB write.
18. **Loading states** — every async action shows shadcn `Skeleton` or a disabled `Button` + `Spinner` composite.
19. **Optimistic UI** — for delete operations, remove from local state immediately, revert on error.
20. **No page reloads** — all state managed client-side via `useState` / `useEffect` + `fetch`.

---

## Out of Scope (v1)

- Authentication / multi-user support
- Cloud sync
- Tags / categories for quotes
- Reading progress tracking
- Full-text search across quotes (may be added in v2 as SQLite FTS5)

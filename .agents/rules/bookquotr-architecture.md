---
activation: always_on
description: BookQuotr core architecture, tech stack, database schema, and coding conventions.
---

# BookQuotr — Architecture & Conventions

## Overview

BookQuotr is a self-hosted, single-user web app for managing book quotes and metadata.
The only external services are the optional Google Books / Open Library metadata
providers. Authentication is optional and handled with a signed JWT cookie.

---

## Tech Stack

| Layer          | Choice                       | Notes                                             |
|----------------|------------------------------|---------------------------------------------------|
| Framework      | Next.js 16 (App Router)      | Server Components + Route Handlers                |
| Runtime        | Node.js 22                   | Required by Next 16 and the Prisma 7 adapter      |
| UI Components  | shadcn/ui (Base UI)          | **Primary UI layer** — use before any custom code |
| Styling        | Tailwind CSS **v4**          | `@theme inline` blocks, no `tailwind.config.js`   |
| Primitives     | Base UI (not Radix)          | `base` field in `components.json`                 |
| Icons          | Lucide React                 | Configured via shadcn `iconLibrary`               |
| Database       | SQLite via Prisma 7          | `@prisma/adapter-libsql` driver adapter           |
| Auth           | `jose` (HS256 JWT)           | cookie `auth_token`, enforced in `src/proxy.ts`   |
| Markdown       | react-markdown + remark-gfm  | Rendered with `rehype-sanitize`                   |
| HTTP Client    | Native `fetch` (no axios)    | Both internal and external API calls              |
| Container      | Docker + docker-compose      | Multi-stage Dockerfile, GHCR image                |

---

## Project File Structure

```
BookQuotr/
├── .agents/rules/               ← Agent rules (this file)
├── components.json              ← shadcn config (base: "base", tailwind: v4)
├── .dockerignore / .gitignore
├── Dockerfile / docker-compose.yml / entrypoint.sh
├── next.config.mjs              ← standalone output + security headers
├── prisma.config.ts             ← Prisma 7 config (datasource url from env)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── data/                        ← SQLite .db + cached covers (gitignored, volume)
├── tests/                       ← node:test regression tests
└── src/
    ├── proxy.ts                 ← Auth gate (replaces middleware in Next 16)
    ├── instrumentation.ts       ← Startup auth-config warnings
    ├── app/
    │   ├── layout.tsx / page.tsx / login/page.tsx / globals.css
    │   └── api/
    │       ├── auth/login, auth/logout
    │       ├── books/route.ts, books/[id]/route.ts
    │       ├── quotes/route.ts, quotes/[id]/route.ts, quotes/random/route.ts
    │       ├── covers/[bookId]/route.ts, covers/upload/route.ts
    │       ├── admin/migrate-covers/route.ts
    │       ├── search/route.ts, db-search/route.ts
    │       ├── export/route.ts
    │       └── health/route.ts
    ├── components/{ui,layout,books,quotes,settings,search}/
    ├── i18n/                    ← en / tr dictionaries
    ├── lib/
    │   ├── auth.ts              ← auth config + JWT sign/verify
    │   ├── security.ts          ← id / URL / image-type guards
    │   ├── sanitize.ts          ← input sanitizers (mass-assignment guard)
    │   ├── rateLimit.ts         ← login rate limiter
    │   ├── coverCache.ts        ← cover download / store / read
    │   ├── prisma.ts / bookSearch.ts / parseQuotes.ts / utils.ts
    └── types/index.ts
```

---

## Database Schema (Prisma)

File: `prisma/schema.prisma` — SQLite, `cuid()` ids, no `url` in the schema
(Prisma 7 reads it from `prisma.config.ts` / `DATABASE_URL`).

`Book`: id, title, subtitle, author, publisher, publishedDate, description, isbn,
pageCount, language, thumbnail, googleBooksId\*, openLibraryId\*, startedAt,
finishedAt, rating, isFavorite, readingStatus, createdAt, updatedAt, quotes.

`Quote`: id, content, page, chapter, note, createdAt, updatedAt, bookId → Book
(`onDelete: Cascade`; deleting a book deletes its quotes).

`binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` for Alpine Docker images.

---

## Environment Variables

```env
DATABASE_URL="file:./data/bookquotr.db"     # SQLite file (volume-mounted)
GOOGLE_BOOKS_API_KEY=""                     # Optional — raises Google quota
AUTH_USERNAME / AUTH_PASSWORD               # Required when auth is enabled
AUTH_SECRET=""                              # Required when auth is enabled (>=32 chars)
AUTH_ENABLED="true"                         # Defaults to true in production
AUTH_SESSION_DAYS="30"                      # Optional session lifetime
PUBLIC_RANDOM_QUOTES="false"                # Optional: public /api/quotes/random
```

- `DATABASE_URL` must point inside `./data/` so it maps to the Docker volume.
- Search must work without `GOOGLE_BOOKS_API_KEY`.
- Auth is enabled by default in production; set `AUTH_ENABLED=false` only for a
  trusted, private deployment (a warning is logged).

---

## Coding Conventions

### shadcn/ui First (Critical)

1. **shadcn/ui before custom markup** — check the registry before writing markup.
2. **Never edit `components/ui/`** — compose them, don't modify them.
3. **Base UI primitives** — use the `render` prop pattern, not `asChild`.
4. **Semantic Tailwind tokens only** — no raw palette colours like `bg-blue-500`.
5. **Tailwind v4 syntax** — `@theme inline` in the global CSS; no `tailwind.config`.
6. **`cn()` for conditional classes**.
7. **Overlays via `Dialog`/`Sheet`**; toasts via `sonner`.
8. **Icon sizing** — use `data-icon` inside `Button`, not `size-4`.

### General

9. **TypeScript everywhere** — no `.js` in `src/`; strict mode on.
10. **Server Components by default** — add `"use client"` only when needed.
11. **Route Handlers** return `NextResponse.json(...)` with proper status codes.
12. **Error handling** — wrap handlers in `try/catch`, return `{ error: string }`.
13. **Prisma client** — singleton in `lib/prisma.ts`.
14. **Imports** — use the `@/` alias for `src/`.
15. **Validate untrusted input server-side** with `lib/sanitize.ts` before DB writes.
16. **Tests** — add `node:test` cases under `tests/` for security-critical logic.

---

## Out of Scope

- Multi-user / registration / roles
- Cloud sync or managed databases
- Tags/categories, reading-progress tracking
- Full-text search beyond the current `contains` queries

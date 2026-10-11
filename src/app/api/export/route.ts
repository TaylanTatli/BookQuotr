import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeBookFields, sanitizeQuoteFields } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      include: { quotes: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ books });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawBooks = Array.isArray((body as { books?: unknown })?.books)
      ? (body as { books: unknown[] }).books
      : null;

    if (!rawBooks) {
      return NextResponse.json({ error: "Invalid import format" }, { status: 400 });
    }

    let importedBooks = 0;
    let importedQuotes = 0;
    let skippedBooks = 0;

    for (const rawBook of rawBooks) {
      const bookData = sanitizeBookFields(rawBook, { allowId: true });

      if (typeof bookData.title !== "string" || typeof bookData.author !== "string") {
        skippedBooks++;
        continue;
      }

      // Match on a stable unique key when available, otherwise the exported id.
      let whereClause: Prisma.BookWhereUniqueInput | null = null;
      if (typeof bookData.googleBooksId === "string") {
        whereClause = { googleBooksId: bookData.googleBooksId };
      } else if (typeof bookData.openLibraryId === "string") {
        whereClause = { openLibraryId: bookData.openLibraryId };
      } else if (typeof bookData.id === "string") {
        whereClause = { id: bookData.id };
      }

      if (!whereClause) {
        skippedBooks++;
        continue;
      }

      const createData = bookData as unknown as Prisma.BookUncheckedCreateInput;
      const updateData: Record<string, unknown> = { ...bookData };
      delete updateData.id;
      delete updateData.createdAt;

      try {
        const saved = await prisma.book.upsert({
          where: whereClause,
          update: updateData as Prisma.BookUpdateInput,
          create: createData,
        });
        importedBooks++;

        const rawQuotes = Array.isArray((rawBook as { quotes?: unknown })?.quotes)
          ? ((rawBook as { quotes: unknown[] }).quotes)
          : [];

        for (const rawQuote of rawQuotes) {
          const quote = sanitizeQuoteFields(rawQuote);
          if (!quote) continue;
          try {
            if (quote.id) {
              await prisma.quote.upsert({
                where: { id: quote.id },
                update: {
                  content: quote.content,
                  page: quote.page,
                  chapter: quote.chapter,
                  note: quote.note,
                },
                // Fix: attach to the book that actually exists after upsert,
                // not the id from the export file (which may differ).
                create: { ...quote, bookId: saved.id },
              });
            } else {
              await prisma.quote.create({
                data: {
                  content: quote.content,
                  page: quote.page,
                  chapter: quote.chapter,
                  note: quote.note,
                  bookId: saved.id,
                },
              });
            }
            importedQuotes++;
          } catch {
            // Skip individual quotes that fail; keep the imported book.
            continue;
          }
        }
      } catch (error) {
        console.error("Failed to import book:", error);
        skippedBooks++;
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      importedBooks,
      importedQuotes,
      skippedBooks,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

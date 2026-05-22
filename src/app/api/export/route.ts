import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExportPayload } from "@/types";
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
    const body: ExportPayload = await request.json();

    if (!body.books || !Array.isArray(body.books)) {
      return NextResponse.json({ error: "Invalid import format" }, { status: 400 });
    }

    let importedBooks = 0;
    let importedQuotes = 0;

    for (const book of body.books) {
      const { quotes, ...bookData } = book;

      try {
        // Determine where clause for upsert - prioritize unique IDs over book ID
        let whereClause: Prisma.BookWhereUniqueInput;
        
        if (bookData.googleBooksId) {
          whereClause = { googleBooksId: bookData.googleBooksId };
        } else if (bookData.openLibraryId) {
          whereClause = { openLibraryId: bookData.openLibraryId };
        } else {
          whereClause = { id: bookData.id };
        }

        // Sanitize book data - preserve all fields from export, let Prisma handle nulls
        const sanitizedBookData = {
          ...bookData,
          // Ensure null values for optional fields that might be missing
          googleBooksId: bookData.googleBooksId ?? null,
          openLibraryId: bookData.openLibraryId ?? null,
          isFavorite: typeof bookData.isFavorite === 'boolean' ? bookData.isFavorite : false,
          startedAt: bookData.startedAt ?? null,
          finishedAt: bookData.finishedAt ?? null,
          rating: bookData.rating ?? null,
        };

        await prisma.book.upsert({
          where: whereClause,
          update: sanitizedBookData,
          create: sanitizedBookData,
        });
        importedBooks++;

        // Import quotes for this book
        if (quotes && Array.isArray(quotes)) {
          for (const quote of quotes) {
            try {
              await prisma.quote.upsert({
                where: { id: quote.id },
                update: { 
                  content: quote.content,
                  page: quote.page ?? null,
                  chapter: quote.chapter ?? null,
                  note: quote.note ?? null,
                },
                create: { 
                  ...quote, 
                  bookId: bookData.id,
                  page: quote.page ?? null,
                  chapter: quote.chapter ?? null,
                  note: quote.note ?? null,
                },
              });
              importedQuotes++;
            } catch {
              // Skip individual quotes that fail
              continue;
            }
          }
        }
      } catch (error) {
        // Skip books that fail to import and continue with next book
        console.error(`Failed to import book ${bookData.id}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      importedBooks,
      importedQuotes,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

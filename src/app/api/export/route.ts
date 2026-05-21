import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ExportPayload } from "@/types";

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

      await prisma.book.upsert({
        where: { id: bookData.id },
        update: bookData,
        create: bookData,
      });
      importedBooks++;

      if (quotes && Array.isArray(quotes)) {
        for (const quote of quotes) {
          await prisma.quote.upsert({
            where: { id: quote.id },
            update: quote,
            create: { ...quote, bookId: bookData.id },
          });
          importedQuotes++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      importedBooks,
      importedQuotes,
    });
  } catch {
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

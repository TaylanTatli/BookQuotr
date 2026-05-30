import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ books: [], quotes: [] });
    }

    const [books, quotes] = await Promise.all([
      prisma.book.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { author: { contains: q } },
          ],
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { quotes: true } } },
      }),
      prisma.quote.findMany({
        where: {
          OR: [
            { content: { contains: q } },
            { chapter: { contains: q } },
            { note: { contains: q } },
          ],
        },
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          book: { select: { id: true, title: true, author: true } },
        },
      }),
    ]);

    return NextResponse.json({ books, quotes });
  } catch (error) {
    console.error("GET /api/db-search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

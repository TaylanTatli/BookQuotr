import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseQuotes } from "@/lib/parseQuotes";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json({ error: "bookId is required" }, { status: 400 });
    }

    const quotes = await prisma.quote.findMany({
      where: { bookId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ quotes });
  } catch {
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookId, content, page, chapter, note } = body ?? {};

    if (
      typeof bookId !== "string" ||
      !bookId ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return NextResponse.json(
        { error: "bookId and content are required" },
        { status: 400 }
      );
    }

    const segments = parseQuotes(content);

    if (segments.length === 0) {
      return NextResponse.json({ error: "No quote content provided" }, { status: 400 });
    }

    const pageNumber =
      page === null || page === undefined || page === "" || !Number.isFinite(Number(page))
        ? null
        : Math.trunc(Number(page));

    await prisma.quote.createMany({
      data: segments.map((seg) => ({
        bookId,
        content: seg,
        page: pageNumber,
        chapter: typeof chapter === "string" ? chapter : null,
        note: typeof note === "string" ? note : null,
      })),
    });

    const quotes = await prisma.quote.findMany({
      where: { bookId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ quotes, count: segments.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadAndSaveCover } from "@/lib/coverCache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") ?? "createdAt";

    type BookOrderByField = { createdAt?: "asc" | "desc" } | { title?: "asc" | "desc" } | { author?: "asc" | "desc" } | { rating?: "asc" | "desc" } | { finishedAt?: "asc" | "desc" };
    const orderByMap: Record<string, BookOrderByField[]> = {
      finishedAt: [{ finishedAt: "desc" }, { title: "asc" }],
      title: [{ title: "asc" }],
      author: [{ author: "asc" }],
      rating: [{ rating: "desc" }, { title: "asc" }],
      createdAt: [{ createdAt: "desc" }],
    };
    const orderBy = orderByMap[sortBy] ?? orderByMap.createdAt;

    const books = await prisma.book.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: orderBy as any,
      include: { _count: { select: { quotes: true } } },
    });

    // Rewrite remote URLs to our local cover cache so covers are served
    // from our server (faster, CDN-independent). The local route downloads
    // and caches on the first request. updatedAt is used for cache-busting.
    for (const book of books) {
      if (book.thumbnail && book.thumbnail.startsWith("http")) {
        const v = book.updatedAt.getTime();
        book.thumbnail = `/api/covers/${book.id}?v=${v}`;
      }
    }

    return NextResponse.json({ books });
  } catch (error) {
    console.error("GET /api/books error:", error);
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, author, ...rest } = body;

    if (!title || !author) {
      return NextResponse.json(
        { error: "title and author are required" },
        { status: 400 }
      );
    }

    const book = await prisma.book.create({
      data: { title, author, ...rest },
    });
    
    // Note: we don't download remote URLs here anymore. 
    // They will be downloaded and cached on-the-fly by the /api/covers route.

    return NextResponse.json({ book }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}

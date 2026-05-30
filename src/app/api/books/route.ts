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

    // Auto-migrate covers on the fly for existing users
    for (const book of books) {
      if (book.thumbnail && !book.thumbnail.startsWith("/api/covers/")) {
        // Run migration in background without blocking the response
        downloadAndSaveCover(book.id, book.thumbnail).then((localPath) => {
          if (localPath && localPath !== book.thumbnail) {
            prisma.book.update({
              where: { id: book.id },
              data: { thumbnail: localPath },
            }).catch(console.error);
          }
        }).catch(console.error);

        // We can optimistically return the new path assuming it succeeds
        // (If it doesn't, it will just fallback to the old URL next time or the UI will handle the broken image)
        book.thumbnail = `/api/covers/${book.id}`;
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
    
    // Attempt to download the cover if a URL was provided
    if (rest.thumbnail) {
      const localThumbnail = await downloadAndSaveCover(book.id, rest.thumbnail);
      if (localThumbnail && localThumbnail !== rest.thumbnail) {
        await prisma.book.update({
           where: { id: book.id },
           data: { thumbnail: localThumbnail }
        });
        book.thumbnail = localThumbnail;
      }
    }

    return NextResponse.json({ book }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}

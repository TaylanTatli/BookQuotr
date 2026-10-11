import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeBookFields } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";

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

    return NextResponse.json({ books });
  } catch (error) {
    console.error("GET /api/books error:", error);
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, author } = body ?? {};

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim()
    ) {
      return NextResponse.json(
        { error: "title and author are required" },
        { status: 400 }
      );
    }

    const fields = sanitizeBookFields(body);

    const book = await prisma.book.create({
      data: {
        ...fields,
        title: title.trim(),
        author: author.trim(),
      } as Prisma.BookUncheckedCreateInput,
    });

    // Remote covers are downloaded and cached on-the-fly by the /api/covers route.
    return NextResponse.json({ book }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}

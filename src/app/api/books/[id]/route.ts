import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCover, downloadAndSaveCover } from "@/lib/coverCache";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const book = await prisma.book.findUnique({
      where: { id },
      include: { quotes: { orderBy: { createdAt: "asc" } } },
    });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.thumbnail && book.thumbnail.startsWith("http")) {
      const v = book.updatedAt.getTime();
      book.thumbnail = `/api/covers/${book.id}?v=${v}`;
    }

    return NextResponse.json({ book });
  } catch {
    return NextResponse.json({ error: "Failed to fetch book" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    // If thumbnail is being updated, invalidate the local cover cache
    if ('thumbnail' in body) {
       const existingBook = await prisma.book.findUnique({ where: { id }});
       if (existingBook && existingBook.thumbnail !== body.thumbnail) {
          await deleteCover(id);
       }
    }

    const book = await prisma.book.update({ where: { id }, data: body });
    return NextResponse.json({ book });
  } catch (err) {
    console.error("[PATCH] error:", err);
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.book.delete({ where: { id } });
    await deleteCover(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
  }
}

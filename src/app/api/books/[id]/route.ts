import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCover } from "@/lib/coverCache";
import { sanitizeBookFields } from "@/lib/sanitize";
import type { Prisma } from "@prisma/client";

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

    return NextResponse.json({ book });
  } catch {
    return NextResponse.json({ error: "Failed to fetch book" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const fields = sanitizeBookFields(body);

    // If thumbnail is being updated, invalidate the local cover cache
    if ("thumbnail" in fields) {
      const existingBook = await prisma.book.findUnique({ where: { id } });
      if (existingBook && existingBook.thumbnail !== fields.thumbnail) {
        // Do not delete if the new thumbnail is the local API route for this specific book,
        // because it means the user JUST uploaded a file that overwrote it!
        if (
          !fields.thumbnail ||
          !String(fields.thumbnail).startsWith(`/api/covers/${id}`)
        ) {
          await deleteCover(id);
        }
      }
    }

    const book = await prisma.book.update({
      where: { id },
      data: fields as Prisma.BookUpdateInput,
    });
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

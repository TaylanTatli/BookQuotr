import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCover, downloadAndSaveCover, isLocalCover } from "@/lib/coverCache";

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
      // We do NOT update the database here.
      // We just tell the frontend to load it from our local route.
      // The local route will download and cache it on the first request.
      book.thumbnail = `/api/covers/${book.id}`;
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
    
    // If thumbnail is being updated
    if ('thumbnail' in body) {
       const existingBook = await prisma.book.findUnique({ where: { id }});
       // If the new thumbnail is different from the existing one
       if (existingBook && existingBook.thumbnail !== body.thumbnail) {
          // If there was an existing local cover, delete it
          if (isLocalCover(existingBook.thumbnail)) {
             await deleteCover(id);
          }
          // Note: we don't download remote URLs here anymore. 
          // They will be downloaded and cached on-the-fly by the /api/covers route.
       }
    }

    const book = await prisma.book.update({ where: { id }, data: body });
    return NextResponse.json({ book });
  } catch {
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

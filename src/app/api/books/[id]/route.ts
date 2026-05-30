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

    if (book.thumbnail && !book.thumbnail.startsWith("/api/covers/")) {
      downloadAndSaveCover(book.id, book.thumbnail).then((localPath) => {
        if (localPath && localPath !== book.thumbnail) {
          prisma.book.update({
            where: { id: book.id },
            data: { thumbnail: localPath },
          }).catch(console.error);
        }
      }).catch(console.error);

      // We DO NOT optimistically return the new path here anymore.
      // Instead, we return the original external URL so the user sees the image immediately.
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
          // If the new thumbnail is a remote URL, download and save it
          if (body.thumbnail && !isLocalCover(body.thumbnail)) {
              body.thumbnail = await downloadAndSaveCover(id, body.thumbnail);
          }
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

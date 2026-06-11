import { NextResponse } from "next/server";
import { readCoverFile, downloadAndSaveCover } from "@/lib/coverCache";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ bookId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { bookId } = await params;
  const id = bookId.replace(/\.[^.]+$/, "");

  let buffer = await readCoverFile(id);

  // If not found locally, try to download it on-the-fly if it has a remote URL
  if (!buffer) {
    try {
      const book = await prisma.book.findUnique({ where: { id } });
      if (book && book.thumbnail && book.thumbnail.startsWith("http")) {
        // Download it and save to cache
        await downloadAndSaveCover(id, book.thumbnail);
        // Try reading it again
        buffer = await readCoverFile(id);
      }
    } catch (err) {
      console.error("Failed to on-the-fly fetch cover", err);
    }
  }

  if (!buffer) {
    return NextResponse.json({ error: "Cover not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}

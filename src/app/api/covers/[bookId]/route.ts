import { NextResponse } from "next/server";
import { readCoverFile } from "@/lib/coverCache";

type Params = { params: Promise<{ bookId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { bookId } = await params;

  // Strip any extension the client might append
  const id = bookId.replace(/\.[^.]+$/, "");

  const buffer = await readCoverFile(id);

  if (!buffer) {
    return NextResponse.json({ error: "Cover not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      // Cache aggressively in the browser — the bookId never changes for the same image
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

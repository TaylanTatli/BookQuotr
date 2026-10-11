import { NextResponse } from "next/server";
import { saveUploadedCover } from "@/lib/coverCache";
import { isSafeCoverId, sniffImageType } from "@/lib/security";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bookId = formData.get("bookId") as string | null;

    if (!file || !bookId) {
      return NextResponse.json(
        { error: "file and bookId are required" },
        { status: 400 }
      );
    }

    if (!isSafeCoverId(bookId)) {
      return NextResponse.json({ error: "Invalid bookId" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 5 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 5 MB" },
        { status: 400 }
      );
    }

    // Trust the bytes, not the client-supplied content type.
    if (!sniffImageType(buffer)) {
      return NextResponse.json(
        { error: "Only valid JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    const path = await saveUploadedCover(bookId, buffer);

    return NextResponse.json({ path });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload cover" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { saveUploadedCover } from "@/lib/coverCache";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 5 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = await saveUploadedCover(bookId, buffer);

    return NextResponse.json({ path });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload cover" },
      { status: 500 }
    );
  }
}

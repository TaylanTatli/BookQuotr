import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, page, chapter, note } = body ?? {};

    const data: { content?: string; page?: number | null; chapter?: string | null; note?: string | null } = {};

    if (content !== undefined) {
      if (typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: "content must be a non-empty string" }, { status: 400 });
      }
      data.content = content;
    }
    if (page !== undefined) {
      data.page =
        page === null || page === "" || !Number.isFinite(Number(page))
          ? null
          : Math.trunc(Number(page));
    }
    if (chapter !== undefined) {
      data.chapter = typeof chapter === "string" ? chapter : null;
    }
    if (note !== undefined) {
      data.note = typeof note === "string" ? note : null;
    }

    const quote = await prisma.quote.update({ where: { id }, data });
    return NextResponse.json({ quote });
  } catch {
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}

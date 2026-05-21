import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, page, chapter, note } = body;

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(page !== undefined && { page }),
        ...(chapter !== undefined && { chapter }),
        ...(note !== undefined && { note }),
      },
    });
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

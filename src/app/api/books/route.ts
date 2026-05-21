import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { quotes: true } } },
    });
    return NextResponse.json({ books });
  } catch {
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, author, ...rest } = body;

    if (!title || !author) {
      return NextResponse.json(
        { error: "title and author are required" },
        { status: 400 }
      );
    }

    const book = await prisma.book.create({
      data: { title, author, ...rest },
    });
    return NextResponse.json({ book }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}

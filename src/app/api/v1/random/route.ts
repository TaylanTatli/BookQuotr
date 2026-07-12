import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const quoteCount = await prisma.quote.count()

    if (quoteCount === 0) {
      return NextResponse.json(
        { error: "No quotes available" },
        { status: 404 }
      )
    }

    const randomOffset = Math.floor(Math.random() * quoteCount)

    const quote = await prisma.quote.findFirst({
      skip: randomOffset,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            subtitle: true,
            author: true,
            publisher: true,
            publishedDate: true,
            thumbnail: true,
            language: true,
            googleBooksId: true,
            openLibraryId: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "No quotes available" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      quote: {
        id: quote.id,
        content: quote.content,
        page: quote.page,
        chapter: quote.chapter,
        note: quote.note,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      },
      book: quote.book,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch random quote" },
      { status: 500 }
    )
  }
}

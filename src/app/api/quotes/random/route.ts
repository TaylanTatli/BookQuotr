import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Random quote endpoint, intended for optional public integrations
 * (e.g. a home dashboard). Public access must be explicitly enabled with
 * `PUBLIC_RANDOM_QUOTES=true`; otherwise the proxy requires authentication.
 *
 * Private metadata (the personal `note`) is never exposed here.
 */
export async function GET() {
  try {
    const quoteCount = await prisma.quote.count()

    if (quoteCount === 0) {
      return NextResponse.json({
        available: false,
        quote: null,
        book: null,
        message: "No quotes available",
      })
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
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    if (!quote) {
      return NextResponse.json({
        available: false,
        quote: null,
        book: null,
        message: "No quotes available",
      })
    }

    return NextResponse.json(
      {
        available: true,
        quote: {
          id: quote.id,
          content: quote.content,
          page: quote.page,
          chapter: quote.chapter,
          createdAt: quote.createdAt,
          updatedAt: quote.updatedAt,
        },
        book: quote.book,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch random quote" },
      { status: 500 }
    )
  }
}

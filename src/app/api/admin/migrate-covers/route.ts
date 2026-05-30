import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadAndSaveCover, isLocalCover } from "@/lib/coverCache";

export async function POST() {
  try {
    const books = await prisma.book.findMany();
    let migratedCount = 0;
    let failedCount = 0;

    for (const book of books) {
      if (book.thumbnail && !isLocalCover(book.thumbnail)) {
        try {
          const localPath = await downloadAndSaveCover(book.id, book.thumbnail);
          if (localPath && localPath !== book.thumbnail) {
            await prisma.book.update({
              where: { id: book.id },
              data: { thumbnail: localPath },
            });
            migratedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to migrate cover for book ${book.id}:`, error);
          failedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      failedCount,
      totalBooks: books.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Failed to run cover migration" },
      { status: 500 }
    );
  }
}

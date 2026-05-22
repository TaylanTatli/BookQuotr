-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "description" TEXT,
    "isbn" TEXT,
    "pageCount" INTEGER,
    "language" TEXT,
    "thumbnail" TEXT,
    "googleBooksId" TEXT,
    "openLibraryId" TEXT,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "rating" INTEGER,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Book" ("author", "createdAt", "description", "googleBooksId", "id", "isbn", "language", "openLibraryId", "pageCount", "publishedDate", "publisher", "thumbnail", "title", "updatedAt") SELECT "author", "createdAt", "description", "googleBooksId", "id", "isbn", "language", "openLibraryId", "pageCount", "publishedDate", "publisher", "thumbnail", "title", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE UNIQUE INDEX "Book_googleBooksId_key" ON "Book"("googleBooksId");
CREATE UNIQUE INDEX "Book_openLibraryId_key" ON "Book"("openLibraryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

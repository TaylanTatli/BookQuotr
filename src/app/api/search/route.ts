import { NextResponse } from "next/server";
import { searchGoogleBooks, searchOpenLibrary } from "@/lib/bookSearch";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const source = searchParams.get("source") ?? "all";

    if (!q) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }

    const [google, openLibrary] = await Promise.allSettled([
      source === "openlibrary" ? Promise.resolve([]) : searchGoogleBooks(q),
      source === "google" ? Promise.resolve([]) : searchOpenLibrary(q),
    ]);

    const results = [
      ...(google.status === "fulfilled" ? google.value : []),
      ...(openLibrary.status === "fulfilled" ? openLibrary.value : []),
    ];

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

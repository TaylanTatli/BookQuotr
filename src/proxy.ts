import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const authEnabled = process.env.AUTH_ENABLED === "true";

  if (!authEnabled) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;

  // Allow static files, manifests, icons, and login route
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon.ico") ||
    path.startsWith("/favicon.svg") ||
    path === "/site.webmanifest" ||
    path === "/apple-touch-icon.png" ||
    path === "/favicon-96x96.png" ||
    path === "/web-app-manifest-192x192.png" ||
    path === "/web-app-manifest-512x512.png" ||
    path === "/login" ||
    path === "/api/health" ||
    path === "/api/auth/login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|site\\.webmanifest|apple-touch-icon\\.png|favicon-96x96\\.png|web-app-manifest-192x192\\.png|web-app-manifest-512x512\\.png).*)",
  ],
};

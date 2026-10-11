import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthConfig, verifyToken } from "@/lib/auth"

/**
 * Routes reachable without a session. Everything else — including cover images,
 * the export endpoint and every mutation — requires authentication whenever
 * auth is enabled.
 */
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
])

function isStaticAsset(path: string): boolean {
  return (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path === "/site.webmanifest" ||
    path === "/apple-touch-icon.png" ||
    path === "/web-app-manifest-192x192.png" ||
    path === "/web-app-manifest-512x512.png"
  )
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const config = getAuthConfig()

  // Explicitly configurable authentication-free mode (trusted local use only).
  if (!config.enabled) {
    return NextResponse.next()
  }

  // Fail closed with a clear message when auth is enabled but misconfigured.
  // Details are logged once at startup by src/instrumentation.ts.
  if (config.errors.length > 0) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication is misconfigured on the server" },
        { status: 503 }
      )
    }
    return new NextResponse(
      "Authentication is misconfigured on the server. Check the container logs for details.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    )
  }

  if (isStaticAsset(path) || PUBLIC_PATHS.has(path)) {
    return NextResponse.next()
  }

  // Public random-quote integration is opt-in and documented.
  if (path === "/api/quotes/random" && process.env.PUBLIC_RANDOM_QUOTES === "true") {
    return NextResponse.next()
  }

  const token = request.cookies.get("auth_token")?.value

  if (!token || !(await verifyToken(token))) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|site\\.webmanifest|apple-touch-icon\\.png|favicon-96x96\\.png|web-app-manifest-192x192\\.png|web-app-manifest-512x512\\.png).*)",
  ],
}

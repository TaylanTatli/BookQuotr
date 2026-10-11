import { NextResponse } from "next/server";
import { getAuthConfig, signToken, validateCredentials } from "@/lib/auth";
import {
  clearAttempts,
  isRateLimited,
  recordFailedAttempt,
} from "@/lib/rateLimit";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  const config = getAuthConfig();

  if (!config.enabled) {
    return NextResponse.json(
      { error: "Authentication is disabled" },
      { status: 403 }
    );
  }

  if (config.errors.length > 0) {
    return NextResponse.json(
      { error: "Authentication is misconfigured on the server" },
      { status: 503 }
    );
  }

  const key = clientKey(req);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  let username: unknown;
  let password: unknown;
  try {
    ({ username, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!validateCredentials(username, password)) {
    recordFailedAttempt(key);
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  clearAttempts(key);

  // Only set the Secure flag when actually served over HTTPS (e.g. a reverse
  // proxy), so cookies also work on plain-HTTP self-hosted setups.
  const isSecure =
    req.headers.get("x-forwarded-proto") === "https" ||
    new URL(req.url).protocol === "https:";

  const token = await signToken({ username: config.username });

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "auth_token",
    value: token,
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * config.sessionDays,
    path: "/",
  });

  return response;
}

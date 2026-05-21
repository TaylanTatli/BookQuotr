import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const envUsername = process.env.AUTH_USERNAME || "admin";
    const envPassword = process.env.AUTH_PASSWORD || "bookquotr";

    // Only set Secure flag when actually behind HTTPS (e.g. reverse proxy).
    // This ensures cookies work in Docker/self-hosted HTTP setups too.
    const isSecure = req.headers.get("x-forwarded-proto") === "https";

    if (username === envUsername && password === envPassword) {
      const token = await signToken({ username });

      const response = NextResponse.json({ success: true });
      
      response.cookies.set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

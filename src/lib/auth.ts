import { SignJWT, jwtVerify } from "jose";

/**
 * Authentication configuration and JWT helpers.
 *
 * Secure by default: in production, authentication is enabled unless it is
 * *explicitly* disabled with `AUTH_ENABLED=false` (intended only for trusted,
 * local deployments). A dedicated, strong `AUTH_SECRET` is required to sign
 * tokens — there is deliberately no fallback secret or default password.
 */

const MIN_SECRET_LENGTH = 32;
const DEFAULT_SESSION_DAYS = 30;

export interface AuthConfig {
  enabled: boolean;
  username?: string;
  password?: string;
  secret?: string;
  sessionDays: number;
  /** Human-readable configuration problems; empty when the config is usable. */
  errors: string[];
}

export function getAuthConfig(
  env: Record<string, string | undefined> = process.env
): AuthConfig {
  const explicit = env.AUTH_ENABLED;
  const enabled =
    explicit === "true" ||
    (explicit !== "false" && env.NODE_ENV === "production");

  const username = env.AUTH_USERNAME?.trim() || undefined;
  const password = env.AUTH_PASSWORD || undefined;
  const secret = env.AUTH_SECRET || undefined;

  const rawDays = Number(env.AUTH_SESSION_DAYS);
  const sessionDays =
    Number.isFinite(rawDays) && rawDays > 0 ? Math.trunc(rawDays) : DEFAULT_SESSION_DAYS;

  const errors: string[] = [];
  if (enabled) {
    if (!username) errors.push("AUTH_USERNAME must be set");
    if (!password) errors.push("AUTH_PASSWORD must be set");
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      errors.push(
        `AUTH_SECRET must be set to a random value of at least ${MIN_SECRET_LENGTH} characters (e.g. \`openssl rand -base64 32\`)`
      );
    }
  }

  return { enabled, username, password, secret, sessionDays, errors };
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function getSecretKey(): Uint8Array {
  const { secret, errors } = getAuthConfig();
  if (!secret || errors.length > 0) {
    throw new Error("Authentication is misconfigured: AUTH_SECRET is missing or too short");
  }
  return encode(secret);
}

export async function signToken(payload: Record<string, unknown>) {
  const { sessionDays } = getAuthConfig();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionDays}d`)
    .sign(getSecretKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

/** Length-independent constant-time string comparison. */
function constantTimeEqual(a: string, b: string): boolean {
  const ab = encode(a);
  const bb = encode(b);
  let diff = ab.length ^ bb.length;
  const length = Math.max(ab.length, bb.length);
  for (let i = 0; i < length; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** Validates login credentials against the configured values. */
export function validateCredentials(
  username: unknown,
  password: unknown
): boolean {
  const config = getAuthConfig();
  if (!config.enabled || config.errors.length > 0) return false;
  if (typeof username !== "string" || typeof password !== "string") return false;

  const usernameOk = constantTimeEqual(username, config.username as string);
  const passwordOk = constantTimeEqual(password, config.password as string);
  return usernameOk && passwordOk;
}

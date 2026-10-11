import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getAuthConfig,
  signToken,
  validateCredentials,
  verifyToken,
} from "../src/lib/auth.ts";

test("getAuthConfig defaults to enabled in production", () => {
  const config = getAuthConfig({ NODE_ENV: "production" });
  assert.equal(config.enabled, true);
  assert.equal(config.errors.length > 0, true); // missing credentials => misconfigured
});

test("getAuthConfig defaults to disabled outside production", () => {
  const config = getAuthConfig({ NODE_ENV: "development" });
  assert.equal(config.enabled, false);
  assert.deepEqual(config.errors, []);
});

test("getAuthConfig honours explicit AUTH_ENABLED", () => {
  assert.equal(getAuthConfig({ AUTH_ENABLED: "true", NODE_ENV: "development" }).enabled, true);
  assert.equal(getAuthConfig({ AUTH_ENABLED: "false", NODE_ENV: "production" }).enabled, false);
});

test("getAuthConfig requires credentials and a strong secret", () => {
  const missing = getAuthConfig({ NODE_ENV: "production" });
  assert.equal(missing.errors.length, 3);

  const weak = getAuthConfig({
    NODE_ENV: "production",
    AUTH_USERNAME: "admin",
    AUTH_PASSWORD: "correct horse",
    AUTH_SECRET: "short",
  });
  assert.equal(weak.errors.length, 1);

  const valid = getAuthConfig({
    NODE_ENV: "production",
    AUTH_USERNAME: "admin",
    AUTH_PASSWORD: "correct horse battery",
    AUTH_SECRET: "a".repeat(32),
  });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.enabled, true);
});

test("getAuthConfig parses AUTH_SESSION_DAYS", () => {
  assert.equal(getAuthConfig({ AUTH_SESSION_DAYS: "7" }).sessionDays, 7);
  assert.equal(getAuthConfig({ AUTH_SESSION_DAYS: "-1" }).sessionDays, 30);
  assert.equal(getAuthConfig({ AUTH_SESSION_DAYS: "abc" }).sessionDays, 30);
  assert.equal(getAuthConfig({}).sessionDays, 30);
});

test("validateCredentials compares safely and respects config", () => {
  const saved = { ...process.env };
  try {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      AUTH_ENABLED: "true",
      AUTH_USERNAME: "admin",
      AUTH_PASSWORD: "correct horse battery",
      AUTH_SECRET: "a".repeat(32),
    };

    assert.equal(validateCredentials("admin", "correct horse battery"), true);
    assert.equal(validateCredentials("admin", "wrong"), false);
    assert.equal(validateCredentials("root", "correct horse battery"), false);
    assert.equal(validateCredentials(123, 456), false);
    assert.equal(validateCredentials(undefined, undefined), false);

    process.env = { ...process.env, AUTH_ENABLED: "false" };
    assert.equal(validateCredentials("admin", "correct horse battery"), false);
  } finally {
    process.env = saved;
  }
});

test("signToken/verifyToken round-trip and reject tampering", async () => {
  const saved = { ...process.env };
  try {
    process.env = {
      ...process.env,
      NODE_ENV: "production",
      AUTH_ENABLED: "true",
      AUTH_USERNAME: "admin",
      AUTH_PASSWORD: "correct horse battery",
      AUTH_SECRET: "a".repeat(32),
    };

    const token = await signToken({ username: "admin" });
    assert.equal(typeof token, "string");
    assert.equal((await verifyToken(token))?.username, "admin");
    assert.equal(await verifyToken(`${token}x`), null);
    assert.equal(await verifyToken("not-a-token"), null);
  } finally {
    process.env = saved;
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearAttempts,
  isRateLimited,
  recordFailedAttempt,
} from "../src/lib/rateLimit.ts";

test("isRateLimited allows attempts below the limit", () => {
  const key = "ip-1";
  clearAttempts(key);
  assert.equal(isRateLimited(key), false);
  for (let i = 0; i < 4; i++) recordFailedAttempt(key);
  assert.equal(isRateLimited(key), false);
});

test("isRateLimited blocks once the limit is reached", () => {
  const key = "ip-2";
  for (let i = 0; i < 5; i++) recordFailedAttempt(key);
  assert.equal(isRateLimited(key), true);
});

test("attempts expire after the window", () => {
  const key = "ip-3";
  const now = 1_000_000;
  for (let i = 0; i < 5; i++) recordFailedAttempt(key, 1000, now);
  assert.equal(isRateLimited(key, 5, 1000, now), true);
  assert.equal(isRateLimited(key, 5, 1000, now + 1001), false);
});

test("clearAttempts resets the counter", () => {
  const key = "ip-4";
  for (let i = 0; i < 5; i++) recordFailedAttempt(key);
  assert.equal(isRateLimited(key), true);
  clearAttempts(key);
  assert.equal(isRateLimited(key), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuotes } from "../src/lib/parseQuotes.ts";

test("splits on --- and trims segments", () => {
  assert.deepEqual(parseQuotes("one\n---\ntwo\n---\nthree"), ["one", "two", "three"]);
});

test("accepts 3+ hyphens with surrounding whitespace", () => {
  assert.deepEqual(parseQuotes("a\n  -----  \nb"), ["a", "b"]);
});

test("drops empty segments", () => {
  assert.deepEqual(parseQuotes("\n\n---\n\n"), []);
  assert.deepEqual(parseQuotes("   "), []);
});

test("keeps a single quote intact", () => {
  assert.deepEqual(parseQuotes("just one\nquote"), ["just one\nquote"]);
});

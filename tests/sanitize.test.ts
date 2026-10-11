import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeBookFields,
  sanitizeQuoteFields,
  sanitizeThumbnail,
} from "../src/lib/sanitize.ts";

test("sanitizeBookFields drops unknown keys (mass assignment)", () => {
  const out = sanitizeBookFields({
    title: "Dune",
    author: "Frank Herbert",
    id: "attacker-supplied-id",
    createdAt: "2000-01-01T00:00:00.000Z",
    isAdmin: true,
    quotes: [{ content: "x" }],
  });
  assert.equal(out.title, "Dune");
  assert.equal(out.author, "Frank Herbert");
  assert.equal("id" in out, false);
  assert.equal("createdAt" in out, false);
  assert.equal("isAdmin" in out, false);
  assert.equal("quotes" in out, false);
});

test("sanitizeBookFields includes id/createdAt only for import", () => {
  const out = sanitizeBookFields(
    { title: "Dune", author: "FH", id: "abc", createdAt: "2020-05-01T00:00:00.000Z" },
    { allowId: true }
  );
  assert.equal(out.id, "abc");
  assert.ok(out.createdAt instanceof Date);
});

test("sanitizeBookFields coerces numbers and clamps rating", () => {
  assert.equal(sanitizeBookFields({ title: "t", author: "a", pageCount: "412" }).pageCount, 412);
  assert.equal(sanitizeBookFields({ title: "t", author: "a", pageCount: "nope" }).pageCount, null);
  assert.equal(sanitizeBookFields({ title: "t", author: "a", rating: 5 }).rating, 5);
  assert.equal(sanitizeBookFields({ title: "t", author: "a", rating: 99 }).rating, null);
  assert.equal(sanitizeBookFields({ title: "t", author: "a", rating: -1 }).rating, null);
});

test("sanitizeBookFields ignores empty required fields", () => {
  const out = sanitizeBookFields({ title: "   ", author: "  " });
  assert.equal("title" in out, false);
  assert.equal("author" in out, false);
});

test("sanitizeBookFields drops unsafe thumbnails", () => {
  const base = { title: "t", author: "a" };
  assert.equal(sanitizeBookFields({ ...base, thumbnail: "javascript:alert(1)" }).thumbnail, null);
  assert.equal(sanitizeBookFields({ ...base, thumbnail: "http://127.0.0.1/x" }).thumbnail, null);
  assert.equal(sanitizeBookFields({ ...base, thumbnail: "file:///etc/passwd" }).thumbnail, null);
  assert.equal(
    sanitizeBookFields({ ...base, thumbnail: "https://books.google.com/x.jpg" }).thumbnail,
    "https://books.google.com/x.jpg"
  );
  assert.equal(
    sanitizeBookFields({ ...base, thumbnail: "/api/covers/abc123" }).thumbnail,
    "/api/covers/abc123"
  );
});

test("sanitizeThumbnail returns null for non-strings", () => {
  assert.equal(sanitizeThumbnail(undefined), null);
  assert.equal(sanitizeThumbnail(123), null);
});

test("sanitizeQuoteFields requires non-empty content", () => {
  assert.equal(sanitizeQuoteFields({ content: "   " }), null);
  assert.equal(sanitizeQuoteFields({}), null);
  assert.equal(sanitizeQuoteFields(null), null);
});

test("sanitizeQuoteFields normalises optional fields", () => {
  const quote = sanitizeQuoteFields({
    id: "q1",
    content: "  Hello  ",
    page: "42",
    chapter: "One",
    note: "private",
    extra: "ignored",
  });
  assert.deepEqual(quote, {
    id: "q1",
    content: "Hello",
    page: 42,
    chapter: "One",
    note: "private",
  });
});

test("sanitizeQuoteFields turns invalid page into null", () => {
  assert.equal(sanitizeQuoteFields({ content: "x", page: "abc" })?.page, null);
});

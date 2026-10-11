import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAllowedRemoteUrl,
  isPrivateHostname,
  isSafeCoverId,
  sniffImageType,
} from "../src/lib/security.ts";

test("isSafeCoverId accepts cuid-like and uuid identifiers", () => {
  assert.equal(isSafeCoverId("c1fz03fwn27ji0c597rf3wazy"), true);
  assert.equal(isSafeCoverId("0b8f7e2a-1c3d-4e5f-8a9b-0c1d2e3f4a5b"), true);
  assert.equal(isSafeCoverId("abc_123-xyz"), true);
});

test("isSafeCoverId rejects path traversal and malformed ids", () => {
  for (const bad of [
    "../../etc/passwd",
    "..%2f..%2fetc",
    "a/b",
    "a\\b",
    "foo.bar",
    "",
    "a b",
    "a\0b",
    "x".repeat(65),
    null,
    undefined,
    42,
  ]) {
    assert.equal(isSafeCoverId(bad), false, `expected ${String(bad)} to be rejected`);
  }
});

test("isPrivateHostname flags loopback, private and metadata hosts", () => {
  for (const host of [
    "localhost",
    "app.localhost",
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "metadata",
  ]) {
    assert.equal(isPrivateHostname(host), true, `expected ${host} to be private`);
  }
  assert.equal(isPrivateHostname("books.google.com"), false);
  assert.equal(isPrivateHostname("8.8.8.8"), false);
});

test("isAllowedRemoteUrl permits only public http(s) URLs", () => {
  assert.equal(isAllowedRemoteUrl("https://books.google.com/books/content?id=1"), true);
  assert.equal(isAllowedRemoteUrl("https://covers.openlibrary.org/b/id/1-M.jpg"), true);
  assert.equal(isAllowedRemoteUrl("http://example.com/cover.jpg"), true);

  for (const bad of [
    "http://localhost:3000/x",
    "http://127.0.0.1/x",
    "http://169.254.169.254/latest/meta-data/",
    "http://192.168.0.1/x",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "ftp://example.com/x",
    "not a url",
    null,
  ]) {
    assert.equal(isAllowedRemoteUrl(bad), false, `expected ${String(bad)} to be blocked`);
  }
});

test("sniffImageType detects real image magic bytes", () => {
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime, "image/jpeg");
  assert.equal(
    sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime,
    "image/png"
  );
  assert.equal(
    sniffImageType(Buffer.from("RIFF____WEBP", "ascii"))?.mime,
    "image/webp"
  );
  assert.equal(sniffImageType(Buffer.from("GIF89a", "ascii"))?.mime, "image/gif");
});

test("sniffImageType rejects non-images and truncated data", () => {
  assert.equal(sniffImageType(Buffer.from("hello world", "ascii")), null);
  assert.equal(sniffImageType(Buffer.from("<?php echo 1;", "ascii")), null);
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8])), null);
  assert.equal(sniffImageType(Buffer.alloc(0)), null);
});

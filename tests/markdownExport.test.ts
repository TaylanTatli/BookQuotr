import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMarkdown,
  escapeMarkdown,
  formatQuote,
  libraryMarkdownFilename,
  markdownFilename,
  type MarkdownExportConfig,
  type MarkdownQuote,
} from "../src/lib/markdownExport.ts";

const standard: MarkdownExportConfig = {
  mode: "standard",
  prefix: "",
  suffix: "",
};

const wrapper: MarkdownExportConfig = {
  mode: "wrapper",
  prefix: "<Bookquote>",
  suffix: "</Bookquote>",
};

test("standard mode prefixes every line with a blockquote marker", () => {
  assert.equal(formatQuote("one\ntwo", standard), "> one\n> two");
});

test("standard mode keeps blank lines inside a quote as bare markers", () => {
  assert.equal(
    formatQuote("first\n\nsecond", standard),
    "> first\n>\n> second"
  );
});

test("standard mode preserves inline Markdown and trims surrounding blank lines", () => {
  assert.equal(
    formatQuote("\n**bold** and [link](https://x.y)\n", standard),
    "> **bold** and [link](https://x.y)"
  );
});

test("wrapper mode wraps a single-line quote inline", () => {
  assert.equal(
    formatQuote("Ne kadar çok insan gömülü her birimizin içinde.", wrapper),
    "<Bookquote>Ne kadar çok insan gömülü her birimizin içinde.</Bookquote>"
  );
});

test("wrapper mode puts wrappers on their own lines for multiline quotes", () => {
  assert.equal(
    formatQuote("line one\nline two", wrapper),
    "<Bookquote>\nline one\nline two\n</Bookquote>"
  );
});

test("wrapper mode never adds blockquote markers", () => {
  assert.doesNotMatch(formatQuote("one\ntwo", wrapper), /^> /m);
});

test("wrapper mode supports arbitrary delimiters", () => {
  assert.equal(
    formatQuote("hi", { mode: "wrapper", prefix: "BEGIN ", suffix: " END" }),
    "BEGIN hi END"
  );
  assert.equal(
    formatQuote("hi", { mode: "wrapper", prefix: "", suffix: "" }),
    "hi"
  );
});

test("wrapper mode escapes MDX-sensitive characters without adding markers", () => {
  assert.equal(
    formatQuote("if (a < b) { return }", wrapper),
    "<Bookquote>if (a \\< b) \\{ return \\}</Bookquote>"
  );
});

test("empty content yields an empty quote", () => {
  assert.equal(formatQuote("   \n ", standard), "");
  assert.equal(formatQuote("", wrapper), "");
});

test("normalizes CRLF line endings", () => {
  assert.equal(formatQuote("one\r\ntwo", standard), "> one\n> two");
});

test("markdownFilename produces filesystem-safe names with Turkish transliteration", () => {
  assert.equal(markdownFilename("Kürk Mantolu Madonna"), "kurk-mantolu-madonna.md");
  assert.equal(markdownFilename("Şeker Portakalı"), "seker-portakali.md");
  assert.equal(markdownFilename("İnce Memed"), "ince-memed.md");
  assert.equal(markdownFilename("Dune: Messiah / Part 2"), "dune-messiah-part-2.md");
});

test("markdownFilename falls back and caps length", () => {
  assert.equal(markdownFilename("***"), "book.md");
  assert.equal(markdownFilename("   "), "book.md");
  assert.ok(markdownFilename("a".repeat(200)).length <= 83);
});

test("libraryMarkdownFilename uses the requested date", () => {
  assert.equal(
    libraryMarkdownFilename(new Date("2026-11-13T12:00:00Z")),
    "bookquotr-quotes-2026-11-13.md"
  );
});

test("formatQuoteMeta is rendered from available metadata only", () => {
  const book = (quote: object) => [
    { title: "T", author: "A", quotes: [{ content: "q", ...quote }] },
  ];
  assert.match(buildMarkdown(book({ page: 42 }), standard), /\*Page 42\*/);
  assert.match(
    buildMarkdown(book({ chapter: "Chapter 3", page: 87 }), standard),
    /\*Chapter 3 · Page 87\*/
  );
  assert.match(buildMarkdown(book({ chapter: "Chapter 3" }), standard), /\*Chapter 3\*/);
  assert.ok(!buildMarkdown(book({ page: 0, chapter: "  " }), standard).includes("*Page"));
  const noMeta = buildMarkdown(book({ page: null, chapter: null }), standard);
  assert.ok(!noMeta.includes("*Page") && !noMeta.includes("Chapter"));
});

test("document structure follows titles, author, quotes and separators", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "Book Title",
        author: "Author Name",
        quotes: [{ content: "First", page: 42 }, { content: "Second" }],
      },
      {
        title: "Another Book",
        author: "Another Author",
        quotes: [{ content: "Third", chapter: "Chapter 3", page: 87 }],
      },
    ],
    standard
  );

  assert.equal(
    markdown,
    [
      "# Book Title",
      "",
      "**Author:** Author Name",
      "",
      "> First",
      "",
      "*Page 42*",
      "",
      "---",
      "",
      "> Second",
      "",
      "---",
      "",
      "# Another Book",
      "",
      "**Author:** Another Author",
      "",
      "> Third",
      "",
      "*Chapter 3 · Page 87*",
      "",
    ].join("\n")
  );
});

test("titles and metadata are escaped, quote content is not", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "Notes #1",
        author: "Mark *Twain*",
        quotes: [{ content: "*kept as written*", chapter: "C# 101" }],
      },
    ],
    standard
  );
  assert.match(markdown, /^# Notes \\#1$/m);
  assert.match(markdown, /\*\*Author:\*\* Mark \\\*Twain\\\*/);
  assert.match(markdown, /^\*C\\# 101\*$/m);
  assert.match(markdown, /^> \*kept as written\*$/m);
});

test("Turkish characters survive in content and titles", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "Şeker Portakalı",
        author: "José Mauro de Vasconcelos",
        quotes: [{ content: "Acı çekmek, öğrenmenin bir parçasıdır." }],
      },
    ],
    wrapper
  );
  assert.match(markdown, /^# Şeker Portakalı$/m);
  assert.ok(markdown.includes("<Bookquote>Acı çekmek, öğrenmenin bir parçasıdır.</Bookquote>"));
});

test("private notes are never exported", () => {
  // Quote rows carry a `note` field; the markdown types deliberately ignore it.
  const quotes: (MarkdownQuote & { note: string })[] = [
    { content: "public quote", note: "private note" },
  ];
  const markdown = buildMarkdown(
    [{ title: "T", author: "A", quotes }],
    standard
  );
  assert.ok(!markdown.includes("private note"));
});

test("quote separation defaults to a separator with blank lines", () => {
  const markdown = buildMarkdown(
    [{ title: "T", author: "A", quotes: [{ content: "one" }, { content: "two" }] }],
    standard
  );
  assert.ok(markdown.includes("> one\n\n---\n\n> two"));
});

test("the quote separator can be disabled while blank lines stay", () => {
  const markdown = buildMarkdown(
    [{ title: "T", author: "A", quotes: [{ content: "one" }, { content: "two" }] }],
    { ...standard, separator: false }
  );
  assert.ok(markdown.includes("> one\n\n> two"));
  assert.ok(!markdown.includes("---"));
});

test("blank lines can be disabled while the separator stays", () => {
  const markdown = buildMarkdown(
    [{ title: "T", author: "A", quotes: [{ content: "one" }, { content: "two" }] }],
    { ...standard, blankLine: false }
  );
  assert.ok(markdown.includes("> one\n---\n> two"));
});

test("both options off puts consecutive quotes on adjacent lines", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "T",
        author: "A",
        quotes: [
          { content: "First quote." },
          { content: "Second quote." },
          { content: "Third quote." },
        ],
      },
    ],
    { ...wrapper, separator: false, blankLine: false }
  );
  assert.ok(
    markdown.includes(
      [
        "<Bookquote>First quote.</Bookquote>",
        "<Bookquote>Second quote.</Bookquote>",
        "<Bookquote>Third quote.</Bookquote>",
      ].join("\n")
    )
  );
  assert.ok(!markdown.includes("---"));
});

test("quote separation settings never collapse book separation", () => {
  const markdown = buildMarkdown(
    [
      { title: "One", author: "A", quotes: [{ content: "first" }] },
      { title: "Two", author: "B", quotes: [{ content: "second" }] },
    ],
    { ...wrapper, separator: false, blankLine: false }
  );
  assert.ok(markdown.includes("</Bookquote>\n\n---\n\n# Two"));
});

test("line breaks inside a quote survive the compactest separation", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "T",
        author: "A",
        quotes: [{ content: "line one\nline two" }, { content: "next" }],
      },
    ],
    { ...wrapper, separator: false, blankLine: false }
  );
  assert.ok(
    markdown.includes(
      "<Bookquote>\nline one\nline two\n</Bookquote>\n<Bookquote>next</Bookquote>"
    )
  );
});

test("quotes only + wrappers emits exactly the quote lines", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "Hidden",
        author: "Hidden",
        quotes: [
          { content: "First quote." },
          { content: "Second quote." },
          { content: "Third quote." },
        ],
      },
    ],
    { ...wrapper, quotesOnly: true, separator: false, blankLine: false }
  );
  assert.equal(
    markdown,
    [
      "<Bookquote>First quote.</Bookquote>",
      "<Bookquote>Second quote.</Bookquote>",
      "<Bookquote>Third quote.</Bookquote>",
      "",
    ].join("\n")
  );
});

test("quotes only excludes titles, authors and all metadata", () => {
  const quotes: (MarkdownQuote & { note: string })[] = [
    {
      content: "just the quote",
      chapter: "Chapter 1",
      page: 12,
      note: "private note",
    },
  ];
  const markdown = buildMarkdown(
    [{ title: "A Title", author: "An Author", quotes }],
    { ...standard, quotesOnly: true }
  );
  assert.equal(markdown, "> just the quote\n");
  for (const excluded of ["A Title", "An Author", "Chapter 1", "Page", "private note", "#"]) {
    assert.ok(!markdown.includes(excluded), `should omit ${excluded}`);
  }
});

test("quotes only still honours the separator preferences", () => {
  const books = [
    { title: "T", author: "A", quotes: [{ content: "one" }, { content: "two" }] },
  ];
  assert.ok(
    buildMarkdown(books, { ...standard, quotesOnly: true }).includes(
      "> one\n\n---\n\n> two"
    )
  );
  assert.ok(
    buildMarkdown(books, { ...standard, quotesOnly: true, separator: false }).includes(
      "> one\n\n> two"
    )
  );
});

test("quotes only preserves multiline quote content", () => {
  const markdown = buildMarkdown(
    [
      {
        title: "T",
        author: "A",
        quotes: [{ content: "line one\nline two" }, { content: "next" }],
      },
    ],
    { ...wrapper, quotesOnly: true, separator: false, blankLine: false }
  );
  assert.equal(
    markdown,
    "<Bookquote>\nline one\nline two\n</Bookquote>\n<Bookquote>next</Bookquote>\n"
  );
});

test("quotes only disabled keeps the existing document structure", () => {
  const markdown = buildMarkdown(
    [{ title: "A Title", author: "An Author", quotes: [{ content: "q", page: 3 }] }],
    { ...standard, quotesOnly: false }
  );
  assert.equal(markdown, "# A Title\n\n**Author:** An Author\n\n> q\n\n*Page 3*\n");
});

test("full-library exports keep headings and book separators", () => {
  const markdown = buildMarkdown(
    [
      { title: "One", author: "A", quotes: [{ content: "first" }] },
      { title: "Two", author: "B", quotes: [{ content: "second" }] },
    ],
    { ...standard, quotesOnly: false }
  );
  assert.match(markdown, /^# One$/m);
  assert.match(markdown, /^# Two$/m);
  assert.ok(markdown.includes("> first\n\n---\n\n# Two"));
});

test("a selection without non-empty quotes produces no document", () => {
  assert.equal(buildMarkdown([], standard), "");
  assert.equal(
    buildMarkdown([{ title: "Empty", author: "Nobody", quotes: [] }], standard),
    ""
  );
  assert.equal(
    buildMarkdown(
      [{ title: "Blank", author: "A", quotes: [{ content: " \n\t " }] }],
      wrapper
    ),
    ""
  );
});

test("a library with at least one quote still exports book sections", () => {
  const markdown = buildMarkdown(
    [
      { title: "Empty", author: "Nobody", quotes: [] },
      { title: "Full", author: "Someone", quotes: [{ content: "kept" }] },
    ],
    standard
  );
  assert.match(markdown, /^# Empty$/m);
  assert.match(markdown, /^# Full$/m);
  assert.match(markdown, /^> kept$/m);
});

test("missing author is omitted", () => {
  const markdown = buildMarkdown(
    [{ title: "No Author", author: "  ", quotes: [{ content: "q" }] }],
    standard
  );
  assert.ok(!markdown.includes("**Author:**"));
});

test("escapeMarkdown flattens newlines", () => {
  assert.equal(escapeMarkdown("a\nb"), "a b");
});

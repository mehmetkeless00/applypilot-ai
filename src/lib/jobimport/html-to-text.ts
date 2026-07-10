import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// Cheerio-based HTML→text for the generic import path, where pages are
// arbitrary and messy. The provider adapters keep the lightweight regex
// converter in html.ts — their HTML is simple and well-formed.

const REMOVE_SELECTOR = "script, style, noscript, template, iframe, svg, canvas";

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "main",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "tr",
  "blockquote",
  "figure",
  "dl",
  "dt",
  "dd",
]);

function nodeToText($: cheerio.CheerioAPI, node: AnyNode): string {
  if (node.type === "text") {
    return (node as { data?: string }).data ?? "";
  }
  if (node.type !== "tag") return "";

  const el = node as unknown as { tagName: string; children: AnyNode[] };
  const tag = el.tagName.toLowerCase();
  if (tag === "br") return "\n";

  const inner = el.children.map((child) => nodeToText($, child)).join("");
  if (tag === "li") return `• ${inner}\n`;
  if (BLOCK_TAGS.has(tag)) return `\n${inner}\n`;
  return inner;
}

function collapse(text: string): string {
  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Converts an HTML fragment (or whole page body) to clean readable text. */
export function htmlToCleanText(html: string): string {
  const $ = cheerio.load(html);
  $(REMOVE_SELECTOR).remove();
  const root = $("body")[0] ?? $.root()[0];
  const text = root
    ? (root as unknown as { children: AnyNode[] }).children
        .map((child) => nodeToText($, child))
        .join("")
    : "";
  return collapse(text);
}

/** Converts an already-selected cheerio element's contents to clean text. */
export function elementToCleanText(
  $: cheerio.CheerioAPI,
  element: AnyNode,
): string {
  const children = (element as unknown as { children?: AnyNode[] }).children ?? [];
  return collapse(children.map((child) => nodeToText($, child)).join(""));
}

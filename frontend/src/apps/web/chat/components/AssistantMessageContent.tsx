import { useMemo } from "react";

interface AssistantMessageContentProps {
  content: string;
}

const ALLOWED_TAGS = new Set(["A", "B", "BLOCKQUOTE", "BR", "CODE", "EM", "I", "LI", "OL", "P", "PRE", "STRONG", "UL"]);
const BLOCK_HTML_TAG_PATTERN = /<(p|ul|ol|li|pre|blockquote|br)\b/i;
const INLINE_HTML_TAG_PATTERN = /<\/?(?:a\b[^>]*|strong|b|em|i|code)>/gi;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineFormatting(input: string): string {
  const preservedTags: string[] = [];
  const withPlaceholders = input.replace(INLINE_HTML_TAG_PATTERN, (match) => {
    const placeholder = `@@HTMLTAG${preservedTags.length}@@`;
    preservedTags.push(match);
    return placeholder;
  });

  let output = escapeHtml(withPlaceholders);

  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\[([^\]]+)\]\(((?:https?:|mailto:|tg:)[^)\s]+)\)/g, '<a href="$2">$1</a>');
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__(.+?)__/g, "<strong>$1</strong>");
  output = output.replace(/(^|[\s(])\*(?!\s)(.+?)(?<!\s)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  output = output.replace(/(^|[\s(])_(?!\s)(.+?)(?<!\s)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  output = output.replace(/@@HTMLTAG(\d+)@@/g, (_, index: string) => preservedTags[Number(index)] || "");

  return output;
}

function expandInlineLists(input: string): string {
  let output = input.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");

  output = output.replace(/([:;])\s+([\-*•])\s+/g, "$1\n$2 ");
  output = output.replace(/([.!?])\s+([\-*•])\s+/g, "$1\n$2 ");
  output = output.replace(/([^\n])\s+(\d+[.)]\s+)/g, "$1\n$2");
  output = output.replace(/([:;])\s+(\d+[.)]\s+)/g, "$1\n$2");
  output = output.replace(/([.!?])\s+(\d+[.)]\s+)/g, "$1\n$2");
  output = output.replace(/\n{3,}/g, "\n\n");

  return output.trim();
}

function formatPlainTextToHtml(input: string): string {
  const lines = expandInlineLists(input).split("\n");
  const chunks: string[] = [];
  let paragraphLines: string[] = [];
  let unorderedListItems: string[] = [];
  let orderedListItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    chunks.push(`<p>${paragraphLines.map((line) => applyInlineFormatting(line)).join("<br />")}</p>`);
    paragraphLines = [];
  };

  const flushLists = () => {
    if (unorderedListItems.length) {
      chunks.push(`<ul>${unorderedListItems.map((item) => `<li>${applyInlineFormatting(item)}</li>`).join("")}</ul>`);
      unorderedListItems = [];
    }
    if (orderedListItems.length) {
      chunks.push(`<ol>${orderedListItems.map((item) => `<li>${applyInlineFormatting(item)}</li>`).join("")}</ol>`);
      orderedListItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^\s*(?:[-*•]|[—–-](?=\s))\s+(.*)$/);
    const orderedMatch = line.match(/^\s*\d+(?:[.)]|(?=\s))\s+(.*)$/);

    if (!line.trim()) {
      flushParagraph();
      flushLists();
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      if (orderedListItems.length) {
        flushLists();
      }
      unorderedListItems.push(bulletMatch[1].trim());
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      if (unorderedListItems.length) {
        flushLists();
      }
      orderedListItems.push(orderedMatch[1].trim());
      continue;
    }

    flushLists();
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushLists();

  return chunks.length ? chunks.join("") : `<p>${applyInlineFormatting(input)}</p>`;
}

function normalizeContent(input: string): string {
  if (BLOCK_HTML_TAG_PATTERN.test(input)) {
    return input;
  }

  return formatPlainTextToHtml(input);
}

function sanitizeHtml(input: string): string {
  if (typeof window === "undefined") {
    return input;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(input, "text/html");

  const sanitizeNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent || "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    if (!ALLOWED_TAGS.has(element.tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(element.childNodes).forEach((child) => {
        const sanitizedChild = sanitizeNode(child);
        if (sanitizedChild) {
          fragment.appendChild(sanitizedChild);
        }
      });
      return fragment;
    }

    const clean = document.createElement(element.tagName.toLowerCase());

    if (element.tagName === "A") {
      const href = element.getAttribute("href") || "";
      if (/^(https?:|mailto:|tg:)/i.test(href)) {
        clean.setAttribute("href", href);
        clean.setAttribute("target", "_blank");
        clean.setAttribute("rel", "noreferrer");
      }
    }

    Array.from(element.childNodes).forEach((child) => {
      const sanitizedChild = sanitizeNode(child);
      if (sanitizedChild) {
        clean.appendChild(sanitizedChild);
      }
    });

    return clean;
  };

  const wrapper = document.createElement("div");
  Array.from(document.body.childNodes).forEach((child) => {
    const sanitizedChild = sanitizeNode(child);
    if (sanitizedChild) {
      wrapper.appendChild(sanitizedChild);
    }
  });

  return wrapper.innerHTML;
}

export function getAssistantMessagePlainText(content: string): string {
  const normalized = normalizeContent(content);
  const sanitized = sanitizeHtml(normalized);

  if (typeof window === "undefined") {
    return sanitized;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = sanitized;

  return (wrapper.innerText || wrapper.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

export default function AssistantMessageContent({ content }: AssistantMessageContentProps) {
  const sanitized = useMemo(() => sanitizeHtml(normalizeContent(content)), [content]);

  return <div className="message-rich whitespace-normal" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

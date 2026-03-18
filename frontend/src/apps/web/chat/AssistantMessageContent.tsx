import { useMemo } from "react";

interface AssistantMessageContentProps {
  content: string;
}

const ALLOWED_TAGS = new Set(["A", "B", "BLOCKQUOTE", "BR", "CODE", "EM", "I", "LI", "OL", "P", "PRE", "STRONG", "UL"]);

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyInlineFormatting(input: string): string {
  return input
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(?!\s)(.+?)(?<!\s)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_(?!\s)(.+?)(?<!\s)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
}

function expandInlineLists(input: string): string {
  let output = input.replace(/(\d+[.)]\s+)/g, "\n$1").replace(/\n{2,}/g, "\n");
  output = output.replace(/(?:^|\n)([-*]\s+)/g, "\n$1").replace(/\n{2,}/g, "\n");
  return output.trim();
}

function formatPlainTextToHtml(input: string): string {
  const lines = expandInlineLists(input).replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let paragraphLines: string[] = [];
  let unorderedListItems: string[] = [];
  let orderedListItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    chunks.push(`<p>${paragraphLines.map((line) => applyInlineFormatting(escapeHtml(line))).join("<br />")}</p>`);
    paragraphLines = [];
  };

  const flushLists = () => {
    if (unorderedListItems.length) {
      chunks.push(`<ul>${unorderedListItems.map((item) => `<li>${applyInlineFormatting(escapeHtml(item))}</li>`).join("")}</ul>`);
      unorderedListItems = [];
    }
    if (orderedListItems.length) {
      chunks.push(`<ol>${orderedListItems.map((item) => `<li>${applyInlineFormatting(escapeHtml(item))}</li>`).join("")}</ol>`);
      orderedListItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (!line.trim()) {
      flushParagraph();
      flushLists();
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      orderedListItems = [];
      unorderedListItems.push(bulletMatch[1].trim());
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      unorderedListItems = [];
      orderedListItems.push(orderedMatch[1].trim());
      continue;
    }

    flushLists();
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushLists();

  return chunks.length ? chunks.join("") : `<p>${applyInlineFormatting(escapeHtml(input))}</p>`;
}

function normalizeContent(input: string): string {
  const normalizedMarkdown = input
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*(?!\s)(.+?)(?<!\s)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_(?!\s)(.+?)(?<!\s)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");

  if (/<[a-z][\s\S]*>/i.test(normalizedMarkdown)) {
    return normalizedMarkdown;
  }

  return formatPlainTextToHtml(normalizedMarkdown);
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

export default function AssistantMessageContent({ content }: AssistantMessageContentProps) {
  const sanitized = useMemo(() => sanitizeHtml(normalizeContent(content)), [content]);

  return (
    <div
      className="message-rich whitespace-normal"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

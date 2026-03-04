import asyncio
import html
import logging
import re

from google import genai

from utils.messages import get_text

logger = logging.getLogger(__name__)


class GeminiHelper:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model
        self.client = genai.Client(api_key=api_key)

    async def generate_answer(self, question: str, language: str = "ru", contexts: list[str] | None = None) -> str:
        if not contexts:
            return self._empty_context(language)

        context_block = "\n\n".join(contexts)
        prompt = (
            "Answer the QUESTION using only DOCUMENTS.\n"
            "Reply in the same language as the QUESTION (English/Russian/Kyrgyz).\n"
            "Never change the language even if DOCUMENTS use another language.\n"
            "If DOCUMENTS contain relevant info, answer using it.\n"
            "If partially relevant, answer only with what exists in DOCUMENTS.\n"
            "If nothing relevant, return one short 'not found' sentence in the same language.\n"
            "Answer in 3-6 short lines using line breaks.\n"
            "Plain text only. Allowed HTML tags: <b>, <i>, <code>. No Markdown.\n\n"
            f"DOCUMENTS:\n{context_block}\n\n"
            f"QUESTION:\n{question}"
        )

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=prompt,
            )
        except Exception:
            logger.exception("Gemini generate_content failed")
            return self._error_message(language)

        text = getattr(response, "text", None)
        if text and text.strip():
            return self._markdownish_to_html(text.strip())

        return self._empty_message(language)

    @staticmethod
    def _markdownish_to_html(text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return ""

        if GeminiHelper._looks_like_html(normalized):
            return GeminiHelper._normalize_existing_html(normalized)

        code_blocks: list[str] = []

        def code_block_repl(match: re.Match[str]) -> str:
            code = html.escape(match.group(1).strip("\n"))
            index = len(code_blocks)
            code_blocks.append(f"<pre><code>{code}</code></pre>")
            return f"@@CODE_BLOCK_{index}@@"

        normalized = re.sub(
            r"```(?:[^\n`]*)\n(.*?)```",
            code_block_repl,
            normalized,
            flags=re.S,
        )

        escaped = html.escape(normalized)
        escaped = re.sub(r"(?m)^#{1,3}\s+(.+)$", r"<b>\1</b>", escaped)
        escaped = re.sub(r"`([^`\n]+)`", r"<code>\1</code>", escaped)
        escaped = re.sub(r"\*\*([^*\n]+)\*\*", r"<b>\1</b>", escaped)
        escaped = re.sub(r"__([^_\n]+)__", r"<b>\1</b>", escaped)
        escaped = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", escaped)
        escaped = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"<i>\1</i>", escaped)

        for index, block in enumerate(code_blocks):
            escaped = escaped.replace(f"@@CODE_BLOCK_{index}@@", block)

        return escaped

    @staticmethod
    def _normalize_existing_html(text: str) -> str:
        normalized = text
        normalized = re.sub(r"\*\*([^*\n]+)\*\*", r"<b>\1</b>", normalized)
        normalized = re.sub(r"__([^_\n]+)__", r"<b>\1</b>", normalized)
        normalized = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<i>\1</i>", normalized)
        normalized = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"<i>\1</i>", normalized)
        return normalized

    @staticmethod
    def _looks_like_html(text: str) -> bool:
        return bool(
            re.search(
                r"</?(b|strong|i|em|u|s|code|pre|a|blockquote)(?:\s+[^>]*)?>",
                text,
                flags=re.I,
            )
        )

    @staticmethod
    def _error_message(language: str) -> str:
        return get_text(language, "general_error")

    @staticmethod
    def _empty_message(language: str) -> str:
        return get_text(language, "general_error")

    @staticmethod
    def _empty_context(language: str) -> str:
        return get_text(language, "no_context")

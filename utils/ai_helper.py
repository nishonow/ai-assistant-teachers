import asyncio
import html
import logging
import re

from openai import OpenAI

from utils.messages import get_text

logger = logging.getLogger(__name__)


class OpenAIHelper:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model
        self.client = OpenAI(api_key=api_key)

    async def generate_answer(self, question: str, language: str = "ru", contexts: list[str] | None = None) -> str:
        if not contexts:
            return self._empty_context(language)

        context_block = "\n\n".join(contexts)
        question_language = await self._detect_question_language(question, fallback=language)
        prompt = (
            "Answer QUESTION using only the information from DOCUMENTS.\n"
            f"Reply in exactly the same language: {question_language}.\n"
            "Do not invent rules, procedures, deadlines, or penalties.\n"
            "State the answer directly.\n"
            "Do not use meta phrases like 'the documents say' or 'according to the documents'.\n"
            "If DOCUMENTS contain any relevant details, provide them first as the answer.\n"
            "Only if exact details are missing, say briefly what is not specified.\n"
            "If nothing relevant exists at all, give a short polite no-info answer without mentioning documents.\n"
            "Keep the answer concise (3-6 short lines).\n"
            "Structure: short explanation first, then actions if needed. Separate sections with one blank line.\n"
            "Use HTML tags for clarity: <b>, <u>. Wrap key relevant terms or actions in <b>...</b>, at least once.\n"
            "Use '•' bullets for actions (max 4).\n\n"
            f"DOCUMENTS:\n{context_block}\n\n"
            f"QUESTION:\n{question}"
        )

        try:
            response = await asyncio.to_thread(
                self.client.responses.create,
                model=self.model,
                input=prompt,
            )
        except Exception:
            logger.exception("OpenAI response generation failed")
            return self._error_message(language)

        text = self._extract_response_text(response)
        if text and text.strip():
            return self._markdownish_to_html(text.strip())

        return self._empty_message(language)

    @staticmethod
    def _markdownish_to_html(text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return ""

        if OpenAIHelper._looks_like_html(normalized):
            return OpenAIHelper._normalize_existing_html(normalized)

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
        normalized = re.sub(r"(?m)^\s*\d+[\.)]\s+", "• ", normalized)
        normalized = re.sub(r"(?m)^\s*[-*•·–—]\s+", "• ", normalized)

        escaped = html.escape(normalized)
        escaped = re.sub(r"(?m)^#{1,3}\s+(.+)$", r"<b>\1</b>", escaped)
        escaped = re.sub(r"`([^`\n]+)`", r"\1", escaped)
        escaped = re.sub(r"\*\*([^*\n]+)\*\*", r"<b>\1</b>", escaped)
        escaped = re.sub(r"__([^_\n]+)__", r"<b>\1</b>", escaped)
        escaped = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<u>\1</u>", escaped)
        escaped = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"<u>\1</u>", escaped)

        for index, block in enumerate(code_blocks):
            escaped = escaped.replace(f"@@CODE_BLOCK_{index}@@", block)

        return escaped

    @staticmethod
    def _extract_response_text(response: object) -> str:
        text = getattr(response, "output_text", None)
        if isinstance(text, str) and text.strip():
            return text

        output = getattr(response, "output", None)
        if isinstance(output, list):
            pieces: list[str] = []
            for item in output:
                content = getattr(item, "content", None)
                if not isinstance(content, list):
                    continue
                for part in content:
                    part_text = getattr(part, "text", None)
                    if isinstance(part_text, str) and part_text.strip():
                        pieces.append(part_text)
            if pieces:
                return "\n".join(pieces)

        return ""

    @staticmethod
    def _normalize_existing_html(text: str) -> str:
        normalized = text
        normalized = re.sub(r"(?m)^\s*\d+[\.)]\s+", "• ", normalized)
        normalized = re.sub(r"(?m)^\s*[-*•·–—]\s+", "• ", normalized)
        normalized = re.sub(r"(?i)<\s*strong\s*>", "<b>", normalized)
        normalized = re.sub(r"(?i)<\s*/\s*strong\s*>", "</b>", normalized)
        normalized = re.sub(r"(?i)<\s*em\s*>", "<u>", normalized)
        normalized = re.sub(r"(?i)<\s*/\s*em\s*>", "</u>", normalized)
        normalized = re.sub(r"(?i)<\s*i\s*>", "<u>", normalized)
        normalized = re.sub(r"(?i)<\s*/\s*i\s*>", "</u>", normalized)
        normalized = re.sub(r"(?i)</?(code|pre|a|blockquote)(?:\s+[^>]*)?>", "", normalized)
        normalized = re.sub(r"\*\*([^*\n]+)\*\*", r"<b>\1</b>", normalized)
        normalized = re.sub(r"__([^_\n]+)__", r"<b>\1</b>", normalized)
        normalized = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<u>\1</u>", normalized)
        normalized = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"<u>\1</u>", normalized)
        return normalized

    async def _detect_question_language(self, question: str, fallback: str = "ru") -> str:
        normalized_question = re.sub(r"\s+", " ", question).strip()
        if not normalized_question:
            return self._map_fallback_language(fallback)

        prompt = (
            "Detect the language of QUESTION. "
            "Return only one value from this list: English, Russian, Kyrgyz, Uzbek, Turkish, Azerbaijani, Other.\n\n"
            f"QUESTION:\n{normalized_question}"
        )

        try:
            response = await asyncio.to_thread(
                self.client.responses.create,
                model=self.model,
                input=prompt,
            )
            detected = self._extract_response_text(response).strip()
            detected_lower = detected.lower()
            allowed = {
                "english": "English",
                "russian": "Russian",
                "kyrgyz": "Kyrgyz",
                "uzbek": "Uzbek",
                "turkish": "Turkish",
                "azerbaijani": "Azerbaijani",
                "other": self._map_fallback_language(fallback),
            }
            if detected_lower in allowed:
                return allowed[detected_lower]
        except Exception:
            logger.warning("Language detection call failed; fallback=%s", fallback)

        return self._map_fallback_language(fallback)

    @staticmethod
    def _map_fallback_language(fallback: str) -> str:
        mapping = {
            "ru": "Russian",
            "kg": "Kyrgyz",
            "en": "English",
            "uz": "Uzbek",
            "tr": "Turkish",
            "az": "Azerbaijani",
        }
        return mapping.get(str(fallback).lower(), "English")

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

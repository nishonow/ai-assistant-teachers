import asyncio
import html
import logging
import re

from google import genai


logger = logging.getLogger(__name__)


class GeminiHelper:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model
        self.client = genai.Client(api_key=api_key)

    async def generate_answer(self, question: str, language: str = "ru", contexts: list[str] | None = None) -> str:
        if not contexts:
            return self._empty_context(language)

        language_name = "Russian" if language == "ru" else "Kyrgyz"
        context_block = "\n\n".join(contexts)

        prompt = (
            f"Answer in {language_name}. Use only CONTEXT. "
            "If not enough context, say not found in uploaded documents. "
            "Keep it concise but useful: 2-4 short sentences with direct action steps when available. "
            "No markdown.\n\n"
            f"CONTEXT:\n{context_block}\n\n"
            f"QUESTION: {question}"
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
        escaped = re.sub(r"(?m)^\s*[-*]\s+", "• ", escaped)
        escaped = re.sub(r"(?m)^\s*\d+\.\s+", "• ", escaped)
        escaped = re.sub(r"(?m)^\s*&gt;\s*", "❯ ", escaped)
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
        normalized = re.sub(r"(?m)^\s*[-*]\s+", "• ", normalized)
        normalized = re.sub(r"(?m)^\s*\d+\.\s+", "• ", normalized)
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
        if language == "kg":
            return "⚠️ Азыр жооп ала алган жокмун. Кийинчерээк кайра аракет кылыңыз."

        return "⚠️ Сейчас не удалось получить ответ. Попробуйте позже."

    @staticmethod
    def _empty_message(language: str) -> str:
        if language == "kg":
            return "⚠️ Тилекке каршы, жооп түзүлгөн жок."

        return "⚠️ К сожалению, ответ не сформировался."

    @staticmethod
    def _empty_context(language: str) -> str:
        if language == "kg":
            return "📄 Жүктөлгөн документтерден бул суроого маалымат табылган жок."

        return "📄 В загруженных документах не найдено данных по этому вопросу."

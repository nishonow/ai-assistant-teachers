import asyncio
import html
import re

from google import genai


class GeminiHelper:
    def __init__(self, api_key: str, model: str) -> None:
        self.model = model
        self.client = genai.Client(api_key=api_key)

    async def generate_answer(self, question: str, language: str = "ru") -> str:
        language_name = "Russian" if language == "ru" else "Kyrgyz"
        prompt = (
            "You are an AI legal assistant for teachers in Kyrgyzstan. "
            "Give practical and clear legal guidance in education context. "
            "Default style: very concise and direct. "
            "For simple questions, answer in 1-3 short sentences (about 30-80 words). "
            "Do not add sections like 'Conclusion', 'Key points', or 'Practical steps' unless user explicitly asks. "
            "Use bullets only when truly needed, max 3 bullets by default. "
            "Expand only when user asks for details or the case is complex/high-risk. "
            "Avoid long introductions and avoid repeating generic disclaimers in each reply. "
            "If the user asks what to do, give a direct action-oriented answer first. "
            "Do not use markdown symbols; use plain text or simple HTML tags only.\n\n"
            f"Reply in {language_name}.\n\n"
            f"Question: {question}"
        )

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=self.model,
                contents=prompt,
            )
        except Exception:
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
            return "Азыр жооп ала алган жокмун. Сураныч, кайра аракет кылыңыз."

        return "Сейчас не удалось получить ответ. Пожалуйста, попробуйте еще раз."

    @staticmethod
    def _empty_message(language: str) -> str:
        if language == "kg":
            return "Тилекке каршы, так жооп табылган жок. Суроону башкача бериңиз."

        return "К сожалению, не получилось сформировать точный ответ. Попробуйте переформулировать вопрос."

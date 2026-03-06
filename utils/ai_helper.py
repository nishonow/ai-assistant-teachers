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

    async def generate_answer(
        self,
        question: str,
        language: str = "ru",
        contexts: list[str] | None = None,
        chat_history: list[dict[str, str]] | None = None,
    ) -> str:
        if not contexts:
            return self._empty_context(language)

        context_block = "\n\n".join(contexts)
        history_block = self._format_chat_history(chat_history)
        question_language = await self._detect_question_language(question, fallback=language)
        history_section = f"CHAT_HISTORY:\n{history_block}\n\n" if history_block else ""

        prompt = (
            "Use DOCUMENTS to answer QUESTION.\n"
            f"Answer in the same language as QUESTION (target: {question_language}); do not mix languages.\n"
            "Use CHAT_HISTORY only to resolve references in follow-up questions; never use it as a factual source.\n"
            "If a follow-up reference is clear, name the resolved subject in the first sentence; if unclear, ask one short clarifying question.\n"
            "Do not invent facts, rules, procedures, deadlines, or penalties.\n"
            "If DOCUMENTS cover the question, answer directly with those details. If partially covered, briefly say what is missing. If not covered, give a short polite no-info answer.\n"
            "Avoid meta phrases like 'according to the documents'.\n"
            "Keep it concise (3-6 short lines): short explanation first, then actions if needed.\n"
            "Format for Telegram HTML: use <b> for key terms and up to 4 • bullet actions.\n\n"
            f"{history_section}"
            f"DOCUMENTS:\n{context_block}\n\n"
            f"QUESTION:\n{question}"
        )

        try:
            response = await asyncio.to_thread(
                self.client.responses.create,
                model=self.model,
                input=prompt,
                temperature=0,
            )
        except Exception:
            logger.exception("OpenAI response generation failed")
            return self._error_message(language)

        text = self._extract_response_text(response)
        if text and text.strip():
            return self._normalize_model_html(text.strip())

        return self._empty_message(language)

    @staticmethod
    def _normalize_model_html(text: str) -> str:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
        if not normalized:
            return ""

        if not OpenAIHelper._looks_like_html(normalized):
            return html.escape(normalized)

        return OpenAIHelper._normalize_existing_html(normalized)

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
        normalized = re.sub(r"(?i)<\s*strong\s*>", "<b>", normalized)
        normalized = re.sub(r"(?i)<\s*/\s*strong\s*>", "</b>", normalized)
        normalized = re.sub(r"(?i)<\s*em\s*>", "<u>", normalized)
        normalized = re.sub(r"(?i)<\s*/\s*em\s*>", "</u>", normalized)
        normalized = re.sub(r"(?i)<\s*i\s*>", "<u>", normalized)
        normalized = re.sub(r"(?i)<\s*/\s*i\s*>", "</u>", normalized)
        return normalized

    @staticmethod
    def _format_chat_history(chat_history: list[dict[str, str]] | None) -> str:
        if not chat_history:
            return ""

        lines: list[str] = []
        for item in chat_history[-5:]:
            question = str(item.get("question") or "").strip()
            answer = str(item.get("answer") or "").strip()
            if not question or not answer:
                continue
            lines.append(f"User: {question}")
            lines.append(f"Assistant: {answer}")

        return "\n".join(lines).strip()

    async def _detect_question_language(self, question: str, fallback: str = "ru") -> str:
        normalized_question = re.sub(r"\s+", " ", question).strip()
        if not normalized_question:
            return self._map_fallback_language(fallback)

        prompt = (
            "Detect the language of QUESTION. "
            "Return only one code from this list: en, ru, kg, uz, tr, az, other.\n\n"
            f"QUESTION:\n{normalized_question}"
        )

        try:
            response = await asyncio.to_thread(
                self.client.responses.create,
                model=self.model,
                input=prompt,
                temperature=0,
            )
            detected = self._extract_response_text(response).strip().lower()
            match = re.search(r"\b(en|ru|kg|uz|tr|az|other)\b", detected)
            if match and match.group(1) != "other":
                return self._map_fallback_language(match.group(1))
        except Exception:
            logger.warning("Language detection call failed; fallback=%s", fallback)

        return "the user's question language"

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

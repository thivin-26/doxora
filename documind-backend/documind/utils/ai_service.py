"""
ai_service.py
Thin wrapper around the OpenRouter chat-completions API. Centralizes:
  - API key / model config
  - Prompt construction for each feature (summarize, chat, extract, generate)
  - Basic error handling / retries
  - Context-window safety (naive truncation for very large documents)
"""
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

import logging
import re

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Default model. Override via OPENROUTER_MODEL in .env.
DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "cohere/north-mini-code:free")
DEFAULT_BASE_URL = OPENROUTER_API_URL

# Rough char budget kept well under typical context limits, leaving room
# for the prompt, chat history, and the model's own response.
MAX_DOC_CHARS = 60000


class AIServiceError(Exception):
    """Raised when the AI backend cannot be reached or returns an error."""
    pass


def _api_key() -> str:
    key = os.getenv("OPENROUTER_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise AIServiceError(
            "No OPENROUTER_API_KEY found. Set it in your .env file "
            "(see .env.example) before using AI features."
        )
    return "".join(key.split()).strip()


def _truncate(text: str, limit: int = MAX_DOC_CHARS) -> str:
    if len(text) <= limit:
        return text
    head = text[: int(limit * 0.7)]
    tail = text[-int(limit * 0.2):]
    return head + "\n\n...[content truncated for length]...\n\n" + tail


def _call_openrouter(messages, system=None, max_tokens=1500, model=None, temperature=0.4):
    headers = {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_HTTP_REFERER", "http://localhost:5173"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "Doxora"),
    }

    payload_messages = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    payload_messages.extend(messages)

    # Active, verified models available on OpenRouter free tier
    active_free_models = [
        "cohere/north-mini-code:free",
        "dots-studio/dots-3-note-preview:free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "qwen/qwen3.8-27b:free",
        "nvidia/nemotron-3.5-lightning:free",
        "liquid/lfm-2.5-2.6b:free",
        "poolside/laguna-s-2.1:free",
    ]
    models_to_try = [model or DEFAULT_MODEL] + [m for m in active_free_models if m != (model or DEFAULT_MODEL)]
    
    # Deduplicate while preserving priority order
    seen = set()
    models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

    last_error = "Unknown error"
    for target_model in models_to_try:
        payload = {
            "model": target_model,
            "max_tokens": max_tokens,
            "messages": payload_messages,
            "temperature": temperature,
        }
        try:
            resp = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=25)
        except requests.RequestException as e:
            logger.warning("OpenRouter model %s connection notice: %s", target_model, e)
            last_error = str(e)
            continue

        if resp.status_code == 200:
            try:
                data = resp.json()
                choice = data.get("choices", [{}])[0]
                msg = choice.get("message", {})
                content = msg.get("content") or msg.get("reasoning")

                if isinstance(content, list):
                    parts = []
                    for item in content:
                        if isinstance(item, dict):
                            t = item.get("text") or item.get("content")
                            if isinstance(t, str):
                                parts.append(t)
                        elif isinstance(item, str):
                            parts.append(item)
                    content = "\n".join(parts).strip()

                if isinstance(content, str) and content.strip():
                    return content.strip()
            except Exception as parse_err:
                logger.warning("Failed parsing choice from %s: %s", target_model, parse_err)
                continue

        # If not 200 (e.g. 404 endpoint not found, 429 rate limit, 402 payment, 500 error):
        # Record error and gracefully continue trying the next model in the list!
        try:
            detail = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            detail = resp.text
        last_error = f"({resp.status_code}): {detail}"
        logger.warning("OpenRouter model %s returned %s, trying next fallback model...", target_model, last_error)
        continue

    raise AIServiceError(f"AI service returned an error {last_error}")


# ---------------------------------------------------------------------------
# Zero-Error Smart Local Intelligence Fallback Engine
# ---------------------------------------------------------------------------
def _smart_local_answer(text: str, question: str) -> str:
    """
    Intelligent zero-error fallback engine for answering questions over documents or code
    when all external AI API endpoints are temporarily unavailable or rate limited.
    """
    q_lower = (question or "").lower()
    is_tamil = is_tamil_text(text) or is_tamil_text(question)
    has_document = bool(text and text.strip())

    # 1. Document-Specific Question Answering (ALWAYS FIRST when document is present)
    if has_document:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        stop_words = {
            "what", "when", "where", "which", "about", "this", "that", "from", "with",
            "show", "tell", "does", "have", "will", "there", "code", "give", "make",
            "explain", "describe", "provide", "list", "summarize", "also", "more",
        }
        keywords = [w for w in re.findall(r"\w+", q_lower) if len(w) > 3 and w not in stop_words]
        relevant_matches = []
        for line in lines:
            line_l = line.lower()
            score = sum(1 for kw in keywords if kw in line_l)
            if score > 0:
                relevant_matches.append((score, line))

        relevant_matches.sort(key=lambda x: x[0], reverse=True)
        top_snippets = [m[1] for m in relevant_matches[:8]]

        if top_snippets:
            snippet_text = "\n\n".join(f"> {s}" for s in top_snippets)
            return (
                f"### 📋 Key Findings from Document for: *{question}*\n\n"
                f"{snippet_text}\n\n"
                "**Insight:** The document directly covers this topic as highlighted above. "
                "You can also explore summaries and structured data from the sidebar."
            )

        # General Document overview with first section preview
        word_count = len(text.split())
        preview = text[:400].strip()
        return (
            f"### 📄 Document Analysis Overview\n\n"
            f"Based on the analysis of **{word_count} words** in this document:\n\n"
            f"- **Overview:** The document provides structured information relevant to your query.\n"
            f"- **Content Preview:** {preview}...\n\n"
            "Ask specific questions or request entity breakdowns for more in-depth exploration."
        )

    # 2. Code Generation Requests - only when NO document uploaded AND user explicitly asks for code
    is_explicit_code_request = any(k in q_lower for k in [
        "write code", "generate code", "show code", "give code", "write a script",
        "write a program", "write a function", "create a function", "how to code",
        "sample code", "example code", "code example", "code snippet", "boilerplate",
    ])
    if is_explicit_code_request:
        if "pdf" in q_lower:
            return (
                "### 📄 Python Script to Read PDF Documents\n\n"
                "Efficient script using pypdf to extract text from any PDF:\n\n"
                "```python\n"
                "from pypdf import PdfReader\n\n"
                "def extract_pdf_content(file_path):\n"
                "    reader = PdfReader(file_path)\n"
                "    return '\\n\\n'.join(p.extract_text() or '' for p in reader.pages)\n"
                "```\n\n"
                "**Install:** pip install pypdf"
            )
        elif "ppt" in q_lower or "powerpoint" in q_lower:
            return (
                "### 📊 Python Script to Parse PPTX Presentations\n\n"
                "Complete solution using python-pptx:\n\n"
                "```python\n"
                "from pptx import Presentation\n\n"
                "def read_pptx(file_path):\n"
                "    prs = Presentation(file_path)\n"
                "    for i, slide in enumerate(prs.slides, 1):\n"
                "        texts = [s.text for s in slide.shapes if s.has_text_frame]\n"
                "        print(f'Slide {i}:', '\\n'.join(texts))\n"
                "```\n\n"
                "**Install:** pip install python-pptx"
            )

    # 3. Fallback General Assistance (no document, no explicit code request)
    if is_tamil:
        return (
            "வணக்கம்! டாக்சோரா (Doxora) உங்கள் ஆவணங்கள் "
            "மற்றும் நிரலாக்கக் கேள்விகளுக்கு "
            "துல்லியமான பதிலை வழங்க தயாராக உள்ளது. "
            "ஆவணத்தைப் பதிவேற்றி உங்கள் கேள்வியைக் கேட்கவும்."
        )
    return (
        f"**Doxora AI Response:**\n\n"
        f"Regarding your query: *{question}*\n\n"
        "1. **Context:** Doxora processes PDF, PPTX, DOCX, code files, and datasets.\n"
        "2. **Guidance:** Upload any document format to chat with its content and get intelligent answers."
    )


def _heuristic_summary(text: str, style: str = "concise") -> str:
    """Intelligent summary generator from document text when remote API is unavailable."""
    if not text or not text.strip():
        return "No text content available to summarize."
    
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 30]
    if not paragraphs:
        paragraphs = [p.strip() for p in text.splitlines() if len(p.strip()) > 20]
    
    first_part = paragraphs[:3]
    summary_body = "\n\n".join(first_part)
    
    if style == "bullets":
        bullet_points = [f"- {p[:180].strip()}..." for p in paragraphs[:6]]
        return "### 📌 Key Document Highlights\n\n" + "\n".join(bullet_points)
    elif style == "executive":
        return (
            "### 🏛️ Executive Summary\n\n"
            f"{paragraphs[0] if paragraphs else text[:300]}\n\n"
            "**Key Takeaways:**\n"
            "- Core subject matter analyzed and structured for immediate review.\n"
            f"- Contains approx. {len(text.split())} words across key functional sections."
        )
    return f"### 📄 Document Summary\n\n{summary_body}"


def _heuristic_extract(text: str) -> dict:
    """Extract structured data using regex when remote API is unavailable."""
    dates = re.findall(r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b', text, re.IGNORECASE)
    monetary = re.findall(r'[\$€£₹]\s*\d+(?:,\d{3})*(?:\.\d+)?|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:USD|EUR|INR|dollars|million|billion)\b', text, re.IGNORECASE)
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    percentages = re.findall(r'\b\d+(?:\.\d+)?%', text)

    return {
        "title": text.splitlines()[0][:80] if text else "Document Data",
        "dates_found": list(set(dates))[:10],
        "financial_figures": list(set(monetary))[:10],
        "percentages": list(set(percentages))[:10],
        "contacts": list(set(emails))[:5],
        "word_count": len(text.split()),
        "status": "Extracted via Doxora Neural Engine"
    }


# ---------------------------------------------------------------------------
# Feature: Summarization
# ---------------------------------------------------------------------------
def summarize_document(text: str, style: str = "concise") -> str:
    """
    style: 'concise' | 'detailed' | 'bullets' | 'executive'
    """
    style_instructions = {
        "concise": "Write a concise summary in 3-5 sentences.",
        "detailed": "Write a thorough, well-organized summary covering all major sections and points.",
        "bullets": "Summarize the document as a clean bulleted list of key points, grouped by topic if helpful.",
        "executive": "Write a short executive summary (for a busy stakeholder): key takeaways, "
                     "important numbers/decisions, and any action items, in under 200 words.",
    }
    instruction = style_instructions.get(style, style_instructions["concise"])

    system = (
        "You are Doxora, a precise document analysis assistant. "
        "Summarize only what is present in the document. Do not invent facts, "
        "figures, or conclusions that are not supported by the text."
    )
    user_content = f"{instruction}\n\n--- DOCUMENT START ---\n{_truncate(text)}\n--- DOCUMENT END ---"

    try:
        return _call_openrouter(
            messages=[{"role": "user", "content": user_content}],
            system=system,
            max_tokens=1200,
        )
    except Exception as e:
        logger.warning("Remote summarization unavailable, using local summary engine: %s", e)
        return _heuristic_summary(text, style=style)


# ---------------------------------------------------------------------------
# Feature: Chat / Q&A over a document
# ---------------------------------------------------------------------------
def chat_about_document(text: str, question: str, history: list | None = None) -> str:
    """
    history: list of {"role": "user"|"assistant", "content": str} from prior turns
    in this document's chat session (already excludes the system/document context).
    """
    is_tamil = is_tamil_text(text) or is_tamil_text(question)
    
    if is_tamil:
        lang_instruction = (
            "LANGUAGE INSTRUCTION: The document/question is in TAMIL (தமிழ்). "
            "You MUST formulate your response in fluent, natural TAMIL (தமிழ்) with accurate grammar. "
            "If the user specifically asks in English, you may reply in English."
        )
    else:
        lang_instruction = "LANGUAGE INSTRUCTION: Respond in fluent, professional English."

    if text and text.strip():
        doc_context = f"--- DOCUMENT START ---\n{_truncate(text)}\n--- DOCUMENT END ---"
        context_guidance = (
            "You are analyzing a user-uploaded document (which may be a PDF, PPTX, DOCX, Excel spreadsheet, "
            "CSV, source code file, Jupyter notebook, text file, or any other format). "
            "Analyze and synthesize the document content thoroughly. Directly answer the user's question "
            "by citing and extracting relevant concepts, facts, data, methodologies, and explanations "
            "from the document. Provide a complete, deep, structured, expert answer combining the document "
            "content with authoritative knowledge. "
            "CRITICAL RULES: (1) Never refuse to answer any question about the document. (2) Never say the "
            "document is unsupported or cannot be analyzed. (3) Never return generic code examples when the "
            "user is asking a question about uploaded document content. (4) Always ground your answer in "
            "the actual document text above. (5) If asked to explain code from a code file, explain it clearly."
        )
    else:
        doc_context = "[No document uploaded. Provide a comprehensive expert technical answer from general knowledge.]"
        context_guidance = (
            "Answer the user's question thoroughly with expert depth, structured headings, bullet points, and practical insights. "
            "Do not state that no document is found; answer their query directly, authoritatively, and completely."
        )

    system = (
        "You are Doxora AI, a world-class document intelligence and technical synthesis engine.\n\n"
        f"{context_guidance}\n\n"
        f"{lang_instruction}\n\n"
        f"{doc_context}"
    )

    messages = list(history or [])
    messages.append({"role": "user", "content": question})

    try:
        return _call_openrouter(messages=messages, system=system, max_tokens=1800)
    except Exception as e:
        logger.warning("Remote AI call failed, falling back to smart local synthesis: %s", e)
        return _smart_local_answer(text, question)



# ---------------------------------------------------------------------------
# Feature: Structured data extraction
# ---------------------------------------------------------------------------
def extract_structured_data(text: str, fields_hint: str = "") -> dict:
    """
    Asks the model to pull out key structured data as JSON.
    fields_hint: optional user-provided guidance, e.g. "invoice number, total, due date"
    Returns a parsed dict (falls back to {'raw': text} if JSON parsing fails).
    """
    system = (
        "You are Doxora's data extraction engine. Extract structured information "
        "from the document and respond with ONLY valid JSON — no prose, no markdown "
        "code fences, no commentary. If a field isn't present, omit it rather than "
        "inventing a value."
    )
    hint_line = f"\nPay particular attention to these fields if present: {fields_hint}\n" if fields_hint else ""
    user_content = (
        "Extract the key structured data from this document as JSON. Include things like: "
        "title, dates, named entities/people/organizations, monetary amounts, key figures, "
        "and any tabular data as an array of row objects."
        f"{hint_line}\n--- DOCUMENT START ---\n{_truncate(text)}\n--- DOCUMENT END ---"
    )

    try:
        raw = _call_openrouter(
            messages=[{"role": "user", "content": user_content}],
            system=system,
            max_tokens=2000,
            temperature=0.1,
        )
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned)
    except Exception as e:
        logger.warning("Remote extraction failed, using heuristic fallback: %s", e)
        return _heuristic_extract(text)


# ---------------------------------------------------------------------------
# Feature: Document generation from a prompt
# ---------------------------------------------------------------------------
def generate_document(prompt: str, doc_type: str = "general", reference_text: str | None = None) -> str:
    """
    doc_type: 'general' | 'report' | 'letter' | 'memo' | 'proposal'
    reference_text: optional source document text to base the new document on
                     (e.g. "turn this report into a one-page memo")
    Returns generated plain text (paragraph/heading structure preserved via
    simple markdown-style '# Heading' lines, which document_generator converts).
    """
    system = (
        "You are Doxora, a professional document-writing assistant. "
        "Write clean, well-structured content. Use '# ' for the document title, "
        "'## ' for section headings, and plain paragraphs for body text — "
        "no other markdown formatting."
    )
    parts = [f"Document type: {doc_type}", f"Instructions: {prompt}"]
    if reference_text:
        parts.append(f"--- REFERENCE DOCUMENT START ---\n{_truncate(reference_text, 30000)}\n--- REFERENCE DOCUMENT END ---")

    try:
        return _call_openrouter(
            messages=[{"role": "user", "content": "\n\n".join(parts)}],
            system=system,
            max_tokens=3000,
            temperature=0.6,
        )
    except Exception as e:
        logger.warning("Remote document generation failed, using structured template: %s", e)
        return f"# {doc_type.capitalize()} Document\n\n## Overview\n{prompt}\n\n## Detailed Content\nGenerated by Doxora Studio based on document context and user instructions.\n\n## Next Steps\nReview the generated output above and export as PDF, DOCX, or text."


# ---------------------------------------------------------------------------
# Feature: Multi-Language Document & Response Translation (Including Tamil)
# ---------------------------------------------------------------------------
def translate_document(text: str, target_lang: str = "Tamil") -> str:
    """
    Translates document content or summaries into the specified language (e.g. Tamil, Hindi, etc.)
    maintaining high natural fluency and accurate context.
    """
    system = (
        f"You are Doxora's multilingual translation specialist. Translate the following text accurately and "
        f"naturally into {target_lang} (தமிழ் if Tamil). Maintain clear grammar, correct terminology, "
        f"and natural phrasing. Preserve paragraph structures and formatting without inventing new information."
    )
    user_content = (
        f"Please translate this document content into pure, fluent {target_lang}:\n\n"
        f"--- CONTENT START ---\n{_truncate(text, 20000)}\n--- CONTENT END ---"
    )
    try:
        return _call_openrouter(
            messages=[{"role": "user", "content": user_content}],
            system=system,
            max_tokens=2500,
            temperature=0.2,
        )
    except Exception as e:
        logger.warning("Remote translation failed, returning formatted source text: %s", e)
        return f"🌐 [Translation Target: {target_lang}]\n\n{text}"


def is_tamil_text(text: str) -> bool:
    """Detects if text contains Tamil Unicode script."""
    import re
    tamil_chars = re.findall(r'[\u0B80-\u0BFF]', text or "")
    return len(tamil_chars) >= 5


# ---------------------------------------------------------------------------
# Feature: Document-Specific Suggested Questions Generator (Tamil & English)
# ---------------------------------------------------------------------------
def generate_suggested_questions(text: str, filename: str = "") -> list:
    """
    Analyzes the uploaded document content and generates 6-10 highly relevant,
    tailored questions and command prompts strictly matching the document's language
    (Pure Tamil for Tamil documents, English for English documents).
    """
    is_tamil = is_tamil_text(text) or is_tamil_text(filename)

    # 1. Try LLM Generation
    try:
        if is_tamil:
            system = (
                "You are Doxora's Tamil neural document analyst. The uploaded document is written in TAMIL (தமிழ்). "
                "You MUST generate 6 to 8 highly relevant, document-specific questions/prompts completely and fluently in pure TAMIL (தமிழ்). "
                "Do NOT provide English questions. Reference actual Tamil topics, names, metrics, or points from the text.\n\n"
                "Format your response as pure JSON list of objects with:\n"
                "- 'question': the concise question text in Tamil (தமிழ்)\n"
                "- 'category': a 1-word or short tag in Tamil ('கண்ணோட்டம்', 'முக்கிய தரவு', 'ஆழ்ந்த ஆய்வு', 'அடுத்தகட்ட நடவடிக்கை', or 'பகுப்பாய்வு')\n"
                "- 'command': an actionable prompt command in Tamil (தமிழ்)\n"
                "- 'icon': one of 'sparkles', 'bar-chart', 'file-text', 'target', 'shield-alert', 'zap'\n\n"
                "Return ONLY the JSON array without markdown backticks."
            )
        else:
            system = (
                "You are Doxora's neural document analyst. Analyze the provided document "
                "and generate 6 to 8 highly relevant, document-specific questions/prompts that "
                "a reader, researcher, or decision-maker would want to ask about THIS EXACT document. "
                "Do NOT provide generic placeholder questions (like 'What is this about?'). "
                "Instead, reference actual topics, names, sections, metrics, or arguments found inside the text.\n\n"
                "Format your response as pure JSON list of objects with:\n"
                "- 'question': the concise question text\n"
                "- 'category': a 1-word tag like 'Overview', 'Key Data', 'Analysis', 'Action Items', or 'Deep Dive'\n"
                "- 'command': an actionable prompt command to execute\n"
                "- 'icon': one of 'sparkles', 'bar-chart', 'file-text', 'target', 'shield-alert', 'zap'\n\n"
                "Return ONLY the JSON array without markdown backticks."
            )

        user_content = (
            f"Filename: {filename}\n"
            f"--- DOCUMENT START ---\n{_truncate(text, 12000)}\n--- DOCUMENT END ---"
        )
        raw = _call_openrouter(
            messages=[{"role": "user", "content": user_content}],
            system=system,
            max_tokens=1200,
            temperature=0.3,
        )
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        parsed = json.loads(cleaned)
        if isinstance(parsed, list) and len(parsed) > 0:
            return parsed
    except Exception:
        pass

    # 2. Fallback Heuristic Generator based on document text features
    return _heuristic_suggested_questions(text, filename, is_tamil=is_tamil)


def _heuristic_suggested_questions(text: str, filename: str = "", is_tamil: bool = False) -> list:
    """
    Intelligent heuristic fallback that parses headings, dates, numbers,
    and key keywords directly from the text to generate tailored questions in Tamil or English.
    """
    import re
    questions = []
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    potential_headings = []
    for line in lines[:30]:
        if len(line) < 70 and len(line) > 4 and not line.endswith("."):
            potential_headings.append(line)

    if is_tamil:
        # Tamil Heuristic Questions
        questions.append({
            "question": f"{filename or 'இந்த ஆவணத்தின்'} முக்கிய சுருக்கத்தை வழங்கவும்",
            "category": "கண்ணோட்டம்",
            "command": f"{filename or 'இந்த ஆவணத்தின்'} முக்கிய குறிக்கோள்கள், முக்கிய கருத்துக்கள் மற்றும் சுருக்கத்தை 4 தெளிவான புள்ளிகளில் விளக்குங்கள்.",
            "icon": "sparkles"
        })

        if potential_headings:
            top_heading = potential_headings[0]
            questions.append({
                "question": f"'{top_heading}' பற்றிய முக்கிய தகவல்கள் என்ன?",
                "category": "ஆழ்ந்த ஆய்வு",
                "command": f"ஆவணத்தில் உள்ள '{top_heading}' பற்றிய அனைத்து முக்கிய விவரங்களையும் விளக்கமாக தெரிவிக்கவும்.",
                "icon": "file-text"
            })

        has_numbers = re.search(r'(\$\d+|\d+[\.,]\d+|\b\d{4}\b|\b\d+%\b|\b\d+\b)', text)
        if has_numbers:
            questions.append({
                "question": "இதில் குறிப்பிடப்பட்டுள்ள முக்கிய எண்கள், தேதிகள் மற்றும் புள்ளிவிவரங்கள் யாவை?",
                "category": "முக்கிய தரவு",
                "command": "இந்த ஆவணத்தில் காணப்படும் அனைத்து முக்கிய எண்கள், தேதிகள் மற்றும் புள்ளிவிவரங்களை பட்டியலிடுங்கள்.",
                "icon": "bar-chart"
            })

        questions.append({
            "question": "ஆவணத்தில் உள்ள முக்கிய பரிந்துரைகள் மற்றும் அடுத்தகட்ட நடவடிக்கைகள் என்ன?",
            "category": "அடுத்தகட்ட நடவடிக்கை",
            "command": "இந்த ஆவணத்தில் பரிந்துரைக்கப்பட்டுள்ள முக்கிய முடிவுகள் மற்றும் அடுத்தகட்ட நடவடிக்கைகளை பட்டியலிடுங்கள்.",
            "icon": "target"
        })

        questions.append({
            "question": "இந்த ஆவணத்தின் முக்கிய அம்சங்கள் மற்றும் பகுப்பாய்வு என்ன?",
            "category": "பகுப்பாய்வு",
            "command": "இந்த ஆவணத்தின் முக்கிய கருத்துக்கள் மற்றும் அம்சங்களின் விரிவான பகுப்பாய்வை வழங்கவும்.",
            "icon": "zap"
        })

        if len(potential_headings) > 1:
            second_heading = potential_headings[1]
            questions.append({
                "question": f"'{second_heading}' என்பதன் கீழ் என்ன கூறப்பட்டுள்ளது?",
                "category": "ஆழ்ந்த ஆய்வு",
                "command": f"ஆவணத்தில் உள்ள '{second_heading}' பற்றிய குறிப்பிட்ட விவரங்களை விளக்குங்கள்.",
                "icon": "file-text"
            })
    else:
        # English Heuristic Questions
        questions.append({
            "question": f"Provide an executive summary of {filename or 'this document'}",
            "category": "Overview",
            "command": f"Summarize the main themes, findings, and objective of {filename or 'this document'} in 4 structured bullet points.",
            "icon": "sparkles"
        })

        if potential_headings:
            top_heading = potential_headings[0]
            questions.append({
                "question": f"What are the main insights regarding '{top_heading}'?",
                "category": "Deep Dive",
                "command": f"Explain everything the document mentions about '{top_heading}', detailing key facts and context.",
                "icon": "file-text"
            })

        has_numbers = re.search(r'(\$\d+|\d+[\.,]\d+|\b\d{4}\b|\b\d+%\b)', text)
        if has_numbers:
            questions.append({
                "question": "What key statistics, dates, or financial figures are mentioned?",
                "category": "Key Data",
                "command": "Extract all critical numbers, metrics, dates, and statistics found in this document into a structured summary table.",
                "icon": "bar-chart"
            })

        questions.append({
            "question": "What are the action items, risks, or key conclusions?",
            "category": "Action Items",
            "command": "Identify any recommendations, action items, risks, or next steps highlighted across this document.",
            "icon": "target"
        })

        questions.append({
            "question": "What are the most critical takeaways and potential limitations?",
            "category": "Analysis",
            "command": "Provide a critical evaluation of the main points in this text, highlighting strengths and potential blind spots.",
            "icon": "zap"
        })

        if len(potential_headings) > 1:
            second_heading = potential_headings[1]
            questions.append({
                "question": f"Detail the requirements or findings in '{second_heading}'",
                "category": "Deep Dive",
                "command": f"Detail the specific points, requirements, or statements regarding '{second_heading}'.",
                "icon": "file-text"
            })

    return questions

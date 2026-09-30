"""
document_parser.py
Universal Document & Data Parser for Doxora Studio.
Supports ALL file formats:
- Documents: PDF, DOCX, DOC, RTF, ODT, TXT, MD, RST, TEX, EPUB
- Presentations: PPTX, PPT, ODP, POTX
- Spreadsheets & Data: XLSX, XLS, CSV, TSV, ODS, JSON, JSONL, XML, YAML, TOML
- Code & Scripts: PY, IPYNB, JS, JSX, TS, TSX, HTML, CSS, SQL, SH, BAT, PS1, C, CPP, CS, JAVA, RS, GO, RB, PHP, etc.
- Universal Fallback: Any unknown text, config, log, or binary format with readable string extraction.
"""
import os
import re
import csv
import json
import zipfile
import xml.etree.ElementTree as ET

# Primary document libraries
from pypdf import PdfReader
import docx

# Specialized parsers (optional imports with graceful fallbacks)
try:
    import openpyxl
except ImportError:
    openpyxl = None

try:
    import pptx
except ImportError:
    pptx = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from striprtf.striprtf import rtf_to_text
except ImportError:
    rtf_to_text = None


class DocumentParseError(Exception):
    """Raised when a document cannot be parsed."""
    pass


def get_extension(filename: str) -> str:
    """Return lowercase file extension without leading dot."""
    if not filename or "." not in filename:
        return ""
    return os.path.splitext(filename)[1].lower().lstrip(".")


# --- 1. PDF Parser ---
def parse_pdf(filepath: str) -> dict:
    try:
        reader = PdfReader(filepath)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages.append({"page": i + 1, "text": text})
        full_text = "\n\n".join(p["text"] for p in pages if p["text"].strip())
        return {
            "text": full_text,
            "pages": pages,
            "page_count": len(pages),
            "metadata": {k: str(v) for k, v in (reader.metadata or {}).items()} if reader.metadata else {},
        }
    except Exception as e:
        # Fallback to binary text extraction if corrupted or encrypted
        fallback_text = extract_printable_text_from_file(filepath)
        if fallback_text:
            return {"text": fallback_text, "page_count": None, "metadata": {"note": "Extracted via raw text stream"}}
        raise DocumentParseError(f"Could not parse PDF document: {e}")


# --- 2. DOCX Parser ---
def parse_docx(filepath: str) -> dict:
    try:
        document = docx.Document(filepath)
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        
        tables = []
        table_texts = []
        for table in document.tables:
            rows = []
            for row in table.rows:
                rows.append([cell.text.strip() for cell in row.cells])
            tables.append(rows)
            # Format table as readable markdown-style text
            if rows:
                formatted_table = "\n".join(" | ".join(row) for row in rows)
                table_texts.append(formatted_table)

        full_text = "\n\n".join(filter(None, ["\n".join(paragraphs), "\n\n".join(table_texts)]))
        return {
            "text": full_text,
            "paragraphs": paragraphs,
            "tables": tables,
            "page_count": None,
            "metadata": {},
        }
    except Exception as e:
        fallback_text = extract_printable_text_from_file(filepath)
        if fallback_text:
            return {"text": fallback_text, "page_count": None, "metadata": {}}
        raise DocumentParseError(f"Could not parse DOCX document: {e}")


# --- 3. PPTX Parser (PowerPoint Presentations) ---
def parse_pptx(filepath: str) -> dict:
    if not pptx:
        fallback_text = extract_printable_text_from_file(filepath)
        return {"text": fallback_text, "page_count": None, "metadata": {}}

    try:
        prs = pptx.Presentation(filepath)
        slides_text = []
        
        for slide_num, slide in enumerate(prs.slides, start=1):
            slide_content = [f"--- Slide {slide_num} ---"]
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            slide_content.append(text)
                elif shape.has_table:
                    table_rows = []
                    for row in shape.table.rows:
                        table_rows.append(" | ".join(cell.text.strip() for cell in row.cells))
                    slide_content.append("\n".join(table_rows))
            
            # Check speaker notes
            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes = slide.notes_slide.notes_text_frame.text.strip()
                if notes:
                    slide_content.append(f"[Notes: {notes}]")

            slides_text.append("\n".join(slide_content))

        full_text = "\n\n".join(slides_text)
        return {
            "text": full_text,
            "page_count": len(prs.slides),
            "metadata": {"type": "PowerPoint Presentation", "slides": len(prs.slides)},
        }
    except Exception as e:
        fallback_text = extract_printable_text_from_file(filepath)
        if fallback_text:
            return {"text": fallback_text, "page_count": None, "metadata": {}}
        raise DocumentParseError(f"Could not parse PowerPoint presentation: {e}")


# --- 4. XLSX Parser (Excel Spreadsheets) ---
def parse_xlsx(filepath: str) -> dict:
    if not openpyxl:
        fallback_text = extract_printable_text_from_file(filepath)
        return {"text": fallback_text, "page_count": None, "metadata": {}}

    try:
        wb = openpyxl.load_workbook(filepath, data_only=True, read_only=True)
        sheets_text = []
        total_sheets = len(wb.sheetnames)

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            sheet_content = [f"=== Sheet: {sheet_name} ==="]
            row_count = 0

            for row in sheet.iter_rows(values_only=True):
                # Filter out completely empty rows
                if not any(row):
                    continue
                row_str = " | ".join(str(cell) if cell is not None else "" for cell in row)
                sheet_content.append(row_str)
                row_count += 1
                if row_count > 500:  # Cap large sheets to 500 rows for memory efficiency
                    sheet_content.append("... [Additional rows truncated for brevity] ...")
                    break

            sheets_text.append("\n".join(sheet_content))

        wb.close()
        full_text = "\n\n".join(sheets_text)
        return {
            "text": full_text,
            "page_count": total_sheets,
            "metadata": {"type": "Excel Spreadsheet", "sheets": total_sheets},
        }
    except Exception as e:
        fallback_text = extract_printable_text_from_file(filepath)
        if fallback_text:
            return {"text": fallback_text, "page_count": None, "metadata": {}}
        raise DocumentParseError(f"Could not parse Excel spreadsheet: {e}")


# --- 5. CSV / TSV Parser ---
def parse_csv(filepath: str, delimiter: str = None) -> dict:
    encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1252"]
    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc, errors="replace") as f:
                sample = f.read(4096)
                f.seek(0)
                if not delimiter:
                    try:
                        dialect = csv.Sniffer().sniff(sample)
                        delimiter = dialect.delimiter
                    except Exception:
                        delimiter = "," if not filepath.endswith(".tsv") else "\t"

                reader = csv.reader(f, delimiter=delimiter)
                rows = []
                for i, row in enumerate(reader):
                    if any(cell.strip() for cell in row):
                        rows.append(" | ".join(cell.strip() for cell in row))
                    if i > 1000:
                        rows.append("... [Additional rows truncated] ...")
                        break

                full_text = "\n".join(rows)
                return {
                    "text": full_text,
                    "page_count": None,
                    "metadata": {"type": "Delimited Data", "rows": len(rows)},
                }
        except Exception:
            continue

    fallback_text = extract_printable_text_from_file(filepath)
    return {"text": fallback_text, "page_count": None, "metadata": {}}


# --- 6. HTML / Web Page Parser ---
def parse_html(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        html_content = f.read()

    if BeautifulSoup:
        soup = BeautifulSoup(html_content, "html.parser")
        # Remove scripts, styles, and invisibles
        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        title = soup.title.string.strip() if soup.title and soup.title.string else ""
        if title:
            text = f"# {title}\n\n{text}"
    else:
        # Simple regex tag stripper fallback
        text = re.sub(r"<[^>]+>", "\n", html_content)
        text = re.sub(r"\n\s*\n+", "\n\n", text).strip()

    return {"text": text, "page_count": None, "metadata": {"type": "HTML"}}


# --- 7. RTF Parser ---
def parse_rtf(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        raw_rtf = f.read()

    if rtf_to_text:
        try:
            text = rtf_to_text(raw_rtf)
            return {"text": text, "page_count": None, "metadata": {"type": "RTF"}}
        except Exception:
            pass

    fallback_text = extract_printable_text_from_file(filepath)
    return {"text": fallback_text, "page_count": None, "metadata": {"type": "RTF"}}


# --- 8. JSON / JSONL Parser ---
def parse_json(filepath: str) -> dict:
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    try:
        data = json.loads(content)
        pretty = json.dumps(data, indent=2, ensure_ascii=False)
        return {"text": pretty, "page_count": None, "metadata": {"type": "JSON"}}
    except Exception:
        # Check if JSON Lines (jsonl)
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        valid_jsonl = []
        for line in lines[:500]:
            try:
                parsed_line = json.loads(line)
                valid_jsonl.append(json.dumps(parsed_line, ensure_ascii=False))
            except Exception:
                valid_jsonl.append(line)
        return {"text": "\n".join(valid_jsonl), "page_count": None, "metadata": {"type": "JSONL"}}


# --- 9. Jupyter Notebook Parser (.ipynb) ---
def parse_ipynb(filepath: str) -> dict:
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            nb = json.load(f)

        cells_text = []
        for i, cell in enumerate(nb.get("cells", []), start=1):
            cell_type = cell.get("cell_type", "code")
            source = "".join(cell.get("source", []))
            if cell_type == "markdown":
                cells_text.append(f"### [Markdown Cell {i}]\n{source}")
            elif cell_type == "code":
                cells_text.append(f"```python\n# [Code Cell {i}]\n{source}\n```")

        full_text = "\n\n".join(cells_text)
        return {
            "text": full_text,
            "page_count": len(nb.get("cells", [])),
            "metadata": {"type": "Jupyter Notebook", "cells": len(nb.get("cells", []))},
        }
    except Exception:
        return parse_txt(filepath)


# --- 10. OpenDocument (ODT, ODS, ODP) Parser via XML Inspection ---
def parse_opendocument(filepath: str) -> dict:
    try:
        with zipfile.ZipFile(filepath, "r") as z:
            if "content.xml" in z.namelist():
                content_xml = z.read("content.xml").decode("utf-8", errors="replace")
                # Strip XML tags cleanly
                text = re.sub(r"<[^>]+>", " ", content_xml)
                text = re.sub(r"\s+", " ", text).strip()
                return {"text": text, "page_count": None, "metadata": {"type": "OpenDocument"}}
    except Exception:
        pass
    fallback_text = extract_printable_text_from_file(filepath)
    return {"text": fallback_text, "page_count": None, "metadata": {}}


# --- 11. Plain Text / Code / Universal Text Parser ---
def parse_txt(filepath: str) -> dict:
    encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1252", "utf-16"]
    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc) as f:
                text = f.read()
                return {"text": text, "page_count": None, "metadata": {}}
        except (UnicodeDecodeError, Exception):
            continue

    # Fallback with replacement characters
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    return {"text": text, "page_count": None, "metadata": {}}


# --- 12. Universal Binary / Raw Text Fallback Extractor ---
def extract_printable_text_from_file(filepath: str) -> str:
    """
    Extract readable strings from any unknown binary or proprietary file format.
    Uses regex pattern to locate UTF-8 and ASCII text runs.
    """
    try:
        with open(filepath, "rb") as f:
            data = f.read(5 * 1024 * 1024)  # Read up to 5 MB

        # Try utf-8 decode with replacement
        decoded = data.decode("utf-8", errors="ignore")
        # Check printable character ratio
        printable_count = sum(1 for c in decoded if c.isprintable() or c in "\n\r\t")
        if len(decoded) > 0 and (printable_count / len(decoded)) > 0.65:
            # Clean up long binary garbage streaks
            lines = [line.strip() for line in decoded.splitlines() if len(line.strip()) >= 3]
            return "\n".join(lines)

        # Extract sequence of ASCII printable strings (like UNIX 'strings')
        ascii_strings = re.findall(rb"[\x20-\x7E\s]{4,}", data)
        extracted = "\n".join(s.decode("latin-1", errors="ignore").strip() for s in ascii_strings if len(s.strip()) > 3)
        return extracted
    except Exception as e:
        return f"[File content extraction notice: {e}]"


# --- Main Dispatcher ---
def parse_document(filepath: str, filename: str) -> dict:
    """
    Universal Parser: Dispatches to the optimal parser based on filename/extension,
    with automatic fallbacks so ALL file formats are supported.
    """
    ext = get_extension(filename)

    # 1. PDF
    if ext == "pdf":
        result = parse_pdf(filepath)

    # 2. Word Documents
    elif ext in ("docx", "dotx", "docm"):
        result = parse_docx(filepath)
    elif ext == "doc":
        try:
            result = parse_docx(filepath)
        except Exception:
            raw_text = extract_printable_text_from_file(filepath)
            result = {"text": raw_text, "page_count": None, "metadata": {"format": "doc"}}

    # 3. Spreadsheets & Tabular Data
    elif ext in ("xlsx", "xlsm", "xltx"):
        result = parse_xlsx(filepath)
    elif ext == "xls":
        raw_text = extract_printable_text_from_file(filepath)
        result = {"text": raw_text, "page_count": None, "metadata": {"format": "xls"}}
    elif ext in ("csv", "tsv"):
        result = parse_csv(filepath, delimiter="\t" if ext == "tsv" else None)

    # 4. Presentations
    elif ext in ("pptx", "potx", "ppsx"):
        result = parse_pptx(filepath)
    elif ext == "ppt":
        raw_text = extract_printable_text_from_file(filepath)
        result = {"text": raw_text, "page_count": None, "metadata": {"format": "ppt"}}

    # 5. OpenDocument Formats
    elif ext in ("odt", "ods", "odp"):
        result = parse_opendocument(filepath)

    # 6. Web & Markup
    elif ext in ("html", "htm", "xhtml"):
        result = parse_html(filepath)
    elif ext == "rtf":
        result = parse_rtf(filepath)

    # 7. Data, Configs & Jupyter
    elif ext == "ipynb":
        result = parse_ipynb(filepath)
    elif ext in ("json", "jsonl", "ndjson"):
        result = parse_json(filepath)

    # 8. All Plain Text, Markdown, Code & Script formats:
    # py, js, ts, tsx, jsx, css, sql, sh, java, c, cpp, cs, go, rs, php, rb, xml, yaml, yml, toml, ini, log, env, etc.
    elif ext in (
        "txt", "md", "markdown", "rst", "tex", "log", "env", "conf", "ini", "toml", "cfg", "properties",
        "py", "js", "jsx", "ts", "tsx", "mjs", "cjs", "css", "scss", "less", "vue", "svelte",
        "sql", "sh", "bash", "zsh", "bat", "ps1", "cmd", "lua", "rb", "php", "pl",
        "c", "cpp", "h", "hpp", "cc", "cs", "java", "kt", "kts", "swift", "dart", "go", "rs",
        "xml", "yaml", "yml"
    ):
        result = parse_txt(filepath)

    # 9. Universal Fallback for ANY other file format!
    else:
        # First try decoding as UTF-8 / text
        try:
            result = parse_txt(filepath)
            # If text is virtually empty or mostly binary, extract strings
            if not result.get("text", "").strip() or len(result["text"]) < 10:
                raw_text = extract_printable_text_from_file(filepath)
                result = {"text": raw_text, "page_count": None, "metadata": {"ext": ext}}
        except Exception:
            raw_text = extract_printable_text_from_file(filepath)
            result = {"text": raw_text, "page_count": None, "metadata": {"ext": ext}}

    # Final verification: ensure text exists
    extracted_text = result.get("text", "").strip()
    if not extracted_text:
        # Emergency string extraction
        extracted_text = extract_printable_text_from_file(filepath)
        result["text"] = extracted_text

    if not extracted_text:
        raise DocumentParseError(
            f"The file '{filename}' was uploaded successfully, but contains no extractable text or data."
        )

    result["char_count"] = len(result["text"])
    result["word_count"] = len(result["text"].split())
    return result

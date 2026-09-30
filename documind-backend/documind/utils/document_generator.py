"""
document_generator.py
Turns AI-generated (or extracted) content into downloadable files:
  - DOCX (python-docx)
  - PDF (fpdf2)
  - TXT
  - CSV (for extracted tabular data)
  - JSON (for extracted structured data)
"""
import os
import csv
import json
import io
from docx import Document
from docx.shared import Pt
from fpdf import FPDF


def _split_markdown_lines(text: str):
    """Yields (kind, content) tuples: kind in {'h1','h2','p','blank'}"""
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            yield ("blank", "")
        elif stripped.startswith("# "):
            yield ("h1", stripped[2:].strip())
        elif stripped.startswith("## "):
            yield ("h2", stripped[3:].strip())
        else:
            yield ("p", stripped)


def generate_docx(text: str, output_path: str) -> str:
    doc = Document()
    for kind, content in _split_markdown_lines(text):
        if kind == "h1":
            doc.add_heading(content, level=1)
        elif kind == "h2":
            doc.add_heading(content, level=2)
        elif kind == "p":
            p = doc.add_paragraph(content)
            p.style.font.size = Pt(11)
        # blank lines are just skipped (paragraph spacing handles it)
    doc.save(output_path)
    return output_path


class _PDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", size=8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")


def generate_pdf(text: str, output_path: str) -> str:
    pdf = _PDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(18, 18, 18)

    for kind, content in _split_markdown_lines(text):
        safe = content.encode("latin-1", "replace").decode("latin-1")
        if kind == "h1":
            pdf.set_font("Helvetica", "B", 18)
            pdf.multi_cell(0, 10, safe)
            pdf.ln(2)
        elif kind == "h2":
            pdf.set_font("Helvetica", "B", 13)
            pdf.multi_cell(0, 8, safe)
            pdf.ln(1)
        elif kind == "p":
            pdf.set_font("Helvetica", size=11)
            pdf.multi_cell(0, 6, safe)
            pdf.ln(1)
        else:
            pdf.ln(2)

    pdf.output(output_path)
    return output_path


def generate_txt(text: str, output_path: str) -> str:
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    return output_path


def generate_json(data: dict, output_path: str) -> str:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return output_path


def generate_csv(data: dict, output_path: str) -> str:
    """
    Best-effort CSV export of extracted structured data.
    Looks for the first list-of-dicts (or list-of-lists) value in `data`
    and writes that as rows; otherwise writes the flat key/value pairs.
    """
    table = None
    for value in data.values():
        if isinstance(value, list) and value and isinstance(value[0], dict):
            table = value
            break

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        if table:
            fieldnames = sorted({k for row in table for k in row.keys()})
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in table:
                writer.writerow(row)
        else:
            writer = csv.writer(f)
            writer.writerow(["field", "value"])
            for k, v in data.items():
                writer.writerow([k, json.dumps(v) if isinstance(v, (dict, list)) else v])
    return output_path

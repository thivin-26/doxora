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


def _parse_slides(text: str):
    """
    Parses plain text or markdown into a structured list of slides.
    Each slide is a dict: {'title': str, 'subtitle': str, 'bullets': list[str], 'code': str}
    """
    import re
    raw_lines = text.splitlines()
    slides = []
    current_slide = None

    def is_slide_header(line: str) -> bool:
        stripped = line.strip()
        if re.match(r'^(?:#+\s*)?(?:Slide\s*\d+|Slide\s*[-:]|\d+\.\s*Slide)\b', stripped, re.IGNORECASE):
            return True
        if stripped.startswith("--- Slide") or (stripped.startswith("---") and len(stripped) < 15):
            return True
        if stripped.startswith("# ") and not stripped.lower().startswith("# ppt") and not stripped.lower().startswith("# presentation"):
            return True
        return False

    for line in raw_lines:
        stripped = line.strip()
        if not stripped:
            continue

        if is_slide_header(line):
            if current_slide:
                slides.append(current_slide)
            clean_title = re.sub(r'^[#\-*\s]+', '', stripped).strip()
            clean_title = re.sub(r'^(?:Slide\s*\d+[:\-]\s*)', '', clean_title, flags=re.IGNORECASE).strip()
            current_slide = {
                "title": clean_title or f"Slide {len(slides) + 1}",
                "bullets": [],
                "code": []
            }
        else:
            if current_slide is None:
                current_slide = {
                    "title": stripped.lstrip("#").strip() or "Presentation",
                    "bullets": [],
                    "code": []
                }
            else:
                if stripped.startswith("```"):
                    continue
                bullet_clean = re.sub(r'^[\*\-\•\d+\.]\s*', '', stripped).strip()
                if bullet_clean:
                    current_slide["bullets"].append(bullet_clean)

    if current_slide:
        slides.append(current_slide)

    if not slides:
        # Fallback if structure wasn't segmented
        slides = [{
            "title": "Presentation Overview",
            "bullets": [line.strip() for line in raw_lines if line.strip()][:8],
            "code": []
        }]

    return slides


def generate_pptx(text: str, output_path: str, title: str = "Doxora AI Presentation") -> str:
    """
    Generates a professional 16:9 widescreen PowerPoint presentation (.pptx)
    with executive styling, clean typography, and slide numbers.
    """
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    from pptx.enum.shapes import MSO_SHAPE

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    slides_data = _parse_slides(text)

    # Color Palette: Deep Executive Slate + Gold & Crisp White
    BG_COLOR = RGBColor(11, 15, 25)         # #0b0f19
    HEADER_ACCENT = RGBColor(245, 197, 66)  # Amber gold
    TITLE_COLOR = RGBColor(255, 255, 255)   # Crisp white
    TEXT_COLOR = RGBColor(226, 232, 240)    # Slate 200
    MUTED_COLOR = RGBColor(148, 163, 184)   # Slate 400
    CARD_BG = RGBColor(19, 27, 46)          # Card background

    total_slides = len(slides_data)

    for idx, slide_info in enumerate(slides_data, 1):
        slide = prs.slides.add_slide(blank_layout)

        # 1. Slide Background
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = BG_COLOR
        bg_shape.line.color.rgb = BG_COLOR

        if idx == 1:
            # ── Title Slide Layout ──────────────────────────────────────────
            # Decorative Gold Accent Bar
            accent_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.2), Inches(0.15), Inches(2.8))
            accent_bar.fill.solid()
            accent_bar.fill.fore_color.rgb = HEADER_ACCENT
            accent_bar.line.fill.background()

            # Main Title Box
            title_box = slide.shapes.add_textbox(Inches(1.9), Inches(2.0), Inches(9.8), Inches(2.0))
            tf = title_box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = slide_info["title"] or title
            p.font.name = "Calibri"
            p.font.size = Pt(40)
            p.font.bold = True
            p.font.color.rgb = TITLE_COLOR

            # Subtitle / Details
            sub_box = slide.shapes.add_textbox(Inches(1.9), Inches(4.2), Inches(9.8), Inches(1.8))
            stf = sub_box.text_frame
            stf.word_wrap = True
            
            p_sub = stf.paragraphs[0]
            first_points = slide_info["bullets"][:2]
            p_sub.text = " • ".join(first_points) if first_points else "Comprehensive AI Technical Deck"
            p_sub.font.name = "Calibri"
            p_sub.font.size = Pt(18)
            p_sub.font.color.rgb = HEADER_ACCENT

            p_meta = stf.add_paragraph()
            p_meta.text = "Created with Doxora AI Studio  •  Executive Edition"
            p_meta.font.name = "Calibri"
            p_meta.font.size = Pt(13)
            p_meta.font.color.rgb = MUTED_COLOR
            p_meta.space_before = Pt(14)

        else:
            # ── Content Slide Layout ────────────────────────────────────────
            # Slide Header Banner Box
            header_box = slide.shapes.add_textbox(Inches(1.0), Inches(0.6), Inches(11.333), Inches(1.1))
            htf = header_box.text_frame
            htf.word_wrap = True
            
            p_tag = htf.paragraphs[0]
            p_tag.text = f"SECTION {idx - 1}  •  PRESENTATION OVERVIEW"
            p_tag.font.name = "Calibri"
            p_tag.font.size = Pt(10)
            p_tag.font.bold = True
            p_tag.font.color.rgb = HEADER_ACCENT

            p_title = htf.add_paragraph()
            p_title.text = slide_info["title"]
            p_title.font.name = "Calibri"
            p_title.font.size = Pt(26)
            p_title.font.bold = True
            p_title.font.color.rgb = TITLE_COLOR
            p_title.space_before = Pt(4)

            # Horizontal divider line
            div = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.8), Inches(11.333), Inches(0.02))
            div.fill.solid()
            div.fill.fore_color.rgb = RGBColor(40, 53, 76)
            div.line.fill.background()

            # Content Card
            card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(2.1), Inches(11.333), Inches(4.5))
            card.fill.solid()
            card.fill.fore_color.rgb = CARD_BG
            card.line.color.rgb = RGBColor(45, 60, 85)

            # Content Text Inside Card
            content_box = slide.shapes.add_textbox(Inches(1.4), Inches(2.3), Inches(10.5), Inches(4.1))
            ctf = content_box.text_frame
            ctf.word_wrap = True

            bullets = slide_info["bullets"]
            if not bullets:
                bullets = ["Key insight and analytical breakdown generated for this topic."]

            for b_idx, bullet in enumerate(bullets[:6]):
                p_bullet = ctf.paragraphs[0] if b_idx == 0 else ctf.add_paragraph()
                p_bullet.text = f"•  {bullet}"
                p_bullet.font.name = "Calibri"
                p_bullet.font.size = Pt(17)
                p_bullet.font.color.rgb = TEXT_COLOR
                p_bullet.space_before = Pt(12)
                p_bullet.line_spacing = 1.25

        # ── Bottom Footer (Every Slide) ────────────────────────────────────
        footer_box = slide.shapes.add_textbox(Inches(1.0), Inches(6.9), Inches(11.333), Inches(0.4))
        ftf = footer_box.text_frame
        p_ft = ftf.paragraphs[0]
        p_ft.text = f"Doxora Studio  |  Slide {idx} of {total_slides}"
        p_ft.font.name = "Calibri"
        p_ft.font.size = Pt(9)
        p_ft.font.color.rgb = MUTED_COLOR

    prs.save(output_path)
    return output_path


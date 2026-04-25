"""
PhantomPen OS — Local Python Backend
Provides: AI writing assistant (via Ollama) + real file export (PDF, DOCX)

Requirements:
    pip install flask flask-cors requests python-docx reportlab

Optional (still working on this for AI):
    Install Ollama from https://ollama.com
    Then run: ollama pull llama3.2
"""
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import json
import os
import io
import tempfile

app = Flask(__name__)
CORS(app)  # Allow requests from the browser frontend

# ── Config ──────────────────────────────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2"          # change to any model you have pulled
PORT         = 5001 
# ── Health check ─────────────────────────────────────────────────────────────
@app.route("/api/status")
def status():
    ollama_ok = False
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=2)
        ollama_ok = r.status_code == 200
    except Exception:
        pass
    return jsonify({
        "server": "ok",
        "ollama": ollama_ok,
        "model":  OLLAMA_MODEL,
    })

# ── AI Writing Assistant ──────────────────────────────────────────────────────
@app.route("/api/ai/complete", methods=["POST"])
def ai_complete():
    """
    Body: { "prompt": str, "context": str, "mode": str }
    Modes: continue | improve | summarise | brainstorm | fixgrammar
    Returns a streaming plain-text response.
    """
    data    = request.get_json(force=True)
    mode    = data.get("mode", "continue")
    context = data.get("context", "")
    prompt  = data.get("prompt", "")

    system_prompts = {
        "continue":    "You are a creative writing assistant. Continue the text naturally and seamlessly. Output only the continuation, no preamble.",
        "improve":     "You are an editor. Rewrite the selected text to be clearer, more vivid, and more engaging. Output only the improved text.",
        "summarise":   "You are a summariser. Write a concise 2-3 sentence summary of the text. Output only the summary.",
        "brainstorm":  "You are a brainstorming partner. Generate 5 creative ideas related to the text as a short bullet list.",
        "fixgrammar":  "You are a copy editor. Fix all grammar, spelling, and punctuation errors. Output only the corrected text.",
    }

    system = system_prompts.get(mode, system_prompts["continue"])

    user_message = f"Text:\n{context}\n\nInstruction: {prompt}" if prompt else f"Text:\n{context}"

    payload = {
        "model":  OLLAMA_MODEL,
        "system": system,
        "prompt": user_message,
        "stream": False,
    }

    try:
        r = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=60)
        r.raise_for_status()
        result = r.json().get("response", "")
        return jsonify({"result": result})
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Ollama not running. Start it with: ollama serve"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    """
    Multi-turn chat with the document as context.
    Body: { "messages": [...], "documentContext": str }
    """
    data     = request.get_json(force=True)
    messages = data.get("messages", [])
    doc_ctx  = data.get("documentContext", "")

    system = (
        "You are PhantomPen, a private AI writing assistant. "
        "You help the user with their creative work. "
        "Everything stays local — you never mention cloud services. "
        + (f"\n\nCurrent document:\n{doc_ctx[:3000]}" if doc_ctx else "")
    )
    # Convert to Ollama message format
    ollama_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    payload = {
        "model":    OLLAMA_MODEL,
        "system":   system,
        "messages": ollama_messages,
        "stream":   False,
    }

    try:
        r = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=60)
        r.raise_for_status()
        result = r.json().get("message", {}).get("content", "")
        return jsonify({"result": result})
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Ollama not running. Start it with: ollama serve"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── File Export ───────────────────────────────────────────────────────────────
@app.route("/api/export/docx", methods=["POST"])
def export_docx():
    """
    Body: { "title": str, "content": str (plain text), "html": str }
    Returns a .docx file download.
    """
    try:
        from docx import Document
        from docx.shared import Pt, RGBColor, Inches
        from docx.enum.text import WD_ALIGN_PARAGRAPH
    except ImportError:
        return jsonify({"error": "python-docx not installed. Run: pip install python-docx"}), 500

    data    = request.get_json(force=True)
    title   = data.get("title", "Untitled")
    html    = data.get("html", "")
    content = data.get("content", "")

    doc = Document()

    # Styling
    style = doc.styles["Normal"]
    style.font.name = "Georgia"
    style.font.size = Pt(12)

    # Margins
    for section in doc.sections:
        section.top_margin    = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin   = Inches(1.2)
        section.right_margin  = Inches(1.2)

    # Title
    title_para = doc.add_heading(title, 0)
    title_para.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # Parse HTML content into paragraphs
    _html_to_docx(doc, html if html else content)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)
    return send_file(
        buf,
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        as_attachment=True,
        download_name=f"{safe_name}.docx",
    )


@app.route("/api/export/pdf", methods=["POST"])
def export_pdf():
    """
    Body: { "title": str, "content": str }
    Returns a .pdf file download.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT
    except ImportError:
        return jsonify({"error": "reportlab not installed. Run: pip install reportlab"}), 500

    data    = request.get_json(force=True)
    title   = data.get("title", "Untitled")
    content = data.get("content", "")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=3*cm, rightMargin=3*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "PhantomTitle",
        parent=styles["Title"],
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#111114"),
        spaceAfter=18,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "PhantomBody",
        parent=styles["Normal"],
        fontSize=12,
        leading=20,
        textColor=colors.HexColor("#1a1a1a"),
        spaceAfter=10,
        fontName="Helvetica",
        alignment=TA_LEFT,
    )
    h1_style = ParagraphStyle(
        "PhantomH1",
        parent=styles["Heading1"],
        fontSize=18,
        leading=24,
        textColor=colors.HexColor("#0a0a0b"),
        spaceBefore=16,
        spaceAfter=8,
        fontName="Helvetica-Bold",
    )
    h2_style = ParagraphStyle(
        "PhantomH2",
        parent=styles["Heading2"],
        fontSize=14,
        leading=20,
        textColor=colors.HexColor("#0a0a0b"),
        spaceBefore=12,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )

    story = [Paragraph(title, title_style), Spacer(1, 0.3*cm)]

    for line in content.split("\n"):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.4*cm))
            continue
        if line.startswith("# "):
            story.append(Paragraph(line[2:], h1_style))
        elif line.startswith("## "):
            story.append(Paragraph(line[3:], h2_style))
        else:
            # Escape XML special chars
            safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            story.append(Paragraph(safe, body_style))

    doc.build(story)
    buf.seek(0)

    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)
    return send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{safe_name}.pdf",
    )


@app.route("/api/export/txt", methods=["POST"])
def export_txt():
    data    = request.get_json(force=True)
    title   = data.get("title", "Untitled")
    content = data.get("content", "")
    buf     = io.BytesIO((f"{title}\n{'='*len(title)}\n\n{content}").encode("utf-8"))
    safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)
    return send_file(buf, mimetype="text/plain", as_attachment=True, download_name=f"{safe_name}.txt")
    
# ── Helpers ───────────────────────────────────────────────────────────────────
def _html_to_docx(doc, html):
    """Very lightweight HTML → docx converter (no external deps beyond python-docx)."""
    from docx.shared import Pt
    import re

    # Strip tags we handle explicitly, split into blocks
    # Handle headings
    html = re.sub(r"<h1[^>]*>(.*?)</h1>", lambda m: f"\n[H1]{m.group(1)}[/H1]\n", html, flags=re.S)
    html = re.sub(r"<h2[^>]*>(.*?)</h2>", lambda m: f"\n[H2]{m.group(1)}[/H2]\n", html, flags=re.S)
    html = re.sub(r"<h3[^>]*>(.*?)</h3>", lambda m: f"\n[H3]{m.group(1)}[/H3]\n", html, flags=re.S)
    html = re.sub(r"<p[^>]*>(.*?)</p>",   lambda m: f"\n{m.group(1)}\n",           html, flags=re.S)
    html = re.sub(r"<br\s*/?>", "\n", html)
    html = re.sub(r"<strong>(.*?)</strong>", r"**\1**", html, flags=re.S)
    html = re.sub(r"<em>(.*?)</em>",        r"_\1_",   html, flags=re.S)
    html = re.sub(r"<[^>]+>", "", html)  # strip remaining tags
    html = html.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&nbsp;", " ")

    for line in html.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("[H1]"):
            doc.add_heading(line[4:-5], level=1)
        elif line.startswith("[H2]"):
            doc.add_heading(line[4:-5], level=2)
        elif line.startswith("[H3]"):
            doc.add_heading(line[4:-5], level=3)
        else:
            p = doc.add_paragraph()
            # Handle bold/italic inline
            import re as _re
            parts = _re.split(r"(\*\*.*?\*\*|_.*?_)", line)
            for part in parts:
                if part.startswith("**") and part.endswith("**"):
                    run = p.add_run(part[2:-2])
                    run.bold = True
                elif part.startswith("_") and part.endswith("_"):
                    run = p.add_run(part[1:-1])
                    run.italic = True
                else:
                    p.add_run(part)


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  PhantomPen OS — Local Backend")
    print(f"  Running at http://localhost:{PORT}")
    print("=" * 50)
    print()
    print("  AI Features require Ollama:")
    print("  1. Install from https://ollama.com")
    print(f"  2. Run: ollama pull {OLLAMA_MODEL}")
    print("  3. Run: ollama serve")
    print()
    print("  Export Features: always available")
    print("=" * 50)
    app.run(port=PORT, debug=False)

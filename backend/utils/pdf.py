from pathlib import Path
from pypdf import PdfReader
def extract_pdf_text(path:Path)->str: return '\n\n'.join(p.extract_text() or '' for p in PdfReader(str(path)).pages).strip()

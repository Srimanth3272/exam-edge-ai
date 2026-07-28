import fitz  # PyMuPDF
import sys

try:
    doc = fitz.open("1785217185.pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    
    with open("pdf_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Extracted text successfully.")
except Exception as e:
    print(f"Error: {e}")

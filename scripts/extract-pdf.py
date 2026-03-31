"""
Generic PDF recipe extractor.
- Detects Broodje Dunner e-books and uses specialized parser
- For other PDFs: extracts text + images per page for AI processing

Usage: python extract-pdf.py <pdf_path> [original_filename]
Output: JSON to stdout
"""

import sys
import os
import re
import io
import json
import base64

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

from pypdf import PdfReader
from PIL import Image

IMG_MAX_WIDTH = 500
IMG_JPEG_QUALITY = 70

UNITS = r'gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|theelepel|stuks?|plakjes?|sneetjes?|blaadjes?|tenen?|teentjes?|takjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk|handjes?|bosjes?|grote|kleine|middelgrote'

DUTCH_AMOUNTS = {
    'halve': 'halve', 'half': 'halve', 'kwart': 'kwart',
    'driekwart': 'driekwart', 'hele': 'hele', 'heel': 'hele',
}


def extract_page_image(page):
    """Extract the largest image from a PDF page as base64 JPEG."""
    try:
        imgs = page.images
        if not imgs:
            return None
        best = max(imgs, key=lambda x: len(x.data))
        img = Image.open(io.BytesIO(best.data))
        if img.mode in ('CMYK', 'RGBA', 'P'):
            img = img.convert('RGB')
        if img.width < 50 or img.height < 50:
            return None
        if img.width > IMG_MAX_WIDTH:
            ratio = IMG_MAX_WIDTH / img.width
            img = img.resize((IMG_MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=IMG_JPEG_QUALITY, optimize=True)
        return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"
    except Exception:
        return None


def parse_bd_ingredient(text):
    """Parse Broodje Dunner ingredient — amount at END or START."""
    text = text.strip()
    first_word = text.split()[0].lower() if text else ''
    if first_word in DUTCH_AMOUNTS:
        rest = text[len(first_word):].strip()
        return {'hoeveelheid': DUTCH_AMOUNTS[first_word], 'eenheid': None, 'naam': rest}
    m = re.match(r'^(.+?)\s+([\d½¼¾⅓⅔,./]+)\s*(' + UNITS + r')?\s*$', text, re.IGNORECASE)
    if m:
        return {'hoeveelheid': m.group(2).strip(), 'eenheid': m.group(3).strip() if m.group(3) else None, 'naam': m.group(1).strip()}
    m = re.match(r'^([\d½¼¾⅓⅔,./]+)\s*(' + UNITS + r')?\s+(.+)$', text, re.IGNORECASE)
    if m:
        return {'hoeveelheid': m.group(1).strip(), 'eenheid': m.group(2).strip() if m.group(2) else None, 'naam': m.group(3).strip()}
    return {'hoeveelheid': None, 'eenheid': None, 'naam': text}


def is_broodje_dunner(pdf_path, original_name=None):
    name = (original_name or os.path.basename(pdf_path)).lower()
    return 'broodje' in name and 'dunner' in name


def extract_broodje_dunner(pdf_path):
    """Use the specialized Broodje Dunner parser."""
    # Import from the copied parser
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from bd_parser import extract_recipes_from_ebook

    num = re.search(r'(\d+)', os.path.basename(pdf_path))
    ebook_num = int(num.group(1)) if num else 1

    raw_recipes = extract_recipes_from_ebook(pdf_path, ebook_num)

    recipes = []
    for r in raw_recipes:
        ingredients = [parse_bd_ingredient(ing) for ing in r.get('ingredients', [])]
        recipes.append({
            'title': r['name'],
            'subtitle': r.get('vega') or None,
            'image_data': r.get('image'),
            'bron': 'Broodje Dunner',
            'basis_porties': int(r['portions']) if r.get('portions') else 2,
            'tijd': r.get('time') or None,
            'moeilijkheid': 'Gemiddeld',
            'ingredients': ingredients,
            'steps': [{'titel': None, 'beschrijving': s} for s in r.get('steps', [])],
            'tags': [f'E-book {ebook_num}'],
            'nutrition': None,
        })

    return recipes


def extract_generic(pdf_path):
    """Extract pages with text and images for AI processing."""
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = (page.extract_text() or '').strip()
        image = extract_page_image(page)

        # Include page if it has text OR an image
        if len(text) > 30 or image:
            pages.append({
                'pageNum': i + 1,
                'text': text,
                'image': image,
            })
    return pages


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No PDF path provided'}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    original_name = sys.argv[2] if len(sys.argv) > 2 else None

    if not os.path.exists(pdf_path):
        print(json.dumps({'error': f'File not found: {pdf_path}'}))
        sys.exit(1)

    if is_broodje_dunner(pdf_path, original_name):
        recipes = extract_broodje_dunner(pdf_path)
        result = {
            'mode': 'broodje_dunner',
            'recipes': recipes,
            'total': len(recipes),
        }
    else:
        pages = extract_generic(pdf_path)
        result = {
            'mode': 'generic',
            'pages': pages,
            'total_pages': len(pages),
        }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

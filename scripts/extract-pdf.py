"""
PDF recipe extractor — called from Next.js API.
Detects Broodje Dunner e-books and uses specialized parser, otherwise outputs raw pages.

Usage: python extract-pdf.py <pdf_path>
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

# Add RecipeFinder for Broodje Dunner parser
sys.path.insert(0, r"D:\AI\RecipeFinder")

IMG_MAX_WIDTH = 500
IMG_JPEG_QUALITY = 70


def extract_page_image(page):
    """Extract the largest image from a PDF page as base64 JPEG."""
    try:
        imgs = page.images
        if not imgs:
            return None
        # Find largest image
        best = None
        best_size = 0
        for img_obj in imgs:
            if len(img_obj.data) > best_size:
                best = img_obj
                best_size = len(img_obj.data)
        if not best:
            return None
        img = Image.open(io.BytesIO(best.data))
        if img.mode in ('CMYK', 'RGBA', 'P'):
            img = img.convert('RGB')
        # Skip tiny images
        if img.width < 50 or img.height < 50:
            return None
        if img.width > IMG_MAX_WIDTH:
            ratio = IMG_MAX_WIDTH / img.width
            new_h = int(img.height * ratio)
            img = img.resize((IMG_MAX_WIDTH, new_h), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=IMG_JPEG_QUALITY, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode('ascii')
        return f"data:image/jpeg;base64,{b64}"
    except Exception:
        return None


def is_broodje_dunner(pdf_path, original_name=None):
    """Check if PDF is a Broodje Dunner e-book."""
    name = (original_name or os.path.basename(pdf_path)).lower()
    return 'broodje' in name and 'dunner' in name


UNITS = r'gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|theelepel|stuks?|plakjes?|sneetjes?|blaadjes?|tenen?|teentjes?|takjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk|handjes?|bosjes?|grote|kleine|middelgrote'

# Dutch word amounts that should be treated as numeric quantities
DUTCH_AMOUNTS = {
    'halve': 'halve', 'half': 'halve',
    'kwart': 'kwart',
    'driekwart': 'driekwart',
    'hele': 'hele', 'heel': 'hele',
}

def parse_bd_ingredient(text):
    """Parse Broodje Dunner ingredient — amount is usually at the END.
    Examples:
      'Extra mager rundergehakt 300 gram' → 300 gram / Extra mager rundergehakt
      'Knoflook 1 teentje' → 1 teentje / Knoflook
      'Volkoren wraps (Santa maria) 4 stuks' → 4 stuks / Volkoren wraps (Santa maria)
      'halve ui' → halve / ui
      'Sla' → Sla (no amount)
      '1 ui' → 1 / ui (amount at start)
      'ijsbergsla 1 handje' → 1 handje / ijsbergsla
    """
    text = text.strip()

    # Try Dutch word amount at START: "halve ui", "kwart paprika"
    first_word = text.split()[0].lower() if text else ''
    if first_word in DUTCH_AMOUNTS:
        rest = text[len(first_word):].strip()
        return {
            'hoeveelheid': DUTCH_AMOUNTS[first_word],
            'eenheid': None,
            'naam': rest,
        }

    # Try amount at END: "naam 123 eenheid"
    m = re.match(
        r'^(.+?)\s+([\d½¼¾⅓⅔,./]+)\s*(' + UNITS + r')?\s*$',
        text, re.IGNORECASE
    )
    if m:
        return {
            'hoeveelheid': m.group(2).strip(),
            'eenheid': m.group(3).strip() if m.group(3) else None,
            'naam': m.group(1).strip(),
        }

    # Try amount at START: "123 eenheid naam"
    m = re.match(
        r'^([\d½¼¾⅓⅔,./]+)\s*(' + UNITS + r')?\s+(.+)$',
        text, re.IGNORECASE
    )
    if m:
        return {
            'hoeveelheid': m.group(1).strip(),
            'eenheid': m.group(2).strip() if m.group(2) else None,
            'naam': m.group(3).strip(),
        }

    # No amount found
    return {'hoeveelheid': None, 'eenheid': None, 'naam': text}


def extract_broodje_dunner(pdf_path):
    """Use the specialized Broodje Dunner parser."""
    from build_recipe_app import extract_recipes_from_ebook
    num = re.search(r'(\d+)', os.path.basename(pdf_path))
    ebook_num = int(num.group(1)) if num else 1

    raw_recipes = extract_recipes_from_ebook(pdf_path, ebook_num)

    recipes = []
    for r in raw_recipes:
        # Parse ingredients — BD format has amount at END: "Kipfilet 200 gram"
        ingredients = []
        for ing_text in r.get('ingredients', []):
            parsed = parse_bd_ingredient(ing_text)
            ingredients.append(parsed)

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
        text = page.extract_text()
        if text and len(text.strip()) > 30:
            image = extract_page_image(page)
            pages.append({
                'pageNum': i + 1,
                'text': text.strip(),
                'image': image,
            })
    return pages


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No PDF path provided'}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(json.dumps({'error': f'File not found: {pdf_path}'}))
        sys.exit(1)

    original_name = sys.argv[2] if len(sys.argv) > 2 else None
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

    # Output JSON to stdout
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

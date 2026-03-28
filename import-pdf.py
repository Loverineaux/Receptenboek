"""
Import Broodje Dunner PDF recipes into Supabase using the proven Python extractor.
Usage: python import-pdf.py path/to/ebook.pdf
"""

import sys
import os
import re
import io
import base64
import json
import requests
from dotenv import load_dotenv

# Add RecipeFinder to path for the extraction functions
sys.path.insert(0, r"D:\AI\RecipeFinder")
from build_recipe_app import extract_recipes_from_ebook, extract_pages, parse_recipe_page

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), '.env.local'))

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

def supabase_post(table, data):
    """Insert a row into Supabase."""
    res = requests.post(
        f'{SUPABASE_URL}/rest/v1/{table}',
        headers=HEADERS,
        json=data,
    )
    if res.status_code not in (200, 201):
        raise Exception(f'Supabase {table} insert failed: {res.text}')
    return res.json()

def supabase_get(table, params=None):
    """Query Supabase."""
    res = requests.get(
        f'{SUPABASE_URL}/rest/v1/{table}',
        headers={**HEADERS, 'Prefer': ''},
        params=params or {},
    )
    return res.json()

def upload_image(recipe_id, image_b64):
    """Upload a base64 image to Supabase Storage and return the public URL."""
    if not image_b64:
        return None

    # Strip data URL prefix
    if ',' in image_b64:
        image_b64 = image_b64.split(',', 1)[1]

    image_bytes = base64.b64decode(image_b64)
    path = f'recipes/{recipe_id}.jpg'

    res = requests.post(
        f'{SUPABASE_URL}/storage/v1/object/recipe-images/{path}',
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
        },
        data=image_bytes,
    )

    if res.status_code not in (200, 201):
        print(f'  [WARN] Image upload failed: {res.text[:100]}')
        return None

    return f'{SUPABASE_URL}/storage/v1/object/public/recipe-images/{path}'

def parse_ingredient(text):
    """Parse ingredient string into hoeveelheid/eenheid/naam."""
    # Common patterns: "200 gram kipfilet", "2 el olijfolie", "1 ui"
    m = re.match(
        r'^([\d½¼¾⅓⅔,./]+)\s*'
        r'(gram|g|kg|ml|l|dl|cl|el|tl|eetlepel|theelepel|stuks?|plakjes?|sneetjes?|blaadjes?|tenen?|takjes?|snufje|scheut|blikjes?|zakjes?|potjes?|stuk|halve|hele|grote|kleine|middelgrote)?\s*'
        r'(.+)',
        text, re.IGNORECASE
    )
    if m:
        return {
            'hoeveelheid': m.group(1).strip(),
            'eenheid': m.group(2).strip() if m.group(2) else None,
            'naam': m.group(3).strip(),
        }
    return {'hoeveelheid': None, 'eenheid': None, 'naam': text.strip()}

def import_recipe(user_id, recipe, ebook_num):
    """Import a single recipe into Supabase."""
    # Upload image first
    # Create recipe row first to get ID
    recipe_data = {
        'user_id': user_id,
        'title': recipe['name'],
        'subtitle': recipe.get('vega') or None,
        'image_url': None,  # Set after upload
        'bron': 'Broodje Dunner',
        'basis_porties': int(recipe['portions']) if recipe.get('portions') else 2,
        'tijd': recipe.get('time') or None,
        'moeilijkheid': 'Gemiddeld',
        'is_public': False,
        'weetje': None,
        'allergenen': None,
    }

    result = supabase_post('recipes', recipe_data)
    if isinstance(result, list):
        result = result[0]
    recipe_id = result['id']

    # Upload image and update recipe
    if recipe.get('image'):
        image_url = upload_image(recipe_id, recipe['image'])
        if image_url:
            requests.patch(
                f'{SUPABASE_URL}/rest/v1/recipes?id=eq.{recipe_id}',
                headers=HEADERS,
                json={'image_url': image_url},
            )

    # Insert ingredients
    ingredients = []
    for idx, ing_text in enumerate(recipe.get('ingredients', [])):
        parsed = parse_ingredient(ing_text)
        ingredients.append({
            'recipe_id': recipe_id,
            'hoeveelheid': parsed['hoeveelheid'],
            'eenheid': parsed['eenheid'],
            'naam': parsed['naam'],
            'sort_order': idx,
        })
    if ingredients:
        supabase_post('ingredients', ingredients)

    # Insert steps
    steps = []
    for idx, step_text in enumerate(recipe.get('steps', [])):
        steps.append({
            'recipe_id': recipe_id,
            'titel': None,
            'beschrijving': step_text,
            'afbeelding_url': None,
            'sort_order': idx,
        })
    if steps:
        supabase_post('steps', steps)

    # Insert tags
    tag_name = f'E-book {ebook_num}'
    # Upsert tag
    tag_res = requests.post(
        f'{SUPABASE_URL}/rest/v1/tags',
        headers={**HEADERS, 'Prefer': 'return=representation,resolution=merge-duplicates'},
        json={'name': tag_name},
    )
    if tag_res.status_code in (200, 201):
        tags = tag_res.json()
        tag_id = tags[0]['id'] if isinstance(tags, list) else tags['id']
        supabase_post('recipe_tags', {'recipe_id': recipe_id, 'tag_id': tag_id})

    return recipe_id

def main():
    if len(sys.argv) < 2:
        # Default: find all Broodje Dunner PDFs
        pdf_folder = r"C:\Users\robin\Downloads"
        pdfs = []
        for f in os.listdir(pdf_folder):
            if f.lower().startswith('broodje') and f.lower().endswith('.pdf'):
                num = re.search(r'(\d+)', f)
                ebook_num = int(num.group(1)) if num else 1
                pdfs.append((os.path.join(pdf_folder, f), ebook_num))
        pdfs.sort(key=lambda x: x[1])
    else:
        pdf_path = sys.argv[1]
        num = re.search(r'(\d+)', os.path.basename(pdf_path))
        ebook_num = int(num.group(1)) if num else 1
        pdfs = [(pdf_path, ebook_num)]

    if not pdfs:
        print("Geen PDF bestanden gevonden!")
        return

    # Get user ID
    profiles = supabase_get('profiles', {'select': 'id', 'limit': '1'})
    if not profiles:
        print("Geen gebruiker gevonden!")
        return
    user_id = profiles[0]['id']
    print(f"User: {user_id}")

    total_ok = 0
    total_fail = 0

    for pdf_path, ebook_num in pdfs:
        print(f"\n{'='*60}")
        print(f"E-book {ebook_num}: {os.path.basename(pdf_path)}")
        print(f"{'='*60}")

        recipes = extract_recipes_from_ebook(pdf_path, ebook_num)
        print(f"Gevonden: {len(recipes)} recepten\n")

        for i, recipe in enumerate(recipes):
            name = recipe['name']
            has_img = 'YES' if recipe.get('image') else 'NO'
            try:
                rid = import_recipe(user_id, recipe, ebook_num)
                print(f"  [{i+1}/{len(recipes)}] {name} — OK (img:{has_img}, {len(recipe['ingredients'])} ing, {len(recipe['steps'])} stappen)")
                total_ok += 1
            except Exception as e:
                print(f"  [{i+1}/{len(recipes)}] {name} — FAIL: {e}")
                total_fail += 1

    print(f"\n{'='*60}")
    print(f"KLAAR: {total_ok} geïmporteerd, {total_fail} mislukt")

if __name__ == '__main__':
    main()

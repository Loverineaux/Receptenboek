"""Strip HTML tags from all recipe steps in the database."""
import requests, re, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stdout.reconfigure(line_buffering=True)

env = {}
with open('.env.local') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v

SB_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SB_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
headers = {
    'apikey': SB_KEY,
    'Authorization': f'Bearer {SB_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def strip_html(html):
    text = re.sub(r'<[^>]*>', '', html)
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').replace('\xa0', ' ')
    return re.sub(r'\s+', ' ', text).strip()

# Paginate through all steps (Supabase default limit is 1000)
all_steps = []
offset = 0
while True:
    res = requests.get(
        f'{SB_URL}/rest/v1/steps?select=id,beschrijving&order=id&offset={offset}&limit=1000',
        headers=headers
    )
    batch = res.json()
    all_steps.extend(batch)
    if len(batch) < 1000:
        break
    offset += 1000

print(f'Total steps: {len(all_steps)}')

fixed = 0
for s in all_steps:
    desc = s['beschrijving'] or ''
    if '<' in desc and '>' in desc:
        cleaned = strip_html(desc)
        if cleaned != desc:
            requests.patch(
                f'{SB_URL}/rest/v1/steps?id=eq.{s["id"]}',
                headers=headers,
                json={'beschrijving': cleaned}
            )
            fixed += 1
            print(f'  Fixed: {cleaned[:60]}...')

print(f'\nKlaar: {fixed} stappen opgeschoond')

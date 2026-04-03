import requests, json, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stdout.reconfigure(line_buffering=True)

# Load env
env = {}
with open('.env.local') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v

SB_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SB_ANON = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

# Login
auth_res = requests.post(
    f'{SB_URL}/auth/v1/token?grant_type=password',
    headers={'apikey': SB_ANON, 'Content-Type': 'application/json'},
    json={'email': 'robinlovink@hotmail.com', 'password': 'Test123'}
)
if auth_res.status_code != 200:
    print(f'Login failed: {auth_res.status_code} {auth_res.text[:100]}')
    sys.exit(1)

token = auth_res.json()['access_token']
uid = auth_res.json()['user']['id']
print(f'Logged in as {uid}')

sb_headers = {
    'apikey': SB_ANON,
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

urls = [
    'https://www.hellofresh.be/recipes/kruidige-bobotie-van-rundergehakt-en-boontjes-629758f5d1e4152bd60d2155',
    'https://www.hellofresh.be/recipes/kruidige-bobotie-van-rundergehakt-en-boontjes-63c7d14f6ab9cacaa3737ac6',
    'https://www.hellofresh.nl/recipes/aubergine-uit-de-oven-met-casarecce-62a19cce89567c4ad00b38c0',
    'https://www.hellofresh.nl/recipes/aziatische-fusionsalade-met-vegetarische-runderstukjes-62050e38b73a644b3d2667da',
    'https://www.hellofresh.nl/recipes/zomerse-andijviestamppot-593a8656171c582809691142',
    'https://www.hellofresh.nl/recipes/andijviestamppot-met-gebakken-halloumi-5fd0c5b8be10d8756c0ab429',
    'https://www.hellofresh.nl/recipes/aziatische-noedels-met-roerei-en-pindas-5a7ad24030006c3c30442662',
    'https://www.hellofresh.nl/recipes/bami-in-surinaamse-stijl-met-kippendijreepjes-61b0c1f9c28ee61e355db53e',
    'https://www.hellofresh.nl/recipes/biefstukpuntjes-in-lichtpittige-zwarte-bonensaus-6166e3e3e980d246df30844a',
    'https://www.hellofresh.nl/recipes/bulgur-met-avocado-komkommer-en-cranberrys-63a2d0ff858485949306b4d7',
    'https://www.hellofresh.nl/recipes/noedels-met-biefstukreepjes-in-zoet-pittige-chilisaus-5f4fade2dbe49666a74dd76b',
    'https://www.hellofresh.nl/recipes/boerenworst-met-gebakken-ui-en-currysaus-635bd0c28848866d3f022599',
    'https://www.hellofresh.nl/recipes/biefstukpuntjes-in-zoete-aziatische-saus-62332069cbdaf5207f188af3',
    'https://www.hellofresh.nl/recipes/broodje-hamburger-met-italiaanse-twist-601164527aa3987e302686c9',
    'https://www.hellofresh.nl/recipes/boekoeloekoeburger-op-een-wortelbroodje-661e6076019ddbd535c02c12',
    'https://www.hellofresh.nl/recipes/niet-gebruiken-burger-met-pittige-groene-peper-en-piccalilly-63c7d78600ace46356b3f5d0',
    'https://www.hellofresh.nl/recipes/broodje-kipgyros-met-aioli-62331fb0cea9047a667a11d5',
    'https://www.hellofresh.nl/recipes/brie-in-bladerdeeg-met-appel-en-gekaramelliseerde-ui-63c7ce646ab9cacaa37370e2',
    'https://www.hellofresh.nl/recipes/bulgurbowl-met-kipgehakt-en-sweet-chili-tortillachips-648c4cdd0635a1e9befbb538',
    'https://www.hellofresh.nl/recipes/duitse-biefstuk-met-piccalilly-61961c4420d21a08e31b4eca',
    'https://www.hellofresh.nl/recipes/mediterrane-bulgur-met-kipgyros-rode-biet-avocado-komkommer-en-mesclun-590c77012310a85ea53d17e2',
    'https://www.hellofresh.nl/recipes/aromatische-visstoof-met-koolvis-en-rijst-6568a2465234ba85b73c3a63',
    'https://www.hellofresh.nl/recipes/roasted-vegetable-bulgur-salad-672249eb4251e0dbe4be97f4',
    'https://www.hellofresh.nl/recipes/bulgur-linzensalade-met-geitenkaas-5d7288eda82f5000093883e5',
    'https://www.hellofresh.nl/recipes/bulgursalade-met-biefstukpuntjes-5f9019bad35147555b1601d4',
    'https://www.hellofresh.nl/recipes/burrata-and-pecorino-pasta-63ff6d687cb532b7de19ed75',
    'https://www.hellofresh.nl/recipes/boerenworst-met-pastinaak-wortelstamppot-61cdc6c325af9d408b228fe2',
    'https://www.hellofresh.nl/recipes/bulgur-met-spinazie-en-harissa-63c7d2356ab9cacaa3737d7c',
    'https://www.hellofresh.nl/recipes/conchiglie-met-rode-pesto-en-feta-5ad0bb1330006c22d171aca2',
    'https://www.hellofresh.nl/recipes/courgette-uit-de-oven-in-romige-tomatensaus-5f7749a373e82011896496dd',
    'https://www.hellofresh.nl/recipes/curry-noedelsoep-met-kokosmelk-601164803bf8650a195649ad',
    'https://www.hellofresh.nl/recipes/verse-conchiglie-met-mozzarella-uit-de-oven-60812d4ceae7ff4d565dd162',
    'https://www.hellofresh.nl/recipes/courgettepasta-met-romige-kruidenkaassaus-61cdc6bdfbff7d0d04691704',
    'https://www.hellofresh.nl/recipes/courgettesoep-met-bospaddenstoelenpesto-648c4ca70635a1e9befbb514',
    'https://www.hellofresh.nl/recipes/casarecce-alla-norma-61c4364babab9e0e5e16f521',
    'https://www.hellofresh.nl/recipes/cannelloni-met-romige-spinazie-champignonvulling-61f2c49b6fca6e5b95349151',
    'https://www.hellofresh.nl/recipes/chilli-sin-carne-5e5f58ac67efe93af63103f0',
    'https://www.hellofresh.nl/recipes/chicken-parmigiana-654a5909fd4304b9ba89802d',
    'https://www.hellofresh.nl/recipes/courgette-preisoep-met-verse-dille-6220dec810c59f43d756ccec',
    'https://www.hellofresh.nl/recipes/duitse-biefstuk-met-pittige-zoete-aardappelpuree-60812d4226dbb140f85952e9',
    'https://www.hellofresh.nl/recipes/indiase-dahl-met-zoete-aardappel-5d6681',
]

success = 0
failed = 0
errors = []

for i, url in enumerate(urls):
    slug = url.split('/')[-1][:50]
    print(f'[{i+1}/{len(urls)}] {slug}...', end=' ', flush=True)
    try:
        # Extract via app
        res = requests.post('http://localhost:3000/api/extract/url', json={'url': url}, timeout=120)
        if res.status_code != 200:
            print(f'EXTRACT FAIL ({res.status_code})')
            failed += 1; continue
        recipe = res.json()
        if 'error' in recipe:
            print(f'ERROR: {recipe["error"][:60]}')
            failed += 1; continue
        title = recipe.get('title', '?')

        # Insert recipe via Supabase REST (authenticated)
        recipe_row = {
            'user_id': uid,
            'title': title,
            'subtitle': recipe.get('subtitle'),
            'image_url': recipe.get('image_url'),
            'bron': 'HelloFresh',
            'tijd': recipe.get('tijd'),
            'moeilijkheid': recipe.get('moeilijkheid') or 'Gemiddeld',
            'basis_porties': recipe.get('basis_porties') or 4,
        }
        r = requests.post(f'{SB_URL}/rest/v1/recipes', headers=sb_headers, json=recipe_row)
        if r.status_code not in (200, 201):
            print(f'RECIPE FAIL: {r.text[:80]}')
            failed += 1; continue
        rid = r.json()[0]['id']

        # Ingredients
        ings = recipe.get('ingredients', [])
        if ings:
            rows = [{'recipe_id': rid, 'hoeveelheid': ig.get('hoeveelheid'), 'eenheid': ig.get('eenheid'), 'naam': ig.get('naam', ''), 'sort_order': idx} for idx, ig in enumerate(ings)]
            requests.post(f'{SB_URL}/rest/v1/ingredients', headers=sb_headers, json=rows)

        # Steps
        steps = recipe.get('steps', [])
        if steps:
            rows = [{'recipe_id': rid, 'titel': s.get('titel'), 'beschrijving': s.get('beschrijving', ''), 'sort_order': idx} for idx, s in enumerate(steps)]
            requests.post(f'{SB_URL}/rest/v1/steps', headers=sb_headers, json=rows)

        # Nutrition
        nutr = recipe.get('nutrition')
        if nutr and any(v for v in nutr.values() if v):
            nutr_row = {k: v for k, v in nutr.items() if k != 'recipe_id'}
            nutr_row['recipe_id'] = rid
            requests.post(f'{SB_URL}/rest/v1/nutrition', headers=sb_headers, json=nutr_row)

        print(f'OK -> {title[:40]} ({len(ings)} ing, {len(steps)} steps)')
        success += 1
    except Exception as e:
        print(f'ERROR: {e}')
        failed += 1
        errors.append((slug, str(e)[:60]))
    time.sleep(2)

print(f'\n=== Klaar: {success} OK, {failed} mislukt ===')
if errors:
    print('Fouten:')
    for s, e in errors:
        print(f'  {s}: {e}')

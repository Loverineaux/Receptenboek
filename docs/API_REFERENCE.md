# Receptenboek API Referentie

## Overzicht

De Receptenboek API biedt eindpunten voor het beheren van recepten, collecties, ingrediënten, gebruikers en notificaties. Alle eindpunten retourneren JSON en gebruiken standaard HTTP-statuscodes.

## Authenticatie

Meeste eindpunten vereisen authenticatie via Supabase Auth. Sessie-informatie wordt automatisch gevalideerd via cookies.

---

## 📖 Recepten

### `GET /api/recipes`
**Beschrijving:** Lijst alle recepten met filters en paginering  
**Auth:** Optioneel (beïnvloedt zichtbaarheid privé recepten)  
**Query parameters:**
- `search` - Zoekterm voor titel/ingrediënten
- `tags` - Komma-gescheiden lijst van tag namen
- `difficulty` - `Makkelijk`, `Gemiddeld`, of `Moeilijk`
- `time` - Maximale bereidingstijd (bijv. `30`)
- `offset` - Paginering offset (standaard 0)
- `limit` - Aantal resultaten (standaard 20, max 50)

**Response:**
```json
{
  "recipes": [
    {
      "id": "uuid",
      "title": "Pasta Carbonara",
      "subtitle": "Klassiek Italiaans gerecht",
      "image_url": "https://...",
      "tijd": "25 min",
      "moeilijkheid": "Gemiddeld",
      "bron": "Italiaanse Keuken",
      "basis_porties": 4,
      "created_at": "2024-01-15T10:30:00Z",
      "ingredients": [{"naam": "spaghetti"}],
      "tags": [{"id": "uuid", "name": "Pasta"}],
      "average_rating": 4.2,
      "nutrition": null
    }
  ],
  "total": 156
}
```

### `POST /api/recipes`
**Beschrijving:** Maak nieuw recept  
**Auth:** Verplicht  
**Request body:**
```json
{
  "title": "Nieuwe Pasta",
  "subtitle": "Heerlijke pasta",
  "tijd": "30 min",
  "moeilijkheid": "Makkelijk",
  "basis_porties": 2,
  "bron": "Eigen recept",
  "ingredients": [
    {
      "hoeveelheid": "400",
      "eenheid": "gram", 
      "naam": "spaghetti"
    }
  ],
  "steps": [
    {
      "titel": "Voorbereiding",
      "beschrijving": "Zet water op"
    }
  ],
  "tags": ["Pasta", "Vegetarisch"],
  "nutrition": {
    "energie_kcal": "520",
    "eiwitten": "18"
  }
}
```

**Response:** Het aangemaakte recept object

### `GET /api/recipes/[id]`
**Beschrijving:** Haal specifiek recept op  
**Auth:** Optioneel  
**Response:**
```json
{
  "recipe": {
    "id": "uuid",
    "title": "Pasta Carbonara",
    "ingredients": [...],
    "steps": [...],
    "tags": [...],
    "nutrition": {...},
    "ratings": [...],
    "comments": [...],
    "user": {...},
    "average_rating": 4.2,
    "favorite_count": 15
  }
}
```

### `PUT /api/recipes/[id]`
**Beschrijving:** Update recept (alleen eigenaar of admin)  
**Auth:** Verplicht + eigenaarschap  
**Request body:** Zelfde als POST, alle velden optioneel  

### `DELETE /api/recipes/[id]`
**Beschrijving:** Verwijder recept (alleen eigenaar of admin)  
**Auth:** Verplicht + eigenaarschap  

### `POST /api/recipes/[id]/favorite`
**Beschrijving:** Voeg recept toe aan favorieten  
**Auth:** Verplicht  
**Response:** `{"success": true}`

### `DELETE /api/recipes/[id]/favorite`
**Beschrijving:** Verwijder recept uit favorieten  
**Auth:** Verplicht  

### `GET /api/recipes/[id]/favorite-count`
**Beschrijving:** Krijg aantal favorieten en of huidige gebruiker het heeft gefavoriet  
**Auth:** Optioneel  
**Response:**
```json
{
  "count": 15,
  "is_favorited": true
}
```

### `POST /api/recipes/[id]/rate`
**Beschrijving:** Geef rating aan recept  
**Auth:** Verplicht  
**Request body:**
```json
{
  "sterren": 4
}
```
*Gebruik `"sterren": 0` om rating te verwijderen*

### `POST /api/recipes/[id]/scale`
**Beschrijving:** Schaal recept naar ander aantal porties  
**Auth:** Geen  
**Request body:**
```json
{
  "steps": [...],
  "ingredients": [...],
  "basisPorties": 4,
  "newPorties": 6
}
```

### `POST /api/recipes/[id]/calculate-nutrition`
**Beschrijving:** Bereken voedingswaarden op basis van ingrediënten  
**Request body:**
```json
{
  "save": true
}
```
**Response:**
```json
{
  "per_portion_kcal": 520,
  "per_portion_protein": 18.5,
  "coverage": 0.85,
  "matched_count": 8,
  "total_count": 10,
  "missing": ["specerijen"]
}
```

### `POST /api/recipes/[id]/chat`
**Beschrijving:** Chat met AI over het recept  
**Auth:** Verplicht  
**Request body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Kan ik de spaghetti vervangen?"
    }
  ]
}
```
**Response:** Server-Sent Events stream met AI antwoord

---

## 💬 Reacties

### `GET /api/recipes/[id]/comments`
**Beschrijving:** Haal reacties op voor recept  
**Response:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "tekst": "Heerlijk recept!",
      "created_at": "2024-01-15T10:30:00Z",
      "user": {
        "display_name": "Jan",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

### `POST /api/recipes/[id]/comments`
**Beschrijving:** Plaats reactie  
**Auth:** Verplicht  
**Request body:**
```json
{
  "tekst": "Geweldige pasta!",
  "parent_id": null
}
```

### `POST /api/recipes/[id]/comments/like`
**Beschrijving:** Like een reactie  
**Auth:** Verplicht  
**Request body:**
```json
{
  "comment_id": "uuid"
}
```

### `DELETE /api/recipes/[id]/comments/like`
**Beschrijving:** Unlike een reactie  
**Auth:** Verplicht  

---

## 📚 Collecties

### `GET /api/collections`
**Beschrijving:** Lijst alle collecties  
**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Italiaanse Klassiekers", 
    "description": "Traditionele recepten",
    "user": {...},
    "recipe_count": 12,
    "preview_images": ["url1", "url2"],
    "is_following": false,
    "is_collaborator": false,
    "average_rating": 4.3,
    "rating_count": 25
  }
]
```

### `POST /api/collections`
**Beschrijving:** Maak nieuwe collectie  
**Auth:** Verplicht  
**Request body:**
```json
{
  "title": "Mijn Favorieten",
  "description": "De beste recepten"
}
```

### `GET /api/collections/[id]`
**Beschrijving:** Haal collectie op met alle recepten  
**Response:** Collectie object met `recipes` array

### `PUT /api/collections/[id]`
**Beschrijving:** Update collectie (eigenaar of admin)  
**Auth:** Verplicht + eigenaarschap  

### `DELETE /api/collections/[id]`
**Beschrijving:** Verwijder collectie  
**Auth:** Verplicht + eigenaarschap  

### `POST /api/collections/[id]/recipes`
**Beschrijving:** Voeg recept toe aan collectie  
**Auth:** Verplicht  
**Request body:**
```json
{
  "recipe_id": "uuid"
}
```

### `DELETE /api/collections/[id]/recipes`
**Beschrijving:** Verwijder recept uit collectie  
**Auth:** Verplicht  

### `POST /api/collections/[id]/follow`
**Beschrijving:** Volg collectie  
**Auth:** Verplicht  

### `DELETE /api/collections/[id]/follow`
**Beschrijving:** Ontvolg collectie  
**Auth:** Verplicht  

### `POST /api/collections/[id]/rate`
**Beschrijving:** Beoordeel collectie  
**Auth:** Verplicht  
**Request body:**
```json
{
  "sterren": 5
}
```

### `POST /api/collections/[id]/duplicate`
**Beschrijving:** Dupliceer collectie  
**Auth:** Verplicht  
**Request body:**
```json
{
  "title": "Kopie van Italiaanse Klassiekers"
}
```

### `GET /api/collections/[id]/collaborators`
**Beschrijving:** Haal sous-chefs op  
**Response:**
```json
[
  {
    "id": "uuid",
    "display_name": "Marie", 
    "avatar_url": "https://...",
    "added_at": "2024-01-15T10:30:00Z"
  }
]
```

### `POST /api/collections/[id]/collaborators`
**Beschrijving:** Voeg sous-chef toe (alleen eigenaar)  
**Auth:** Verplicht + eigenaarschap  
**Request body:**
```json
{
  "user_id": "uuid"
}
```

### `DELETE /api/collections/[id]/collaborators`
**Beschrijving:** Verwijder sous-chef  
**Auth:** Verplicht + eigenaarschap  

### `GET /api/collections/my-recipe-ids`
**Beschrijving:** Krijg alle recept IDs in eigen/medewerker collecties  
**Auth:** Verplicht  
**Response:** Array van recept IDs

---

## 🥕 Ingrediënten

### `GET /api/ingredients`
**Beschrijving:** Zoek generieke ingrediënten  
**Query parameters:**
- `search` - Zoekterm
- `category` - Categorie filter  
- `offset`, `limit` - Paginering

**Response:**
```json
{
  "ingredients": [
    {
      "id": "uuid",
      "name": "Spaghetti",
      "name_plural": "Spaghetti",
      "category": "granen",
      "aliases": ["pasta", "noedels"],
      "avg_kcal": 350,
      "avg_protein": 12.0,
      "product_count": 15,
      "gram_per_piece": null,
      "gram_per_el": 10
    }
  ],
  "total": 500
}
```

### `POST /api/ingredients`
**Beschrijving:** Maak nieuw generiek ingrediënt  
**Auth:** Verplicht  
**Request body:**
```json
{
  "name": "Quinoa",
  "name_plural": "Quinoa", 
  "category": "granen",
  "aliases": ["kinwa"],
  "gram_per_piece": null,
  "gram_per_el": 8
}
```

### `GET /api/ingredients/[id]`
**Beschrijving:** Haal specifiek ingrediënt op met producten  
**Response:**
```json
{
  "id": "uuid",
  "name": "Spaghetti",
  "products": [...],
  "recipe_count": 45,
  "description": "Lange dunne pasta...",
  "usage_tips": "Kook in gezouten water..."
}
```

### `PUT /api/ingredients/[id]`
**Beschrijving:** Update ingrediënt (creator of admin)  
**Auth:** Verplicht + eigenaarschap  

### `POST /api/ingredients/[id]/generate-content`
**Beschrijving:** Genereer AI-inhoud voor ingrediënt  
**Auth:** Verplicht  
**Response:** Server-Sent Events stream

### `POST /api/ingredients/batch-match`
**Beschrijving:** Koppel alle ongelinkte ingrediënten automatisch  
**Auth:** Admin  
**Response:** Server-Sent Events stream met voortgang

### `POST /api/ingredients/cleanup-duplicates`
**Beschrijving:** Verwijder duplicate producten en herbereken voedingswaarden  
**Auth:** Admin  

### `POST /api/ingredients/enrich`
**Beschrijving:** Verrijk ingrediënt met OpenFoodFacts data  
**Auth:** Verplicht  
**Response:** Server-Sent Events stream

---

## 📦 Producten

### `POST /api/products`
**Beschrijving:** Voeg product toe (handmatig of van barcode)  
**Request body:**
```json
{
  "product_name": "AH Spaghetti",
  "brand": "Albert Heijn",
  "barcode": "1234567890",
  "kcal": 350,
  "protein": 12.0,
  "fat": 1.5,
  "carbs": 70.0
}
```

### `POST /api/products/scan`
**Beschrijving:** Scan barcode en zoek product  
**Request body:**
```json
{
  "barcode": "1234567890"
}
```
**Response:**
```json
{
  "product": {...},
  "source": "open_food_facts",
  "suggested_ingredient": {...},
  "suggested_name": "Volkoren spaghetti",
  "suggested_category": "granen"
}
```

### `POST /api/products/scan-label`
**Beschrijving:** Scan voedingslabel met AI  
**Request body:**
```json
{
  "barcode": "1234567890",
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "product_name": "Product naam"
}
```

### `POST /api/products/[id]/link`
**Beschrijving:** Koppel product aan generiek ingrediënt  
**Auth:** Verplicht + eigenaarschap  
**Request body:**
```json
{
  "generic_ingredient_id": "uuid"
}
```

### `DELETE /api/products/[id]`
**Beschrijving:** Verwijder product  
**Auth:** Verplicht + eigenaarschap  

---

## 🔍 Extractie

### `POST /api/extract/url`
**Beschrijving:** Extraheer recept van URL  
**Request body:**
```json
{
  "url": "https://kooksite.nl/recept/pasta"
}
```
**Response:** `ExtractedRecipe` object met `_validation` scores

### `POST /api/extract/text`
**Beschrijving:** Extraheer recept van tekst  
**Request body:**
```json
{
  "text": "Pasta carbonara\n400g spaghetti\n..."
}
```

### `POST /api/extract/image`
**Beschrijving:** Extraheer recept van afbeelding(en)  
**Request body:**
```json
{
  "images": [
    {
      "data": "data:image/jpeg;base64,/9j/4AAQ...",
      "filename": "recept.jpg"
    }
  ]
}
```

### `POST /api/extract/pdf`
**Beschrijving:** Extraheer recepten van PDF  
**Request body:** FormData met PDF bestand  
**Response:** Array van `ExtractedRecipe` objecten

### `POST /api/bulk-import`
**Beschrijving:** Importeer meerdere URL's tegelijk  
**Auth:** Verplicht  
**Request body:**
```json
{
  "urls": ["https://site1.nl/recept1", "https://site2.nl/recept2"],
  "user_id": "uuid"
}
```

---

## 👤 Gebruikers

### `GET /api/users/[id]/profile`
**Beschrijving:** Haal openbaar profiel op  
**Response:**
```json
{
  "profile": {
    "id": "uuid",
    "display_name": "Jan de Bakker",
    "bio": "Hobbykoch uit Amsterdam",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "recipes": [...],
  "stats": {
    "recipe_count": 15,
    "avg_rating": 4.2,
    "last_recipe_at": "2024-01-15T10:30:00Z"
  }
}
```

### `GET /api/users/search`
**Beschrijving:** Zoek gebruikers  
**Auth:** Verplicht  
**Query parameters:** `q` (zoekterm)  
**Response:** Array van basis profiel objecten

### `POST /api/users/heartbeat`
**Beschrijving:** Update laatste activiteit  
**Auth:** Verplicht  

### `POST /api/users/extraction-count`
**Beschrijving:** Verhoog extractie teller  
**Auth:** Verplicht  
**Request body:**
```json
{
  "amount": 1
}
```
**Response:**
```json
{
  "count": 15,
  "showDonation": true
}
```

### `POST /api/users/delete-account`
**Beschrijving:** Verwijder eigen account (anonimiseer)  
**Auth:** Verplicht  

---

## 🔔 Notificaties

### `GET /api/notifications`
**Beschrijving:** Haal notificaties op  
**Auth:** Verplicht  
**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "comment",
      "message": "Jan heeft gereageerd op Pasta Carbonara",
      "link": "/recepten/uuid",
      "is_read": false,
      "created_at": "2024-01-15T10:30:00Z",
      "actor": {
        "display_name": "Jan",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

### `PATCH /api/notifications`
**Beschrijving:** Markeer als gelezen/ongelezen  
**Auth:** Verplicht  
**Request body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "is_read": true
}
```
*Gebruik `"all": true` voor alle notificaties*

### `DELETE /api/notifications`
**Beschrijving:** Verwijder notificaties  
**Auth:** Verplicht  

### `GET /api/notifications/count`
**Beschrijving:** Aantal ongelezen notificaties  
**Auth:** Verplicht  
**Response:**
```json
{
  "count": 3
}
```

### `GET /api/notifications/preferences`
**Beschrijving:** Haal notificatie-instellingen op  
**Auth:** Verplicht  
**Response:**
```json
{
  "comment": true,
  "favorite": true,
  "rating": false,
  "push_enabled": true
}
```

### `PUT /api/notifications/preferences`
**Beschrijving:** Update notificatie-instellingen  
**Auth:** Verplicht  

### `POST /api/notifications/subscribe`
**Beschrijving:** Registreer FCM push token  
**Auth:** Verplicht  
**Request body:**
```json
{
  "token": "fcm_token_string",
  "device_name": "iPhone van Jan"
}
```

### `DELETE /api/notifications/subscribe`
**Beschrijving:** Verwijder push token  
**Auth:** Verplicht  

---

## 🤖 Suggesties

### `POST /api/suggesties`
**Beschrijving:** Zoek recepten op basis van ingrediënten  
**Request body:**
```json
{
  "ingredienten": ["spaghetti", "ui", "kip"]
}
```
**Response:**
```json
[
  {
    "recipe": {...},
    "matchCount": 3,
    "totalCount": 8, 
    "matchPercentage": 0.375,
    "matched": ["spaghetti", "ui", "kip"],
    "missing": ["tomaat", "basilicum"]
  }
]
```

---

## 📤 Delen

### `POST /api/share`
**Beschrijving:** Deel recept of collectie met gebruiker  
**Auth:** Verplicht  
**Request body:**
```json
{
  "recipient_id": "uuid",
  "type": "recipe",
  "item_id": "uuid"
}
```

---

## ⚙️ Systeem

### `GET /api/ping`
**Beschrijving:** Warm serverless functions op  
**Response:**
```json
{
  "ok": true,
  "warmed": 3
}
```

### `GET /api/og`
**Beschrijving:** Proxy afbeelding voor Open Graph  
**Query parameters:** `url` (afbeelding URL)  

---

## 🛡️ Admin Eindpunten

*Alle admin eindpunten vereisen admin-rechten*

### Statistieken
- `GET /api/admin/stats` - Platform statistieken
- `GET /api/admin/check` - Controleer admin status

### Gebruikersbeheer
- `GET /api/admin/users` - Lijst alle gebruikers
- `POST /api/admin/users/[id]/block` - Blokkeer gebruiker
- `POST /api/admin/users/[id]/unblock` - Deblokkeer gebruiker
- `PUT /api/admin/users/[id]/role` - Wijzig gebruikersrol
- `POST /api/admin/users/[id]/reset-password` - Reset wachtwoord

### Inhoudsbeheer
- `GET /api/admin/comments` - Alle reacties
- `DELETE /api/admin/comments/[id]` - Verwijder reactie
- `GET /api/admin/duplicates` - Vind duplicate recepten
- `DELETE /api/admin/duplicates` - Verwijder recept

### Data-onderhoud
- `POST /api/admin/backfill-temperature` - Vul temperaturen aan
- `POST /api/admin/fix-ingredients` - Repareer ingrediënt structuur
- `POST /api/admin/migrate-base64-images` - Migreer afbeeldingen

### Extractie & Analytics
- `GET /api/admin/extraction-stats` - Extractie statistieken per gebruiker
- `POST /api/admin/extraction-stats` - Registreer donatie
- `GET /api/admin/notifications/log` - Notificatie logboek

### Toegangsbeheer
- `GET /api/admin/access-code` - Haal registratiecode op
- `PUT /api/admin/access-code` - Update registratiecode

---

## Hulp-eindpunten

### `POST /api/auth/verify-access-code`
**Beschrijving:** Verificeer registratiecode  
**Request body:**
```json
{
  "code": "geheime_code"
}
```
**Response:**
```json
{
  "valid": true
}
```

### `GET /api/auth/callback`
**Beschrijving:** OAuth callback handler  
**Query parameters:**
- `code` - OAuth authorization code
- `next` - Redirect URL na login

### `POST /api/recipes/clean-steps`
**Beschrijving:** Opschonen van "Stap X" titels  
**Auth:** Admin  

### `GET /api/recipes/recategorize`
**Beschrijving:** Automatisch categoriseren van recepten  
**Auth:** Verplicht  
**Query parameters:** `mode=missing|all`  
**Response:** Server-Sent Events stream

### `POST /api/recipes/favorite-counts`
**Beschrijving:** Bulk favorieten teller  
**Request body:**
```json
{
  "recipe_ids": ["uuid1", "uuid2"]
}
```
**Response:**
```json
{
  "counts": {
    "uuid1": 5,
    "uuid2": 12
  }
}
```

---

## Error Responses

Alle eindpunten kunnen de volgende errors retourneren:

- `400 Bad Request` - Ongeldige request data
- `401 Unauthorized` - Niet ingelogd
- `403 Forbidden` - Geen toegang
- `404 Not Found` - Resource niet gevonden
- `409 Conflict` - Duplicate data
- `422 Unprocessable Entity` - AI extractie gefaald
- `500 Internal Server Error` - Server fout

**Error formaat:**
```json
{
  "error": "Beschrijving van de fout"
}
```

## Rate Limiting

- Extractie eindpunten: Gebruikersafhankelijk donatie-model
- Andere eindpunten: Standaard Vercel limieten

## Data Types

Zie de TypeScript interfaces voor complete type definities:
- `Recipe`, `Ingredient`, `Step` voor basis receptdata  
- `ExtractedRecipe` voor AI extractie resultaten
- `NutritionCalculation` voor voedingswaarde berekeningen
- `AppNotification` voor notificatie objecten

# Receptenboek - Projectdocumentatie
> Laatst bijgewerkt: 2026-04-16 | Versie: 1.14.5

## 1. Projectoverzicht

### Wat is Receptenboek?
Receptenboek is een modern Nederlands receptenplatform dat gebruikers helpt hun favoriete recepten te organiseren, ontdekken en delen. De app biedt geavanceerde AI-functionaliteiten voor het extraheren van recepten uit websites, afbeeldingen en PDF-bestanden, evenals een uitgebreide ingrediëntendatabase met barcodescanner.

### Doelgroep
- Thuiskoks die hun receptencollectie willen digitaliseren
- Voedselliefhebbers die nieuwe recepten willen ontdekken
- Gebruikers die gestructureerd willen koken met voedingswaarde-informatie
- Community-gedreven kookliefhebbers die recepten delen

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 3.4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API voor recept-extractie
- **Storage**: Supabase Storage voor afbeeldingen
- **Web Scraping**: Puppeteer + Stealth plugin
- **PDF Processing**: PDF.js
- **Barcode Scanning**: html5-qrcode
- **Push Notifications**: Firebase Cloud Messaging
- **PWA**: Next.js PWA capabilities

## 2. Architectuur

### App Router Structuur
Het project gebruikt Next.js 15 App Router met een duidelijke route-groepering:

```
src/app/
├── (auth)/                 # Authenticatie-gerelateerde paginas
│   ├── auth/
│   ├── login/
│   ├── register/
│   └── wachtwoord-vergeten/
├── (main)/                 # Hoofdapplicatie (geauthenticeerd)
│   ├── admin/              # Beheerderspaneel
│   ├── collecties/         # Receptencollecties
│   ├── favorieten/         # Favoriete recepten
│   ├── ingredienten/       # Ingrediëntendatabase
│   ├── instellingen/       # Gebruikersinstellingen
│   ├── ontdek/            # Recepten ontdekken
│   ├── profiel/           # Gebruikersprofielen
│   ├── recepten/          # Receptbeheer
│   └── suggesties/        # AI-suggesties
└── api/                   # Backend API endpoints
```

### Supabase Architectuur
- **Auth**: Gebruikersregistratie en -authenticatie
- **Database**: PostgreSQL met Row Level Security (RLS)
- **Storage**: Afbeeldingopslag voor recepten, profielen en ingrediënten
- **Realtime**: Live updates voor opmerkingen en notificaties

### Firebase Integratie
- **FCM**: Push notificaties voor mobiele gebruikers
- **Admin SDK**: Server-side notificatie verzending

### Mappenstructuur
```
src/
├── app/                    # Next.js App Router
├── components/             # React componenten
│   ├── icons/             # Iconen componenten
│   ├── ingredients/       # Ingrediënt-specifieke componenten
│   ├── layout/            # Layout componenten
│   ├── notifications/     # Notificatie componenten
│   ├── recipes/           # Recept-specifieke componenten
│   ├── tour/              # Onboarding tour
│   └── ui/                # Generieke UI componenten
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── extraction/        # AI extractie logica
│   ├── firebase/          # Firebase configuratie
│   ├── ingredients/       # Ingrediënt matching
│   └── supabase/          # Supabase clients
└── types/                 # TypeScript type definities
```

## 3. Database Schema

### Kern Tabellen

#### profiles
Uitbreiding van Supabase Auth gebruikers:
```sql
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id),
    email text UNIQUE,
    display_name text,
    avatar_url text,
    bio text,
    role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_blocked boolean DEFAULT false,
    last_seen timestamptz,
    extraction_count integer DEFAULT 0,
    total_donated numeric(10,2) DEFAULT 0,
    donation_free_until integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);
```

#### recipes
Hoofdtabel voor recepten:
```sql
CREATE TABLE recipes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    title text NOT NULL,
    subtitle text,
    image_url text,
    tijd text,
    moeilijkheid text CHECK (moeilijkheid IN ('Makkelijk', 'Gemiddeld', 'Moeilijk')),
    categorie text,
    bron text,
    basis_porties integer DEFAULT 2,
    is_public boolean DEFAULT false,
    weetje text,
    allergenen text,
    temperatuur text,
    kerntemperatuur text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### ingredients
Ingrediënten per recept:
```sql
CREATE TABLE ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES recipes(id),
    hoeveelheid text,
    eenheid text,
    naam text NOT NULL,
    sort_order integer DEFAULT 0,
    generic_ingredient_id uuid REFERENCES generic_ingredients(id)
);
```

#### steps
Bereidingsstappen:
```sql
CREATE TABLE steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id uuid NOT NULL REFERENCES recipes(id),
    titel text,
    beschrijving text NOT NULL,
    afbeelding_url text,
    sort_order integer DEFAULT 0
);
```

### Ingrediëntendatabase

#### generic_ingredients
Generieke ingrediënten met voedingswaarden:
```sql
CREATE TABLE generic_ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    name_plural text,
    category text,
    aliases text[],
    avg_kcal numeric,
    avg_protein numeric,
    -- ... meer voedingswaarden
    gram_per_piece numeric,
    gram_per_ml numeric,
    description text,
    -- ... encyclopedie content
    created_by uuid REFERENCES profiles(id)
);
```

#### products
Barcode-gescande producten:
```sql
CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode text UNIQUE NOT NULL,
    generic_ingredient_id uuid REFERENCES generic_ingredients(id),
    brand text,
    product_name text NOT NULL,
    -- ... voedingswaarden per 100g
    source text DEFAULT 'user_scan',
    scanned_by uuid REFERENCES profiles(id)
);
```

### Sociale Features

#### collections
Receptencollecties:
```sql
CREATE TABLE collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    title text UNIQUE NOT NULL,
    description text,
    image_url text
);
```

#### ratings, comments, favorites
Interactie tabellen voor receptbeoordeling, reacties en favorieten.

#### notifications
Notificatiesysteem:
```sql
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid NOT NULL REFERENCES profiles(id),
    actor_id uuid NOT NULL REFERENCES profiles(id),
    type text CHECK (type IN ('comment', 'reply', 'favorite', 'rating', 'collection_follow', 'collection_invite', 'share')),
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false
);
```

### Row Level Security (RLS)
Alle tabellen hebben RLS ingeschakeld met policies voor:
- **Publieke toegang**: Recepten, ingrediënten (leesbaar voor iedereen)
- **Eigenaarschap**: Gebruikers kunnen alleen eigen content wijzigen
- **Admin toegang**: Admins hebben uitgebreide rechten
- **Privacy**: Favorieten en notificaties alleen zichtbaar voor eigenaar

## 4. API Routes

### Authenticatie
- `POST /api/auth/callback` - Supabase auth callback verwerking
- `POST /api/auth/verify-access-code` - Verificatie registratie toegangscode

### Recepten
- `GET /api/recipes` - Recepten ophalen met filters en paginatie
- `POST /api/recipes` - Nieuw recept aanmaken
- `GET /api/recipes/[id]` - Specifiek recept ophalen
- `PUT /api/recipes/[id]` - Recept bijwerken
- `DELETE /api/recipes/[id]` - Recept verwijderen
- `POST /api/recipes/[id]/favorite` - Recept favorieten toggle
- `GET /api/recipes/[id]/favorite-count` - Aantal favorieten ophalen
- `POST /api/recipes/[id]/rate` - Recept beoordelen
- `POST /api/recipes/[id]/comments` - Reactie plaatsen
- `POST /api/recipes/[id]/comments/like` - Reactie liken
- `POST /api/recipes/[id]/scale` - Recept porties schalen
- `POST /api/recipes/[id]/calculate-nutrition` - Voedingswaarden berekenen
- `POST /api/recipes/[id]/chat` - AI chat over recept
- `GET /api/recipes/favorite-counts` - Favorieten tellingen bulk
- `POST /api/recipes/clean-steps` - Stappen opschonen (admin)
- `POST /api/recipes/recategorize` - Recepten hercategoriseren (admin)

### AI Extractie
- `POST /api/extract/url` - Recept extraheren uit URL
- `POST /api/extract/image` - Recept extraheren uit afbeelding
- `POST /api/extract/pdf` - Recept extraheren uit PDF
- `POST /api/extract/text` - Recept extraheren uit tekst
- `POST /api/bulk-import` - Bulk import meerdere URLs

### Collecties
- `GET /api/collections` - Collecties ophalen
- `POST /api/collections` - Nieuwe collectie aanmaken
- `GET /api/collections/[id]` - Specifieke collectie ophalen
- `PUT /api/collections/[id]` - Collectie bijwerken
- `DELETE /api/collections/[id]` - Collectie verwijderen
- `POST /api/collections/[id]/duplicate` - Collectie dupliceren
- `POST /api/collections/[id]/follow` - Collectie volgen/ontvolgen
- `POST /api/collections/[id]/rate` - Collectie beoordelen
- `GET /api/collections/[id]/recipes` - Recepten in collectie
- `POST /api/collections/[id]/recipes` - Recept toevoegen aan collectie
- `DELETE /api/collections/[id]/recipes` - Recept verwijderen uit collectie
- `GET /api/collections/[id]/collaborators` - Medewerkers ophalen
- `POST /api/collections/[id]/collaborators` - Medewerker uitnodigen
- `DELETE /api/collections/[id]/collaborators` - Medewerker verwijderen
- `GET /api/collections/my-recipe-ids` - Eigen recept IDs in collecties

### Ingrediënten
- `GET /api/ingredients` - Ingrediënten zoeken/ophalen
- `POST /api/ingredients` - Nieuw ingrediënt aanmaken
- `GET /api/ingredients/[id]` - Specifiek ingrediënt ophalen
- `PUT /api/ingredients/[id]` - Ingrediënt bijwerken
- `DELETE /api/ingredients/[id]` - Ingrediënt verwijderen
- `POST /api/ingredients/[id]/generate-content` - AI content genereren
- `POST /api/ingredients/batch-match` - Batch matching voor recepten
- `POST /api/ingredients/cleanup-duplicates` - Duplicaten opschonen
- `POST /api/ingredients/enrich` - Ingrediënt verrijken met AI

### Producten (Barcode)
- `GET /api/products` - Producten zoeken
- `POST /api/products` - Nieuw product aanmaken
- `GET /api/products/[id]` - Specifiek product ophalen
- `PUT /api/products/[id]` - Product bijwerken
- `DELETE /api/products/[id]` - Product verwijderen
- `POST /api/products/scan` - Barcode scannen
- `POST /api/products/scan-label` - Label scannen met AI
- `POST /api/products/[id]/link` - Product koppelen aan ingrediënt

### Notificaties
- `GET /api/notifications` - Notificaties ophalen
- `POST /api/notifications` - Notificatie markeren als gelezen
- `GET /api/notifications/count` - Ongelezen telling
- `GET /api/notifications/preferences` - Voorkeuren ophalen
- `PUT /api/notifications/preferences` - Voorkeuren bijwerken
- `POST /api/notifications/subscribe` - Push notificaties inschrijven
- `POST /api/notifications/log` - Notificatie loggen (intern)

### Gebruikers
- `GET /api/users/search` - Gebruikers zoeken
- `GET /api/users/[id]/profile` - Profiel ophalen
- `POST /api/users/delete-account` - Account verwijderen
- `POST /api/users/heartbeat` - Laatste activiteit bijwerken
- `GET /api/users/extraction-count` - Extractie telling ophalen

### Admin
- `GET /api/admin/check` - Admin status controleren
- `GET /api/admin/stats` - Algemene statistieken
- `GET /api/admin/extraction-stats` - Extractie statistieken
- `GET /api/admin/users` - Gebruikers beheer
- `PUT /api/admin/users/[id]/role` - Gebruikersrol wijzigen
- `POST /api/admin/users/[id]/block` - Gebruiker blokkeren
- `POST /api/admin/users/[id]/unblock` - Gebruiker deblokkeren
- `POST /api/admin/users/[id]/reset-password` - Wachtwoord resetten
- `GET /api/admin/comments` - Reacties modereren
- `DELETE /api/admin/comments/[id]` - Reactie verwijderen
- `GET /api/admin/access-code` - Toegangscode ophalen/wijzigen
- `POST /api/admin/duplicates` - Duplicaat recepten vinden
- `POST /api/admin/backfill-temperature` - Temperatuur backfill
- `POST /api/admin/fix-ingredients` - Ingrediënten repareren
- `POST /api/admin/migrate-base64-images` - Base64 afbeeldingen migreren

### Overig
- `GET /api/suggesties` - AI receptsuggesties
- `POST /api/share` - Recept delen
- `GET /api/og` - Open Graph afbeeldingen genereren
- `GET /api/ping` - Health check

## 5. Paginas en Routes

### Authenticatie Groep `(auth)`
- `/login` - Inlogpagina met email/wachtwoord en Google OAuth
- `/register` - Registratiepagina met toegangscode verificatie
- `/wachtwoord-vergeten` - Wachtwoord reset aanvraag
- `/auth/reset-password` - Wachtwoord reset bevestiging

### Hoofdapplicatie Groep `(main)`

#### Recepten
- `/` - Redirects naar `/recepten`
- `/recepten` - Recepten overzicht met filters en zoekfunctie
- `/recepten/nieuw` - Nieuw recept aanmaken met AI extractie opties
- `/recepten/[id]` - Recept detailpagina met kook modus, chat, en scaling
- `/recepten/[id]/bewerk` - Recept bewerken

#### Collecties
- `/collecties` - Alle collecties browsen
- `/collecties/[id]` - Collectie detailpagina met recepten

#### Favorieten & Ontdekken
- `/favorieten` - Persoonlijke favoriete recepten
- `/ontdek` - Nieuwe recepten ontdekken met aanbevelingen

#### Ingrediënten
- `/ingredienten` - Ingrediëntendatabase browsen
- `/ingredienten/[id]` - Ingrediënt detailpagina met encyclopedie info
- `/ingredienten/scan` - Barcode scanner voor producten

#### Profiel & Instellingen
- `/profiel` - Eigen profiel met publieke recepten
- `/profiel/[userId]` - Ander gebruiker profiel bekijken
- `/instellingen` - Hoofdinstellingenpagina
- `/instellingen/account` - Account instellingen (naam, avatar, bio)
- `/instellingen/gebruikers` - Gebruikers zoeken en volgen
- `/instellingen/mijn-recepten` - Eigen recepten beheer
- `/instellingen/meldingen` - Notificatievoorkeuren
- `/instellingen/over` - Over de app, versie-info, changelog

#### Suggesties
- `/suggesties` - AI-gegenereerde receptsuggesties op basis van beschikbare ingrediënten

#### Admin (alleen voor admins)
- `/admin` - Admin dashboard met statistieken
- `/admin/gebruikers` - Gebruikersbeheer (blokkeren, rollen)
- `/admin/recepten` - Recepten moderatie
- `/admin/collecties` - Collecties beheer
- `/admin/ingredienten` - Ingrediënten beheer
- `/admin/reacties` - Reacties moderatie
- `/admin/meldingen` - Notificaties log
- `/admin/instellingen` - App instellingen (toegangscode)
- `/admin/onderhoud` - Onderhoudstools (migraties, reparaties)

#### Speciale Paginas
- `/geblokkeerd` - Pagina voor geblokkeerde gebruikers

## 6. Componenten

### Layout Componenten (`components/layout/`)
- **Header.tsx** - Hoofdnavigatie met logo, zoekbalk, notificatie bel, en gebruikersmenu
- **Footer.tsx** - Footer met links en app informatie
- **FabButton.tsx** - Floating Action Button voor snel recept toevoegen
- **NavigationProgress.tsx** - Voortgangsbalk voor navigatie
- **PWAInstall.tsx** - PWA installatie prompt

### Recipe Componenten (`components/recipes/`)
- **RecipeCard.tsx** - Receptkaart voor lijstweergave met afbeelding, titel, rating
- **RecipeForm.tsx** - Formulier voor recept aanmaken/bewerken met ingrediënten en stappen
- **AddToCollectionModal.tsx** - Modal voor recept toevoegen aan collectie
- **CollectionCard.tsx** - Collectiekaart met preview afbeeldingen
- **CookMode.tsx** - Kook modus met stap-voor-stap instructies
- **RecipeChat.tsx** - AI chat component voor recept vragen

### Ingrediënt Componenten (`components/ingredients/`)
- **IngredientCard.tsx** - Ingrediënt kaart met voedingswaarden
- **ProductCard.tsx** - Product kaart voor barcode-gescande items
- **BarcodeScanner.tsx** - Barcode scanner met camera interface
- **NutritionBar.tsx** - Visualisatie van voedingswaarden

### UI Componenten (`components/ui/`)
- **Button.tsx** - Herbruikbare button component met varianten
- **Input.tsx** - Input field met validation styling
- **Modal.tsx** - Generic modal wrapper
- **SearchBar.tsx** - Zoekbalk met autocomplete
- **StarRating.tsx** - Sterren rating component (interactief)
- **CategoryFilter.tsx** - Categorie filter chips
- **PortieSelector.tsx** - Portie aanpassing slider
- **ShareModal.tsx** - Deel modal met social sharing
- **ConfirmDialog.tsx** - Bevestigingsdialoog
- **UserPicker.tsx** - Gebruiker selectie component
- **IngredientChips.tsx** - Ingrediënt tags met kleuren
- **BronInput.tsx** - Bron input met URL validatie
- **BronBadge.tsx** - Bron badge met favicon
- **DonationCard.tsx** - Donatie card na extractie limiet
- **MobileFilterSheet.tsx** - Mobiele filter sheet
- **PullToRefresh.tsx** - Pull-to-refresh functionaliteit
- **SignOutButton.tsx** - Uitlog button met bevestiging
- **AvatarCropModal.tsx** - Avatar crop modal met react-easy-crop

### Notificatie Componenten (`components/notifications/`)
- **NotificationBell.tsx** - Notificatie bel met ongelezen teller en dropdown

### Tour Componenten (`components/tour/`)
- **TourProvider.tsx** - Context provider voor app tour
- **TourOverlay.tsx** - Overlay voor tour stappen
- **TourTooltip.tsx** - Tooltip component voor tour
- **tourSteps.ts** - Configuratie van tour stappen

### Icon Componenten (`components/icons/`)
- **GoogleLogo.tsx** - Google logo voor OAuth

## 7. Custom Hooks

### Authenticatie & Autorisatie
- **useAuth()** - Gebruikersstatus en profiel, loading states
- **useAdmin()** - Admin status controle, derived van useAuth

### Data Management
- **useFavorites()** - Favorieten beheer met SWR caching en optimistic updates
- **useUserRatings()** - Gebruikersratings tracking met optimistic updates
- **useCollectionRecipeIds()** - Set van recept IDs in eigen collecties voor snelle lookup

### Realtime & Notificaties
- **useNotifications()** - Notificaties met realtime updates, ongelezen teller
- **useRealtimeSubscription()** - Generic realtime subscription hook voor Supabase

### UI & UX
- **useTour()** - App tour state en navigation

### Hook Details

#### useAuth
```typescript
export function useAuth(): {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```
Centrale hook voor authenticatie staat. Gebruikt AuthContext om user en profile data te delen.

#### useFavorites
```typescript
export function useFavorites(): {
  favoriteIds: Set<string>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  isFavorite: (recipeId: string) => boolean;
}
```
Beheert favorieten met SWR voor caching en optimistic updates voor snelle UI feedback.

#### useNotifications
```typescript
export function useNotifications(): {
  unreadCount: number;
  notifications: AppNotification[];
  markAsRead: (id: string) => void;
  refresh: () => void;
}
```
Integreert met realtime subscriptions voor live notificatie updates.

## 8. Authenticatie en Autorisatie

### Auth Flow
1. **Registratie**: Vereist toegangscode + email verificatie
2. **Login**: Email/wachtwoord of Google OAuth
3. **Session Management**: Supabase Auth met automatische token refresh
4. **Middleware**: Route bescherming op app-niveau

### Middleware (`middleware.ts`)
- Skip API routes (eigen auth handling)
- Session refresh voor alle pagina requests
- Redirect naar login voor ongeauthenticeerde gebruikers

### Role-Based Access
#### Gebruikersrollen
- **user**: Standaard rol, kan eigen content beheren
- **admin**: Volledige toegang tot admin panel en moderatie functies

#### Admin Functies
- Gebruikers blokkeren/deblokkeren
- Rol toewijzing
- Content moderatie (recepten, reacties)
- Ingrediëntendatabase beheer
- Systeem onderhoudstools
- Toegangscode beheer
- Statistieken en analytics

### Account Blokkering
- Geblokkeerde gebruikers worden doorgestuurd naar `/geblokkeerd`
- Kunnen alleen uitloggen, geen andere acties
- Admin kan blokkering opheffen

### Row Level Security Implementatie
Alle database queries worden gefilterd op gebruikersniveau:
```sql
-- Voorbeeld: Recepten policy
CREATE POLICY "recipes_select_all" ON recipes 
  FOR SELECT USING (true); -- Iedereen kan recepten zien

CREATE POLICY "recipes_update_own" ON recipes 
  FOR UPDATE USING (auth.uid() = user_id); -- Alleen eigen recepten bewerken
```

## 9. Features

### Recept CRUD
**Aanmaken**: Via formulier of AI-extractie uit URL/afbeelding/PDF/tekst
**Bewerken**: Volledig bewerkbaar formulier met drag-and-drop voor stappen
**Bekijken**: Rijke detailweergave met afbeelding, ingrediënten, stappen, voeding
**Verwijderen**: Met bevestiging, cascade delete voor gerelateerde data

### AI-Extractie Systeem
- **URL Extractie**: Web scraping met Puppeteer + stealth plugin, parse HTML voor structured data
- **Afbeelding Extractie**: Claude Vision API voor recept herkenning uit foto's
- **PDF Extractie**: PDF.js voor tekst extractie, daarna Claude processing
- **Tekst Extractie**: Directe Claude API voor recept parsing uit platte tekst
- **Bulk Import**: Meerdere URLs tegelijk verwerken
- **Caching**: Intelligente cache om duplicate extractions te voorkomen
- **Validation**: Extracted data wordt gevalideerd voor completheid

### Collecties (Kookboeken)
- **Aanmaken**: Titel moet globaal uniek zijn
- **Recepten Toevoegen**: Drag-and-drop interface, bulk acties
- **Samenwerking**: Tot 10 collaborators per collectie
- **Volgen**: Publieke collecties volgen voor updates
- **Rating**: 5-sterren systeem voor collecties
- **Dupliceren**: Volledige collectie kopiëren met eigen ownership

### Ingrediëntendatabase
- **Generic Ingredients**: 200+ voorgedefinieerde ingrediënten met voedingswaarden
- **AI Content**: Automatische encyclopedie content generatie (herkomst, gebruik, bewaren)
- **Eenheid Conversies**: Intelligente omrekening (gram ↔ ml, lepels, kopjes)
- **Product Koppeling**: Link naar barcode-gescande producten
- **Search & Matching**: Fuzzy search met aliases voor ingrediënt matching

### Barcode Scanner
- **Camera Scanning**: html5-qrcode voor live camera scanning
- **Product Database**: Lokale database van gescande producten
- **Open Food Facts**: Fallback naar externe database
- **Nutrition Parsing**: AI-parsing van voedingslabels uit foto's
- **Generic Linking**: Producten koppelen aan generic ingredients

### Zoeken & Filteren
- **Full-text Search**: PostgreSQL trigram search
- **Filters**: Categorie, moeilijkheid, tijd, bron
- **Sorting**: Nieuwste, populairste, best beoordeeld
- **Advanced Search**: Zoeken op ingrediënten, tags, gebruiker

### Favorieten Systeem
- **Toggle**: Een-klik favoriet toevoegen/verwijderen
- **Optimistic Updates**: Directe UI feedback
- **Bulk Operations**: Alle favorieten bekijken/beheren
- **Statistics**: Favoriet tellingen per recept

### Reacties & Beoordelingen
- **5-Sterren Rating**: Per recept, gemiddelde berekening
- **Threaded Comments**: Geneste reacties met replies
- **Like System**: Reacties kunnen geliked worden
- **Moderation**: Admin tools voor content moderatie
- **Notifications**: Real-time meldingen voor interacties

### Notificatiesysteem
- **Types**: Reacties, ratings, favorieten, collectie follows, shares
- **Real-time**: Supabase realtime subscriptions
- **Push Notifications**: Firebase FCM voor mobiele alerts
- **Preferences**: Granulaire controle per notification type
- **Read Status**: Ongelezen teller met batch mark-as-read

### AI Suggesties
- **Ingredient-Based**: Suggesties op basis van beschikbare ingrediënten
- **Preference Learning**: Machine learning op basis van ratings en favorieten
- **Seasonal**: Seizoensgebonden receptaanbevelingen
- **Dietary Restrictions**: Rekening houden met allergenen en dieet voorkeuren

### Kook Modus
- **Step-by-Step**: Grote, duidelijke weergave per bereidingsstap
- **Timer Integration**: Ingebouwde timers per stap
- **Voice Control**: Hands-free navigatie (toekomstige feature)
- **Progress Tracking**: Voortgang bijhouden tijdens koken
- **Ingredient Checklist**: Afvinken van ingrediënten tijdens prep

### AI Recipe Chat
- **Recipe Q&A**: Vragen stellen over specifiek recept
- **Substitutions**: Alternatieve ingrediënten voorstellen
- **Technique Help**: Uitleg van kooktechnieken
- **Scaling Advice**: Tips voor portie aanpassingen
- **Troubleshooting**: Hulp als iets misgaat tijdens koken

### Portie Schaling
- **Intelligent Scaling**: Automatische aanpassing ingrediënt hoeveelheden
- **Unit Conversion**: Behoud van logische eenheden bij schaling
- **Cooking Time Adjustment**: Suggesties voor aangepaste kooktijden
- **Equipment Scaling**: Waarschuwingen voor pan/oven maat aanpassingen

### Voedingswaarde Berekening
- **Automatic Calculation**: Op basis van ingredient database matching
- **Per Portion**: Voedingswaarden per portie weergave
- **Coverage Indicator**: Percentage van ingrediënten met bekende waarden
- **Allergen Detection**: Automatische detectie van allergenen
- **Dietary Labels**: Vegetarisch, veganistisch, glutenvrij labels

### PWA Functionaliteit
- **Installeerbaar**: Add to homescreen op mobiel en desktop
- **Offline Capability**: Service worker voor offline recept toegang
- **Native Feel**: App-like navigatie en styling
- **Push Notifications**: Native push support
- **Auto-updates**: Seamless app updates via service worker

### Profiel & Social
- **Public Profiles**: Gebruikersprofielen met publieke recepten
- **Avatar Upload**: Afbeelding cropping met react-easy-crop
- **Bio & Info**: Persoonlijke informatie en kook achtergrond
- **Recipe Collections**: Showcase van persoonlijke recepten
- **Following System**: Gebruikers en collecties volgen

### Donatie Systeem
- **Usage Tracking**: AI-extractie limiet voor gratis gebruikers
- **Donation Prompts**: Vriendelijke nudges na limiet bereikt
- **Donation Tracking**: Bijhouden van donaties per gebruiker
- **Extended Access**: Meer extracties na donatie
- **Transparency**: Duidelijke communicatie over kosten en gebruik

### Onboarding Tour
- **Interactive Guide**: Stap-voor-stap introductie van key features
- **Contextual Help**: Tooltips op relevante momenten
- **Skip Option**: Gebruikers kunnen tour overslaan
- **Progress Tracking**: Tour voortgang opslaan
- **Re-trigger**: Tour opnieuw starten vanuit instellingen

## 10. Scripts en Tools

### Development Scripts (package.json)
- **`npm run dev`** - Start development server met Turbopack
- **`npm run build`** - Production build
- **`npm run start`** - Start production server
- **`npm run lint`** - ESLint code quality check

### Release Management
Het project heeft een geautomatiseerd versioning systeem:
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Verplichte `/release` run**: Voor elke git push
- **Dual Update**: `package.json` EN `src/app/(main)/instellingen/over/page.tsx`
- **Release Notes**: Automatische changelog generatie

### Database Migrations
Supabase migrations in `supabase/migrations/`:
- **001_initial_schema.sql** - Basis database schema met RLS
- **002_collections.sql** - Collecties feature
- **003_collection_follows_and_collaborators.sql** - Social features voor collecties
- **004_collection_ratings.sql** - Collectie ratings
- **005_fix_duplicate_tags.sql** - Tag duplicaten opschonen
- **006_ingredients_database.sql** - Ingrediëntendatabase met barcode support
- **007_notifications.sql** - Notificatiesysteem
- **008-015** - Incrementele features en fixes

### Admin Tools (via admin panel)
- **Duplicate Detection** - Vind duplicaat recepten op basis van titel/bron similariteit
- **Temperature Backfill** - Bulk update temperatuur velden
- **Ingredient Fixing** - Repareer ingredient database inconsistenties
- **Base64 Image Migration** - Migreer inline images naar Supabase Storage
- **User Management** - Bulk user operations (block, role changes)
- **Content Moderation** - Bulk comment/recipe moderation

## 11. Configuratie

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Configuration  
ANTHROPIC_API_KEY=your-anthropic-claude-api-key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
```

### Next.js Configuration (`next.config.js`)
- **Environment Variables**: App version uit package.json
- **Build Settings**: Ignore ESLint en TypeScript errors voor snellere builds
- **Server Packages**: External packages voor serverless compatibility
- **Experimental**: Server Actions met 100MB body limit voor grote uploads
- **Images**: Remote patterns voor alle domains (recipe images)
- **Webpack**: Canvas alias voor PDF.js compatibility

### PWA Configuration (`public/manifest.json`)
```json
{
  "name": "Receptenboek",
  "short_name": "Receptenboek", 
  "description": "Jouw persoonlijk receptenplatform met AI-extractie",
  "start_url": "/recepten",
  "display": "standalone",
  "theme_color": "#16653a",
  "background_color": "#fafaf8"
}
```

### TypeScript Configuration
- **Strict Mode**: Enabled voor type safety
- **App Router**: Next.js 15 app directory support
- **Path Mapping**: `@/` alias naar `src/`
- **Library Types**: Supabase, React 19, Next.js types

### Tailwind Configuration
- **Custom Colors**: Brand groen (#16653a) als primary
- **Typography**: Custom font stacks
- **Responsive**: Mobile-first design system
- **Animations**: Smooth transitions en hover effects

## 12. Installatie en Development

### Vereisten
- **Node.js**: 20.x of hoger
- **npm**: 9.x of hoger  
- **Supabase Account**: Voor database en auth
- **Anthropic API**: Voor AI features
- **Firebase Account**: Voor push notifications (optioneel)

### Installatie Stappen

1. **Repository Clonen**
```bash
git clone <repository-url>
cd receptenboek
```

2. **Dependencies Installeren**
```bash
npm install
```

3. **Environment Variables**
```bash
cp .env.example .env.local
# Vul alle required variables in
```

4. **Supabase Setup**
```bash
# Install Supabase CLI
npm install -g supabase

# Start local development (optioneel)
supabase start

# Of connecteer met remote project
supabase link --project-ref your-project-ref
```

5. **Database Migraties**
```bash
supabase db push
# Of voor lokaal:
supabase migration up
```

### Development Server
```bash
# Start development server met Turbopack
npm run dev

# Server draait op http://localhost:3000
```

### Build en Deploy
```bash
# Production build
npm run build

# Test production build lokaal
npm run start

# Deploy naar Vercel/Netlify
# Environment variables instellen in hosting platform
```

### Database Development
- **Lokale Database**: `supabase start` voor lokale PostgreSQL
- **Migrations**: Nieuwe features via SQL migratie bestanden
- **Seeding**: Initial data via SQL inserts in migrations
- **RLS Testing**: Test policies via Supabase dashboard

### Development Workflow
1. **Feature Branch**: Maak branch van main
2. **Development**: Code schrijven met hot reload
3. **Testing**: Manual testing in development mode
4. **Release**: Run `/release` om versie te bumpen
5. **Push**: Git push naar remote repository
6. **Deploy**: Automatische deploy via hosting platform

## 13. Changelog (Laatste 20 Commits)

### v1.14.5 (Current)
- **436d7ce** - Version bump naar 1.14.5
- **14ffca3** - Fix: Remove bron-based duplicate check, verhoog titel threshold naar 92%

### v1.14.4 
- **4b708f6** - Version bump naar 1.14.4
- **1d0b369** - Fix: Match duplicates alleen op bron wanneer titels ook vergelijkbaar zijn

### v1.14.3
- **2d75745** - Fix: Toon duplicaten als side-by-side pairs (origineel vs duplicate)
- **2f21bf3** - Version bump naar 1.14.3

### v1.14.2
- **ab24ba8** - Fix: Toon duplicate recepten als visuele kaarten naast elkaar
- **3edd352** - Fix: Toon match reden per recept in duplicate groepen

### v1.14.0 - Major Admin Update
- **8b8a12b** - Feat: Admin maintenance tab met temperatuur, duplicate, en ingredient tools
- **db07308** - Version bump naar 1.14.0

### v1.13.0 - Duplicate Detection
- **c648f44** - Feat: Verbeterde duplicate detectie met preview + admin duplicate finder
- **aa74ada** - Version bump naar 1.13.0

### v1.12.10
- **0b96aa4** - Fix: Toon alle gebruikers in admin donation dashboard
- **12f66ab** - Version bump naar 1.12.10

### v1.12.9 
- **61e3638** - Fix: Tel elke bulk-imported URL als aparte extractie
- **4a68a97** - Version bump naar 1.12.9

### v1.12.8 - Image Migration
- **1dd55d8** - Fix: Auto-upload base64 images naar Storage, migratie voor bestaande
- **a002715** - Version bump naar 1.12.8

### v1.12.7
- **Last entry** - Version bump naar 1.12.7

### Development Patterns
Het project volgt consistente development patterns:
- **Semantic Versioning**: Elke release heeft betekenisvolle version bump
- **Feature Branches**: Nieuwe features in eigen branches
- **Fix-First Approach**: Bugs worden prioriteit gegeven
- **User-Centric**: Changes zijn gedreven door user feedback
- **Performance Focus**: Optimalisaties voor gebruikerservaring

### Recent Focus Areas
- **Admin Tools**: Uitgebreide onderhoudstools voor platform beheer
- **Data Quality**: Duplicate detection en data cleanup tools
- **User Experience**: Performance optimalisaties en bug fixes
- **Content Management**: Betere tools voor content moderatie
- **Stability**: Focus op bug fixes en edge cases

---

> **Laatste Update**: 2026-04-16  
> **Versie**: 1.14.5  
> **Maintainer**: Development Team  
> **Status**: Actieve ontwikkeling

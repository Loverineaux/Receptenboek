# Receptenboek Database Documentatie

## Overzicht

De Receptenboek applicatie gebruikt een PostgreSQL database via Supabase met uitgebreide Row Level Security (RLS) policies. De database ondersteunt gebruikersbeheer, receptenbeheer, collecties, ingrediëntendatabase, notificaties en admin-functionaliteiten.

## Migratie-overzicht

| Migratie | Beschrijving | Datum |
|----------|-------------|-------|
| `001_initial_schema.sql` | Basis schema met recepten, ingrediënten, gebruikers, ratings, comments | Initial |
| `002_collections.sql` | Collecties (kookboeken) functionaliteit | v2.0 |
| `003_collection_follows_and_collaborators.sql` | Volgen van collecties en samenwerking | v2.1 |
| `004_collection_ratings.sql` | Ratings voor collecties | v2.2 |
| `005_fix_duplicate_tags.sql` | Tag duplicaten oplossen, case-insensitive uniek | v2.3 |
| `006_ingredients_database.sql` | Uitgebreide ingrediëntendatabase met barcodes | v3.0 |
| `007_notifications.sql` | Notificatiesysteem met push ondersteuning | v3.1 |
| `008_profiles_last_seen.sql` | Laatste activiteit tracking | v3.2 |
| `009_share_notification_type.sql` | Delen notificatie-type | v3.3 |
| `010_admin_system.sql` | Admin systeem en toegangscode | v3.4 |
| `011_extraction_count.sql` | AI extractie teller voor donatie-nudging | v3.5 |
| `012_donation_tracking.sql` | Donatie tracking | v3.6 |
| `013_temperatuur.sql` | Temperatuur veld voor recepten | v3.7 |
| `014_kerntemperatuur.sql` | Kerntemperatuur veld voor recepten | v3.8 |
| `015_recipe_stats_function.sql` | Performance optimalisatie voor recept-statistieken | v3.9 |

## Database Schema

### Gebruikersbeheer

#### `profiles`
Uitbreiding op Supabase Auth voor gebruikersprofielen.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE | Gebruikers-ID |
| `email` | `text` | UNIQUE | E-mailadres |
| `display_name` | `text` | | Weergavenaam |
| `avatar_url` | `text` | | Profielafbeelding URL |
| `bio` | `text` | | Gebruikersbeschrijving |
| `role` | `text` | CHECK (role IN ('user', 'admin')), DEFAULT 'user' | Gebruikersrol |
| `is_blocked` | `boolean` | DEFAULT false | Geblokkeerde status |
| `last_seen` | `timestamptz` | DEFAULT now() | Laatste activiteit |
| `extraction_count` | `integer` | DEFAULT 0 | Aantal AI extracties (voor donatie-nudging) |
| `total_donated` | `numeric(10,2)` | DEFAULT 0 | Totaal gedoneerd bedrag |
| `donation_free_until` | `integer` | DEFAULT 0 | Gratis extracties tot dit aantal |
| `created_at` | `timestamptz` | DEFAULT now() | Aanmaakdatum |

**Indexen:**
- Primaire sleutel op `id`
- Unieke index op `email`

**Triggers:**
- `on_auth_user_created`: Auto-aanmaken profiel bij nieuwe auth user

### Receptenbeheer

#### `recipes`
Hoofdtabel voor alle recepten.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Recept-ID |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Eigenaar |
| `title` | `text` | NOT NULL | Titel |
| `subtitle` | `text` | | Ondertitel |
| `image_url` | `text` | | Hoofdafbeelding URL |
| `tijd` | `text` | | Bereidingstijd |
| `temperatuur` | `text` | | Oven-/baktemperatuur |
| `kerntemperatuur` | `text` | | Gewenste kerntemperatuur |
| `moeilijkheid` | `text` | CHECK (moeilijkheid IN ('Makkelijk', 'Gemiddeld', 'Moeilijk')) | Moeilijkheidsgraad |
| `categorie` | `text` | | Receptcategorie |
| `bron` | `text` | | Bron van het recept |
| `basis_porties` | `integer` | DEFAULT 2 | Standaard aantal porties |
| `is_public` | `boolean` | DEFAULT false | Openbaar zichtbaar |
| `weetje` | `text` | | Interessante achtergrondinformatie |
| `allergenen` | `text` | | Allergenen informatie |
| `created_at` | `timestamptz` | DEFAULT now() | Aanmaakdatum |
| `updated_at` | `timestamptz` | DEFAULT now() | Laatste wijziging |

**Indexen:**
- `idx_recipes_user_id` op `user_id`
- `idx_recipes_is_public` op `is_public`

**Triggers:**
- `set_recipes_updated_at`: Auto-update `updated_at` bij wijzigingen

#### `ingredients`
Ingrediënten per recept.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Ingrediënt-ID |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Bijbehorend recept |
| `hoeveelheid` | `text` | | Hoeveelheid (bijv. "2", "1/2") |
| `eenheid` | `text` | | Eenheid (bijv. "gram", "eetlepel") |
| `naam` | `text` | NOT NULL | Ingrediëntnaam |
| `sort_order` | `integer` | DEFAULT 0 | Sorteervolgorde |
| `generic_ingredient_id` | `uuid` | REFERENCES `generic_ingredients(id)` ON DELETE SET NULL | Koppeling naar generiek ingrediënt |

**Indexen:**
- `idx_ingredients_recipe_id` op `recipe_id`
- `idx_ingredients_generic` op `generic_ingredient_id`

#### `steps`
Bereidingsstappen per recept.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Stap-ID |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Bijbehorend recept |
| `titel` | `text` | | Stap titel (optioneel) |
| `beschrijving` | `text` | NOT NULL | Stap beschrijving |
| `afbeelding_url` | `text` | | Afbeelding voor deze stap |
| `sort_order` | `integer` | DEFAULT 0 | Sorteervolgorde |

**Indexen:**
- `idx_steps_recipe_id` op `recipe_id`

#### `benodigdheden`
Benodigde keukengerei per recept.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Benodigd-ID |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Bijbehorend recept |
| `naam` | `text` | NOT NULL | Naam keukengerei |

**Indexen:**
- `idx_benodigdheden_recipe_id` op `recipe_id`

### Tags en Categorisatie

#### `tags`
Herbruikbare tags voor recepten.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Tag-ID |
| `name` | `text` | NOT NULL | Tag naam |
| `created_by` | `uuid` | REFERENCES `profiles(id)` | Maker van de tag |

**Constraints:**
- `tags_name_unique_ci`: Case-insensitive unieke index op `LOWER(name)`

#### `recipe_tags`
Many-to-many koppeling tussen recepten en tags.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Recept-ID |
| `tag_id` | `uuid` | NOT NULL, REFERENCES `tags(id)` ON DELETE CASCADE | Tag-ID |

**Constraints:**
- PRIMARY KEY (`recipe_id`, `tag_id`)

**Indexen:**
- `idx_recipe_tags_recipe_id` op `recipe_id`
- `idx_recipe_tags_tag_id` op `tag_id`

### Voeding

#### `nutrition`
Voedingswaarden per recept.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `recipe_id` | `uuid` | PRIMARY KEY, REFERENCES `recipes(id)` ON DELETE CASCADE | Recept-ID |
| `energie_kcal` | `text` | | Energie in kcal |
| `energie_kj` | `text` | | Energie in kJ |
| `vetten` | `text` | | Vetten in gram |
| `verzadigd` | `text` | | Verzadigde vetten |
| `koolhydraten` | `text` | | Koolhydraten in gram |
| `suikers` | `text` | | Suikers in gram |
| `vezels` | `text` | | Vezels in gram |
| `eiwitten` | `text` | | Eiwitten in gram |
| `zout` | `text` | | Zout in gram |

### Sociale Functies

#### `ratings`
Beoordelingen van recepten door gebruikers.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Rating-ID |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Beoordeeld recept |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Beoordelende gebruiker |
| `sterren` | `integer` | NOT NULL, CHECK (sterren >= 1 AND sterren <= 5) | Aantal sterren (1-5) |
| `created_at` | `timestamptz` | DEFAULT now() | Beoordelingsdatum |

**Constraints:**
- UNIQUE (`recipe_id`, `user_id`) - Één beoordeling per gebruiker per recept

**Indexen:**
- `idx_ratings_recipe_id` op `recipe_id`

#### `comments`
Reacties op recepten met ondersteuning voor replies.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Comment-ID |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Recept waarop gereageerd |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Reactie auteur |
| `tekst` | `text` | NOT NULL | Reactietekst |
| `parent_id` | `uuid` | REFERENCES `comments(id)` | Parent comment voor replies |
| `created_at` | `timestamptz` | DEFAULT now() | Reactiedatum |

**Indexen:**
- `idx_comments_recipe_id` op `recipe_id`
- `idx_comments_parent_id` op `parent_id`

#### `favorites`
Favoriete recepten per gebruiker.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Gebruiker |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Favoriete recept |
| `created_at` | `timestamptz` | DEFAULT now() | Datum toegevoegd aan favorieten |

**Constraints:**
- PRIMARY KEY (`user_id`, `recipe_id`)

**Indexen:**
- `idx_favorites_recipe_id` op `recipe_id`

### Collecties (Kookboeken)

#### `collections`
Verzamelingen van recepten (kookboeken).

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Collectie-ID |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Eigenaar |
| `title` | `text` | NOT NULL, UNIQUE | Titel (globaal uniek) |
| `description` | `text` | | Beschrijving |
| `image_url` | `text` | | Hoofdafbeelding URL |
| `created_at` | `timestamptz` | DEFAULT now() | Aanmaakdatum |
| `updated_at` | `timestamptz` | DEFAULT now() | Laatste wijziging |

**Constraints:**
- `collections_title_unique` op `title`

**Indexen:**
- `idx_collections_user_id` op `user_id`

**Triggers:**
- `set_collections_updated_at`: Auto-update `updated_at`

#### `collection_recipes`
Koppeling tussen collecties en recepten.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `collection_id` | `uuid` | NOT NULL, REFERENCES `collections(id)` ON DELETE CASCADE | Collectie-ID |
| `recipe_id` | `uuid` | NOT NULL, REFERENCES `recipes(id)` ON DELETE CASCADE | Recept-ID |
| `sort_order` | `integer` | DEFAULT 0 | Sorteervolgorde binnen collectie |
| `added_at` | `timestamptz` | DEFAULT now() | Datum toegevoegd |

**Constraints:**
- PRIMARY KEY (`collection_id`, `recipe_id`)

**Indexen:**
- `idx_collection_recipes_collection_id` op `collection_id`
- `idx_collection_recipes_recipe_id` op `recipe_id`

#### `collection_follows`
Volgers van collecties.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Volgende gebruiker |
| `collection_id` | `uuid` | NOT NULL, REFERENCES `collections(id)` ON DELETE CASCADE | Gevolgde collectie |
| `created_at` | `timestamptz` | DEFAULT now() | Datum gevolgd |

**Constraints:**
- PRIMARY KEY (`user_id`, `collection_id`)

**Indexen:**
- `idx_collection_follows_collection_id` op `collection_id`
- `idx_collection_follows_user_id` op `user_id`

#### `collection_collaborators`
Medewerkers aan collecties (max 10, API-gecontroleerd).

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `collection_id` | `uuid` | NOT NULL, REFERENCES `collections(id)` ON DELETE CASCADE | Collectie-ID |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Medewerker |
| `invited_by` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Uitnodiger |
| `created_at` | `timestamptz` | DEFAULT now() | Uitnodigingsdatum |

**Constraints:**
- PRIMARY KEY (`collection_id`, `user_id`)

**Indexen:**
- `idx_collection_collaborators_user_id` op `user_id`

#### `collection_ratings`
Beoordelingen van collecties.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Rating-ID |
| `collection_id` | `uuid` | NOT NULL, REFERENCES `collections(id)` ON DELETE CASCADE | Beoordeelde collectie |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Beoordelende gebruiker |
| `sterren` | `integer` | NOT NULL, CHECK (sterren >= 1 AND sterren <= 5) | Aantal sterren (1-5) |
| `created_at` | `timestamptz` | DEFAULT now() | Beoordelingsdatum |

**Constraints:**
- UNIQUE (`collection_id`, `user_id`)

**Indexen:**
- `idx_collection_ratings_collection_id` op `collection_id`

### Ingrediëntendatabase

#### `generic_ingredients`
Generieke ingrediënten met voedingswaarden en encyclopedie-content.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Ingrediënt-ID |
| `name` | `text` | NOT NULL | Ingrediëntnaam |
| `name_plural` | `text` | | Meervoudsvorm |
| `category` | `text` | | Categorie (groente, vlees, etc.) |
| `aliases` | `text[]` | DEFAULT '{}' | Alternatieve namen |
| `avg_kcal` | `numeric` | | Gemiddelde kcal per 100g |
| `avg_protein` | `numeric` | | Gemiddeld eiwit per 100g |
| `avg_fat` | `numeric` | | Gemiddeld vet per 100g |
| `avg_saturated_fat` | `numeric` | | Gemiddeld verzadigd vet per 100g |
| `avg_carbs` | `numeric` | | Gemiddelde koolhydraten per 100g |
| `avg_sugars` | `numeric` | | Gemiddelde suikers per 100g |
| `avg_fiber` | `numeric` | | Gemiddelde vezels per 100g |
| `avg_salt` | `numeric` | | Gemiddeld zout per 100g |
| `product_count` | `integer` | DEFAULT 0 | Aantal gekoppelde producten |
| `gram_per_piece` | `numeric` | | Gram per stuk (bijv. 1 ui = 150g) |
| `gram_per_ml` | `numeric` | | Dichtheid (gram per ml) |
| `gram_per_el` | `numeric` | | Gram per eetlepel |
| `gram_per_tl` | `numeric` | | Gram per theelepel |
| `description` | `text` | | Beschrijving (AI-gegenereerd) |
| `origin` | `text` | | Herkomst informatie |
| `usage_tips` | `text` | | Gebruikstips |
| `storage_tips` | `text` | | Bewaartips |
| `season` | `text` | | Seizoen informatie |
| `variants` | `text[]` | DEFAULT '{}' | Varianten |
| `fun_facts` | `text` | | Leuke weetjes |
| `image_url` | `text` | | Afbeelding URL |
| `content_generated_at` | `timestamptz` | | AI content generatie datum |
| `created_by` | `uuid` | REFERENCES `profiles(id)` | Maker |
| `created_at` | `timestamptz` | DEFAULT now() | Aanmaakdatum |
| `updated_at` | `timestamptz` | DEFAULT now() | Laatste wijziging |

**Constraints:**
- `idx_generic_ingredients_name` unieke index op `lower(trim(name))`

**Indexen:**
- `idx_generic_ingredients_category` op `category`
- `idx_generic_ingredients_name_trgm` GIN index voor full-text search

**Triggers:**
- `set_generic_ingredients_updated_at`: Auto-update `updated_at`

#### `products`
Gescande producten met barcode en voedingswaarden.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Product-ID |
| `barcode` | `text` | NOT NULL, UNIQUE | Barcode |
| `generic_ingredient_id` | `uuid` | REFERENCES `generic_ingredients(id)` ON DELETE SET NULL | Gekoppeld generiek ingrediënt |
| `brand` | `text` | | Merknaam |
| `product_name` | `text` | NOT NULL | Productnaam |
| `weight_grams` | `numeric` | | Gewicht in gram |
| `weight_ml` | `numeric` | | Volume in ml |
| `kcal` | `numeric` | | Energie per 100g |
| `protein` | `numeric` | | Eiwit per 100g |
| `fat` | `numeric` | | Vet per 100g |
| `saturated_fat` | `numeric` | | Verzadigd vet per 100g |
| `carbs` | `numeric` | | Koolhydraten per 100g |
| `sugars` | `numeric` | | Suikers per 100g |
| `fiber` | `numeric` | | Vezels per 100g |
| `salt` | `numeric` | | Zout per 100g |
| `image_url` | `text` | | Product afbeelding |
| `nutrition_image_url` | `text` | | Voedingslabel afbeelding |
| `source` | `text` | DEFAULT 'user_scan', CHECK (source IN ('open_food_facts', 'user_scan', 'user_photo')) | Databron |
| `scanned_by` | `uuid` | REFERENCES `profiles(id)` | Scanner |
| `verification_count` | `integer` | DEFAULT 1 | Verificatie teller |
| `created_at` | `timestamptz` | DEFAULT now() | Aanmaakdatum |
| `updated_at` | `timestamptz` | DEFAULT now() | Laatste wijziging |

**Constraints:**
- `idx_products_barcode` unieke index op `barcode`

**Indexen:**
- `idx_products_generic_ingredient` op `generic_ingredient_id`

**Triggers:**
- `set_products_updated_at`: Auto-update `updated_at`

#### `unit_conversions`
Eenheid conversietabel voor ingrediënten.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Conversie-ID |
| `unit_name` | `text` | UNIQUE NOT NULL | Eenheidnaam |
| `unit_aliases` | `text[]` | DEFAULT '{}' | Alternatieve namen |
| `ml_equivalent` | `numeric` | | Milliliter equivalent |
| `gram_default` | `numeric` | | Standaard gram waarde |
| `notes` | `text` | | Notities |

### Notificaties

#### `notifications`
Systeem notificaties voor gebruikers.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Notificatie-ID |
| `recipient_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Ontvanger |
| `actor_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Actie uitvoerder |
| `type` | `text` | NOT NULL, CHECK (type IN ('comment', 'reply', 'favorite', 'rating', 'collection_follow', 'collection_invite')) | Notificatietype |
| `message` | `text` | NOT NULL | Notificatie bericht |
| `link` | `text` | | Link naar gerelateerde content |
| `is_read` | `boolean` | DEFAULT false | Gelezen status |
| `created_at` | `timestamptz` | DEFAULT now() | Aanmaakdatum |

**Indexen:**
- `idx_notifications_recipient` op `recipient_id, created_at DESC`
- `idx_notifications_unread` op `recipient_id` WHERE `is_read = false`
- `idx_notifications_actor` op `actor_id`

#### `notification_preferences`
Notificatie voorkeuren per gebruiker.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `user_id` | `uuid` | PRIMARY KEY, REFERENCES `profiles(id)` ON DELETE CASCADE | Gebruiker-ID |
| `comment` | `boolean` | DEFAULT true | Comments notificaties |
| `reply` | `boolean` | DEFAULT true | Reply notificaties |
| `favorite` | `boolean` | DEFAULT true | Favoriet notificaties |
| `rating` | `boolean` | DEFAULT true | Rating notificaties |
| `collection_follow` | `boolean` | DEFAULT true | Collectie volger notificaties |
| `collection_invite` | `boolean` | DEFAULT true | Collectie uitnodiging notificaties |
| `share` | `boolean` | DEFAULT true | Deel notificaties |
| `push_enabled` | `boolean` | DEFAULT true | Push notificaties aan/uit |
| `updated_at` | `timestamptz` | DEFAULT now() | Laatste wijziging |

**Triggers:**
- `set_notification_preferences_updated_at`: Auto-update `updated_at`
- `on_profile_created_preferences`: Auto-aanmaken voorkeuren voor nieuwe gebruikers

#### `push_subscriptions`
FCM tokens voor push notificaties.

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Subscription-ID |
| `user_id` | `uuid` | NOT NULL, REFERENCES `profiles(id)` ON DELETE CASCADE | Gebruiker |
| `fcm_token` | `text` | UNIQUE NOT NULL | Firebase Cloud Messaging token |
| `device_name` | `text` | | Apparaatnaam |
| `created_at` | `timestamptz` | DEFAULT now() | Registratiedatum |

**Indexen:**
- `idx_push_subscriptions_user` op `user_id`

### Admin & Systeem

#### `app_settings`
Applicatie instellingen (zoals toegangscode).

| Kolom | Type | Constraints | Beschrijving |
|-------|------|-------------|--------------|
| `key` | `text` | PRIMARY KEY | Instelling sleutel |
| `value` | `text` | NOT NULL | Instelling waarde |
| `updated_at` | `timestamptz` | DEFAULT now() | Laatste wijziging |
| `updated_by` | `uuid` | REFERENCES `profiles(id)` | Laatste wijziger |

**Seed data:**
- `registration_access_code`: 'KokenMetKokkies2026'

## Database Functies

### `public.handle_new_user()`
Trigger functie die automatisch een profiel aanmaakt wanneer een nieuwe gebruiker wordt geregistreerd in `auth.users`.

### `public.update_updated_at()`
Generieke trigger functie om `updated_at` kolommen automatisch bij te werken.

### `public.handle_new_profile_preferences()`
Trigger functie die automatisch notificatie voorkeuren aanmaakt voor nieuwe profielen.

### `recalculate_generic_nutrition(ingredient_id uuid)`
Herberekent gemiddelde voedingswaarden voor een generiek ingrediënt op basis van gekoppelde producten.

### `public.is_admin()`
Security definer functie om te controleren of de huidige gebruiker admin rechten heeft.

### `public.get_recipe_stats(p_recipe_ids uuid[])`
Performance geoptimaliseerde functie die geaggregeerde statistieken retourneert voor meerdere recepten (ratings, comments, favorieten).

## Row Level Security (RLS) Policies

Alle tabellen hebben RLS ingeschakeld. Hieronder de belangrijkste policy patronen:

### Gebruikersgericht (Own Data)
- **profiles**: Iedereen kan lezen, gebruikers kunnen alleen eigen profiel wijzigen
- **favorites**: Gebruikers zien/wijzigen alleen eigen favorieten  
- **notifications**: Gebruikers zien/wijzigen alleen eigen notificaties

### Openbaar Lezen, Eigen Schrijven
- **recipes**: Iedereen kan lezen, gebruikers kunnen alleen eigen recepten wijzigen
- **collections**: Iedereen kan lezen, eigenaren kunnen wijzigen
- **ratings**: Iedereen kan lezen, gebruikers kunnen alleen eigen ratings wijzigen

### Volgt Parent Visibility
Ingrediënten, stappen, voeding, etc. volgen de zichtbaarheid van het parent recept:
- **ingredients/steps/nutrition/benodigdheden**: Gebruikers kunnen alleen wijzigen als ze eigenaar zijn van het bijbehorende recept

### Samenwerking
- **collection_recipes**: Eigenaar OF medewerkers kunnen recepten toevoegen/verwijderen
- **collection_collaborators**: Alleen eigenaar kan medewerkers beheren

### Admin Only
- **app_settings**: Alleen admins kunnen lezen/wijzigen

### Open voor Authenticated Users
- **tags**: Iedereen kan lezen, geauthenticeerde gebruikers kunnen nieuwe tags aanmaken
- **generic_ingredients/products**: Iedereen kan lezen, geauthenticeerde gebruikers kunnen nieuwe toevoegen

## Performance Optimalisaties

### Indexen
Uitgebreide indexering op:
- Foreign keys voor JOIN performance
- User_id kolommen voor eigenaarschap queries  
- Datum kolommen voor chronologische sortering
- Full-text search via trigram voor ingrediënten zoeken
- Partial indexes voor ongelezen notificaties

### Query Optimalisatie
- `get_recipe_stats()` functie vermijdt N+1 queries voor recept statistieken
- Trigram indexes voor snelle tekst zoeken
- Composite indexes voor multi-kolom filters

### Seed Data
Database bevat seed data voor:
- Standaard tags (Calorie Smart, High Protein, etc.)
- 80+ generieke ingrediënten met conversie-gegevens
- Standaard eenheid conversies (eetlepel, theelepel, etc.)

Deze database structuur ondersteunt alle functionaliteiten van de Receptenboek applicatie inclusief AI-extractie, barcodescanning, sociale functies, collecties en uitgebreid admin beheer.
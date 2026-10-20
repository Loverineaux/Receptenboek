# Receptenboek — Projectinstructies

## Taal
- De app is Nederlandstalig. Alle UI-teksten, foutmeldingen en toasts in het Nederlands.
- Gebruik nooit `window.alert()`, `window.confirm()` of `window.prompt()`. Altijd in-app UI (toasts, modals).

## Releases & Versioning
- **Voordat `git push` wordt uitgevoerd MOET ALTIJD EERST `/release` worden gedraaid.**
- Er mag NOOIT gepusht worden zonder dat `/release` is uitgevoerd.
- Semantic versioning: MAJOR.MINOR.PATCH
  - **patch**: bugfixes, kleine aanpassingen
  - **minor**: nieuwe features
  - **major**: breaking changes
- Versie wordt bijgehouden in: `package.json` en `src/app/(main)/instellingen/over/page.tsx`

## Recept-extractie
- Bij het importeren van een recept via URL mag ALLEEN informatie van de opgegeven bron/website gebruikt worden.
- NOOIT recepten van andere websites gebruiken als fallback. Als de bron niet genoeg info geeft, geef dan terug wat je hebt — de gebruiker kan het handmatig aanvullen.
- De bron die in het recept wordt opgeslagen moet altijd de website zijn waar de URL naartoe wijst.

## Database-migraties
- Sinds 30 oktober 2026 krijgen nieuwe tabellen in `public` geen automatische Data API-rechten meer. Elke migratie die een tabel aanmaakt, moet in dezelfde migratie ook expliciet `grant`s geven (naast RLS aanzetten en policies):
  ```sql
  grant select on public.<tabel> to anon;
  grant select, insert, update, delete on public.<tabel> to authenticated;
  grant select, insert, update, delete on public.<tabel> to service_role;
  ```
  Geef `anon` alleen `select` als de tabel ook zonder inloggen leesbaar moet zijn; RLS blijft de echte beveiliging.

## Tech Stack
- Next.js 14 (App Router)
- Supabase (Auth, Database, Storage)
- Tailwind CSS
- TypeScript

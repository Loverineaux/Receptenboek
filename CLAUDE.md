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

## Tech Stack
- Next.js 14 (App Router)
- Supabase (Auth, Database, Storage)
- Tailwind CSS
- TypeScript

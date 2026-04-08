Voer het volgende release proces uit:

## 1. Bepaal het bump type

Bekijk de commits sinds de laatste tag (of alle commits als er geen tag is):

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD --oneline
```

Bepaal op basis van de commit messages:
- **major** — als er breaking changes zijn (BREAKING, `!:` in commit)
- **minor** — als er nieuwe features zijn (`feat:`, `feat(...)`)
- **patch** — voor bugfixes, refactors, en overige

## 2. Bump de versie

Voer het bump script uit:

```bash
bash scripts/bump-version.sh [patch|minor|major]
```

## 3. Genereer release notes

Lees het bestand `src/lib/release-notes.ts`. Voeg bovenaan de `releaseNotes` array een nieuw item toe met:
- `version`: de nieuwe versie
- `date`: vandaag in het formaat "7 april 2026"
- `highlights`: een array van 4-6 korte zinnen in **begrijpelijke Nederlandse taal** die beschrijven wat er nieuw of verbeterd is. Schrijf voor gewone gebruikers, niet voor developers. Gebruik geen technische termen.

Baseer de highlights op de commits sinds de laatste tag. Groepeer gerelateerde commits in één zin. Als er meer dan 3 releases in het bestand staan, verwijder de oudste zodat er maximaal 3 overblijven.

## 4. Controleer

Verifieer dat `src/app/(main)/instellingen/over/page.tsx` de versie dynamisch toont via `process.env.APP_VERSION`.

## 5. Maak een versie-commit

Stage de gewijzigde bestanden en maak een commit:

```
chore: bump version to X.Y.Z
```

## 6. Tag de release

```bash
git tag vX.Y.Z
```

## 7. Push

```bash
git push && git push --tags
```

Meld aan de gebruiker welke versie er is gereleased en geef een korte samenvatting.

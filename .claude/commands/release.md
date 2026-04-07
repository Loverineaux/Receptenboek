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

## 3. Update de "Over de app" pagina

Controleer dat `src/app/(main)/instellingen/over/page.tsx` de juiste versie toont. Het script doet dit automatisch, maar verifieer het.

## 4. Maak een versie-commit

Stage de gewijzigde bestanden en maak een commit:

```
chore: bump version to X.Y.Z
```

## 5. Tag de release

```bash
git tag vX.Y.Z
```

## 6. Push

```bash
git push && git push --tags
```

Meld aan de gebruiker welke versie er is gereleased en wat de belangrijkste wijzigingen zijn (korte samenvatting van de commits).

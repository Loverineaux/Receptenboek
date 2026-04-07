#!/bin/bash
# Auto version bump based on commit messages since last tag
# Usage: ./scripts/bump-version.sh [patch|minor|major]

set -e

PACKAGE_JSON="package.json"
ABOUT_PAGE="src/app/(main)/instellingen/over/page.tsx"

# Read current version
CURRENT=$(node -p "require('./$PACKAGE_JSON').version")
echo "Current version: $CURRENT"

# Split into parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Determine bump type from argument or commits
BUMP_TYPE="${1:-auto}"

if [ "$BUMP_TYPE" = "auto" ]; then
  # Check commits since last tag
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

  if [ -z "$LAST_TAG" ]; then
    COMMITS=$(git log --oneline)
  else
    COMMITS=$(git log "$LAST_TAG"..HEAD --oneline)
  fi

  if echo "$COMMITS" | grep -iqE "^[a-f0-9]+ (BREAKING|breaking|!:)"; then
    BUMP_TYPE="major"
  elif echo "$COMMITS" | grep -iqE "^[a-f0-9]+ feat"; then
    BUMP_TYPE="minor"
  else
    BUMP_TYPE="patch"
  fi
fi

# Bump
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "Bumping to: $NEW_VERSION ($BUMP_TYPE)"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PACKAGE_JSON', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('$PACKAGE_JSON', JSON.stringify(pkg, null, 2) + '\n');
"

# Update about page
if [ -f "$ABOUT_PAGE" ]; then
  sed -i "s/Versie $CURRENT/Versie $NEW_VERSION/g" "$ABOUT_PAGE"
  sed -i "s/Versie 0\.1\.0/Versie $NEW_VERSION/g" "$ABOUT_PAGE"
fi

echo "$NEW_VERSION"

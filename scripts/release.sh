#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "Creating release for version $VERSION..."

git checkout master
git pull origin master
git tag -a "$TAG" -m "Release version $VERSION"
git push origin "$TAG"

# Release notes: this version's CHANGELOG section
sed -n "/## \[$VERSION\]/,/## \[/p" CHANGELOG.md | sed '$d' > /tmp/release-notes.md

# Publishing the release triggers the npm-publish workflow (test -> publish)
gh release create "$TAG" \
  --title "Release $TAG" \
  --notes-file /tmp/release-notes.md \
  --latest

echo "✅ Release $TAG published! CI will test and publish to npm."
echo "🔗 https://github.com/valehasadli/emitrix/actions"

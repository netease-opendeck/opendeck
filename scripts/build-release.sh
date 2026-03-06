#!/usr/bin/env bash
# Build deck.tar.gz for GitHub Releases.
# Run from repo root. Produces scripts/deck.tar.gz (or set OUT_DIR).
# Layout: backend/ app/ skills/ deck ecosystem.config.cjs deck.ps1 deck.cmd

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$REPO_ROOT/scripts}"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

cd "$REPO_ROOT"

echo "Building backend and app..."
pnpm install
pnpm run build

echo "Staging release files..."
cp -r backend app "$STAGING/"
[ -d skills ] && cp -r skills "$STAGING/" || mkdir -p "$STAGING/skills"
cp scripts/deck scripts/ecosystem.config.cjs "$STAGING/"
[ -f scripts/deck.ps1 ] && cp scripts/deck.ps1 "$STAGING/"
[ -f scripts/deck.cmd ] && cp scripts/deck.cmd "$STAGING/"
chmod +x "$STAGING/deck"

echo "Creating deck.tar.gz..."
mkdir -p "$OUT_DIR"
tar -czf "$OUT_DIR/deck.tar.gz" -C "$STAGING" .

echo "Done: $OUT_DIR/deck.tar.gz"

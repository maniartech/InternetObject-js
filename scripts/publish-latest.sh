#!/usr/bin/env bash
set -euo pipefail

# Publishes the current package version to the default npm dist-tag: "latest".
#
# Usage:
#   bash scripts/publish-latest.sh
#
# Notes:
# - Requires you to be logged into npm (npm whoami).
# - Requires a clean git working tree (override with ALLOW_DIRTY=1).
# - Runs the same safety pipeline as prepublishOnly: clean + build + test.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH" >&2
  exit 1
fi

if ! command -v yarn >/dev/null 2>&1; then
  echo "yarn is required but was not found in PATH" >&2
  exit 1
fi

if command -v git >/dev/null 2>&1; then
  if [[ "${ALLOW_DIRTY:-0}" != "1" ]]; then
    if [[ -n "$(git status --porcelain)" ]]; then
      echo "Refusing to publish with uncommitted changes." >&2
      echo "Commit/stash your changes or re-run with ALLOW_DIRTY=1" >&2
      exit 1
    fi
  fi
fi

# Auth Configuration
TEMP_NPMRC=""

cleanup() {
  if [ -n "$TEMP_NPMRC" ] && [ -f "$TEMP_NPMRC" ]; then
    rm -f "$TEMP_NPMRC"
  fi
}
trap cleanup EXIT

# 1. Try loading token from .env
NPM_PUBLISH_TOKEN=""
if [ -f .env ]; then
  # Extract token, handling potential quotes and Windows line endings
  NPM_PUBLISH_TOKEN=$(grep "^NPM_PUBLISH_TOKEN=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

if [ -n "${NPM_PUBLISH_TOKEN:-}" ]; then
  echo "🔑 Found NPM_PUBLISH_TOKEN in .env"

  # create temp npmrc
  TEMP_NPMRC=$(mktemp)
  echo "//registry.npmjs.org/:_authToken=${NPM_PUBLISH_TOKEN}" > "$TEMP_NPMRC"

  # Validate token
  if ! npm whoami --userconfig "$TEMP_NPMRC" >/dev/null 2>&1; then
    echo "❌ Error: The NPM_PUBLISH_TOKEN in .env is invalid or expired." >&2
    echo "   Please regenerate the token." >&2
    exit 1
  fi

  echo "✅ Token validated. User: $(npm whoami --userconfig "$TEMP_NPMRC")"
  export NPM_CONFIG_USERCONFIG="$TEMP_NPMRC"

else
  # 2. Fallback to interactive login
  if ! npm whoami >/dev/null 2>&1; then
    echo "Not logged in to npm. Run: npm login" >&2
    exit 1
  fi
  echo "👤 Using active npm login: $(npm whoami)"
fi

echo "Running prepublish checks (clean + build + test)…"
yarn -s prepublishOnly

echo "Publishing to npm (dist-tag: latest)…"
# Default tag is "latest".
npm publish

# Reinforce the tag explicitly (harmless if already latest).
VERSION="$(node -p "require('./package.json').version")"
NAME="$(node -p "require('./package.json').name")"
npm dist-tag add "${NAME}@${VERSION}" latest >/dev/null

echo "✅ Published ${NAME}@${VERSION} as latest"

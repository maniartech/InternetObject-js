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

# Ensure npm auth is configured.
if ! npm whoami >/dev/null 2>&1; then
  echo "Not logged in to npm. Run: npm login" >&2
  exit 1
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

#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="${DOOMGENERIC_REPOSITORY:-https://github.com/ozkl/doomgeneric.git}"
COMMIT="${1:-${DOOMGENERIC_COMMIT:-}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESTINATION="${DOOMGENERIC_DESTINATION:-$PROJECT_DIR/third_party/doomgeneric}"

if [ -z "$COMMIT" ]; then
  echo "Usage: $0 <pinned-commit>" >&2
  echo "Or set DOOMGENERIC_COMMIT." >&2
  exit 2
fi

if [ ! -d "$DESTINATION" ]; then
  git clone "$REPOSITORY" "$DESTINATION"
else
  echo "doomgeneric already exists: $DESTINATION"
fi

git -C "$DESTINATION" fetch --tags --prune
git -C "$DESTINATION" checkout "$COMMIT"
git -C "$DESTINATION" submodule update --init --recursive

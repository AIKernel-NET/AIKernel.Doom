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

PATCH_PATH="$PROJECT_DIR/patches/doomgeneric-upstream.patch"
if [ -f "$PATCH_PATH" ]; then
  if git -C "$DESTINATION" apply --check --whitespace=nowarn "$PATCH_PATH" >/dev/null 2>&1; then
    git -C "$DESTINATION" apply --whitespace=nowarn "$PATCH_PATH"
    echo "Applied AIKernel doomgeneric patch: $PATCH_PATH"
  else
    echo "AIKernel doomgeneric patch already applied or not applicable: $PATCH_PATH"
  fi
fi

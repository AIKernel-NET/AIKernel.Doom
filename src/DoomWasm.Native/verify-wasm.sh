#!/usr/bin/env bash
set -euo pipefail

WASM_PATH="${1:-}"
if [ -z "$WASM_PATH" ] || [ ! -f "$WASM_PATH" ]; then
  echo "WASM file not found: $WASM_PATH" >&2
  exit 2
fi

if command -v xxd >/dev/null 2>&1; then
  MAGIC="$(xxd -p -l 8 "$WASM_PATH")"
elif command -v od >/dev/null 2>&1; then
  MAGIC="$(od -An -N8 -tx1 -v "$WASM_PATH" | tr -d ' \n')"
elif command -v python3 >/dev/null 2>&1; then
  MAGIC="$(python3 -c 'import sys; print(open(sys.argv[1], "rb").read(8).hex())' "$WASM_PATH")"
else
  echo "Cannot verify WASM magic: xxd, od, and python3 are unavailable." >&2
  exit 4
fi

if [ "$MAGIC" != "0061736d01000000" ]; then
  echo "Invalid WASM magic/version: $WASM_PATH" >&2
  exit 3
fi

echo "Verified WASM binary: $WASM_PATH"

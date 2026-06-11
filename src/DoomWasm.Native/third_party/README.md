# Third-Party DOOM Source

DOOM engine source is not vendored in this repository.

Use `tools/fetch-doomgeneric.ps1` or `tools/fetch-doomgeneric.sh` with an explicit pinned commit:

```powershell
pwsh ./tools/fetch-doomgeneric.ps1 -Commit <pinned-commit-sha>
```

```bash
./tools/fetch-doomgeneric.sh <pinned-commit-sha>
```

Default upstream:

```text
https://github.com/ozkl/doomgeneric.git
```

Keep upstream license files with the fetched source. Do not commit commercial WAD files or generated `doom.wasm` binaries.

# WASM Runtime

[English](wasm-runtime.md)

Native DOOM runtime は `src/DoomWasm.Native` にあります。これは doomgeneric 向けの Emscripten overlay であり、AIKernel.Wasm.Runtime が呼び出す小さな C ABI を公開します。

## Export ABI

必須 export:

```c
int doom_init(void);
int doom_tick(void);
uint8_t* doom_render(void);
void doom_input(int keycode, int pressed);
```

`doom_init` は WAD を memory-backed mount から初期化します。`doom_tick` は 1 tic 進めます。`doom_render` は WASM linear memory 上の 320x200 paletted 8-bit framebuffer を返します。`doom_input` は key press / release を DOOM event queue に流します。

## Memory-Backed WAD

商用 WAD や shareware WAD はリポジトリに含めません。Web runtime は、承認後に hosted `DOOM1.WAD` を取得し、WASM memory に配置します。Native runtime は file I/O ではなく、この memory buffer を WAD backend として扱います。

実装上の要件:

- `fopen` / `fread` / `fseek` に依存しない。
- WAD header を検証する。
- WAD 未設定やサイズ不正は明示的な error code で返す。
- DOOM 本体ソースや WAD を捏造しない。

## Emscripten Build

推奨する build 方針:

```bash
emcc -O3 \
  -s WASM=1 \
  -s STANDALONE_WASM \
  -s EXPORTED_FUNCTIONS="['_main','_doom_init','_doom_tick','_doom_render','_doom_input']" \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  -o doom.wasm
```

`BuildDoomWasm=true` または `AIKERNEL_BUILD_DOOM_WASM=true` が指定された場合だけ native WASM build を実行します。Emscripten がない環境でも通常の `dotnet build` は失敗しないようにします。

Docker 例:

```powershell
docker run --rm -v ${PWD}:/src emscripten/emsdk:latest `
  bash -lc "cd /src/AIKernel.Doom/src/DoomWasm.Native && ./build.sh"
```

## Rendering

`doom_render` は paletted 8-bit framebuffer を返します。ブラウザ側はこの buffer を WebGPU texture または Canvas fallback で描画します。色変換は可能な限り再利用バッファで行い、毎フレームの allocation を避けます。

## Input

DOOM の基本操作は key event として注入します。

- Arrow Up / Down: 前進 / 後退
- Arrow Left / Right: 旋回
- Ctrl: 攻撃
- Space: Use
- Shift: Run
- Alt: Strafe

AutoPlay も手動操作も同じ `doom_input` 経路を使います。これにより、手動で効く Use が AutoPlay でも同じ ABI で検証できます。

## ライセンス

doomgeneric は GPL-2.0 として扱います。`doom.wasm` を配布する場合、対応する source、patch、build script、license notice を提供する必要があります。

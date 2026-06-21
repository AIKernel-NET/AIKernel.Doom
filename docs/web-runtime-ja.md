# Web Runtime

[English](web-runtime.md)

`src/DoomWeb` は、AIKernel.Doom web prompt で使用する public browser runtime
source assets を含みます。source-only であり、hosted runtime binaries は含めません。

この層は browser-side Provider と Operator の境界です。AIKernel 開発ガイドラインに
従い、hosted asset load、WebGPU access、WASM instantiation、user input を明示的な
edge に置き、telemetry を Observer から見える状態に保ちます。

## ファイル

```text
src/DoomWeb/
  DoomWeb.csproj
  DoomWebAssets.cs
  wwwroot/
    js/
      webgpu-provider.js
      doom.js
      doom-worker.js
      doom-worker-proxy.js
      bonsai.js
    demo/doom/
      autoplay-profile.json
      js/doom-prompt.js
      terms-and-licenses.html
```

## 主な責務

`doom.js`

- `doom.wasm` をロードする。
- `DOOM1.WAD` をマウントする。
- `doom_init`、`doom_tick`、`doom_render`、input exports を呼び出す。
- frame pacing と watchdog restart を担当する。
- CLI 風 runtime command を公開する。

`webgpu-provider.js`

- browser `WebGpuComputeProvider` bridge を生成する。
- WebGPU が利用できる場合の texture upload/presentation を担当する。
- 決定論的な Canvas fallback を提供する。

`doom-worker.js` / `doom-worker-proxy.js`

- OffscreenCanvas 利用可能時に DOOM runtime work を Web Worker へ隔離する。
- status、logs、commands、manual input を転送する。
- main UI thread の応答性を維持する。

`bonsai.js`

- perception と autoplay supervisor を実装する。
- framebuffer と HUD を sample する。
- phase-aware state を構築する。
- 境界づけられた DOOM input action を発行する。
- persisted autoplay profile をロードする。

`doom-prompt.js`

- AIKernel 風 prompt を描画する。
- approval gate を管理する。
- debug controls を提供する。
- cheat、status command、copyable telemetry を処理する。

## Worker Runtime

worker path は、DOOM tick/render と perception sampling が UI thread を占有する
ことを避けるために優先されます。可能な場合は OffscreenCanvas を worker に渡し、
status/log message を prompt へ戻します。

重要な性質:

- keyboard/button event は queue されるため input が応答し続ける。
- worker support がない場合は main-thread execution へ degrade できる。
- 一定時間 frame が生成されない場合、watchdog が frame loop を restart できる。

## Frame Loop

runtime は cooperative adaptive loop を使います。

1. target FPS cap を適用する。
2. browser event loop へ yield する。
3. `doom_tick` を呼ぶ。
4. `doom_render` を呼ぶ。
5. framebuffer を present する。
6. perception data を sample する。
7. AutoPlay が有効なら action を計算する。
8. inference が遅れた場合は前回 action を再利用する。

loop は作業時間が idle budget を圧迫する場合、FPS cap を段階的に下げます。
これにより長時間実行でも debug UI と manual controls の操作性を維持します。

この scheduler は Operator として扱います。固定順序を実行し、bounded
backpressure を適用し、stall を隠さず `doom.status` に報告します。

## Rendering Path

native module は 320x200 paletted 8-bit framebuffer を返します。

web runtime は以下の経路で表示できます。

- `WebGpuComputeProvider(texture)`: WebGPU texture binding が有効な場合。
- `canvas-fallback(WebGpuComputeProvider)`: GPU provider はあるが texture binding が使えない場合。
- Canvas-only fallback: WebGPU 非対応ブラウザ。

texture path が有効な場合、`webgpu-provider.js` は fragment shader による HUD
compositor も担当します。present pass は DOOM framebuffer texture を sample し、
debug evidence を VRAM 内で合成します。

- 9x9 detector heatmap は 81 個の float storage buffer として upload し、1 回の
  full-screen draw call で描画する。
- Kairos pulse は DOM/CSS の点滅ではなく shader time で制御する。
- probe arrow、center enemy ring、near-wall foot glow は fragment shader で生成する。
- `doom-prompt.js` は GPU HUD が active な間だけ DOM detection overlay を隠す。
  Canvas/CPU fallback では既存の DOM/CSS overlay を維持する。

AutoPlay の tuning は shader へ閉じ込めません。`doom.js` が現在の perception/DSL
control state を compact な HUD state buffer に変換するため、controller logic は
presentation shader を再コンパイルせずに発展させられます。

perception path は frame が WebGPU surface 上に残ったかを status に記録します。

```text
vision=webgpu-texture-binding; zeroCopy=true
vision=webgpu-state-buffer:cpu-frame-sample; zeroCopy=false
vision=cpu-frame-sample; zeroCopy=false
```

## Runtime Consent

prompt は accepted approval word が入力されるまで suspended です。approval 後に
runtime は以下を download/cache/load できます。

- hosted `doom.wasm`
- hosted shareware `DOOM1.WAD`
- Bonsai model manifest と model file
- 関連 runtime metadata

runtime は approval 後の download 状態を `status.downloadProgress` に出します。
各 asset は `receivedBytes`、`totalBytes`、`percent`、phase label を持つため、
`doom.wasm` / WAD / model の取得で数秒待つ場合でも prompt UI は進捗を表示できます。

approval 前に大容量 protected runtime asset はロードされません。これは public demo
で最も見えやすい fail-closed boundary です。

## Debug Controls

debug toolbar には以下があります。

- `Copy Logs`
- `Phase + Logs`
- `Manual Move`
- `Sense Only`
- `Detection Overlay`
- detector ごとの toggle

`Phase + Logs` は `doom.phase.check` と `copy.logs` を 1 click で実行します。
combat や door timing のように prompt へ入力する時間が gameplay に影響する場面で
使うための機能です。

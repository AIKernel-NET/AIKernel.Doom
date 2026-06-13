# 視野認知エンジン

[English](vision-perception-engine.md)

ブラウザ側の AutoPlay supervisor は、JavaScript で compact な perception system を
実装しています。これは、full computer-vision model を使わずに、低解像度の game
framebuffer から action に使える状態を抽出するための再利用可能な実装例です。

AIKernel の観点では、この engine は Observer-facing perception layer です。
raw framebuffer state を bounded symbolic signals へ変換しますが、最終的な
gameplay decision は所有しません。それらの signal は Operator pipeline へ渡されます。

主な実装箇所:

```text
src/DoomWeb/wwwroot/js/bonsai.js
src/DoomWeb/wwwroot/js/webgpu-provider.js
src/DoomWeb/wwwroot/js/doom.js
```

## Design Goals

- WebGPU texture binding が使える場合は高価な CPU readback を避ける。
- 全 detector に決定論的 CPU fallback を残す。
- 320x200 paletted framebuffer から低次元 state を抽出する。
- detection と action selection を分離する。
- detector state を overlay と copyable logs で見えるようにする。
- external profile で調整可能にする。
- detector output を status と overlay で audit 可能にする。
- phase-specific に detector activation を行い、無関係な detector が意思決定に
  影響しないようにする。

## Sampling Layers

### Screen Regions

初期の粗い視野は 3x2 grid です。

```text
left-top    center-top    right-top
left-bottom center-bottom right-bottom
```

これは C# strategy contract の `Screen6Regions` として公開され、wall pressure、
open space、lateral bias の低コスト signal として残っています。

### 3x3 Region Grid

新しい `regions9` signal は gameplay view を 3x3 に分割します。

```text
r0 r1 r2
r3 r4 r5
r6 r7 r8
```

これにより以下が改善されます。

- corridor entrance detection
- enemy localization
- bridge lane detection
- obstacle / barrel detection
- turning と forward motion の識別

status には次のように出力されます。

```text
regions9=665654643
```

各桁は quantized bucket です。目的は写実的な認識ではなく、決定論的 routing に
使える安定した symbolic signature を得ることです。

### HUD Sampling

DOOM status bar は world view とは別に sample します。HUD pixel は world geometry
ではないため、分離しないと wall/corridor signature を汚染します。

抽出する HUD signal:

- ammo signature
- likely-empty ammo state
- health signature
- zero-health likelihood
- DOOM face signature
- face delta

DOOM face は compact な player-state buffer として扱います。damage、directional
hit feedback、critical state を反映するため、`faceSig` は world regions と分離します。

### Palette Semantics

engine は paletted 8-bit DOOM frame 上で動きます。palette entries を以下の semantic
color clusters に照合します。

- enemy-like colors
- dark area
- blue floor
- computer room lights
- door panels
- bridge brown / green hazard
- foot obstacles

これは意図的に軽量です。real-time debug に十分速く、log で説明できる程度に単純です。
説明可能性は Observer が audit 可能な evidence を生成するというガイドライン準拠の
一部です。

## Quantized Signatures

小さな色変化や motion は noisy な frame delta を生みます。engine は quantization によって
微小な揺れを stable bucket へ畳み込みます。

利点:

- palette jitter を無視できる。
- wall texture detail を抽象化できる。
- view bobbing の影響を減らせる。
- repeated wall/corner view を dictionary matching できる。
- log が compact になる。

例:

```text
regions=665653
regions9=665654643
depthSig=7445
faceSig=0440044004400440
sig=wall/0.83
dict=48/4/7
```

`dict` は wall、corner、depth pattern の学習済み signature dictionary を表します。
これにより既知の corner trap などを素早く認識できます。

## Multi-Frame Motion Analysis

classic DOOM では移動中に画面が上下に揺れるため、single-frame comparison は不安定です。
engine は小さな frame history を持ち、current quantized regions を bob-filtered prior
frame と比較します。

`motion9` は 3x3 region change から計算します。

```text
motion9[i] = quantize(abs(currentRegion9[i] - previousRegion9[i]))
```

派生 signal:

- `forwardProgress`: forward move 中の中央縦方向 motion
- `turningMotion`: left/right 非対称 motion
- `obstacleMotion`: 中央下部の近接 obstacle signal
- `entranceMotion`: 右側の開けや movement clue
- `motionStallScore`: forward intent があるのに動いていない状態

これにより、壁への突進、turn in place、corridor entry、barrel/column block、
bridge movement を区別します。

## Door と Computer Room Detection

door detection は phase-gated です。door-like texture を見ただけでは phase を進めません。

first-door milestone には以下のような証拠を要求します。

- corridor が既に located
- Use が attempted
- door transition が armed
- dark sector または map hint が matched
- または Use 後に computer-room visual evidence が出現

これにより、dark wall と enemy color の組み合わせを door open と誤認しないようにします。
これは fail-closed milestone です。弱い証拠で semantic phase を進めるより、進行が遅れる方を
選びます。

computer room detection は以下を別 group として扱います。

- computer panel score
- blue light score
- red light score
- dark panel score
- luma threshold
- enemy-zone context

プレイヤーが部屋のどこを見ていても認識できるようにするためです。

## Enemy Detection

enemy detection は全 region で評価し、action は phase で gate します。

重要な規則:

- first door 前は enemy detection を無効化する。
- green/gate-like colors は enemy として信用しない。
- brown/gray は close depth または center confidence がある場合のみ信用する。
- red/pink は dark computer room では depth gate を少し緩める。
- Fire は target が centered の場合のみ出す。

DOOM では enemy は任意の region に現れますが、中心に入る前に撃つと弾を浪費するためです。

## Debug Overlay

overlay は全 detector ではなく active detector を描画します。

色:

- objective: green
- motion: red
- door/gap: green
- wall: orange
- enemy: purple
- computer: blue
- foot obstacle: yellow
- HUD: gray

priority は強度に反映されます。高優先度 command は強く光り、低優先度 detector は薄く
表示されます。これにより、現在どの detector が action arbitration に勝っているかを
視覚的に確認できます。

## 応用先

この perception approach は以下に向いています。

- 入力が低解像度 framebuffer
- direct game-state API がない
- opaque model output より決定論が重要
- human developer が live に inspection/tuning する必要がある
- frame readback を最小化したい

emulator UI、robotics simulator、古いゲーム、browser sandbox、visual debugging surface
などに応用できます。

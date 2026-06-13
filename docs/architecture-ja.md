# アーキテクチャ

[English](architecture.md)

AIKernel.Doom は、ゲームエンジンパッケージではなく、デモグレードの
AIKernel アプリケーションとして構成されています。目的は、WASM process、
WebGPU rendering、runtime consent、telemetry、AI control loop を、AIKernel
Development Guidelines に沿って接続する方法を示すことです。

## ガイドライン準拠の柱

- **Interface-Led Architecture (ILA)**: 実装詳細より前に契約を明示します。
- **Provider-Observer-Operator (POO)**: 副作用、観測、実行を分離します。
- **DAG Principle**: phase transition と command arbitration を決定論的で
  検査可能な制御フローとして扱います。
- **Exceptionless Fail-Closed Principle**: missing asset、GPU unavailable、
  invalid WAD、rejected consent を隠して続行しません。
- **Governance and Evidence**: runtime decision を status、overlay、copied logs、
  optimizer telemetry で観測可能にします。

## Provider

Provider は副作用と外部境界を担当します。これは、確率的または副作用を伴う
動作を Provider contract の背後に閉じ込めるというガイドラインに対応します。

- `DoomProvider` は consent、lifecycle state、runtime preparation、
  capability-facing status を管理します。
- `DoomWasm` は ROM metadata と `doom.wasm` asset を解決します。
- `DoomWasm.Native` は DOOM engine の C/WASM 境界を提供します。
- `DoomWeb` は browser runtime bridge、WebGPU surface、hosted asset manifest、
  public prompt scripts を担当します。
- `WebGpuComputeProvider` は GPU execution と texture surface を表します。

Provider code は fail-closed である必要があります。WAD/model/WASM の欠落、
WAD header 不正、WebGPU 不可、ブラウザ機能不足は、隠さず runtime status と
fallback state として報告します。

## Observer

Observer は runtime behavior を記録し説明します。action selection とは分離し、
telemetry が隠れた制御依存にならないようにします。

- `doom.status` は compact な state string を出力します。
- `doom.phase.check` は phase-focused snapshot を出力します。
- `copy.logs` と `Phase + Logs` は console、runtime JSON、static map hints を収集します。
- debug overlay は active detection regions と priority を描画します。
- `DoomOptimizer` は `artifacts/autoplay/` に Observer ROM telemetry を出力します。

Observer はゲームを決定しません。Operator を調整するための証拠を提供します。

## Operator

Operator は観測された状態を action に変換します。決定論的で、境界づけられ、
可能な限り記録済み state から replay 可能であるべきです。

- `IAutoplayStrategy` は `SensorFusion` を `ActionCommand` へ写像します。
- browser autoplay logic は `OpeningHome`、`FirstDoor`、`ComputerRoom` などの phase を routing します。
- cooperative scheduler は UI thread の応答性を守りながら tick/render/predict を進めます。
- action arbiter は、低優先度の移動が door/combat/emergency action を上書きしないようにします。

## DAG としての Runtime Flow

```text
User approval
  -> hosted asset validation
  -> doom.wasm instantiate
  -> DOOM1.WAD memory mount
  -> doom_init
  -> requestAnimationFrame loop
  -> doom_tick
  -> doom_render
  -> WebGPU texture or Canvas fallback
  -> perception sampling
  -> phase router
  -> autoplay action
  -> doom_input / doom_input_action
```

この runtime は opaque loop ではありません。各 arrow は観測、fail-closed、
test double 差し替えが可能な安定境界です。これは、Provider を edge に接続し、
Operator が Skeleton を実行する AIKernel 的な構造に対応します。

## Fail-Closed Invariants

- 明示的な同意前に protected asset をロードしない。
- 第三者バイナリ runtime artifact を source control に含めない。
- `doom.wasm` は Emscripten 生成物でなければならず、fake binary は許可しない。
- WebGPU は optional で、Canvas/CPU fallback は決定論的に動作する。
- AutoPlay action は DOOM input に限定する。
- デバッグ時は manual controls が AutoPlay を override できる。
- Sense Only mode は sensing と telemetry を維持しつつ AI input を抑止する。

これらの invariant は review surface です。consent bypass、missing asset の隠蔽、
低優先度 movement による critical Use action の上書きは、単なる gameplay
変更ではなく architecture violation として扱います。

## JavaScript 側が Web Control Loop を持つ理由

ブラウザは以下が frame cadence で交差する唯一の場所です。

- WebGPU texture ownership
- OffscreenCanvas / worker availability
- keyboard and virtual controller input
- DOOM framebuffer memory
- debug overlay rendering
- copied diagnostics
- consent-gated hosted assets

このデモでは、JavaScript 層が豊かな reference implementation を持つことを
意図しています。制約の強い UI 環境で AIKernel 風の observation と control を
実装する、移植可能な例として扱います。

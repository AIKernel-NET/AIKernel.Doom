# AIKernel.Doom ドキュメント

[English](README.md)

AIKernel.Doom は、DOOM を WASM プロセスとして AIKernel 風のランタイム上で
実行し、ブラウザ側の視野認知と AutoPlay 制御ループで監督するための
source-only デモリポジトリです。

この実装は、**AIKernel Development Guidelines に準拠したサンプル**として
意図的に整理されています。単なるゲームデモではなく、Interface-Led
Architecture、Provider-Observer-Operator の責務分離、DAG 風の制御フロー、
fail-closed な実行時ゲート、Observer ROM による証拠駆動の開発を、実際の
インタラクティブなワークロードに適用するための小さな参照実装です。

このドキュメントは、実装技術を理解し、他の AIKernel デモや Web/WASM
ランタイムへ応用したい開発者向けです。このリポジトリはデモサンプルであり、
DOOM の配布パッケージではありません。`DOOM1.WAD`、Bonsai GGUF モデル、
生成済み `doom.wasm` などの第三者ランタイム成果物はコミットしません。

## 読む順番

まず以下から読むことを推奨します。

1. [概要](overview-ja.md)
2. [アーキテクチャ](architecture-ja.md)
3. [WASM Runtime と ABI](wasm-runtime-ja.md)
4. [Web Runtime](web-runtime-ja.md)
5. [視野認知エンジン](vision-perception-engine-ja.md)
6. [AutoPlay Control Pipeline](autoplay-control-pipeline-ja.md)
7. [デバッグとテレメトリ](debugging-and-telemetry-ja.md)
8. [AutoPlay Optimizer](autoplay-optimizer-ja.md)
9. [開発方法論](development-methodology-ja.md)
10. [アセットとリリース運用](asset-and-release-operations-ja.md)

参照資料:

- [Provider](provider-ja.md)
- [CLI](cli-ja.md)

## 開発者向けの見取り図

このデモは AIKernel の開発ガイドラインに従い、Provider-Observer-Operator
モデルで責務を分離します。

- **Provider**: `DoomProvider`、`DoomWasm`、`DoomWeb`、ブラウザランタイム
  ブリッジが、WASM モジュールロード、WAD マウント、WebGPU テクスチャ所有、
  ユーザー同意、ホスト済みアセット manifest などの副作用境界を担当します。
- **Observer**: テレメトリ、デバッグ overlay、phase check、optimizer ROM 実行、
  コピー可能なログが、ゲーム状態を変更せずに実行状況を記録します。
- **Operator**: autoplay strategy、ブラウザ cooperative scheduler、
  phase router が、観測された状態を境界づけられた DOOM 入力へ変換します。

ガイドライン準拠の要点:

- `IAutoplayStrategy`、`SensorFusion`、`ActionCommand`、capability 名、
  WASM ABI export など、契約を明示する。
- 副作用を Provider 境界へ閉じ込める。
- phase routing を決定論的な制御 DAG として扱う。
- 大容量アセットのダウンロードを同意ゲートで fail-closed にする。
- テレメトリとスクリーンショットを Observer 証拠として扱う。
- 学習済みパラメータをハードコードではなく optimization profile として保存する。

## 主な再利用可能技術

- レガシー C ゲームループ向けの独立 WASM ABI
- ファイル I/O の代わりに memory-backed asset mount を使う構成
- 利用可能な場合の zero-copy WebGPU framebuffer binding
- 8-bit paletted framebuffer sampling
- 3x3 空間認知と multi-frame motion signature
- HUD からの状態抽出
- phase-routed control pipeline
- 人間参加型チューニングのためのワンクリック telemetry capture
- 永続化された optimization profile

## リポジトリ構成

```text
src/DoomWasm.Native/   Emscripten overlay と ABI 向け C コード
src/DoomWasm/          ROM metadata と asset resolution
src/DoomProvider/      AIKernel provider と autoplay contracts
src/DoomCapabilities/  doom.start / doom.stop / doom.status capability layer
src/DoomDemo/          CLI skeleton
src/DoomWeb/           Browser runtime source assets
src/DoomOptimizer/     Profile optimizer と web-runner harness
docs/                  Developer documentation
samples/               Source metadata only
```

## 意図的に含めないもの

このリポジトリには以下を含めません。

- commercial DOOM WAD
- shareware `DOOM1.WAD` バイナリ
- Bonsai model weights
- 生成済み `doom.wasm`
- browser cache
- optimizer telemetry artifacts

デプロイ運用者は、ランタイム成果物を別途ホストし、manifest、license notice、
checksum、runtime consent text を実ファイルに合わせて公開する必要があります。

# AIKernel.Doom リリースノート

[English](RELEASE_NOTES.md)

## 0.1.1-dev1

AIKernel.Doom の初回公開デモサンプルです。

主な内容:

- DOOM WASM ブラウザデモ向けの source-only な AIKernel.Doom リポジトリ。
- `.slnx` 形式の .NET 10 solution。
- `DoomProvider`、`DoomCapabilities`、`DoomWasm`、`DoomWasm.Native`、`DoomWeb`、`DoomOptimizer`、`DoomDemo` プロジェクト。
- AIKernel 風の Provider / Observer / Operator 分離。
- hosted WAD、model、WASM、manifest、demo metadata を承認後にロードする consent-gated runtime flow。
- doomgeneric 向け Emscripten native overlay。
- Canvas fallback を持つ browser WebGPU framebuffer path。
- Bonsai supervisor surface と AutoPlay control pipeline。
- detector overlay、manual move mode、sense-only mode、one-click telemetry capture を備えた phase-routed vision perception engine。
- すべての開発者向け docs に英語版と日本語版のペアを用意。

注意:

- このリポジトリはサンプル / デモプログラムであり、NuGet パッケージではありません。
- shared project level で `IsPackable=false` を設定しています。
- `DOOM1.WAD`、Bonsai GGUF model files、生成済み `doom.wasm` binary などの第三者 runtime artifact は意図的にコミットしません。
- 公開デプロイでは、これらの runtime asset を別途ホストし、consent text、manifest、checksum、license notice を hosted file と整合させる必要があります。

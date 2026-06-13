# AIKernel.Doom

[English README](README.md)

AIKernel.Doom は、AIKernel Semantic OS 向けの .NET 10 WASM デモです。AIKernel 風のブートプロンプトを表示し、明示的な承認があるまで停止し、Bonsai-1.7B supervisor を準備したうえで、DOOM を `doom.start`、`doom.stop`、`doom.status` から操作できる WASM プロセスとして公開します。

このリポジトリは DOOM パッケージではなく、デモ兼サンプルプログラムです。実装は、Interface-Led Architecture、Provider-Observer-Operator 分離、fail-closed なランタイム承認、WASM プロセス分離、WebGPU framebuffer 処理、Observer 駆動の AutoPlay 最適化を示す、AIKernel Development Guidelines 準拠の実装例として整理しています。

## ドキュメント

開発者向けドキュメントは次から始めてください。

```text
docs/README-ja.md
```

英語版は次にあります。

```text
docs/README.md
```

推奨の読み順:

- `docs/architecture-ja.md` - ガイドライン準拠の Provider / Observer / Operator 対応。
- `docs/wasm-runtime-ja.md` - Emscripten / WASI ABI と memory-backed WAD mount。
- `docs/web-runtime-ja.md` - ブラウザ worker、WebGPU、prompt、consent runtime。
- `docs/vision-perception-engine-ja.md` - JavaScript による 3x3 視野認知、HUD、motion、overlay engine。
- `docs/autoplay-control-pipeline-ja.md` - phase routed AutoPlay Operator 設計。
- `docs/debugging-and-telemetry-ja.md` - Sense Only、Phase + Logs、overlay、証跡コピー。
- `docs/development-methodology-ja.md` - human-in-the-loop な AI 開発フロー。
- `docs/autoplay-optimizer-ja.md` - profile optimization と Observer ROM runner。
- `docs/asset-and-release-operations-ja.md` - source-only release と asset boundary。

## 実行

```powershell
dotnet restore AIKernel.Doom.slnx
dotnet build AIKernel.Doom.slnx
dotnet run --project src/DoomDemo/DoomDemo.csproj
```

## CLI

```text
yes
aik help
aik help commands
aik help approval
aik status
aik providers list
aik capabilities list
aik exec run doom
aik capabilities invoke doom.start
aik capabilities invoke doom.stop
aik capabilities invoke doom.status
help
exit
quit
```

## 初回承認

起動時は、ユーザーが明示的に承認するまで停止します。

- 利用規約
- 約 300MB 以上のランタイムデータのダウンロード / キャッシュ
- Bonsai-1.7B モデルの取得
- DOOM WASM のロード

CLI は `hintWord> yes` を表示します。`yes`、`y`、`approve`、または `aik approve doom.runtime-download` を入力すると承認が記録され、準備処理が再開されます。拒否した場合、モデルや WASM のロード前にランタイムは停止したままになります。

## アセット

`samples/doom.rom` は `doom.wasm` を参照します。実際の DOOM WASM バイナリはコミットしません。`DoomWasmOptions.DoomWasmPath` でアセットパスを設定するか、ROM の横に `doom.wasm` を配置してください。ランタイムキャッシュは既定でユーザーのローカルアプリケーションデータディレクトリを使います。

デモ CLI では、大きなバイナリなしにブートフローを確認できるよう、小さな simulated WASM module を有効化しています。Provider / library 用途では simulation を無効化し、`DOOM_WASM_NOT_FOUND` を受け取れます。

## Web Runtime Assets

`src/DoomWeb` には、公開 Web デプロイで使うブラウザ prompt / runtime のソースアセットが含まれています。

- browser `WebGpuComputeProvider` bridge
- `doom.wasm` loader と framebuffer loop
- Bonsai AutoPlay supervisor logic
- public prompt bootstrap script
- terms and license notice page

`DOOM1.WAD`、Bonsai GGUF model、生成済み `doom.wasm` はリポジトリに含めません。これらはデプロイ運用者が別途ホストし、明示的なランタイム承認後にのみロードしてください。

## Native DOOM WASM Build

`src/DoomWasm.Native` は doomgeneric 向けの Emscripten overlay です。DOOM エンジン本体ソースは自動生成せず、`third_party` に直接コミットしません。

Emscripten を使う例:

```powershell
docker run --rm -v ${PWD}:/src emscripten/emsdk:latest `
  bash -lc "cd /src/AIKernel.Doom/src/DoomWasm.Native && ./build.sh"
```

## バージョン

このデモの開発版バージョンは、正典シリーズに合わせて `0.1.1-dev1` とします。

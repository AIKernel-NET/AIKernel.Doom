# アセットとリリース運用

[English](asset-and-release-operations.md)

AIKernel.Doom は source-only のサンプルとして公開します。第三者のランタイムファイルは、デプロイ運用者が別途ホストし、リポジトリには取り込みません。

## バージョン

このデモの公開準備バージョンは `0.1.1-dev1` です。DOOM はパッケージ化せず、AIKernel.NET 正典シリーズのサンプルプログラムとして GitHub で公開します。

## コミットするもの

リポジトリに含めるもの:

- C# Provider、Capability、ROM metadata、Demo CLI。
- Emscripten overlay、build script、patch、検証 script。
- Web runtime の JavaScript / HTML / CSS ソース。
- ドキュメント、デバッグ手順、最適化 methodology。
- サンプル metadata や小さな manifest。

リポジトリに含めないもの:

- `DOOM1.WAD`
- Bonsai GGUF model files
- 生成済み `doom.wasm`
- ブラウザキャッシュや運用ミラー済みバイナリ
- ライセンス上またはサイズ上、ソースリポジトリに含めるべきでない成果物

## 外部ランタイムアセット

公開サイトでは、次のようなパスに runtime asset を配置できます。

```text
/demo/doom/doom.wasm
/demo/doom/DOOM1.WAD
/demo/doom/doom.rom
/demo/doom/module.json
/models/bonsai1.7b/Bonsai-1.7B-Q1_0.gguf
/models/bonsai1.7b/LICENSE
/models/bonsai1.7b/NOTICE.txt
/models/bonsai1.7b/manifest.json
```

これらは、このソースリポジトリではなく、運用環境ミラー側で管理します。ライセンス、NOTICE、checksum、manifest の整合性はデプロイ運用者が検証してください。

## Consent Gate

ランタイムは、ユーザーが `yes` を入力するまで WAD、model、WASM などの大きな hosted asset をダウンロードしません。承認テキストでは「モデルを使う」ではなく、「このサイトからモデルをダウンロードする」ことを明記します。

この設計により、UX と法務上の表示を runtime の fail-closed boundary として扱えます。

## ライセンス表示

公開ページは次を表示する必要があります。

- DOOM engine source の GPL-2.0 派生成果物に関する説明。
- doomgeneric の source、patch、build script、license notice を提供する方針。
- shareware `DOOM1.WAD` の hosted asset と checksum manifest。
- Bonsai-1.7B model の Apache-2.0 license、NOTICE、upstream repository。
- 商用 WAD を同梱しないこと。

## リリース前チェックリスト

1. `dotnet build AIKernel.Doom.slnx` が成功する。
2. `node --check` で Web runtime script が構文エラーを出さない。
3. Source-only policy に反する大きな第三者 asset が含まれていない。
4. `docs/README.md` と `docs/README-ja.md` から開発者向け文書へ到達できる。
5. Web runtime の consent、license、checksum 表示が最新である。
6. `0.1.1-dev1` の位置づけが README とドキュメントに反映されている。

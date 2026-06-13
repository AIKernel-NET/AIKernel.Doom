# AIKernel.Doom 概要

[English](overview.md)

AIKernel.Doom は、DOOM を AIKernel Semantic OS 上の WASM プロセスとして
モデル化する軽量な公式デモリポジトリです。

同時に、AIKernel 開発ガイドラインに沿った技術サンプルでもあります。
コードとドキュメントは、Interface-Led Architecture、Provider-Observer-
Operator モデル、DAG 風の実行、fail-closed な同意境界を、リアルタイムな
ブラウザ/WASM ワークロードへ適用する例として整理されています。

このデモでは、契約、adapter、実行フローを意図的に分離します。

- `DoomWasm` は ROM metadata と asset resolution を担当します。
- `DoomProvider` は副作用を持つ Provider 動作と WASM process lifecycle を担当します。
- `DoomCapabilities` は `doom.start`、`doom.stop`、`doom.status` を公開します。
- `DoomDemo` は reference CLI Skeleton です。
- `DoomWeb` は public browser runtime source assets と prompt bootstrap を担当します。

ランタイムアセットの取得は、明示的なユーザー同意でゲートされます。
CLI は `hintWord=yes` で suspended 状態から始まり、approval 前でも
`aik help`、`aik status`、provider/capability listing などの標準コマンドは
利用できます。

`DoomWeb` は `DOOM1.WAD`、Bonsai model weights、生成済み `doom.wasm`
などの第三者バイナリを含みません。公開デプロイでは、それらのファイルを
リポジトリ外でミラーし、対応する manifest、checksum、consent text、
license notice を公開する必要があります。

開発者向けの読み順は、[ドキュメント](README-ja.md) から始め、
[アーキテクチャ](architecture-ja.md)、[Web Runtime](web-runtime-ja.md)、
[視野認知エンジン](vision-perception-engine-ja.md)、
[AutoPlay Control Pipeline](autoplay-control-pipeline-ja.md) へ進んでください。

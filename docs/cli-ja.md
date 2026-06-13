# CLI

[English](cli.md)

`DoomDemo` は、想定する AIKernel runtime interaction を模した小さな command shell です。ブラウザ版と同じ概念を使い、承認、provider、capability、status を確認できます。

## 基本コマンド

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

## 承認

起動直後は runtime download consent で停止します。`yes`、`y`、`approve`、または `aik approve doom.runtime-download` を入力すると、承認が記録されます。

承認されない限り、WAD、model、WASM などの大きな hosted runtime asset はロードしません。これは fail-closed な Provider 境界として設計されています。

## DOOM Cheat Command

ブラウザ prompt 側では、DOOM の cheat command をそのまま入力できるようにしています。

```text
iddqd
idkfa
idfa
idspispopd
idclip
```

これらは検証 UX のための機能です。戦闘アルゴリズムの開発では、無敵化や弾補充を行い、検知器や phase 遷移を安全に観察できます。

## デバッグ補助

Web runtime では、CLI 入力のタイムロスを避けるため、`doom.phase.check` と Copy Logs を 1 ボタンで実行する操作を用意しています。敵の攻撃を受ける場面では、コンソールに長いコマンドを入力するよりも、ボタンで即座に証跡を採取する方が適しています。

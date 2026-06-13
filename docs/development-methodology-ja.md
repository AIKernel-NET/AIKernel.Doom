# 開発方法論

[English](development-methodology.md)

AIKernel.Doom は、単なるゲーム移植ではなく、human-in-the-loop な制御システム実験として開発しています。人間が観察し、AI が制御し、Observer が証跡を残し、Profile が改善を永続化する流れを重視しています。

## 基本思想

このデモでは、AIKernel Development Guidelines の考え方をブラウザ上のインタラクティブ workload に適用しています。

- Interface-Led Architecture: `IAutoplayStrategy`、`SensorFusion`、`ActionCommand`、WASM ABI、capability 名を先に固定する。
- Provider-Observer-Operator: 副作用、観測、制御を分ける。
- Fail-Closed: 承認、asset load、runtime start、WASM input を安全側に閉じる。
- Deterministic Routing: phase と detector の組み合わせで、推論の実行範囲を制御する。
- Evidence-Driven Development: 成功 / 失敗をログとスクリーンショットで確認する。
- Profile Persistence: 学習結果を profile として外部化し、Web runtime に読み込ませる。

## なぜ phase pipeline が必要か

初期の AutoPlay は、敵検知、壁回避、ドア探索、スタック回避が同時に動きました。その結果、次のような問題が起きました。

- 開幕で敵検知が割り込む。
- ドア前で回避ロジックが Use を上書きする。
- Use 連打でドアを閉める。
- 橋で戦闘ロジックが暴発する。
- 出口部屋で古い探索ルールが残る。

これを避けるため、まず phase を確定し、phase ごとの detector と action を固定します。下流の推論は、上流の phase が確定するまで走りません。

## 開発フロー

1. 目標を 1 つに絞る。
2. その目標に必要な phase と detector を決める。
3. Sense Only で検知器だけを確認する。
4. Manual Move で人間が移動し、AI の検知と Use / Fire を確認する。
5. AutoPlay を有効化し、行動の競合を見る。
6. Copy Logs と screenshot を保存する。
7. 誤判定を分類する。
8. threshold、priority、cooldown、phase transition を修正する。
9. profile に保存する。
10. 同じ地点で再検証する。

## 目標の段階化

DOOM E1M1 は、一気にクリアを目指すより、中間目標を明確にした方が安定します。

```text
1. 開幕青床エリアから通路入口を見つける
2. 第一ドアに到達する
3. 第一ドアを開ける
4. コンピュータ制御室へ入る
5. 敵を 1 体倒す
6. 第二ドアへの通路へ入る
7. ジグザグ橋を渡る
8. 第二ドアを開ける
9. 中央ホールへ到達する
10. 最終部屋へ到達する
11. 出口スイッチを Use する
```

各目標で必要な検知器を変え、不要な検知器を OFF にします。これは AIKernel の routing / pipeline の考え方と同じです。

## 人間の役割

人間は、AI の代わりにプレイするのではなく、観測器と教師として動きます。

- どの画面がどの phase かをラベル付けする。
- 誤検知をスクリーンショットで示す。
- Manual Move で正しい位置へ移動し、検知器の反応を見る。
- Use や Fire が人間操作では効くかを確認する。
- `doom.phase.check` とログを添えて報告する。

このプロセスにより、AI は「画像の見た目」だけでなく、「この状態では何を目的にすべきか」という意味情報を獲得していきます。

## JavaScript 実装の価値

今回の JavaScript 側実装は、単なる Web UI ではありません。以下の要素は他の AIKernel demo にも転用できます。

- WebGPU texture を入力源とする zero-copy vision path。
- CPU fallback summary。
- 3x3 region quantization。
- multi-frame motion analysis。
- HUD semantic decoding。
- debug overlay with detector routing。
- manual override while AI remains active。
- phase check + log capture UX。
- profile-driven parameter tuning。

これらは、WASM workload を AIKernel 風の Provider / Observer / Operator モデルで制御する実装例です。

## 成功条件の扱い

成功判定は、見た目だけで増やさないようにします。

第一ドアなら:

- Use が pulse された。
- door transition が armed された。
- dark area または map hint と一致した。
- phase が ComputerRoom に移った。

敵撃破なら:

- enemy zone と一致した。
- enemy confidence が上がった。
- burst fire が発生した。
- enemy drop または threat disappearance が確認された。
- ammo / health と矛盾しない。

このように AND 条件を増やすことで、誤判定による milestone 更新を避けます。

## 300 秒クリアへの道筋

最初の到達目標は「300 秒以内の E1M1 クリア」です。世界記録のような SR40 / SR50 は初期要件に含めず、まずは安定した意味ベース制御を優先します。

安定後に、strafe running、combat orbit、bridge lane keeping、shortcut path を profile として追加できます。

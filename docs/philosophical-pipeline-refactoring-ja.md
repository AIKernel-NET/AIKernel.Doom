# AIKernel.Doom 哲学的パイプライン移行メモ

Doom 側で段階導入する AIKernel pipeline の整理方針です。

```text
Aisthesis -> Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe
```

## 今回のパッチ

- `DET` は旧 UI/API 互換ラベルとして扱います。
- debug sensor panel は `Aisthesis`, `Noesis`, `Krisis`, `Kinesis` の
  4 カード構造で描画します。
- 旧 DET に表示していた event extraction は `Phainesis` に寄せます。
- `autoplay/cognition/phainesis.js` に Phainomenon の結果構造と、
  Bonsai の debug/status 出力で使う active event projection を移しました。
- looming, damage localization, trap, stuck, entropy, item-backtrack,
  sensor-recovery projection などの event extraction 本体の第一弾も
  `phainesis.js` に移しました。Bonsai は Doom 固有の grace 条件を渡すだけに
  寄せています。
- `Zoe` は HP-based veto を担当します。`health` detector は `HP Veto`
  として表示します。
- `autoplay/cognition/zoe.js` に health-only action audit を移しました。
  Topos feedback mapping では Kinesis に health flag を渡さず、
  Bonsai 側で `Topos -> Kinesis` 後に `{ action, health }` を Zoe に通します。
- `autoplay/cognition/kairos.js` に Kinesis が消費する priority-axis packet
  を切り出しました。Kinesis は Topos weight や observed score を再計算せず、
  `{ action, decisionVector, kairos }` を action vector に写像するだけにします。
- `Kairos.resolveMonitoringState` に relocalization, combat watch, use probe,
  recovery, caution boost などの abnormal-state monitoring を移しました。
  `Topos.resolveKairos` は互換 alias のみにします。
- first-door route advancement と contact-use readiness は Kairos packet 経由で
  運び、action generator が raw observed governance score を読まないようにします。
- Doom retry key sequence は Doom 固有の input choreography なので、
  汎用 Zoe audit ではなく `doom-retry-dispatch.js` に残します。
- `Hodos` はトップレベルカードから外します。Compass evidence は
  Aisthesis の raw sensor として保持し、Nous/Topos 側で解釈します。
- `PhilosophicalPipelinePackets.cs` に Doom 側暫定 packet shape を追加しました。
  低層 data packet は concept-elevation naming rule に合わせ、
  `SensorFrame`, `MeaningVectorPacket`, `PriorityAxes`, `ActionVector`
  などの中立名にしています。
- `PhilosophicalPipelineInterfaces.cs` に `IPhainesis`, `INous`, `ITopos`,
  `IKairos`, `IKinesis`, `IZoe` の Doom 側暫定契約を追加しました。
- `PhilosophicalAutoplayPipeline` は既存 autoplay の挙動を書き換えず、
  `Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe` の実行順だけを
  固定する薄い orchestrator です。
- `LegacyDetAdapter.cs` は obsolete DET compatibility interface を canonical
  packet / interface file から分離します。

## 互換性

- `data-detection-toggle` の key は維持します。
- `ILegacyDetAdapter` は `[Obsolete]` とし、移行アダプタ用途に限定します。
- このパッチでは deterministic DSL の挙動は変更しません。
- `createNousDetectorResult` は互換 factory として残しますが、
  module load 済みであれば `Phainesis.createPhainomenon` に委譲します。
- runtime status は `phainomenon` を event-extraction packet の主名として
  公開します。既存 debug/API consumer 向けに `nousDetectorResult` は互換 alias
  として残します。
- `Topos.resolveKairos` は既存 consumer 向けの互換 alias として残しますが、
  実装本体は `Kairos.resolveMonitoringState` に置きます。新しい priority-axis
  arbitration は `Kairos.resolvePriorityAxes` を経由します。

## 次の抽象化先

これらの契約は Doom 側の暫定配置です。次回のライブラリアップデートで
`AIKernel.Control` または `AIKernel.Wasm` へ product-neutral な名称で移植します。

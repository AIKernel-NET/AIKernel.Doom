# デバッグとテレメトリ

[English](debugging-and-telemetry.md)

このデモは Observer-first の開発ループで育てています。制御判断は、画面、phase、detector、action、profile、ログ、スクリーンショットの証跡と結びつけて検証します。

## デバッグ UI

Web runtime には次のデバッグ操作があります。

- `Copy Logs`: 現在のコンソールログを clipboard へコピー。
- `Phase + Logs`: `doom.phase.check` と Copy Logs を 1 回で実行。
- `Overlay`: 検知 overlay の表示切り替え。
- `Manual Move`: AutoPlay を維持しつつ、移動だけ手動化。
- `Sense Only`: 検知だけ実行し、入力を出さない。
- `DET:` buttons: `Motion`、`Objective`、`Door`、`Wall`、`Enemy`、`Computer`、`Foot`、`HUD` の ON / OFF。

検知ボタンは overlay の枠線色に合わせた色を持ち、OFF のときはグレーになります。これにより、現在の phase でどの detector が使われているかを視覚的に確認できます。

## Overlay

Overlay はデフォルト ON です。開発者は、AI がどの領域を見て、何を検知し、どの目的へ向かっているかを直接画面上で確認できます。

表示する情報の例:

- 3x3 region
- motion score
- door confidence
- enemy confidence
- objective
- phase
- wall / corner / foot obstacle
- HUD health / ammo

高優先度の検知は濃く表示し、低優先度の補助情報は薄く表示します。これにより、action arbiter がどの判断を優先しているかを把握できます。

## Runtime Status

`doom.status` は、現在の実行状態を 1 行の telemetry として出力します。

代表的なフィールド:

- `runtime`
- `wasm`
- `wad`
- `model`
- `loop`
- `autoplay`
- `pipeline`
- `strategy`
- `vision`
- `zeroCopy`
- `safety`
- `mobility`
- `milestones`
- `darkArea`
- `court`
- `gap`
- `corridor`
- `bridge`
- `enemy`
- `regions9`
- `motion9`
- `health`
- `ammo`
- `fps`
- `gpuWait`

この形式は、人間が読むだけでなく、optimizer runner が Observer ROM として解析することも想定しています。

## 証跡採取

誤判定を報告するときは、次の 3 点を揃えると再現性が高くなります。

1. スクリーンショット。
2. Copy Logs の出力。
3. 現在の操作モードと目的。

例:

```text
ドア前にいるが開けない。
Manual Move では開くため、AutoPlay の移動入力が Use を阻害している可能性がある。
```

このような観察と `doom.status` を組み合わせることで、phase rule と detector threshold を安全に修正できます。

## よくある失敗

### ドア前で回転して戻る

`corner-exit` や `wall-detach` が `door-probe` より強い可能性があります。Door phase では、移動回避を弱め、Use discipline を優先します。

### Use 連打でドアが閉まる

Use は pulse + cooldown で制御します。開いた直後に再度 Use を送らないようにします。

### コンピュータ制御室を誤検知する

色だけではなく、dark area、red light、map hint、transition、enemy alert を組み合わせます。

### 敵を壁と誤判定する

Enemy detector は全領域で検知し、中央領域に入ったときだけ発砲します。第一ドア前では enemy detector を OFF にします。

### 開幕で迷走する

OpeningHome phase では、右奥スキャン、青床、通路入口 signature、中庭救済を使い、戦闘と Use を OFF にします。

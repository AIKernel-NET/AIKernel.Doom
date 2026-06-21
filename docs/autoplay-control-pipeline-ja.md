# AutoPlay Control Pipeline

[English](autoplay-control-pipeline.md)

AutoPlay engine は、観測された DOOM の状態を bounded input action に変換するブラウザ側 Operator です。初期のルール集合は、検知が未確定のまま戦闘、ドア、壁回避が競合する問題を起こしたため、現在は phase routed pipeline と action arbiter に寄せています。

## Dynamic Pipeline DSL

tuning 可能な policy surface は versioned profile DSL に移行しています。Web profile は調整値をすべて `parameters` に置き、必要に応じて `pipeline.stages[]` を定義します。各 stage は deterministic な `when` 条件式と `action` 式 map を持ちます。

C# strategy はこの DSL を有限な dynamic pipeline に compile し、WASM controller ABI も同じ parameter 名を読むため、browser JavaScript は長期的には policy 本体ではなく state/action bridge に寄せられます。

最初の DSL version は次の通りです。

```text
aikernel.doom.autoplay.pipeline/v1
```

式は `health < $lowHealthThreshold`、`context == wall`、`depthSig <= $doorUseDepth` のような小さな deterministic expression に限定します。AutoPlayAI の追加 tuning parameter は bridge shape を変えずに `parameters` 配下へ追加できます。

DSL は次の 3 つの control surface を持ちます。

- `semanticMemory`: `door`、`corridor`、`enemy`、`safe-zone`、`bridge`、`computer-room` などの安定した記号入力。
- `objectives`: `open-door`、`reach-bridge`、`avoid-enemy`、`enter-computer-room` など、目的から手段へ routing するための定義。
- `arbitration`: final action を deterministic に選ぶための evidence weight、threshold、priority。

`AIKernel.Control -> AIKernel.Wasm` adapter には state packet 経由で semantic score を渡し、返却値には選択された pipeline stage と objective を含めます。JavaScript は download/UI/state bridge を担当し、deterministic control policy は共有 Control/WASM runtime 側へ移せる構成にします。

## 目的

パイプラインの目的は、低レベル入力を直接積み上げることではなく、「今どの意味的フェーズにいるか」を先に確定し、そのフェーズで許可された検知器と行動だけを実行することです。

例:

- 開幕は通路探索だけに集中し、敵検知や Use 判定を無効化する。
- 第一ドア前では、回避ロジックより door-facing と Use を優先する。
- コンピュータ制御室では、戦闘検知を有効化し、青床 / 中庭ロジックを無効化する。
- 橋では、green hazard と lane keeping を優先する。
- 出口部屋では、exit switch 用の Use を最優先する。

## Phase

主要 phase:

```text
OpeningHome
CorridorFound
CorridorTransit
FirstDoor
ComputerRoom
Bridge
SecondDoor
CentralHall
ExitRoom
ExitSwitch
```

各 phase は、目的、使用する detector、無効化する detector、移動方針、Use / Fire の許可状態を持ちます。

## Detector Routing

Detector は常に全部動かすのではなく、phase に応じて ON / OFF します。

- `Motion`: 3x3 motion、forward progress、obstacle motion。
- `Objective`: 現在の目的と milestone。
- `Door`: door signature、Use visibility、door transition。
- `Wall`: wall pressure、corner、stuck、detach。
- `Enemy`: enemy color cluster、center lock、combat alert。
- `Computer`: dark area、computer room、red light、blue panel。
- `Foot`: foot obstacle、barrel / column の詰まり。
- `HUD`: health、ammo、face signal。

UI では、検知器が有効なときだけ枠やラベルを表示します。優先度の高い検知は濃く、補助的な検知は薄く表示することで、Operator がどのシグナルを採用しているかを開発者が確認できます。

## Action Arbiter

各モジュールは直接入力を上書きせず、「この action を採用したい」という提案を出します。最後に arbiter が priority に基づいて 1 つの action packet に統合します。

優先順位の例:

```text
Level 4: 死亡 / watchdog / hard reset
Level 3: hard stuck escape
Level 2: urgent door / exit switch / combat lock
Level 1: phase objective movement
Level 0: background wall hug / drift correction
```

これにより、ドア前で `corner-exit` が `Use` を潰す、戦闘前に探索ロジックが暴発する、といった shadowing を抑止します。

## Door Use Discipline

DOOM の Use は距離と向きに依存します。さらに連打すると、ドアを開けた直後に閉める動作になり得ます。そのため、door action は次のように分離します。

1. `approach`: ドアに届く距離まで前進する。
2. `align`: 旋回だけを行い、Use は押さない。
3. `settle`: 角度と motion が落ち着くまで数 tic 待つ。
4. `pulse`: Use を短い pulse として 1 回だけ送る。
5. `cooldown`: transition が確認されるまで再入力を抑制する。
6. `confirm`: dark area / map hint / vision transition で phase を進める。

この制御により、移動コマンドが Use の当たり判定を壊す問題と、Use 連打で閉めてしまう問題を分離できます。

## Manual Move と Sense Only

デバッグ時には、AutoPlay を止めずに移動だけを手動化できる `Manual Move` mode を使います。この状態では sensing、Use、Fire は有効なまま、移動コマンドだけを人間が担当できます。

`Sense Only` は、全検知を動かしつつ入力を出さない検証モードです。phase 判定や overlay が正しいかを、ゲーム状態を壊さず確認できます。

## ログ方針

目的や phase の更新は overlay と state 表示に反映しますが、頻繁なコンソールログは避けます。コンソールスクロールがゲーム画面の観察を阻害するためです。証跡が必要な場合は `Phase + Copy Logs` の 1 ボタン操作で、現在の phase check とログコピーをまとめて実行します。

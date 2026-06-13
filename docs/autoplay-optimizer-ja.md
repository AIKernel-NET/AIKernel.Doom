# AutoPlay Optimizer

[English](autoplay-optimizer.md)

AIKernel.Doom には、profile-driven tuning のための optimizer runner skeleton が含まれています。目的は、AutoPlay のパラメータをソースコードに固定するのではなく、観測、解析、profile 保存、Web runtime への反映というループで改善できるようにすることです。

## Profile

最適化 profile は、phase、detector threshold、action priority、cooldown、stuck 判定、door pulse、combat burst などの値を保持します。

推奨される配置:

```text
src/DoomProvider/Autoplay/Profiles/
```

Web 配置時は、最終 profile を `src/DoomWeb/wwwroot` 側の runtime asset として読み込み、同じロジックをブラウザで再現します。

## Observer ROM

最適化ループでは、各 run の telemetry を Observer ROM として扱います。

- phase 遷移
- milestone
- stuck count
- door opened count
- enemy encounter
- health / ammo
- screenshot evidence
- copied logs
- profile version

これにより、誤判定した run と成功した run を後から比較できます。

## 最初の目標

初期の optimization target は、E1M1 の第一ドアを安定して開けることです。第一ドア到達前は敵が出ないため、戦闘ロジックは OFF にし、通路探索、door-facing、Use discipline に集中します。

次の target は、コンピュータ制御室への安定到達、敵 1 体撃破、中央ホール到達、最終部屋到達、300 秒以内のステージクリアです。

## 実行の考え方

1. Native / browser runtime を起動する。
2. Profile を読み込む。
3. 目標 milestone を指定する。
4. Run を実行し、telemetry と screenshot を保存する。
5. 失敗理由を分類する。
6. Threshold または phase rule を更新する。
7. Profile を保存する。
8. Web runtime に反映する。

この形にすると、学習済みの改善が一時的な JS 修正として消えず、再利用可能な tuning artifact として残ります。

# Doom Provider

[English](provider.md)

`DoomProvider` は、AIKernel 風の Provider 境界として DOOM WASM のライフサイクルを公開します。WASM module load、runtime start、process registry、capability invocation、health probe などの副作用をここに閉じ込めます。

## Match / Result Semantics

Provider は例外や手続き的な if 分岐で失敗を握りつぶさず、`Result` / `Option` の意味論に沿って値を伝播します。

例:

```csharp
return loader.Load(path).Bind(module =>
    runtime.TryStartAsync(module, options)
);
```

Process registry も、成功値を取り出して再ラップせず、`registry.Register(process)` の結果をそのまま返します。

Capability 呼び出しは、process lookup を `ToResult` で明示的に失敗化し、その後 `Bind` で invocation へつなぎます。

```csharp
return runtime.GetProcess(id)
    .ToResult("not found")
    .Bind(proc => proc.Invoke(...));
```

Health probe は、runtime check を `Map` で ProviderHealth に変換します。

```csharp
return runtime.Check().Map(ok => new ProviderHealth(ok));
```

## 役割

Provider は次を担当します。

- WASM runtime の準備。
- WAD / ROM / manifest の解決。
- process registration。
- `doom.start`、`doom.stop`、`doom.status` の capability routing。
- fail-closed な承認状態の尊重。
- runtime health の報告。

Provider は AutoPlay の判断を直接持ちません。AutoPlay は Operator、telemetry は Observer に分離します。

## ガイドライン準拠

この設計により、AIKernel.Core と同じ意味論で DOOM runtime context が伝播します。Capability routing は DAG として読みやすくなり、例外レスで fail-closed なデモを構成できます。

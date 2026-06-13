# Doom Provider

[日本語](provider-ja.md)

`DoomProvider` implements the real AIKernel interfaces available in this workspace:

- `AIKernel.Abstractions.Providers.IProvider`
- `AIKernel.Wasm.Runtime.Abstractions.IWasmProcessProvider`

The prompt mentioned `IProviderHealth`; the available contract is `IProviderHealthProbe` through `IProvider`, so health is implemented through `GetHealthAsync`.

Provider states are fail-closed:

`NotInitialized -> AwaitingConsent -> DownloadingModel -> LoadingWasm -> Ready -> Running -> Stopped`

Invalid transitions return `Result<T>` failures with explicit error codes.

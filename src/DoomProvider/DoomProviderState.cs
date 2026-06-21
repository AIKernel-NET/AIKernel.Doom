namespace AIKernel.Doom.Provider;
/// <summary>
/// EN: Defines DoomProviderState values.
/// EN: Documentation for public API. JA: DoomProviderState の値を定義します。
/// </summary>

public enum DoomProviderState
{
    NotInitialized,
    AwaitingConsent,
    DownloadingModel,
    LoadingWasm,
    Ready,
    Running,
    Stopped,
    Failed
}

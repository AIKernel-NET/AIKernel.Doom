namespace AIKernel.Doom.Provider;

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

namespace AIKernel.Doom.Provider;
/// <summary>
/// EN: Represents DoomProviderStatus.
/// EN: Documentation for public API. JA: DoomProviderStatus を表します。
/// </summary>

public sealed record DoomProviderStatus(
    DoomProviderState State,
    bool WasmLoaded,
    bool ProcessRunning,
    DoomBackendKind Backend,
    bool ModelReady,
    bool IsSimulatedWasm,
    string ProcessState,
    string SupervisorState,
    IReadOnlyList<string> HiddenCheatCommands,
    string DisplayText);

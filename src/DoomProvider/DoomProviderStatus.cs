namespace AIKernel.Doom.Provider;

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

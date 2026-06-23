namespace AIKernel.Doom.Provider;

/// <summary>
/// [EN] Defines the <c>DoomProviderStatus</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomProviderStatus</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="State">
/// [EN] Supplies the <c>State</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>State</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="WasmLoaded">
/// [EN] Supplies the <c>WasmLoaded</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>WasmLoaded</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ProcessRunning">
/// [EN] Supplies the <c>ProcessRunning</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ProcessRunning</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Backend">
/// [EN] Supplies the <c>Backend</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Backend</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ModelReady">
/// [EN] Supplies the <c>ModelReady</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ModelReady</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="IsSimulatedWasm">
/// [EN] Supplies the <c>IsSimulatedWasm</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>IsSimulatedWasm</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ProcessState">
/// [EN] Supplies the <c>ProcessState</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ProcessState</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="SupervisorState">
/// [EN] Supplies the <c>SupervisorState</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>SupervisorState</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="HiddenCheatCommands">
/// [EN] Supplies the <c>HiddenCheatCommands</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>HiddenCheatCommands</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="DisplayText">
/// [EN] Supplies the <c>DisplayText</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>DisplayText</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
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

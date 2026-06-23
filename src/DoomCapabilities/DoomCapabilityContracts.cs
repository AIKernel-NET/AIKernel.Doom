namespace AIKernel.Doom.Capabilities;

using AIKernel.Dtos.Capabilities;
using AIKernel.Enums;

/// <summary>
/// [EN] Provides the canonical capability descriptors that expose Doom start, stop, and status operations to AIKernel tooling.
/// [JA] AIKernel tooling に Doom の start、stop、status operation を公開する canonical capability descriptor を提供します。
/// </summary>
/// <remarks>
/// [EN] Keep descriptor identifiers stable because ROM metadata, capability manifests, replay tooling, and hosted demos bind these names.
/// [JA] ROM metadata、capability manifest、replay tooling、hosted demo がこれらの名前へ bind するため、descriptor identifier は安定させてください。
/// </remarks>
public static class DoomCapabilityContracts
{
    /// <summary>
    /// [EN] Returns all Doom capability descriptors in the order expected by manifest and integration tests.
    /// [JA] manifest と integration test が期待する順序で、すべての Doom capability descriptor を返します。
    /// </summary>
    public static IReadOnlyList<CapabilityModuleDescriptor> All()
        => [Start(), Stop(), Status()];

    /// <summary>
    /// [EN] Creates the descriptor for starting the Doom runtime.
    /// [JA] Doom runtime を開始する descriptor を作成します。
    /// </summary>
    public static CapabilityModuleDescriptor Start()
        => Descriptor("doom.start", "Start DOOM", "doom.start");

    /// <summary>
    /// [EN] Creates the descriptor for stopping the Doom runtime.
    /// [JA] Doom runtime を停止する descriptor を作成します。
    /// </summary>
    public static CapabilityModuleDescriptor Stop()
        => Descriptor("doom.stop", "Stop DOOM", "doom.stop");

    /// <summary>
    /// [EN] Creates the descriptor for reading the Doom runtime status.
    /// [JA] Doom runtime status を読み取る descriptor を作成します。
    /// </summary>
    public static CapabilityModuleDescriptor Status()
        => Descriptor("doom.status", "DOOM status", "doom.status");

    private static CapabilityModuleDescriptor Descriptor(string id, string name, string operation)
        => new(
            id,
            name,
            CapabilityModuleKind.ManagedAssembly,
            CapabilityInvocationMode.Direct,
            "0.1.3",
            typeof(DoomCapabilityInvoker).FullName,
            null,
            null,
            [operation],
            [],
            new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["provider"] = "aikernel.doom.provider",
                ["runtime"] = "wasm",
                ["process"] = "doom",
                ["schema.autoplayProfile"] = "https://aikernel.net/schemas/doom/autoplay-profile.schema.json",
                ["schema.autoplayState"] = "https://aikernel.net/schemas/doom/autoplay-state.schema.json",
                ["schema.autoplayAction"] = "https://aikernel.net/schemas/doom/autoplay-action.schema.json",
                ["schema.autoplayStatus"] = "https://aikernel.net/schemas/doom/autoplay-status.schema.json"
            });
}

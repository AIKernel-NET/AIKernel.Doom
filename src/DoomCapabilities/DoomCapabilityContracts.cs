namespace AIKernel.Doom.Capabilities;

using AIKernel.Dtos.Capabilities;
using AIKernel.Enums;
/// <summary>
/// EN: Represents DoomCapabilityContracts.
/// EN: Documentation for public API. JA: DoomCapabilityContracts を表します。
/// </summary>

public static class DoomCapabilityContracts
{
    /// <summary>
    /// EN: Executes All.
    /// EN: Documentation for public API. JA: All を実行します。
    /// </summary>
    public static IReadOnlyList<CapabilityModuleDescriptor> All()
        => [Start(), Stop(), Status()];
    /// <summary>
    /// EN: Executes Start.
    /// EN: Documentation for public API. JA: Start を実行します。
    /// </summary>

    public static CapabilityModuleDescriptor Start()
        => Descriptor("doom.start", "Start DOOM", "doom.start");
    /// <summary>
    /// EN: Executes Stop.
    /// EN: Documentation for public API. JA: Stop を実行します。
    /// </summary>

    public static CapabilityModuleDescriptor Stop()
        => Descriptor("doom.stop", "Stop DOOM", "doom.stop");
    /// <summary>
    /// EN: Executes Status.
    /// EN: Documentation for public API. JA: Status を実行します。
    /// </summary>

    public static CapabilityModuleDescriptor Status()
        => Descriptor("doom.status", "DOOM status", "doom.status");

    private static CapabilityModuleDescriptor Descriptor(string id, string name, string operation)
        => new(
            id,
            name,
            CapabilityModuleKind.ManagedAssembly,
            CapabilityInvocationMode.Direct,
            "0.1.0",
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

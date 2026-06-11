namespace AIKernel.Doom.Capabilities;

using AIKernel.Dtos.Capabilities;
using AIKernel.Enums;

public static class DoomCapabilityContracts
{
    public static IReadOnlyList<CapabilityModuleDescriptor> All()
        => [Start(), Stop(), Status()];

    public static CapabilityModuleDescriptor Start()
        => Descriptor("doom.start", "Start DOOM", "doom.start");

    public static CapabilityModuleDescriptor Stop()
        => Descriptor("doom.stop", "Stop DOOM", "doom.stop");

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
                ["process"] = "doom"
            });
}

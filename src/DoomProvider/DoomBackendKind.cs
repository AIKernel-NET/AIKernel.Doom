namespace AIKernel.Doom.Provider;

public enum DoomBackendKind
{
    Unknown,
    WebGpu,
    CpuFallback,
    WebGpuComputeProvider,
    WebGpuComputeCpuFallback
}

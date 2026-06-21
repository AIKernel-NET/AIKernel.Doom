namespace AIKernel.Doom.Provider;
/// <summary>
/// EN: Defines DoomBackendKind values.
/// EN: Documentation for public API. JA: DoomBackendKind の値を定義します。
/// </summary>

public enum DoomBackendKind
{
    Unknown,
    WebGpu,
    CpuFallback,
    WebGpuComputeProvider,
    WebGpuComputeCpuFallback
}

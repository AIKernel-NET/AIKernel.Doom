namespace AIKernel.Doom.Provider;

/// <summary>
/// EN: Describes a Doom scenario benchmark carrier without executing the scenario.
/// JA: scenario を実行せず Doom scenario benchmark carrier を記述します。
/// </summary>
public sealed record DoomScenarioBenchmark
{
    /// <summary>EN: Gets the benchmark identifier. JA: benchmark 識別子を取得します。</summary>
    public string BenchmarkId { get; init; } = string.Empty;

    /// <summary>EN: Gets the scenario identifier. JA: scenario 識別子を取得します。</summary>
    public string ScenarioId { get; init; } = string.Empty;

    /// <summary>EN: Gets whether WebGPU-backed execution is expected. JA: WebGPU-backed execution が期待されるかどうかを取得します。</summary>
    public bool RequiresWebGpu { get; init; }

    /// <summary>EN: Gets whether CTG-ROM decision support is expected. JA: CTG-ROM decision support が期待されるかどうかを取得します。</summary>
    public bool RequiresCtgRom { get; init; }

    /// <summary>EN: Gets benchmark metadata. JA: benchmark metadata を取得します。</summary>
    public IReadOnlyDictionary<string, string> Metadata { get; init; } =
        new Dictionary<string, string>(StringComparer.Ordinal);
}

/// <summary>
/// EN: Creates Doom scenario benchmark descriptors for tooling and demos.
/// JA: tooling / demo 向け Doom scenario benchmark descriptor を作成します。
/// </summary>
public sealed class DoomScenarioBenchmarkCatalog
{
    /// <summary>
    /// EN: Lists deterministic benchmark descriptors for Doom demo integration.
    /// JA: Doom demo integration 向け deterministic benchmark descriptor を列挙します。
    /// </summary>
    /// <returns>EN: Benchmark descriptors. JA: benchmark descriptor を返します。</returns>
    public IReadOnlyList<DoomScenarioBenchmark> List()
        =>
        [
            new()
            {
                BenchmarkId = "doom.webgpu.ctg.spatial.v1",
                ScenarioId = "doom.e1m1.spatial-cognition",
                RequiresWebGpu = true,
                RequiresCtgRom = true,
                Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["purpose"] = "Validate WebGPU perception, spatial cognition, HUD DTOs, and CTG-ROM control integration."
                }
            }
        ];
}

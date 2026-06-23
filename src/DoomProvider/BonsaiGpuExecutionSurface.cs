namespace AIKernel.Doom.Provider;

using System.Buffers.Binary;
using AIKernel.Common.Results;
using AIKernel.Wasm.Comput;

/// <summary>
/// [EN] Defines the <c>BonsaiGpuExecutionSurface</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>BonsaiGpuExecutionSurface</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class BonsaiGpuExecutionSurface
{
    private const int StateVectorBytes = 16;

    private readonly WebGpuComputeProvider _provider;
    private bool _initialized;
    /// <summary>
    /// EN: Executes BonsaiGpuExecutionSurface.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] BonsaiGpuExecutionSurface を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public BonsaiGpuExecutionSurface(DoomProviderOptions options)
    {
        _provider = new WebGpuComputeProvider(new WebGpuComputeSettings
        {
            ProviderId = "doom.bonsai.webgpu",
            Name = "AIKernel.Doom Bonsai WebGPU Provider",
            AdapterProfile = "bonsai-1.7b-q1_0-webgpu",
            BackendName = "WebGpuComputeProvider",
            ForceCpuFallback = !options.PreferWebGpu
        });
    }
    /// <summary>
    /// EN: Gets BackendKind.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] BackendKind を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public DoomBackendKind BackendKind
        => _provider.UsingCpuFallback ? DoomBackendKind.WebGpuComputeCpuFallback : DoomBackendKind.WebGpuComputeProvider;
    /// <summary>
    /// EN: Gets BackendName.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] BackendName を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public string BackendName
        => _provider.UsingCpuFallback ? "WebGpuComputeProvider(cpu-fallback)" : "WebGpuComputeProvider(webgpu)";
    /// <summary>
    /// EN: Executes InitializeAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] InitializeAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>InitializeAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>InitializeAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task InitializeAsync()
    {
        if (_initialized)
        {
            return;
        }

        await _provider.InitializeAsync().ConfigureAwait(false);
        _initialized = true;
    }
    /// <summary>
    /// EN: Gets EvaluateAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] EvaluateAsync を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>EvaluateAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>EvaluateAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="state">
    /// [EN] Supplies the <c>state</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>state</c> value です。
    /// </param>
    /// <param name="issuedCommands">
    /// [EN] Supplies the <c>issuedCommands</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>issuedCommands</c> value です。
    /// </param>
    /// <param name="cancellationToken">
    /// [EN] Supplies the <c>cancellationToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>cancellationToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<Result<string>> EvaluateAsync(
        DoomGameState state,
        IReadOnlyList<DoomCheatCommand> issuedCommands,
        CancellationToken cancellationToken = default)
        => await Try.RunAsync(async () =>
        {
            cancellationToken.ThrowIfCancellationRequested();
            await InitializeAsync().ConfigureAwait(false);

            var vector = EncodeStateVector(state, issuedCommands);
            var buffer = await _provider.CreateBufferAsync(vector.Length).ConfigureAwait(false);
            await _provider.WriteBufferAsync(buffer, vector).ConfigureAwait(false);

            return BackendName;
        }).ConfigureAwait(false);
    /// <summary>
    /// EN: Executes ShutdownAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] ShutdownAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>ShutdownAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ShutdownAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task ShutdownAsync()
    {
        if (!_initialized)
        {
            return;
        }

        await _provider.ShutdownAsync().ConfigureAwait(false);
        _initialized = false;
    }

    private static byte[] EncodeStateVector(DoomGameState state, IReadOnlyList<DoomCheatCommand> issuedCommands)
    {
        var vector = new byte[StateVectorBytes];
        BinaryPrimitives.WriteInt32LittleEndian(vector.AsSpan(0, 4), state.Health);
        BinaryPrimitives.WriteInt32LittleEndian(vector.AsSpan(4, 4), state.Ammo);
        BinaryPrimitives.WriteInt32LittleEndian(vector.AsSpan(8, 4), state.IsRunning ? 1 : 0);
        BinaryPrimitives.WriteInt32LittleEndian(vector.AsSpan(12, 4), issuedCommands.Count);
        return vector;
    }
}

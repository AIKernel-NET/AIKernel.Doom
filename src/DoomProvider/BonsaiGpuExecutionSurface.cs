namespace AIKernel.Doom.Provider;

using System.Buffers.Binary;
using AIKernel.Common.Results;
using AIKernel.Wasm.Comput;
/// <summary>
/// EN: Represents BonsaiGpuExecutionSurface.
/// EN: Documentation for public API. JA: BonsaiGpuExecutionSurface を表します。
/// </summary>

public sealed class BonsaiGpuExecutionSurface
{
    private const int StateVectorBytes = 16;

    private readonly WebGpuComputeProvider _provider;
    private bool _initialized;
    /// <summary>
    /// EN: Executes BonsaiGpuExecutionSurface.
    /// EN: Documentation for public API. JA: BonsaiGpuExecutionSurface を実行します。
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
    /// EN: Documentation for public API. JA: BackendKind を取得します。
    /// </summary>

    public DoomBackendKind BackendKind
        => _provider.UsingCpuFallback ? DoomBackendKind.WebGpuComputeCpuFallback : DoomBackendKind.WebGpuComputeProvider;
    /// <summary>
    /// EN: Gets BackendName.
    /// EN: Documentation for public API. JA: BackendName を取得します。
    /// </summary>

    public string BackendName
        => _provider.UsingCpuFallback ? "WebGpuComputeProvider(cpu-fallback)" : "WebGpuComputeProvider(webgpu)";
    /// <summary>
    /// EN: Executes InitializeAsync.
    /// EN: Documentation for public API. JA: InitializeAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: EvaluateAsync を取得します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: ShutdownAsync を実行します。
    /// </summary>

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

namespace AIKernel.Doom.Provider;

using System.Buffers.Binary;
using AIKernel.Common.Results;
using AIKernel.Wasm.Comput;

public sealed class BonsaiGpuExecutionSurface
{
    private const int StateVectorBytes = 16;

    private readonly WebGpuComputeProvider _provider;
    private bool _initialized;

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

    public DoomBackendKind BackendKind
        => _provider.UsingCpuFallback ? DoomBackendKind.WebGpuComputeCpuFallback : DoomBackendKind.WebGpuComputeProvider;

    public string BackendName
        => _provider.UsingCpuFallback ? "WebGpuComputeProvider(cpu-fallback)" : "WebGpuComputeProvider(webgpu)";

    public async Task InitializeAsync()
    {
        if (_initialized)
        {
            return;
        }

        await _provider.InitializeAsync().ConfigureAwait(false);
        _initialized = true;
    }

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

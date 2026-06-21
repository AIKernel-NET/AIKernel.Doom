namespace AIKernel.Doom.Provider;

using AIKernel.Wasm.Comput;

internal sealed class DoomFrameRenderer
{
    /// <summary>
    /// EN: Gets the Width constant.
    /// EN: Documentation for public API. JA: Width 定数を取得します。
    /// </summary>
    public const int Width = 320;
    /// <summary>
    /// EN: Gets the Height constant.
    /// EN: Documentation for public API. JA: Height 定数を取得します。
    /// </summary>
    public const int Height = 200;
    /// <summary>
    /// EN: Gets the PalettedFrameBytes constant.
    /// EN: Documentation for public API. JA: PalettedFrameBytes 定数を取得します。
    /// </summary>
    public const int PalettedFrameBytes = Width * Height;

    private readonly WebGpuComputeProvider _provider;
    private bool _initialized;
    /// <summary>
    /// EN: Executes DoomFrameRenderer.
    /// EN: Documentation for public API. JA: DoomFrameRenderer を実行します。
    /// </summary>

    public DoomFrameRenderer(DoomProviderOptions options)
    {
        _provider = new WebGpuComputeProvider(new WebGpuComputeSettings
        {
            ProviderId = "doom.render.webgpu",
            Name = "AIKernel.Doom WebGPU Render Provider",
            AdapterProfile = "doom-framebuffer-webgpu",
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
    /// EN: Executes RenderFrameAsync.
    /// EN: Documentation for public API. JA: RenderFrameAsync を実行します。
    /// </summary>

    public async Task RenderFrameAsync(ReadOnlyMemory<byte> palettedFrame)
    {
        await InitializeAsync().ConfigureAwait(false);
        var frame = NormalizeFrame(palettedFrame);
        var buffer = await _provider.CreateBufferAsync(frame.Length).ConfigureAwait(false);
        await _provider.WriteBufferAsync(buffer, frame).ConfigureAwait(false);
    }
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

    private static ReadOnlyMemory<byte> NormalizeFrame(ReadOnlyMemory<byte> palettedFrame)
    {
        if (palettedFrame.Length == PalettedFrameBytes)
        {
            return palettedFrame;
        }

        var normalized = new byte[PalettedFrameBytes];
        palettedFrame.Span[..Math.Min(palettedFrame.Length, normalized.Length)].CopyTo(normalized);
        return normalized;
    }
}

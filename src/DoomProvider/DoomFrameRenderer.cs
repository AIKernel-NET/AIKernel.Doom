namespace AIKernel.Doom.Provider;

using AIKernel.Wasm.Comput;

internal sealed class DoomFrameRenderer
{
    public const int Width = 320;
    public const int Height = 200;
    public const int PalettedFrameBytes = Width * Height;

    private readonly WebGpuComputeProvider _provider;
    private bool _initialized;

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

    public async Task RenderFrameAsync(ReadOnlyMemory<byte> palettedFrame)
    {
        await InitializeAsync().ConfigureAwait(false);
        var frame = NormalizeFrame(palettedFrame);
        var buffer = await _provider.CreateBufferAsync(frame.Length).ConfigureAwait(false);
        await _provider.WriteBufferAsync(buffer, frame).ConfigureAwait(false);
    }

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

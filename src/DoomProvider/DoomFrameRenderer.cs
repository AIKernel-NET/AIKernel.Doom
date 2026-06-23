namespace AIKernel.Doom.Provider;

using AIKernel.Wasm.Comput;

internal sealed class DoomFrameRenderer
{
    /// <summary>
    /// EN: Gets the Width constant.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Width 定数を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public const int Width = 320;
    /// <summary>
    /// EN: Gets the Height constant.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Height 定数を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public const int Height = 200;
    /// <summary>
    /// EN: Gets the PalettedFrameBytes constant.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] PalettedFrameBytes 定数を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public const int PalettedFrameBytes = Width * Height;

    private readonly WebGpuComputeProvider _provider;
    private bool _initialized;
    /// <summary>
    /// EN: Executes DoomFrameRenderer.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomFrameRenderer を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
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
    /// EN: Executes RenderFrameAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RenderFrameAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>RenderFrameAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>RenderFrameAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="palettedFrame">
    /// [EN] Supplies the <c>palettedFrame</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>palettedFrame</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task RenderFrameAsync(ReadOnlyMemory<byte> palettedFrame)
    {
        await InitializeAsync().ConfigureAwait(false);
        var frame = NormalizeFrame(palettedFrame);
        var buffer = await _provider.CreateBufferAsync(frame.Length).ConfigureAwait(false);
        await _provider.WriteBufferAsync(buffer, frame).ConfigureAwait(false);
    }
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

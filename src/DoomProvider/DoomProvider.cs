namespace AIKernel.Doom.Provider;

using AIKernel.Abstractions.Processes;
using AIKernel.Abstractions.Providers;
using AIKernel.Common.Results;
using AIKernel.Doom.Wasm;
using AIKernel.Dtos.Core;
using AIKernel.Wasm.Runtime;
using AIKernel.Wasm.Runtime.Abstractions;

/// <summary>
/// [EN] Defines the <c>DoomProvider</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomProvider</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class DoomProvider : IProvider, IWasmProcessProvider
{
    /// <summary>
    /// EN: Gets the DoomProcessName constant.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomProcessName 定数を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public const string DoomProcessName = "doom";

    private readonly DoomProviderOptions _options;
    private readonly IDoomWasmAssetResolver _assetResolver;
    private readonly WasmProcessProvider _processProvider = new();
    private readonly IProviderCapabilities _capabilities = new DoomProviderCapabilities();
    private readonly IDoomCheatCommandPort _cheatPort = new InMemoryDoomCheatCommandPort();
    private readonly DoomFrameRenderer _frameRenderer;
    private readonly BonsaiGpuExecutionSurface _bonsaiExecutionSurface;
    private readonly IBonsaiDoomSupervisor _supervisor;
    private DoomRomManifest? _manifest;
    private DoomWasmAsset? _asset;
    private IProcess? _process;
    private bool _initialized;
    private bool _modelReady;
    private string _lastFailure = string.Empty;
    /// <summary>
    /// EN: Executes DoomProvider.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomProvider を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public DoomProvider(DoomProviderOptions? options = null, IDoomWasmAssetResolver? assetResolver = null)
    {
        _options = options ?? new DoomProviderOptions();
        _assetResolver = assetResolver ?? new DoomWasmAssetResolver(_options.Wasm);
        _frameRenderer = new DoomFrameRenderer(_options);
        _bonsaiExecutionSurface = new BonsaiGpuExecutionSurface(_options);
        _supervisor = new BonsaiDoomSupervisor(
            new DoomRuntimeStateReader(GetStatusSnapshot),
            _cheatPort,
            new DeterministicBonsaiPolicy(),
            _bonsaiExecutionSurface,
            () => _modelReady);
    }
    /// <summary>
    /// EN: Gets ProviderId.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] ProviderId を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>ProviderId</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ProviderId</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public string ProviderId => "aikernel.doom.provider";
    /// <summary>
    /// EN: Gets Name.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Name を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>Name</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Name</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public string Name => "AIKernel DOOM WASM Provider";
    /// <summary>
    /// EN: Gets Version.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Version を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>ThisAssemblyVersion</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ThisAssemblyVersion</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public string Version => ThisAssemblyVersion;

    private const string ThisAssemblyVersion = "0.1.3-dev0";
    /// <summary>
    /// EN: Gets State.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] State を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public DoomProviderState State { get; private set; } = DoomProviderState.NotInitialized;
    /// <summary>
    /// EN: Executes GetCapabilities.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetCapabilities を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>_capabilities</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>_capabilities</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IProviderCapabilities GetCapabilities() => _capabilities;
    /// <summary>
    /// EN: Executes IsAvailableAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] IsAvailableAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>IsAvailableAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>IsAvailableAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public Task<bool> IsAvailableAsync()
        => Task.FromResult(_initialized && State is DoomProviderState.Ready or DoomProviderState.Running or DoomProviderState.Stopped);
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
        _initialized = true;
        State = DoomProviderState.AwaitingConsent;
        await _frameRenderer.InitializeAsync().ConfigureAwait(false);
        await _processProvider.InitializeAsync().ConfigureAwait(false);
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
        await TryStopDoomAsync().ConfigureAwait(false);
        State = DoomProviderState.Stopped;
        _initialized = false;
        await _bonsaiExecutionSurface.ShutdownAsync().ConfigureAwait(false);
        await _frameRenderer.ShutdownAsync().ConfigureAwait(false);
        await _processProvider.ShutdownAsync().ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes GetHealthAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetHealthAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>GetHealthAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>GetHealthAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public Task<ProviderHealthStatus> GetHealthAsync()
        => Task.FromResult(CheckRuntimeHealth().Map(ok => new ProviderHealthStatus(
                ok,
                State.ToString(),
                DateTime.UtcNow,
                0))
            .Match(
                error => new ProviderHealthStatus(false, error.Message, DateTime.UtcNow, 0),
                health => health));
    /// <summary>
    /// EN: Executes CreateProcessAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] CreateProcessAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>CreateProcessAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CreateProcessAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="name">
    /// [EN] Supplies the <c>name</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>name</c> value です。
    /// </param>
    /// <param name="args">
    /// [EN] Supplies the <c>args</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>args</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<IProcess> CreateProcessAsync(string name, object? args = null)
    {
        var result = await TryCreateProcessAsync(name, args).ConfigureAwait(false);
        return result.Match<IProcess>(
            error => new DoomFailedProcess(name, error.Message),
            process => process);
    }
    /// <summary>
    /// EN: Executes TryCreateProcessAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] TryCreateProcessAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>TryCreateProcessAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryCreateProcessAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="name">
    /// [EN] Supplies the <c>name</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>name</c> value です。
    /// </param>
    /// <param name="args">
    /// [EN] Supplies the <c>args</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>args</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<Result<IProcess>> TryCreateProcessAsync(string name, object? args = null)
        => await ValidateProcessName(name)
            .Bind(_ => TryEnsureWasmLoadedAsync())
            .Bind(_ => TryCreateLoadedProcessAsync(args))
            .ConfigureAwait(false);

    private async Task<Result<IProcess>> TryCreateLoadedProcessAsync(object? args)
    {
        if (_process is not null)
        {
            return Result<IProcess>.Success(_process);
        }

        return await ResolveLoadedAsset()
            .Bind(asset => _processProvider.TryCreateProcessAsync(
                DoomProcessName,
                args as WasmProcessOptions ?? new WasmProcessOptions(asset.ModuleBytes, _options.Wasm.InitialMemoryBytes)))
            .Map(RegisterProcess)
            .ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes TryStartAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] TryStartAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>TryStartAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryStartAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="processName">
    /// [EN] Supplies the <c>processName</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>processName</c> value です。
    /// </param>
    /// <param name="cancellationToken">
    /// [EN] Supplies the <c>cancellationToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>cancellationToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<Result<bool>> TryStartAsync(string processName, CancellationToken cancellationToken = default)
    {
        if (!string.Equals(processName, DoomProcessName, StringComparison.Ordinal))
        {
            return Fail<bool>($"Unsupported DOOM process name: {processName}. ErrorCode=DOOM_PROCESS_NAME_INVALID");
        }

        return await TryStartDoomAsync(cancellationToken).ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes ListProcesses.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] ListProcesses を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>ListProcesses</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ListProcesses</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IReadOnlyList<WasmProcess> ListProcesses() => _processProvider.ListProcesses();
    /// <summary>
    /// EN: Gets TryPrepareAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] TryPrepareAsync を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>TryPrepareAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryPrepareAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="consent">
    /// [EN] Supplies the <c>consent</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>consent</c> value です。
    /// </param>
    /// <param name="cancellationToken">
    /// [EN] Supplies the <c>cancellationToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>cancellationToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<Result<DoomProviderStatus>> TryPrepareAsync(
        DoomConsentGrant consent,
        CancellationToken cancellationToken = default)
    {
        return await ValidateConsent(consent).Match<Task<Result<DoomProviderStatus>>>(
                error =>
                {
                    State = DoomProviderState.Stopped;
                    return Result<DoomProviderStatus>.Fail(error).AsTask();
                },
                _ => PrepareAfterConsentAsync(cancellationToken))
            .ConfigureAwait(false);
    }

    private async Task<Result<DoomProviderStatus>> PrepareAfterConsentAsync(CancellationToken cancellationToken)
    {
        State = DoomProviderState.DownloadingModel;
        return await TryAcquireBonsaiModelAsync(cancellationToken)
            .Bind(_ => LoadWasmAfterModelAsync(cancellationToken))
            .Map(_ => MarkReadyAndStatus())
            .ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes TryStartDoomAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] TryStartDoomAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>TryStartDoomAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryStartDoomAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="cancellationToken">
    /// [EN] Supplies the <c>cancellationToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>cancellationToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<Result<bool>> TryStartDoomAsync(CancellationToken cancellationToken = default)
    {
        if (State == DoomProviderState.Running)
        {
            return Result<bool>.Success(true);
        }

        if (State is DoomProviderState.NotInitialized or DoomProviderState.AwaitingConsent)
        {
            return Fail<bool>("DOOM cannot start before initialization and consent. ErrorCode=DOOM_CONSENT_REQUIRED");
        }

        return await ValidateStartState()
            .Bind(_ => TryCreateProcessAsync(DoomProcessName))
            .Bind(process => StartProcessAsync(process, cancellationToken))
            .ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes TryStopDoomAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] TryStopDoomAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>TryStopDoomAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryStopDoomAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="cancellationToken">
    /// [EN] Supplies the <c>cancellationToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>cancellationToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public async Task<Result<bool>> TryStopDoomAsync(CancellationToken cancellationToken = default)
    {
        if (cancellationToken.IsCancellationRequested)
        {
            return Fail<bool>("DOOM stop was cancelled. ErrorCode=DOOM_STOP_CANCELLED");
        }

        if (_process is null || State is DoomProviderState.Ready or DoomProviderState.Stopped)
        {
            State = State == DoomProviderState.NotInitialized ? DoomProviderState.NotInitialized : DoomProviderState.Stopped;
            return Result<bool>.Success(true);
        }

        return await Try.RunAsync(async () =>
        {
            await _process.StopAsync().ConfigureAwait(false);
            State = DoomProviderState.Stopped;
            return true;
        }).ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes TryStatus.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] TryStatus を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>TryStatus</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryStatus</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="verbose">
    /// [EN] Supplies the <c>verbose</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>verbose</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public Result<DoomProviderStatus> TryStatus(bool verbose = false)
    {
        var status = GetStatusSnapshot();
        if (verbose || _options.VerboseStatus)
        {
            return Result<DoomProviderStatus>.Success(status);
        }

        return Result<DoomProviderStatus>.Success(status with
        {
            HiddenCheatCommands = [],
            SupervisorState = status.ModelReady ? "active" : "model-not-ready"
        });
    }

    private async Task<Result<bool>> TryEnsureWasmLoadedAsync(CancellationToken cancellationToken = default)
    {
        if (_asset is not null)
        {
            return Result<bool>.Success(true);
        }

        var load = await DoomRomLoader.LoadAsync(_options.Wasm.RomPath, cancellationToken)
            .Bind(manifest => _assetResolver.ResolveAsync(manifest, cancellationToken)
                .Map(asset => StoreAsset(manifest, asset)))
            .Map(_ => true)
            .ConfigureAwait(false);

        return load.Match(
            error => Fail<bool>(error.Message),
            Result<bool>.Success);
    }

    private Task<Result<bool>> LoadWasmAfterModelAsync(CancellationToken cancellationToken)
    {
        State = DoomProviderState.LoadingWasm;
        return TryEnsureWasmLoadedAsync(cancellationToken);
    }

    private async Task<Result<bool>> StartProcessAsync(IProcess process, CancellationToken cancellationToken)
        => await Try.RunAsync(async () =>
        {
            await process.StartAsync().ConfigureAwait(false);
            State = DoomProviderState.Running;
            await _frameRenderer.RenderFrameAsync(ReadOnlyMemory<byte>.Empty).ConfigureAwait(false);
            await _supervisor.SuperviseAsync(cancellationToken).ConfigureAwait(false);
            return true;
        }).ConfigureAwait(false);

    private DoomProviderStatus MarkReadyAndStatus()
    {
        State = DoomProviderState.Ready;
        return GetStatusSnapshot();
    }

    private bool StoreAsset(DoomRomManifest manifest, DoomWasmAsset asset)
    {
        _manifest = manifest;
        _asset = asset;
        return true;
    }

    private Result<DoomWasmAsset> ResolveLoadedAsset()
        => _asset is null
            ? Fail<DoomWasmAsset>("DOOM WASM asset was not loaded. ErrorCode=DOOM_WASM_ASSET_NOT_LOADED")
            : Result<DoomWasmAsset>.Success(_asset);

    private IProcess RegisterProcess(IProcess process)
    {
        _process = process;
        State = DoomProviderState.Ready;
        return process;
    }

    private async Task<Result<bool>> TryAcquireBonsaiModelAsync(CancellationToken cancellationToken)
    {
        if (cancellationToken.IsCancellationRequested)
        {
            return Fail<bool>("Bonsai1B model acquisition was cancelled. ErrorCode=DOOM_BONSAI_CANCELLED");
        }

        if (!string.IsNullOrWhiteSpace(_options.BonsaiModelPath) && !Directory.Exists(_options.BonsaiModelPath))
        {
            return Fail<bool>("Configured Bonsai1B model path does not exist. ErrorCode=DOOM_BONSAI_PATH_NOT_FOUND");
        }

        return await Try.RunAsync(async () =>
        {
            await _bonsaiExecutionSurface.InitializeAsync().ConfigureAwait(false);
            _modelReady = true;
            return true;
        }).ConfigureAwait(false);
    }

    private Result<bool> ValidateConsent(DoomConsentGrant consent)
    {
        if (!consent.AcceptedTerms)
        {
            return Fail<bool>("Terms were rejected. ErrorCode=DOOM_TERMS_REJECTED");
        }

        if (!consent.AllowDataDownload)
        {
            return Fail<bool>("Data download was rejected. ErrorCode=DOOM_DOWNLOAD_REJECTED");
        }

        if (!consent.AllowBonsaiModelDownload)
        {
            return Fail<bool>("Bonsai1B model download was rejected. ErrorCode=DOOM_BONSAI_REJECTED");
        }

        return consent.AllowDoomWasmLoad
            ? Result<bool>.Success(true)
            : Fail<bool>("DOOM WASM load was rejected. ErrorCode=DOOM_WASM_REJECTED");
    }

    private Result<bool> ValidateProcessName(string processName)
        => string.Equals(processName, DoomProcessName, StringComparison.Ordinal)
            ? Result<bool>.Success(true)
            : Fail<bool>($"Unsupported DOOM process name: {processName}. ErrorCode=DOOM_PROCESS_NAME_INVALID");

    private Result<bool> ValidateStartState()
        => State is DoomProviderState.NotInitialized or DoomProviderState.AwaitingConsent
            ? Fail<bool>("DOOM cannot start before initialization and consent. ErrorCode=DOOM_CONSENT_REQUIRED")
            : Result<bool>.Success(true);

    private Result<bool> CheckRuntimeHealth()
        => _initialized && State is DoomProviderState.Ready or DoomProviderState.Running or DoomProviderState.Stopped
            ? Result<bool>.Success(true)
            : Result<bool>.Fail(string.IsNullOrWhiteSpace(_lastFailure)
                ? $"Provider is not ready: {State}. ErrorCode=DOOM_PROVIDER_NOT_READY"
                : _lastFailure);

    private DoomProviderStatus GetStatusSnapshot()
    {
        var processRunning = _process?.State == ProcessState.Running;
        var backend = SelectBackend();
        var commands = _cheatPort.IssuedCommands.Select(x => $"{x.Name}:{x.Reason}").ToArray();
        var processState = _process?.State.ToString() ?? "None";
        return new DoomProviderStatus(
            State,
            _asset is not null,
            processRunning,
            backend,
            _modelReady,
            _asset?.IsSimulated ?? false,
            processState,
            _modelReady ? $"bonsai-1.7b-q1_0 via {_bonsaiExecutionSurface.BackendName}" : "not-ready",
            commands,
            $"state={State}; wasmLoaded={_asset is not null}; process={processState}; backend={backend}; renderer={_frameRenderer.BackendName}; bonsai={_bonsaiExecutionSurface.BackendName}; modelReady={_modelReady}");
    }

    private DoomBackendKind SelectBackend()
        => _frameRenderer.BackendKind == DoomBackendKind.WebGpuComputeProvider
            || _bonsaiExecutionSurface.BackendKind == DoomBackendKind.WebGpuComputeProvider
            ? DoomBackendKind.WebGpuComputeProvider
            : DoomBackendKind.WebGpuComputeCpuFallback;

    private Result<T> Fail<T>(string message)
    {
        _lastFailure = message;
        if (State != DoomProviderState.Stopped)
        {
            State = DoomProviderState.Failed;
        }

        return Result<T>.Fail(message);
    }
}

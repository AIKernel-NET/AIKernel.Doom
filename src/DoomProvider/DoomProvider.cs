namespace AIKernel.Doom.Provider;

using AIKernel.Abstractions.Processes;
using AIKernel.Abstractions.Providers;
using AIKernel.Common.Results;
using AIKernel.Doom.Wasm;
using AIKernel.Dtos.Core;
using AIKernel.Wasm.Runtime;
using AIKernel.Wasm.Runtime.Abstractions;
/// <summary>
/// EN: Represents DoomProvider.
/// EN: Documentation for public API. JA: DoomProvider を表します。
/// </summary>

public sealed class DoomProvider : IProvider, IWasmProcessProvider
{
    /// <summary>
    /// EN: Gets the DoomProcessName constant.
    /// EN: Documentation for public API. JA: DoomProcessName 定数を取得します。
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
    /// EN: Documentation for public API. JA: DoomProvider を実行します。
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
    /// EN: Documentation for public API. JA: ProviderId を取得します。
    /// </summary>

    public string ProviderId => "aikernel.doom.provider";
    /// <summary>
    /// EN: Gets Name.
    /// EN: Documentation for public API. JA: Name を取得します。
    /// </summary>

    public string Name => "AIKernel DOOM WASM Provider";
    /// <summary>
    /// EN: Gets Version.
    /// EN: Documentation for public API. JA: Version を取得します。
    /// </summary>

    public string Version => ThisAssemblyVersion;

    private const string ThisAssemblyVersion = "0.1.3-dev0";
    /// <summary>
    /// EN: Gets State.
    /// EN: Documentation for public API. JA: State を取得します。
    /// </summary>

    public DoomProviderState State { get; private set; } = DoomProviderState.NotInitialized;
    /// <summary>
    /// EN: Executes GetCapabilities.
    /// EN: Documentation for public API. JA: GetCapabilities を実行します。
    /// </summary>

    public IProviderCapabilities GetCapabilities() => _capabilities;
    /// <summary>
    /// EN: Executes IsAvailableAsync.
    /// EN: Documentation for public API. JA: IsAvailableAsync を実行します。
    /// </summary>

    public Task<bool> IsAvailableAsync()
        => Task.FromResult(_initialized && State is DoomProviderState.Ready or DoomProviderState.Running or DoomProviderState.Stopped);
    /// <summary>
    /// EN: Executes InitializeAsync.
    /// EN: Documentation for public API. JA: InitializeAsync を実行します。
    /// </summary>

    public async Task InitializeAsync()
    {
        _initialized = true;
        State = DoomProviderState.AwaitingConsent;
        await _frameRenderer.InitializeAsync().ConfigureAwait(false);
        await _processProvider.InitializeAsync().ConfigureAwait(false);
    }
    /// <summary>
    /// EN: Executes ShutdownAsync.
    /// EN: Documentation for public API. JA: ShutdownAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: GetHealthAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: CreateProcessAsync を実行します。
    /// </summary>

    public async Task<IProcess> CreateProcessAsync(string name, object? args = null)
    {
        var result = await TryCreateProcessAsync(name, args).ConfigureAwait(false);
        return result.Match<IProcess>(
            error => new DoomFailedProcess(name, error.Message),
            process => process);
    }
    /// <summary>
    /// EN: Executes TryCreateProcessAsync.
    /// EN: Documentation for public API. JA: TryCreateProcessAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: TryStartAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: ListProcesses を実行します。
    /// </summary>

    public IReadOnlyList<WasmProcess> ListProcesses() => _processProvider.ListProcesses();
    /// <summary>
    /// EN: Gets TryPrepareAsync.
    /// EN: Documentation for public API. JA: TryPrepareAsync を取得します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: TryStartDoomAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: TryStopDoomAsync を実行します。
    /// </summary>

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
    /// EN: Documentation for public API. JA: TryStatus を実行します。
    /// </summary>

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

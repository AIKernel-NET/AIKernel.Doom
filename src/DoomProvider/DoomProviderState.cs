namespace AIKernel.Doom.Provider;
/// <summary>
/// EN: Defines DoomProviderState values.
/// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomProviderState の値を定義します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
/// </summary>

/// <summary>
/// [EN] Defines the <c>DoomProviderState</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomProviderState</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public enum DoomProviderState
{
    /// <summary>
    /// [EN] The provider has not created its runtime state yet.
    /// [JA] provider が runtime state をまだ作成していない状態です。
    /// </summary>
    NotInitialized,

    /// <summary>
    /// [EN] The provider is waiting for the user consent gate before loading protected assets.
    /// [JA] protected asset を読み込む前に user consent gate を待っている状態です。
    /// </summary>
    AwaitingConsent,

    /// <summary>
    /// [EN] The provider is downloading or validating the model payload.
    /// [JA] provider が model payload を download または validate している状態です。
    /// </summary>
    DownloadingModel,

    /// <summary>
    /// [EN] The provider is loading the Doom WASM runtime and related assets.
    /// [JA] provider が Doom WASM runtime と関連 asset を読み込んでいる状態です。
    /// </summary>
    LoadingWasm,

    /// <summary>
    /// [EN] The provider is ready to start the Doom runtime.
    /// [JA] provider が Doom runtime を開始できる状態です。
    /// </summary>
    Ready,

    /// <summary>
    /// [EN] The Doom runtime is running and producing ticks or frames.
    /// [JA] Doom runtime が実行中で tick または frame を生成している状態です。
    /// </summary>
    Running,

    /// <summary>
    /// [EN] The provider has stopped the Doom runtime.
    /// [JA] provider が Doom runtime を停止した状態です。
    /// </summary>
    Stopped,

    /// <summary>
    /// [EN] The provider failed to initialize, load, or run the Doom runtime.
    /// [JA] provider が Doom runtime の initialize、load、run に失敗した状態です。
    /// </summary>
    Failed
}

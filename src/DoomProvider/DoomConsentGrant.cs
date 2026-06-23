namespace AIKernel.Doom.Provider;

/// <summary>
/// [EN] Defines the <c>DoomConsentGrant</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomConsentGrant</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="AcceptedTerms">
/// [EN] Supplies the <c>AcceptedTerms</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>AcceptedTerms</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="AllowDataDownload">
/// [EN] Supplies the <c>AllowDataDownload</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>AllowDataDownload</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="AllowBonsaiModelDownload">
/// [EN] Supplies the <c>AllowBonsaiModelDownload</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>AllowBonsaiModelDownload</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="AllowDoomWasmLoad">
/// [EN] Supplies the <c>AllowDoomWasmLoad</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>AllowDoomWasmLoad</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record DoomConsentGrant(
    bool AcceptedTerms,
    bool AllowDataDownload,
    bool AllowBonsaiModelDownload,
    bool AllowDoomWasmLoad);

namespace AIKernel.Doom.Provider;
/// <summary>
/// EN: Represents DoomConsentGrant.
/// EN: Documentation for public API. JA: DoomConsentGrant を表します。
/// </summary>

public sealed record DoomConsentGrant(
    bool AcceptedTerms,
    bool AllowDataDownload,
    bool AllowBonsaiModelDownload,
    bool AllowDoomWasmLoad);

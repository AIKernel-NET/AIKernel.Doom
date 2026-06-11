namespace AIKernel.Doom.Provider;

public sealed record DoomConsentGrant(
    bool AcceptedTerms,
    bool AllowDataDownload,
    bool AllowBonsaiModelDownload,
    bool AllowDoomWasmLoad);

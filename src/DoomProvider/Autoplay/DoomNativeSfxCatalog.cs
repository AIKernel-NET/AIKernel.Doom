using System.Security.Cryptography;
using System.Text;

namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record DoomNativeSfxCatalogEntry(
    int SfxId,
    string SfxName,
    string MeaningCode,
    string MeaningLabel);

internal sealed record DoomNativeSfxCatalogObservation
{
    public string CatalogVersion { get; init; } = DoomNativeSfxCatalog.CatalogVersion;

    public string SourceRevision { get; init; } = DoomNativeSfxCatalog.SourceRevision;

    public string CatalogIdentityHash { get; init; } = DoomNativeSfxCatalog.CatalogIdentityHash;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ObservedAtControlTick { get; init; }

    public long Sequence { get; init; }

    public int SfxId { get; init; } = -1;

    public string RawSfxName { get; init; } = string.Empty;

    public string NormalizedSfxName { get; init; } = string.Empty;

    public string ExpectedSfxName { get; init; } = string.Empty;

    public bool Catalogued { get; init; }

    public string MeaningCode { get; init; } = DoomNativeSfxCatalog.UnknownMeaningCode;

    public string MeaningLabel { get; init; } = DoomNativeSfxCatalog.UnknownMeaningLabel;

    public string ClassificationReason { get; init; } = "unknown";

    public string EventIdentityHash { get; init; } = string.Empty;

    public bool DiagnosticOnly { get; init; } = true;
}

internal sealed record FirstDoorAudioCatalogTrace
{
    public int TraceVersion { get; init; } = 1;

    public string CatalogVersion { get; init; } = DoomNativeSfxCatalog.CatalogVersion;

    public string SourceRevision { get; init; } = DoomNativeSfxCatalog.SourceRevision;

    public string CatalogIdentityHash { get; init; } = DoomNativeSfxCatalog.CatalogIdentityHash;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long EvaluatedAtControlTick { get; init; }

    public long LatestObservedSequence { get; init; }

    public int Capacity { get; init; } = 32;

    public int TotalNewEventCount { get; init; }

    public int RetainedEventCount { get; init; }

    public int UnknownEventCount { get; init; }

    public bool Truncated { get; init; }

    public bool DiagnosticOnly { get; init; } = true;

    public IReadOnlyList<DoomNativeSfxCatalogObservation> Events { get; init; }
        = Array.Empty<DoomNativeSfxCatalogObservation>();
}

internal static class DoomNativeSfxCatalog
{
    internal const string CatalogVersion = "doom-native-sfx-catalog-v1";
    internal const string SourceRevision = "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284";
    internal const string CanonicalWadIdentity
        = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256;
    internal const string UnknownMeaningCode = "unknown-sfx";
    internal const string UnknownMeaningLabel = "Unknown SFX";

    // Meanings follow the pinned info.c mobj sound assignments and direct call sites.
    // A generic family is used wherever the engine deliberately shares one SFX across actors.
    private static readonly DoomNativeSfxCatalogEntry[] CatalogEntries =
    [
        Entry(0, "none", "none", "No sound"),
        Entry(1, "pistol", "weapon-fire-pistol", "Pistol fire"),
        Entry(2, "shotgn", "weapon-fire-shotgun", "Shotgun fire"),
        Entry(3, "sgcock", "weapon-cycle-shotgun", "Shotgun cock"),
        Entry(4, "dshtgn", "weapon-fire-super-shotgun", "Super shotgun fire"),
        Entry(5, "dbopn", "weapon-cycle-super-shotgun-open", "Super shotgun open"),
        Entry(6, "dbcls", "weapon-cycle-super-shotgun-close", "Super shotgun close"),
        Entry(7, "dbload", "weapon-cycle-super-shotgun-load", "Super shotgun load"),
        Entry(8, "plasma", "weapon-fire-plasma", "Plasma rifle fire"),
        Entry(9, "bfg", "weapon-fire-bfg", "BFG fire"),
        Entry(10, "sawup", "weapon-cycle-chainsaw-start", "Chainsaw start"),
        Entry(11, "sawidl", "weapon-active-chainsaw-idle", "Chainsaw idle"),
        Entry(12, "sawful", "weapon-active-chainsaw-full", "Chainsaw full speed"),
        Entry(13, "sawhit", "weapon-hit-chainsaw", "Chainsaw hit"),
        Entry(14, "rlaunc", "weapon-fire-rocket", "Rocket launch"),
        Entry(15, "rxplod", "explosion-rocket", "Rocket explosion"),
        Entry(16, "firsht", "enemy-projectile-fireball", "Fireball launch"),
        Entry(17, "firxpl", "explosion-fireball", "Fireball explosion"),
        Entry(18, "pstart", "mechanism-lift-start", "Lift start"),
        Entry(19, "pstop", "mechanism-lift-stop", "Lift stop"),
        Entry(20, "doropn", "mechanism-door-open", "Door open"),
        Entry(21, "dorcls", "mechanism-door-close", "Door close"),
        Entry(22, "stnmov", "mechanism-stone-move", "Stone movement"),
        Entry(23, "swtchn", "mechanism-switch-on", "Switch on"),
        Entry(24, "swtchx", "mechanism-switch-off", "Switch off"),
        Entry(25, "plpain", "player-pain", "Player pain"),
        Entry(26, "dmpain", "enemy-pain-monster", "Monster pain"),
        Entry(27, "popain", "enemy-pain-shared", "Shared enemy pain"),
        Entry(28, "vipain", "enemy-pain-arch-vile", "Arch-vile pain"),
        Entry(29, "mnpain", "enemy-pain-mancubus", "Mancubus pain"),
        Entry(30, "pepain", "enemy-pain-pain-elemental", "Pain Elemental pain"),
        Entry(31, "slop", "effect-gore", "Gore impact"),
        Entry(32, "itemup", "pickup-item", "Item pickup"),
        Entry(33, "wpnup", "pickup-weapon", "Weapon pickup"),
        Entry(34, "oof", "player-impact", "Player impact"),
        Entry(35, "telept", "effect-teleport", "Teleport"),
        Entry(36, "posit1", "enemy-sight-former-human-1", "Former human sight 1"),
        Entry(37, "posit2", "enemy-sight-former-human-2", "Former human sight 2"),
        Entry(38, "posit3", "enemy-sight-former-human-3", "Former human sight 3"),
        Entry(39, "bgsit1", "enemy-sight-imp-1", "Imp sight 1"),
        Entry(40, "bgsit2", "enemy-sight-imp-2", "Imp sight 2"),
        Entry(41, "sgtsit", "enemy-sight-demon", "Demon or Spectre sight"),
        Entry(42, "cacsit", "enemy-sight-cacodemon", "Cacodemon sight"),
        Entry(43, "brssit", "enemy-sight-baron", "Baron of Hell sight"),
        Entry(44, "cybsit", "enemy-sight-cyberdemon", "Cyberdemon sight"),
        Entry(45, "spisit", "enemy-sight-spider-mastermind", "Spider Mastermind sight"),
        Entry(46, "bspsit", "enemy-sight-arachnotron", "Arachnotron sight"),
        Entry(47, "kntsit", "enemy-sight-hell-knight", "Hell Knight sight"),
        Entry(48, "vilsit", "enemy-sight-arch-vile", "Arch-vile sight"),
        Entry(49, "mansit", "enemy-sight-mancubus", "Mancubus sight"),
        Entry(50, "pesit", "enemy-sight-pain-elemental", "Pain Elemental sight"),
        Entry(51, "sklatk", "enemy-attack-lost-soul", "Lost Soul attack"),
        Entry(52, "sgtatk", "enemy-attack-demon", "Demon or Spectre bite"),
        Entry(53, "skepch", "enemy-attack-revenant-punch", "Revenant punch"),
        Entry(54, "vilatk", "enemy-attack-arch-vile", "Arch-vile attack"),
        Entry(55, "claw", "enemy-attack-claw", "Enemy claw attack"),
        Entry(56, "skeswg", "enemy-attack-revenant-swing", "Revenant swing"),
        Entry(57, "pldeth", "player-death", "Player death"),
        Entry(58, "pdiehi", "player-death-high", "Player high death"),
        Entry(59, "podth1", "enemy-death-former-human-1", "Former human death 1"),
        Entry(60, "podth2", "enemy-death-former-human-2", "Former human death 2"),
        Entry(61, "podth3", "enemy-death-former-human-3", "Former human death 3"),
        Entry(62, "bgdth1", "enemy-death-imp-1", "Imp death 1"),
        Entry(63, "bgdth2", "enemy-death-imp-2", "Imp death 2"),
        Entry(64, "sgtdth", "enemy-death-demon", "Demon or Spectre death"),
        Entry(65, "cacdth", "enemy-death-cacodemon", "Cacodemon death"),
        Entry(66, "skldth", "enemy-death-lost-soul", "Lost Soul death"),
        Entry(67, "brsdth", "enemy-death-baron", "Baron of Hell death"),
        Entry(68, "cybdth", "enemy-death-cyberdemon", "Cyberdemon death"),
        Entry(69, "spidth", "enemy-death-spider-mastermind", "Spider Mastermind death"),
        Entry(70, "bspdth", "enemy-death-arachnotron", "Arachnotron death"),
        Entry(71, "vildth", "enemy-death-arch-vile", "Arch-vile death"),
        Entry(72, "kntdth", "enemy-death-hell-knight", "Hell Knight death"),
        Entry(73, "pedth", "enemy-death-pain-elemental", "Pain Elemental death"),
        Entry(74, "skedth", "enemy-death-revenant", "Revenant death"),
        Entry(75, "posact", "enemy-active-shared", "Shared enemy active"),
        Entry(76, "bgact", "enemy-active-imp", "Imp active"),
        Entry(77, "dmact", "enemy-active-monster", "Monster active"),
        Entry(78, "bspact", "enemy-active-arachnotron", "Arachnotron active"),
        Entry(79, "bspwlk", "enemy-movement-arachnotron", "Arachnotron movement"),
        Entry(80, "vilact", "enemy-active-arch-vile", "Arch-vile active"),
        Entry(81, "noway", "interaction-denied", "Use denied"),
        Entry(82, "barexp", "explosion-barrel", "Barrel explosion"),
        Entry(83, "punch", "weapon-hit-punch", "Punch hit"),
        Entry(84, "hoof", "enemy-movement-cyberdemon", "Cyberdemon hoof step"),
        Entry(85, "metal", "enemy-movement-spider-mastermind", "Spider Mastermind metal step"),
        Entry(86, "chgun", "weapon-fire-chaingun", "Chaingun fire"),
        Entry(87, "tink", "ui-chat-notification", "Chat notification"),
        Entry(88, "bdopn", "mechanism-blazing-door-open", "Blazing door open"),
        Entry(89, "bdcls", "mechanism-blazing-door-close", "Blazing door close"),
        Entry(90, "itmbk", "pickup-item-respawn", "Item respawn"),
        Entry(91, "flame", "enemy-attack-arch-vile-flame", "Arch-vile flame active"),
        Entry(92, "flamst", "enemy-attack-arch-vile-flame-start", "Arch-vile flame start"),
        Entry(93, "getpow", "pickup-power", "Power pickup"),
        Entry(94, "bospit", "boss-icon-of-sin-spawn-launch", "Icon of Sin spawn launch"),
        Entry(95, "boscub", "boss-icon-of-sin-spawn-travel", "Icon of Sin spawn cube travel"),
        Entry(96, "bossit", "boss-icon-of-sin-awake", "Icon of Sin awake"),
        Entry(97, "bospn", "boss-icon-of-sin-pain", "Icon of Sin pain"),
        Entry(98, "bosdth", "boss-icon-of-sin-death", "Icon of Sin death"),
        Entry(99, "manatk", "enemy-attack-mancubus", "Mancubus attack"),
        Entry(100, "mandth", "enemy-death-mancubus", "Mancubus death"),
        Entry(101, "sssit", "enemy-sight-wolfenstein-ss", "Wolfenstein SS sight"),
        Entry(102, "ssdth", "enemy-death-wolfenstein-ss", "Wolfenstein SS death"),
        Entry(103, "keenpn", "enemy-pain-commander-keen", "Commander Keen pain"),
        Entry(104, "keendt", "enemy-death-commander-keen", "Commander Keen death"),
        Entry(105, "skeact", "enemy-active-revenant", "Revenant active"),
        Entry(106, "skesit", "enemy-sight-revenant", "Revenant sight"),
        Entry(107, "skeatk", "enemy-attack-revenant", "Revenant attack"),
        Entry(108, "radio", "ui-chat-radio-notification", "Chat radio notification")
    ];

    private static readonly IReadOnlyList<DoomNativeSfxCatalogEntry> ReadOnlyEntries
        = Array.AsReadOnly(CatalogEntries);

    internal static IReadOnlyList<DoomNativeSfxCatalogEntry> Entries => ReadOnlyEntries;

    internal static string CatalogIdentityHash { get; } = ComputeCatalogIdentityHash();

    internal static DoomNativeSfxCatalogObservation Classify(
        long sequence,
        int sfxId,
        string? sfxName,
        string sessionId,
        string runId,
        long runGeneration,
        long observedAtControlTick)
    {
        var rawName = sfxName ?? string.Empty;
        var normalizedName = NormalizeSfxName(rawName);
        var expected = sfxId >= 0 && sfxId < CatalogEntries.Length
            ? CatalogEntries[sfxId]
            : null;
        var catalogued = false;
        var classificationReason = "id-name-mismatch";

        if (string.IsNullOrWhiteSpace(rawName))
        {
            classificationReason = "empty-sfx-name";
        }
        else if (expected is null)
        {
            classificationReason = "sfx-id-out-of-range";
        }
        else if (string.Equals(normalizedName, expected.SfxName, StringComparison.Ordinal))
        {
            catalogued = true;
            classificationReason = "exact-id-name-pair";
        }

        var meaningCode = catalogued ? expected!.MeaningCode : UnknownMeaningCode;
        var meaningLabel = catalogued ? expected!.MeaningLabel : UnknownMeaningLabel;
        var expectedName = expected?.SfxName ?? string.Empty;
        var eventIdentityHash = ComputeEventIdentityHash(
            sessionId,
            runId,
            runGeneration,
            observedAtControlTick,
            sequence,
            sfxId,
            rawName,
            normalizedName,
            expectedName,
            meaningCode,
            classificationReason);

        return new DoomNativeSfxCatalogObservation
        {
            SessionId = sessionId,
            RunId = runId,
            RunGeneration = runGeneration,
            ObservedAtControlTick = observedAtControlTick,
            Sequence = sequence,
            SfxId = sfxId,
            RawSfxName = rawName,
            NormalizedSfxName = normalizedName,
            ExpectedSfxName = expectedName,
            Catalogued = catalogued,
            MeaningCode = meaningCode,
            MeaningLabel = meaningLabel,
            ClassificationReason = classificationReason,
            EventIdentityHash = eventIdentityHash
        };
    }

    private static DoomNativeSfxCatalogEntry Entry(
        int sfxId,
        string sfxName,
        string meaningCode,
        string meaningLabel)
        => new(sfxId, sfxName, meaningCode, meaningLabel);

    private static string NormalizeSfxName(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        return normalized.StartsWith("sfx_", StringComparison.Ordinal)
            ? normalized[4..]
            : normalized;
    }

    private static string ComputeCatalogIdentityHash()
    {
        var identity = new StringBuilder()
            .Append(CatalogVersion)
            .Append('\u001f')
            .Append(SourceRevision)
            .Append('\u001f')
            .Append(CanonicalWadIdentity);
        foreach (var entry in CatalogEntries)
        {
            identity
                .Append('\n')
                .Append(entry.SfxId)
                .Append('\u001f')
                .Append(entry.SfxName)
                .Append('\u001f')
                .Append(entry.MeaningCode)
                .Append('\u001f')
                .Append(entry.MeaningLabel);
        }

        return Hash(identity.ToString());
    }

    private static string ComputeEventIdentityHash(
        string sessionId,
        string runId,
        long runGeneration,
        long observedAtControlTick,
        long sequence,
        int sfxId,
        string rawName,
        string normalizedName,
        string expectedName,
        string meaningCode,
        string classificationReason)
        => Hash(string.Join(
            '\u001f',
            CatalogIdentityHash,
            sessionId,
            runId,
            runGeneration,
            observedAtControlTick,
            sequence,
            sfxId,
            rawName,
            normalizedName,
            expectedName,
            meaningCode,
            classificationReason));

    private static string Hash(string value)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}

using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.Architecture.Tests;

public sealed class DoomNativeSfxCatalogTests
{
    private static readonly string[] ExpectedNames =
    [
        "none", "pistol", "shotgn", "sgcock", "dshtgn", "dbopn", "dbcls", "dbload",
        "plasma", "bfg", "sawup", "sawidl", "sawful", "sawhit", "rlaunc", "rxplod",
        "firsht", "firxpl", "pstart", "pstop", "doropn", "dorcls", "stnmov", "swtchn",
        "swtchx", "plpain", "dmpain", "popain", "vipain", "mnpain", "pepain", "slop",
        "itemup", "wpnup", "oof", "telept", "posit1", "posit2", "posit3", "bgsit1",
        "bgsit2", "sgtsit", "cacsit", "brssit", "cybsit", "spisit", "bspsit", "kntsit",
        "vilsit", "mansit", "pesit", "sklatk", "sgtatk", "skepch", "vilatk", "claw",
        "skeswg", "pldeth", "pdiehi", "podth1", "podth2", "podth3", "bgdth1", "bgdth2",
        "sgtdth", "cacdth", "skldth", "brsdth", "cybdth", "spidth", "bspdth", "vildth",
        "kntdth", "pedth", "skedth", "posact", "bgact", "dmact", "bspact", "bspwlk",
        "vilact", "noway", "barexp", "punch", "hoof", "metal", "chgun", "tink",
        "bdopn", "bdcls", "itmbk", "flame", "flamst", "getpow", "bospit", "boscub",
        "bossit", "bospn", "bosdth", "manatk", "mandth", "sssit", "ssdth", "keenpn",
        "keendt", "skeact", "skesit", "skeatk", "radio"
    ];

    [Fact]
    public void Catalog_PinsAllDoomGenericSfxIdsNamesAndMeanings()
    {
        var entries = DoomNativeSfxCatalog.Entries;

        Assert.Equal(109, entries.Count);
        Assert.Equal(Enumerable.Range(0, 109), entries.Select(entry => entry.SfxId));
        Assert.Equal(ExpectedNames, entries.Select(entry => entry.SfxName));
        Assert.All(entries, entry => Assert.False(string.IsNullOrWhiteSpace(entry.MeaningCode)));
        Assert.All(entries, entry => Assert.False(string.IsNullOrWhiteSpace(entry.MeaningLabel)));
        Assert.Equal(
            "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284",
            DoomNativeSfxCatalog.SourceRevision);
        Assert.Equal(
            FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            DoomNativeSfxCatalog.CanonicalWadIdentity);
        Assert.Equal(
            "2fd2ba92b0ac0761b4c60ea636532420e71475adfb49f33ac1994c37009dd756",
            DoomNativeSfxCatalog.CatalogIdentityHash);
    }

    [Fact]
    public void Classify_RequiresExactPinnedIdNamePair()
    {
        var observation = Classify(sequence: 7, sfxId: 20, sfxName: "doropn");

        Assert.True(observation.Catalogued);
        Assert.Equal("exact-id-name-pair", observation.ClassificationReason);
        Assert.Equal("doropn", observation.ExpectedSfxName);
        Assert.Equal("mechanism-door-open", observation.MeaningCode);
        Assert.Equal("Door open", observation.MeaningLabel);
        Assert.Equal(DoomNativeSfxCatalog.CatalogIdentityHash, observation.CatalogIdentityHash);
        Assert.True(observation.DiagnosticOnly);
        Assert.Matches("^[0-9a-f]{64}$", observation.EventIdentityHash);
    }

    [Theory]
    [InlineData(20, "", "empty-sfx-name")]
    [InlineData(20, "   ", "empty-sfx-name")]
    [InlineData(-1, "none", "sfx-id-out-of-range")]
    [InlineData(109, "radio", "sfx-id-out-of-range")]
    [InlineData(20, "noway", "id-name-mismatch")]
    public void Classify_UsesUnknownMeaningForInvalidWirePairs(
        int sfxId,
        string sfxName,
        string expectedReason)
    {
        var observation = Classify(sequence: 8, sfxId, sfxName);

        Assert.False(observation.Catalogued);
        Assert.Equal(expectedReason, observation.ClassificationReason);
        Assert.Equal(DoomNativeSfxCatalog.UnknownMeaningCode, observation.MeaningCode);
        Assert.Equal(DoomNativeSfxCatalog.UnknownMeaningLabel, observation.MeaningLabel);
        Assert.True(observation.DiagnosticOnly);
    }

    [Theory]
    [InlineData("SFX_DOROPN")]
    [InlineData(" doropn ")]
    public void Classify_MatchesTheCanonicalNameAfterWireNormalization(string sfxName)
    {
        var observation = Classify(sequence: 8, sfxId: 20, sfxName);

        Assert.True(observation.Catalogued);
        Assert.Equal("doropn", observation.NormalizedSfxName);
        Assert.Equal("exact-id-name-pair", observation.ClassificationReason);
    }

    [Fact]
    public void Classify_EventIdentityIsStableAndScopeBound()
    {
        var first = Classify(sequence: 9, sfxId: 32, sfxName: "itemup");
        var repeated = Classify(sequence: 9, sfxId: 32, sfxName: "itemup");
        var differentSequence = Classify(sequence: 10, sfxId: 32, sfxName: "itemup");
        var differentRun = DoomNativeSfxCatalog.Classify(
            sequence: 9,
            sfxId: 32,
            sfxName: "itemup",
            sessionId: "session-a",
            runId: "run-b",
            runGeneration: 3,
            observedAtControlTick: 11);

        Assert.Equal(first.EventIdentityHash, repeated.EventIdentityHash);
        Assert.NotEqual(first.EventIdentityHash, differentSequence.EventIdentityHash);
        Assert.NotEqual(first.EventIdentityHash, differentRun.EventIdentityHash);
    }

    [Fact]
    public void Catalog_PinsActorMeaningsFromInfoAssignmentsAndDirectCallSites()
    {
        AssertMeaning(26, "dmpain", "enemy-pain-monster", "Monster pain");
        AssertMeaning(27, "popain", "enemy-pain-shared", "Shared enemy pain");
        AssertMeaning(39, "bgsit1", "enemy-sight-imp-1", "Imp sight 1");
        AssertMeaning(40, "bgsit2", "enemy-sight-imp-2", "Imp sight 2");
        AssertMeaning(41, "sgtsit", "enemy-sight-demon", "Demon or Spectre sight");
        AssertMeaning(52, "sgtatk", "enemy-attack-demon", "Demon or Spectre bite");
        AssertMeaning(62, "bgdth1", "enemy-death-imp-1", "Imp death 1");
        AssertMeaning(63, "bgdth2", "enemy-death-imp-2", "Imp death 2");
        AssertMeaning(64, "sgtdth", "enemy-death-demon", "Demon or Spectre death");
        AssertMeaning(75, "posact", "enemy-active-shared", "Shared enemy active");
        AssertMeaning(76, "bgact", "enemy-active-imp", "Imp active");
        AssertMeaning(77, "dmact", "enemy-active-monster", "Monster active");
        AssertMeaning(84, "hoof", "enemy-movement-cyberdemon", "Cyberdemon hoof step");
        AssertMeaning(
            85,
            "metal",
            "enemy-movement-spider-mastermind",
            "Spider Mastermind metal step");
        AssertMeaning(87, "tink", "ui-chat-notification", "Chat notification");
        AssertMeaning(
            91,
            "flame",
            "enemy-attack-arch-vile-flame",
            "Arch-vile flame active");
        AssertMeaning(96, "bossit", "boss-icon-of-sin-awake", "Icon of Sin awake");
        AssertMeaning(108, "radio", "ui-chat-radio-notification", "Chat radio notification");
    }

    private static DoomNativeSfxCatalogObservation Classify(
        long sequence,
        int sfxId,
        string sfxName)
        => DoomNativeSfxCatalog.Classify(
            sequence,
            sfxId,
            sfxName,
            sessionId: "session-a",
            runId: "run-a",
            runGeneration: 3,
            observedAtControlTick: 11);

    private static void AssertMeaning(
        int sfxId,
        string sfxName,
        string meaningCode,
        string meaningLabel)
    {
        var entry = Assert.Single(DoomNativeSfxCatalog.Entries, item => item.SfxId == sfxId);
        Assert.Equal(sfxName, entry.SfxName);
        Assert.Equal(meaningCode, entry.MeaningCode);
        Assert.Equal(meaningLabel, entry.MeaningLabel);
    }
}

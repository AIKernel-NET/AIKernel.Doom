namespace AIKernel.Doom.Architecture.Tests;

using System.Text.Json;
using AIKernel.Doom.Provider.Autoplay;

public sealed class FirstDoorNativeProximityObserverTests
{
    [Fact]
    public void Dev1044Spawn_IsValidReplayButOutsideEveryDoorRange()
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1056, -3616, angleBam: 1L << 30));

        Assert.True(observation.InputAccepted);
        Assert.True(observation.Available);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, observation.Truth);
        Assert.InRange(observation.DistanceToDoorSegment, 1159.9d, 1160.1d);
        Assert.False(observation.WithinAcquisitionRange);
        Assert.False(observation.WithinContactApproachRange);
        Assert.False(observation.WithinUseRange);
    }

    [Fact]
    public void NearDoorPose_ProducesUseRangeAndBearingProof()
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496, angleBam: 0));

        Assert.True(observation.InputAccepted);
        Assert.True(observation.Available);
        Assert.True(observation.WadVerified);
        Assert.Equal(36d, observation.DistanceToDoorSegment, precision: 8);
        Assert.Equal(0d, observation.BearingToDoorDegrees, precision: 8);
        Assert.Equal(0d, observation.BearingErrorDegrees, precision: 8);
        Assert.True(observation.WithinAcquisitionRange);
        Assert.True(observation.WithinContactApproachRange);
        Assert.True(observation.WithinUseRange);
        Assert.Equal(-2496d, observation.ClosestDoorPointY, precision: 8);
        Assert.NotEmpty(observation.ObservationHash);
    }

    [Theory]
    [InlineData("wrong-hash", 0, 1, 1, "canonical-doom1-wad-sha256-mismatch")]
    [InlineData(
        FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
        0,
        1,
        2,
        "unsupported-proximity-map:e1m2")]
    public void WrongWadOrMap_IsRejected(
        string wadHash,
        int gameState,
        int episode,
        int map,
        string expectedReason)
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with
            {
                WadContentSha256 = wadHash,
                NativeGameState = gameState,
                NativeGameEpisode = episode,
                NativeGameMap = map
            });

        Assert.False(observation.InputAccepted);
        Assert.False(observation.Available);
        Assert.False(observation.Fresh);
        Assert.Equal(expectedReason, observation.Reason);
        Assert.False(observation.WithinAcquisitionRange);
        Assert.False(observation.WithinContactApproachRange);
        Assert.False(observation.WithinUseRange);
    }

    [Fact]
    public void MissingPlayerPose_IsTypedUnknownWithFiniteSerializableNumbers()
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with { NativePlayerFactsAvailable = false });

        Assert.False(observation.InputAccepted);
        Assert.False(observation.Available);
        Assert.Equal(FirstDoorEvidenceTruth.Unknown, observation.Truth);
        Assert.Equal("native-player-facts-unavailable", observation.Reason);
        Assert.True(double.IsFinite(observation.DistanceToDoorSegment));
        Assert.True(double.IsFinite(observation.BearingToDoorDegrees));
        Assert.True(double.IsFinite(observation.BearingErrorDegrees));

        var json = JsonSerializer.Serialize(observation);
        Assert.Contains("native-player-facts-unavailable", json, StringComparison.Ordinal);
    }

    [Fact]
    public void ExplicitUnknownSector_IsAcceptedAndReplayed()
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with { NativePlayerSectorIndex = -1 });

        Assert.True(observation.InputAccepted);
        Assert.True(observation.Available);
        Assert.Equal(-1, observation.PlayerSectorIndex);
    }

    [Fact]
    public void NativeVitalityFacts_AreProjectedWithIndependentHashAndProvenance()
    {
        var healthy = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with
            {
                NativePlayerHealth = 100,
                NativePlayerState = 0,
                NativePlayerKillCount = 2
            });
        var damaged = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with
            {
                NativePlayerHealth = 75,
                NativePlayerState = 0,
                NativePlayerKillCount = 2
            });

        Assert.True(healthy.PlayerVitalityFactsAvailable);
        Assert.Equal(100, healthy.PlayerHealth);
        Assert.Equal(0, healthy.PlayerState);
        Assert.Equal(2, healthy.PlayerKillCount);
        Assert.Equal("native-player-struct-v1", healthy.PlayerVitalityProvenance);
        Assert.NotEmpty(healthy.PlayerVitalityObservationHash);
        Assert.NotEqual(
            healthy.PlayerVitalityObservationHash,
            damaged.PlayerVitalityObservationHash);
        Assert.NotEqual(healthy.ObservationHash, damaged.ObservationHash);
    }

    [Theory]
    [InlineData(-1, 0)]
    [InlineData(3, 0)]
    [InlineData(0, -1)]
    public void InvalidNativeVitalityFacts_AreRejected(int playerState, int killCount)
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with
            {
                NativePlayerState = playerState,
                NativePlayerKillCount = killCount
            });

        Assert.False(observation.InputAccepted);
        Assert.False(observation.Available);
        Assert.Equal("invalid-native-player-vitality", observation.Reason);
    }

    [Fact]
    public void UnavailableNativeVitality_DoesNotTurnDefaultZeroIntoDeath()
    {
        var observation = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with
            {
                NativePlayerVitalityFactsAvailable = false,
                NativePlayerHealth = 0,
                NativePlayerState = 1,
                NativePlayerKillCount = 0
            });

        Assert.True(observation.InputAccepted);
        Assert.True(observation.Available);
        Assert.False(observation.PlayerVitalityFactsAvailable);
        Assert.Equal(-1, observation.PlayerHealth);
        Assert.Equal(-1, observation.PlayerState);
        Assert.Equal(-1, observation.PlayerKillCount);
        Assert.Equal(
            "native-player-vitality-unavailable",
            observation.PlayerVitalityProvenance);
        Assert.Empty(observation.PlayerVitalityObservationHash);
    }

    [Fact]
    public void InvalidPoseAndUnavailableSentinel_AreDefaultJsonSerializable()
    {
        var invalid = FirstDoorNativeProximityObserver.Observe(
            ValidInput(1500, -2496) with { NativePlayerSectorIndex = -2 });
        var unavailable = FirstDoorNativeProximityObserver.Unavailable("test-unavailable");

        Assert.False(invalid.Available);
        Assert.Equal("invalid-native-player-pose", invalid.Reason);
        Assert.True(double.IsFinite(invalid.DistanceToDoorSegment));
        Assert.True(double.IsFinite(unavailable.DistanceToDoorSegment));
        Assert.NotEmpty(JsonSerializer.Serialize(invalid));
        Assert.NotEmpty(JsonSerializer.Serialize(unavailable));
    }

    private static FirstDoorNativeProximityInput ValidInput(
        double playerX,
        double playerY,
        long angleBam = 0)
        => new()
        {
            ContractVersion = FirstDoorControlStateMachine.CurrentContractVersion,
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            NativeLevelFactsAvailable = true,
            NativeGametic = 100,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            NativePlayerFactsAvailable = true,
            NativePlayerXFixed = Fixed(playerX),
            NativePlayerYFixed = Fixed(playerY),
            NativePlayerAngleBam = angleBam,
            NativePlayerMomentumXFixed = 0,
            NativePlayerMomentumYFixed = 0,
            NativePlayerSectorIndex = 1,
            NativePlayerVitalityFactsAvailable = true,
            NativePlayerHealth = 100,
            NativePlayerState = 0,
            NativePlayerKillCount = 0,
            AcquisitionMaximumDistance = 256,
            ContactApproachMaximumDistance = 96,
            UseMaximumDistance = 56
        };

    private static long Fixed(double value)
        => checked((long)Math.Round(value * 65536d));
}

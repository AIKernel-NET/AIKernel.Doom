using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record FirstDoorNativeProximityInput
{
    public int ContractVersion { get; init; }

    public string WadContentSha256 { get; init; } = string.Empty;

    public bool NativeLevelFactsAvailable { get; init; }

    public long NativeGametic { get; init; } = -1;

    public int NativeGameState { get; init; } = -1;

    public int NativeGameEpisode { get; init; } = -1;

    public int NativeGameMap { get; init; } = -1;

    public bool NativePlayerFactsAvailable { get; init; }

    public long NativePlayerXFixed { get; init; }

    public long NativePlayerYFixed { get; init; }

    public long NativePlayerAngleBam { get; init; }

    public long NativePlayerMomentumXFixed { get; init; }

    public long NativePlayerMomentumYFixed { get; init; }

    public int NativePlayerSectorIndex { get; init; } = -1;

    public bool NativePlayerVitalityFactsAvailable { get; init; }

    public int NativePlayerHealth { get; init; } = -1;

    public int NativePlayerState { get; init; } = -1;

    public int NativePlayerKillCount { get; init; } = -1;

    public double AcquisitionMaximumDistance { get; init; }

    public double ContactApproachMaximumDistance { get; init; }

    public double UseMaximumDistance { get; init; }
}

/// <summary>
/// A replayable, C#-owned E1M1 FirstDoor proximity fact derived only from
/// canonical WAD provenance and raw native fixed-point player facts.
/// </summary>
internal sealed record FirstDoorProximityObservation
{
    public int TraceVersion { get; init; } = 1;

    public bool InputAccepted { get; init; }

    public bool Available { get; init; }

    public bool Fresh { get; init; }

    public FirstDoorEvidenceTruth Truth { get; init; }

    public string Reason { get; init; } = "native-player-proximity-unavailable";

    public string ObservationHash { get; init; } = string.Empty;

    public string WadContentSha256 { get; init; } = string.Empty;

    public bool WadVerified { get; init; }

    public long NativeGametic { get; init; } = -1;

    public int NativeGameState { get; init; } = -1;

    public int NativeGameEpisode { get; init; } = -1;

    public int NativeGameMap { get; init; } = -1;

    public long PlayerXFixed { get; init; }

    public long PlayerYFixed { get; init; }

    public long PlayerAngleBam { get; init; }

    public long PlayerMomentumXFixed { get; init; }

    public long PlayerMomentumYFixed { get; init; }

    public int PlayerSectorIndex { get; init; } = -1;

    public bool PlayerVitalityFactsAvailable { get; init; }

    public int PlayerHealth { get; init; } = -1;

    public int PlayerState { get; init; } = -1;

    public int PlayerKillCount { get; init; } = -1;

    public string PlayerVitalityProvenance { get; init; }
        = "native-player-vitality-unavailable";

    public string PlayerVitalityObservationHash { get; init; } = string.Empty;

    public double PlayerX { get; init; }

    public double PlayerY { get; init; }

    public double PlayerMomentumX { get; init; }

    public double PlayerMomentumY { get; init; }

    public double HeadingDegrees { get; init; }

    public double ClosestDoorPointX { get; init; }

    public double ClosestDoorPointY { get; init; }

    // Replay/wire payloads must remain serializable with the default
    // System.Text.Json number handling. Availability/truth carry the sentinel
    // meaning; numeric fields intentionally stay finite when unavailable.
    public double DistanceToDoorSegment { get; init; }

    public double BearingToDoorDegrees { get; init; }

    public double BearingErrorDegrees { get; init; }

    public double AcquisitionMaximumDistance { get; init; }

    public double ContactApproachMaximumDistance { get; init; }

    public double UseMaximumDistance { get; init; }

    public bool WithinAcquisitionRange { get; init; }

    public bool WithinContactApproachRange { get; init; }

    public bool WithinUseRange { get; init; }
}

internal static class FirstDoorNativeProximityObserver
{
    internal const string CanonicalDoom1WadSha256
        = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";

    internal const double FirstDoorSegmentX = 1536d;
    internal const double FirstDoorSegmentMinimumY = -2560d;
    internal const double FirstDoorSegmentMaximumY = -2432d;
    internal const double DoomUserRange = 64d;

    private const double FixedUnit = 65536d;
    private const double BamFullTurn = 4294967296d;
    private const double DistanceEpsilon = 1e-9d;

    internal static FirstDoorProximityObservation Observe(FirstDoorNativeProximityInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var wadHash = NormalizeHash(input.WadContentSha256);
        if (input.ContractVersion != FirstDoorControlStateMachine.CurrentContractVersion)
        {
            return Invalid("unsupported-proximity-contract-version", wadHash);
        }

        if (!string.Equals(wadHash, CanonicalDoom1WadSha256, StringComparison.Ordinal))
        {
            return Invalid("canonical-doom1-wad-sha256-mismatch", wadHash, FirstDoorEvidenceTruth.No);
        }

        if (!input.NativeLevelFactsAvailable)
        {
            return Invalid("native-level-facts-unavailable", wadHash);
        }

        if (input.NativeGameState != 0)
        {
            return Invalid($"unsupported-native-game-state:{input.NativeGameState}", wadHash, FirstDoorEvidenceTruth.No);
        }

        if (input.NativeGameEpisode != 1 || input.NativeGameMap != 1)
        {
            return Invalid(
                $"unsupported-proximity-map:e{input.NativeGameEpisode}m{input.NativeGameMap}",
                wadHash,
                FirstDoorEvidenceTruth.No);
        }

        if (!input.NativePlayerFactsAvailable)
        {
            return Invalid("native-player-facts-unavailable", wadHash);
        }

        if (input.NativeGametic < 0)
        {
            return Invalid("native-player-gametic-unavailable", wadHash);
        }

        if (!IsInt32(input.NativePlayerXFixed)
            || !IsInt32(input.NativePlayerYFixed)
            || !IsInt32(input.NativePlayerMomentumXFixed)
            || !IsInt32(input.NativePlayerMomentumYFixed)
            || input.NativePlayerAngleBam < 0
            || input.NativePlayerAngleBam > uint.MaxValue
            || input.NativePlayerSectorIndex < -1)
        {
            return Invalid("invalid-native-player-pose", wadHash);
        }

        if (input.NativePlayerVitalityFactsAvailable
            && (input.NativePlayerState is < 0 or > 2
                || input.NativePlayerKillCount < 0))
        {
            return Invalid("invalid-native-player-vitality", wadHash);
        }

        if (!ValidDistancePolicy(input))
        {
            return Invalid("invalid-first-door-proximity-policy", wadHash);
        }

        var playerX = input.NativePlayerXFixed / FixedUnit;
        var playerY = input.NativePlayerYFixed / FixedUnit;
        var closestX = FirstDoorSegmentX;
        var closestY = Math.Clamp(
            playerY,
            FirstDoorSegmentMinimumY,
            FirstDoorSegmentMaximumY);
        var deltaX = closestX - playerX;
        var deltaY = closestY - playerY;
        var distance = Math.Sqrt((deltaX * deltaX) + (deltaY * deltaY));
        var heading = NormalizeDegrees(input.NativePlayerAngleBam * 360d / BamFullTurn);
        var bearing = distance <= DistanceEpsilon
            ? heading
            : NormalizeDegrees(Math.Atan2(deltaY, deltaX) * 180d / Math.PI);
        // Positive yaw is the browser adapter's right turn. Doom BAM angles grow
        // counter-clockwise, hence heading - bearing is the required control sign.
        var bearingError = NormalizeSignedDegrees(heading - bearing);

        return new FirstDoorProximityObservation
        {
            InputAccepted = true,
            Available = true,
            Fresh = false,
            Truth = FirstDoorEvidenceTruth.Yes,
            Reason = "native-first-door-proximity-valid",
            ObservationHash = ComputeObservationHash(input, wadHash),
            WadContentSha256 = wadHash,
            WadVerified = true,
            NativeGametic = input.NativeGametic,
            NativeGameState = input.NativeGameState,
            NativeGameEpisode = input.NativeGameEpisode,
            NativeGameMap = input.NativeGameMap,
            PlayerXFixed = input.NativePlayerXFixed,
            PlayerYFixed = input.NativePlayerYFixed,
            PlayerAngleBam = input.NativePlayerAngleBam,
            PlayerMomentumXFixed = input.NativePlayerMomentumXFixed,
            PlayerMomentumYFixed = input.NativePlayerMomentumYFixed,
            PlayerSectorIndex = input.NativePlayerSectorIndex,
            PlayerVitalityFactsAvailable = input.NativePlayerVitalityFactsAvailable,
            PlayerHealth = input.NativePlayerVitalityFactsAvailable
                ? input.NativePlayerHealth
                : -1,
            PlayerState = input.NativePlayerVitalityFactsAvailable
                ? input.NativePlayerState
                : -1,
            PlayerKillCount = input.NativePlayerVitalityFactsAvailable
                ? input.NativePlayerKillCount
                : -1,
            PlayerVitalityProvenance = input.NativePlayerVitalityFactsAvailable
                ? "native-player-struct-v1"
                : "native-player-vitality-unavailable",
            PlayerVitalityObservationHash = input.NativePlayerVitalityFactsAvailable
                ? ComputeVitalityObservationHash(input, wadHash)
                : string.Empty,
            PlayerX = playerX,
            PlayerY = playerY,
            PlayerMomentumX = input.NativePlayerMomentumXFixed / FixedUnit,
            PlayerMomentumY = input.NativePlayerMomentumYFixed / FixedUnit,
            HeadingDegrees = heading,
            ClosestDoorPointX = closestX,
            ClosestDoorPointY = closestY,
            DistanceToDoorSegment = distance,
            BearingToDoorDegrees = bearing,
            BearingErrorDegrees = bearingError,
            AcquisitionMaximumDistance = input.AcquisitionMaximumDistance,
            ContactApproachMaximumDistance = input.ContactApproachMaximumDistance,
            UseMaximumDistance = input.UseMaximumDistance,
            WithinAcquisitionRange = distance <= input.AcquisitionMaximumDistance + DistanceEpsilon,
            WithinContactApproachRange = distance <= input.ContactApproachMaximumDistance + DistanceEpsilon,
            WithinUseRange = distance <= input.UseMaximumDistance + DistanceEpsilon
        };
    }

    internal static FirstDoorProximityObservation Unavailable(string reason)
        => new()
        {
            InputAccepted = false,
            Available = false,
            Fresh = false,
            Truth = FirstDoorEvidenceTruth.Unknown,
            Reason = reason
        };

    private static FirstDoorProximityObservation Invalid(
        string reason,
        string wadHash,
        FirstDoorEvidenceTruth truth = FirstDoorEvidenceTruth.Unknown)
        => new()
        {
            InputAccepted = false,
            Available = false,
            Fresh = false,
            Truth = truth,
            Reason = reason,
            WadContentSha256 = wadHash,
            WadVerified = string.Equals(
                wadHash,
                CanonicalDoom1WadSha256,
                StringComparison.Ordinal)
        };

    private static bool ValidDistancePolicy(FirstDoorNativeProximityInput input)
        => double.IsFinite(input.AcquisitionMaximumDistance)
            && double.IsFinite(input.ContactApproachMaximumDistance)
            && double.IsFinite(input.UseMaximumDistance)
            && input.UseMaximumDistance > 0
            && input.UseMaximumDistance < DoomUserRange
            && input.ContactApproachMaximumDistance >= input.UseMaximumDistance
            && input.AcquisitionMaximumDistance >= input.ContactApproachMaximumDistance;

    private static bool IsInt32(long value)
        => value is >= int.MinValue and <= int.MaxValue;

    private static string NormalizeHash(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();

    private static double NormalizeDegrees(double value)
    {
        var normalized = value % 360d;
        return normalized < 0 ? normalized + 360d : normalized;
    }

    private static double NormalizeSignedDegrees(double value)
    {
        var normalized = NormalizeDegrees(value);
        return normalized > 180d ? normalized - 360d : normalized;
    }

    private static string ComputeObservationHash(
        FirstDoorNativeProximityInput input,
        string wadHash)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        AppendInt32(hash, input.ContractVersion);
        AppendUtf8(hash, wadHash);
        AppendInt64(hash, input.NativeGametic);
        AppendInt32(hash, input.NativeGameState);
        AppendInt32(hash, input.NativeGameEpisode);
        AppendInt32(hash, input.NativeGameMap);
        AppendInt64(hash, input.NativePlayerXFixed);
        AppendInt64(hash, input.NativePlayerYFixed);
        AppendInt64(hash, input.NativePlayerAngleBam);
        AppendInt64(hash, input.NativePlayerMomentumXFixed);
        AppendInt64(hash, input.NativePlayerMomentumYFixed);
        AppendInt32(hash, input.NativePlayerSectorIndex);
        AppendInt32(hash, input.NativePlayerVitalityFactsAvailable ? 1 : 0);
        AppendInt32(
            hash,
            input.NativePlayerVitalityFactsAvailable ? input.NativePlayerHealth : -1);
        AppendInt32(
            hash,
            input.NativePlayerVitalityFactsAvailable ? input.NativePlayerState : -1);
        AppendInt32(
            hash,
            input.NativePlayerVitalityFactsAvailable ? input.NativePlayerKillCount : -1);
        AppendInt64(hash, BitConverter.DoubleToInt64Bits(input.AcquisitionMaximumDistance));
        AppendInt64(hash, BitConverter.DoubleToInt64Bits(input.ContactApproachMaximumDistance));
        AppendInt64(hash, BitConverter.DoubleToInt64Bits(input.UseMaximumDistance));
        return Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();
    }

    private static string ComputeVitalityObservationHash(
        FirstDoorNativeProximityInput input,
        string wadHash)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        AppendInt32(hash, input.ContractVersion);
        AppendUtf8(hash, wadHash);
        AppendUtf8(hash, "native-player-struct-v1");
        AppendInt64(hash, input.NativeGametic);
        AppendInt32(hash, input.NativePlayerHealth);
        AppendInt32(hash, input.NativePlayerState);
        AppendInt32(hash, input.NativePlayerKillCount);
        return Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();
    }

    private static void AppendInt32(IncrementalHash hash, int value)
    {
        Span<byte> bytes = stackalloc byte[sizeof(int)];
        BinaryPrimitives.WriteInt32LittleEndian(bytes, value);
        hash.AppendData(bytes);
    }

    private static void AppendInt64(IncrementalHash hash, long value)
    {
        Span<byte> bytes = stackalloc byte[sizeof(long)];
        BinaryPrimitives.WriteInt64LittleEndian(bytes, value);
        hash.AppendData(bytes);
    }

    private static void AppendUtf8(IncrementalHash hash, string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        AppendInt32(hash, bytes.Length);
        hash.AppendData(bytes);
    }
}

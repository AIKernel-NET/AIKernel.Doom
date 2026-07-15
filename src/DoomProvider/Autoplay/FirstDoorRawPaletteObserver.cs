using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// Raw, versioned palette observation consumed by the pure FirstDoor observer.
/// </summary>
internal sealed record FirstDoorRawPaletteObservation
{
    public int ContractVersion { get; init; }

    public bool Available { get; init; }

    public long FrameSequence { get; init; } = -1;

    public long NativeGameticObservedAtEvaluation { get; init; } = -1;

    public int SourceWidth { get; init; }

    public int SourceHeight { get; init; }

    public int GameplayHeight { get; init; }

    public string Layout { get; init; } = string.Empty;

    public int Columns { get; init; }

    public int Rows { get; init; }

    public IReadOnlyList<byte> PaletteIndices { get; init; } = Array.Empty<byte>();

    public bool PaletteAvailable { get; init; }

    public long PaletteGeneration { get; init; } = -1;

    public string PaletteProvenance { get; init; } = string.Empty;

    /// <summary>
    /// Exactly 256 RGBA entries encoded as 1,024 bytes in R,G,B,A order.
    /// </summary>
    public IReadOnlyList<byte> PaletteRgbaBytes { get; init; } = Array.Empty<byte>();
}

/// <summary>
/// The replayable best 2x2 FirstDoor candidate in the projected 9x9 grid.
/// </summary>
internal sealed record FirstDoorRawPaletteBox
{
    public int Column { get; init; }

    public int Row { get; init; }

    public int Columns { get; init; } = 2;

    public int Rows { get; init; } = 2;

    public double Score { get; init; }

    public double RedScore { get; init; }

    public double EdgeScore { get; init; }

    public double DoorScore { get; init; }

    public double DarkPanelScore { get; init; }

    public string Kind { get; init; } = string.Empty;
}

/// <summary>
/// Stateless per-frame evidence. Temporal windows and route admission are deliberately absent.
/// </summary>
internal sealed record FirstDoorRawPaletteEvidence
{
    public string ObserverVersion { get; init; } = FirstDoorRawPaletteObserver.ObserverVersion;

    public bool InputAccepted { get; init; }

    public FirstDoorEvidenceTruth Truth { get; init; }

    public string Reason { get; init; } = string.Empty;

    public string ObservationHash { get; init; } = string.Empty;

    /// <summary>
    /// Hash of the canonical sampled RGBA pixels and layout only. Unlike
    /// ObservationHash, it deliberately excludes frame/evaluation metadata so
    /// pre/post-transition visual content can be compared across fresh frames.
    /// </summary>
    public string VisualContentHash { get; init; } = string.Empty;

    public long FrameSequence { get; init; } = -1;

    public long NativeGameticObservedAtEvaluation { get; init; } = -1;

    public string Layout { get; init; } = string.Empty;

    public long PaletteGeneration { get; init; } = -1;

    public string PaletteProvenance { get; init; } = string.Empty;

    public int PaletteIndexCount { get; init; }

    public int PaletteEntryCount { get; init; }

    public int PaletteRgbaByteCount { get; init; }

    public string CandidateKind { get; init; } = string.Empty;

    public double Score { get; init; }

    public double RedScore { get; init; }

    public double EdgeScore { get; init; }

    public double DoorScore { get; init; }

    public double DarkPanelScore { get; init; }

    public FirstDoorRawPaletteBox? Box { get; init; }

    /// <summary>
    /// Semantic identity result. CandidateKind/Score/Box remain the dominant
    /// legacy local-candidate diagnostics and are never repurposed as facade
    /// alignment data.
    /// </summary>
    public string IdentityKind { get; init; } = string.Empty;

    public double IdentityConfidence { get; init; }

    public FirstDoorRawPaletteBox? AlignmentBox { get; init; }

    public IReadOnlyList<int> Vision9x9 { get; init; } = Array.Empty<int>();

    public IReadOnlyList<double> Door9x9 { get; init; } = Array.Empty<double>();

    public IReadOnlyList<double> Red9x9 { get; init; } = Array.Empty<double>();

    public IReadOnlyList<double> Heatmap9x9 { get; init; } = Array.Empty<double>();

    public double GameplayLuma { get; init; }

    public double DarkAreaScore { get; init; }

    public double ComputerBlueScore { get; init; }

    /// <summary>
    /// Room-confirmation-only spatial evidence for the dark blue COMPTILE grid.
    /// This is deliberately not folded into the generic blue/room scores here;
    /// the browser session may project it only at the canonical sector-7 pose.
    /// </summary>
    public double ComputerRoomStructuredBlueScore { get; init; }

    public int ComputerRoomStructuredBlueCellCount { get; init; }

    public int ComputerRoomStructuredBlueRowCount { get; init; }

    public int ComputerRoomStructuredBlueColumnCount { get; init; }

    public double ComputerRedLightScore { get; init; }

    public double ComputerDarkPanelScore { get; init; }

    public double ComputerPanelScore { get; init; }

    public double ComputerRoomScore { get; init; }

    public double FootObstacleScore { get; init; }
}

/// <summary>
/// Reproduces the legacy per-frame palette projection without accepting legacy semantic output.
/// </summary>
internal static class FirstDoorRawPaletteObserver
{
    public const int CurrentContractVersion = 1;
    public const string LayoutId = "pal8-center-20x13-v1";
    public const string ObserverVersion = "first-door-raw-palette-observer-v4";
    public const int SourceWidth = 320;
    public const int SourceHeight = 200;
    public const int GameplayHeight = 168;
    public const int SampleColumns = 20;
    public const int SampleRows = 13;
    public const int SampleCount = SampleColumns * SampleRows;
    public const int PaletteEntryCount = 256;
    public const int PaletteRgbaByteCount = PaletteEntryCount * 4;

    private const int VisionColumns = 9;
    private const int VisionRows = 9;
    private const int VisionCellCount = VisionColumns * VisionRows;
    private const double WallQuantizationStep = 16;
    private const double FirstDoorRedAccentThreshold = 0.065;
    private const double MinimumDoorIdentityScore = 0.46;
    private const double MinimumBoxScore = 0.24;
    private const string ClosedGrayTechFaceKind = "first-door-closed-gray-tech-face";

    public static FirstDoorRawPaletteEvidence Observe(FirstDoorRawPaletteObservation? observation)
    {
        var validationFailure = Validate(observation);
        if (validationFailure.Length > 0)
        {
            return Invalid(observation, validationFailure);
        }

        var input = observation!;
        var visionTotals = new int[VisionCellCount];
        var visionCounts = new int[VisionCellCount];
        var doorTotals = new double[VisionCellCount];
        var doorCounts = new int[VisionCellCount];
        var doorMax = new double[VisionCellCount];
        var redTotals = new double[VisionCellCount];
        var redCounts = new int[VisionCellCount];
        var redMax = new double[VisionCellCount];

        double darkAreaTotal = 0;
        double gameplayLumaTotal = 0;
        var gameplayLumaCount = 0;
        double computerBlue = 0;
        var computerBlueCount = 0;
        var computerRoomStructuredBlueCellCount = 0;
        var computerRoomStructuredBlueRows = new bool[SampleRows];
        var computerRoomStructuredBlueColumns = new bool[SampleColumns];
        double computerRedLight = 0;
        var computerRedLightCount = 0;
        double computerDarkPanel = 0;
        var computerDarkPanelCount = 0;
        double computerPanel = 0;
        var computerPanelCount = 0;
        double footObstacle = 0;
        double footObstacleMax = 0;
        var footObstacleCount = 0;

        for (var row = 0; row < SampleRows; row++)
        {
            for (var column = 0; column < SampleColumns; column++)
            {
                var value = input.PaletteIndices[(row * SampleColumns) + column];
                var dark = ScoreDarkPaletteIndex(value, input.PaletteRgbaBytes);
                darkAreaTotal += dark.Score;
                if (dark.Luma > 0)
                {
                    gameplayLumaTotal += dark.Luma;
                    gameplayLumaCount++;
                }

                if (row is >= 1 and <= 10 && column is >= 3 and <= 18)
                {
                    computerBlue += ScoreComputerRoomBluePaletteIndex(value, input.PaletteRgbaBytes);
                    computerBlueCount++;
                }

                // Human-facing columns 6..13 are zero-based 5..12 here.
                if (row is >= 1 and <= 10
                    && column is >= 5 and <= 12
                    && IsComputerRoomStructuredDeepBluePaletteIndex(value, input.PaletteRgbaBytes))
                {
                    computerRoomStructuredBlueCellCount++;
                    computerRoomStructuredBlueRows[row] = true;
                    computerRoomStructuredBlueColumns[column] = true;
                }

                if (row is >= 0 and <= 5 && column is >= 2 and <= 19)
                {
                    computerRedLight += ScoreComputerRoomRedLightPaletteIndex(value, input.PaletteRgbaBytes);
                    computerRedLightCount++;
                }

                if (row is >= 1 and <= 10 && column is >= 2 and <= 19)
                {
                    computerDarkPanel += ScoreComputerRoomDarkPanelPaletteIndex(value, input.PaletteRgbaBytes);
                    computerPanel += ScoreComputerRoomPanelPaletteIndex(value, input.PaletteRgbaBytes);
                    computerDarkPanelCount++;
                    computerPanelCount++;
                }

                if (row is >= 6 and <= 12 && column is >= 7 and <= 19)
                {
                    var footScore = ScoreFootObstaclePaletteIndex(value, input.PaletteRgbaBytes);
                    footObstacle += footScore;
                    footObstacleMax = Math.Max(footObstacleMax, footScore);
                    footObstacleCount++;
                }

                var visionColumn = Math.Min(VisionColumns - 1, column * VisionColumns / SampleColumns);
                var visionRow = Math.Min(VisionRows - 1, row * VisionRows / SampleRows);
                var visionIndex = (visionRow * VisionColumns) + visionColumn;
                visionTotals[visionIndex] += value;
                visionCounts[visionIndex]++;

                var doorScore = Math.Max(
                    ScoreBridgeDoorPanelPaletteIndex(value, input.PaletteRgbaBytes),
                    Math.Max(
                        ScoreBridgeBrownPaletteIndex(value, input.PaletteRgbaBytes) * 0.64,
                        ScoreSpawnCorridorPillarPaletteIndex(value, input.PaletteRgbaBytes) * 0.34));
                var redScore = ScoreFirstDoorRedAccentPaletteIndex(value, input.PaletteRgbaBytes);
                doorTotals[visionIndex] += doorScore;
                doorCounts[visionIndex]++;
                doorMax[visionIndex] = Math.Max(doorMax[visionIndex], doorScore);
                redTotals[visionIndex] += redScore;
                redCounts[visionIndex]++;
                redMax[visionIndex] = Math.Max(redMax[visionIndex], redScore);
            }
        }

        var vision9x9 = new int[VisionCellCount];
        var door9x9 = new double[VisionCellCount];
        var red9x9 = new double[VisionCellCount];
        for (var index = 0; index < VisionCellCount; index++)
        {
            vision9x9[index] = visionCounts[index] > 0
                ? JsRoundToInt((double)visionTotals[index] / visionCounts[index])
                : 0;
            door9x9[index] = doorCounts[index] > 0
                ? Round2(Clamp01(Math.Max(doorTotals[index] / doorCounts[index], doorMax[index] * 0.62)))
                : 0;
            red9x9[index] = redCounts[index] > 0
                ? Round2(Clamp01(Math.Max(redTotals[index] / redCounts[index], redMax[index] * 0.72)))
                : 0;
        }

        var candidate = ScoreFirstDoorVision9x9(vision9x9, door9x9, red9x9);
        var dominant = candidate.DominantCandidate;

        var computerBlueScore = Round2(Clamp01(computerBlueCount > 0 ? computerBlue / computerBlueCount : 0));
        var computerRoomStructuredBlueRowCount = computerRoomStructuredBlueRows.Count(value => value);
        var computerRoomStructuredBlueColumnCount = computerRoomStructuredBlueColumns.Count(value => value);
        var computerRoomStructuredBlueScore = Round2(Clamp01(0.24d * Math.Min(
            computerRoomStructuredBlueCellCount / 12d,
            Math.Min(
                computerRoomStructuredBlueRowCount / 4d,
                computerRoomStructuredBlueColumnCount / 6d))));
        var computerRedLightScore = Round2(Clamp01(computerRedLightCount > 0 ? computerRedLight / computerRedLightCount : 0));
        var computerDarkPanelScore = Round2(Clamp01(computerDarkPanelCount > 0 ? computerDarkPanel / computerDarkPanelCount : 0));
        var computerPanelScore = Round2(Clamp01(computerPanelCount > 0 ? computerPanel / computerPanelCount : 0));
        var darkAreaAverage = darkAreaTotal / SampleCount;
        var computerRoomScore = Round2(Clamp01(
            (computerBlueScore * 0.28)
            + (computerRedLightScore * 0.22)
            + (computerDarkPanelScore * 0.24)
            + (computerPanelScore * 0.18)
            + (darkAreaAverage * 0.08)));
        var footObstacleAverage = footObstacleCount > 0 ? footObstacle / footObstacleCount : 0;
        var footObstacleScore = Round2(Clamp01(Math.Max(footObstacleAverage, footObstacleMax * 0.65)));
        var facade = AnalyzeClosedGrayTechFace(
            input,
            candidate,
            gameplayLumaCount > 0 ? gameplayLumaTotal / gameplayLumaCount : 0,
            computerBlueScore,
            computerRedLightScore,
            computerDarkPanelScore,
            computerPanelScore);
        var identity = ResolveIdentity(candidate, facade);

        return new FirstDoorRawPaletteEvidence
        {
            InputAccepted = true,
            Truth = identity.Truth,
            Reason = identity.Reason,
            ObservationHash = ComputeObservationHash(input),
            VisualContentHash = ComputeVisualContentHash(input),
            FrameSequence = input.FrameSequence,
            NativeGameticObservedAtEvaluation = input.NativeGameticObservedAtEvaluation,
            Layout = input.Layout,
            PaletteGeneration = input.PaletteGeneration,
            PaletteProvenance = input.PaletteProvenance.Trim(),
            PaletteIndexCount = input.PaletteIndices.Count,
            PaletteEntryCount = PaletteEntryCount,
            PaletteRgbaByteCount = input.PaletteRgbaBytes.Count,
            CandidateKind = dominant?.Kind ?? string.Empty,
            Score = candidate.Score,
            RedScore = candidate.RedScore,
            EdgeScore = dominant?.EdgeScore ?? 0,
            DoorScore = dominant?.DoorScore ?? 0,
            DarkPanelScore = dominant?.DarkPanelScore ?? 0,
            Box = candidate.Box,
            IdentityKind = identity.Kind,
            IdentityConfidence = identity.Confidence,
            AlignmentBox = identity.AlignmentBox,
            Vision9x9 = vision9x9,
            Door9x9 = door9x9,
            Red9x9 = red9x9,
            Heatmap9x9 = candidate.Heatmap,
            GameplayLuma = gameplayLumaCount > 0 ? Round2(gameplayLumaTotal / gameplayLumaCount) : 0,
            DarkAreaScore = Round2(darkAreaAverage),
            ComputerBlueScore = computerBlueScore,
            ComputerRoomStructuredBlueScore = computerRoomStructuredBlueScore,
            ComputerRoomStructuredBlueCellCount = computerRoomStructuredBlueCellCount,
            ComputerRoomStructuredBlueRowCount = computerRoomStructuredBlueRowCount,
            ComputerRoomStructuredBlueColumnCount = computerRoomStructuredBlueColumnCount,
            ComputerRedLightScore = computerRedLightScore,
            ComputerDarkPanelScore = computerDarkPanelScore,
            ComputerPanelScore = computerPanelScore,
            ComputerRoomScore = computerRoomScore,
            FootObstacleScore = footObstacleScore
        };
    }

    private static string Validate(FirstDoorRawPaletteObservation? input)
    {
        if (input is null)
        {
            return "raw-palette-observation-missing";
        }

        if (!input.Available)
        {
            return "raw-palette-unavailable";
        }

        if (input.ContractVersion != CurrentContractVersion)
        {
            return "raw-palette-contract-version-unsupported";
        }

        if (!string.Equals(input.Layout?.Trim(), LayoutId, StringComparison.Ordinal))
        {
            return "raw-palette-layout-mismatch";
        }

        if (input.SourceWidth != SourceWidth
            || input.SourceHeight != SourceHeight
            || input.GameplayHeight != GameplayHeight)
        {
            return "raw-palette-source-geometry-mismatch";
        }

        if (input.Columns != SampleColumns || input.Rows != SampleRows)
        {
            return "raw-palette-grid-mismatch";
        }

        if (input.FrameSequence < 0 || input.NativeGameticObservedAtEvaluation < -1)
        {
            return "raw-palette-evaluation-metadata-missing";
        }

        if (input.PaletteIndices is null || input.PaletteIndices.Count != SampleCount)
        {
            return "raw-palette-index-count-invalid";
        }

        if (!input.PaletteAvailable)
        {
            return "raw-palette-table-unavailable";
        }

        if (input.PaletteGeneration <= 0)
        {
            return "raw-palette-generation-missing";
        }

        var paletteProvenance = input.PaletteProvenance?.Trim();
        if (string.IsNullOrWhiteSpace(paletteProvenance)
            || string.Equals(paletteProvenance, "unknown", StringComparison.OrdinalIgnoreCase)
            || string.Equals(paletteProvenance, "none", StringComparison.OrdinalIgnoreCase))
        {
            return "raw-palette-provenance-missing";
        }

        if (input.PaletteRgbaBytes is null || input.PaletteRgbaBytes.Count != PaletteRgbaByteCount)
        {
            return "raw-palette-entry-count-invalid";
        }

        return string.Empty;
    }

    private static FirstDoorRawPaletteEvidence Invalid(
        FirstDoorRawPaletteObservation? input,
        string reason)
    {
        var rgbaByteCount = input?.PaletteRgbaBytes?.Count ?? 0;
        return new FirstDoorRawPaletteEvidence
        {
            InputAccepted = false,
            Truth = FirstDoorEvidenceTruth.Unknown,
            Reason = reason,
            FrameSequence = input?.FrameSequence ?? -1,
            NativeGameticObservedAtEvaluation = input?.NativeGameticObservedAtEvaluation ?? -1,
            Layout = input?.Layout ?? string.Empty,
            PaletteGeneration = input?.PaletteGeneration ?? -1,
            PaletteProvenance = input?.PaletteProvenance?.Trim() ?? string.Empty,
            PaletteIndexCount = input?.PaletteIndices?.Count ?? 0,
            PaletteEntryCount = rgbaByteCount / 4,
            PaletteRgbaByteCount = rgbaByteCount
        };
    }

    private static CandidateAnalysis ScoreFirstDoorVision9x9(
        IReadOnlyList<int> vision,
        IReadOnlyList<double> door,
        IReadOnlyList<double> red)
    {
        var heatmap = new double[VisionCellCount];
        var candidates = new List<FirstDoorRawPaletteBox>(49);
        double bestScore = 0;
        FirstDoorRawPaletteBox? bestCandidate = null;
        double bestRedScore = 0;

        for (var row = 1; row < VisionRows - 1; row++)
        {
            for (var column = 1; column < VisionColumns - 1; column++)
            {
                var i0 = (row * VisionColumns) + column;
                var i1 = i0 + 1;
                var i2 = i0 + VisionColumns;
                var i3 = i2 + 1;
                var raw0 = (double)vision[i0];
                var raw1 = vision[i1];
                var raw2 = vision[i2];
                var raw3 = vision[i3];
                var rawMin = Math.Min(Math.Min(raw0, raw1), Math.Min(raw2, raw3));
                var rawMax = Math.Max(Math.Max(raw0, raw1), Math.Max(raw2, raw3));
                var rawAverage = (raw0 + raw1 + raw2 + raw3) * 0.25;
                var quant0 = JsRoundToInt(raw0 / WallQuantizationStep);
                var quant1 = JsRoundToInt(raw1 / WallQuantizationStep);
                var quant2 = JsRoundToInt(raw2 / WallQuantizationStep);
                var quant3 = JsRoundToInt(raw3 / WallQuantizationStep);
                var quantizedSpread = Math.Max(Math.Max(quant0, quant1), Math.Max(quant2, quant3))
                    - Math.Min(Math.Min(quant0, quant1), Math.Min(quant2, quant3));
                var door0 = door[i0];
                var door1 = door[i1];
                var door2 = door[i2];
                var door3 = door[i3];
                var doorAverage = Clamp01((door0 + door1 + door2 + door3) * 0.25);
                var doorPeak = Math.Max(Math.Max(door0, door1), Math.Max(door2, door3));
                var red0 = red[i0];
                var red1 = red[i1];
                var red2 = red[i2];
                var red3 = red[i3];
                var redAverage = Clamp01((red0 + red1 + red2 + red3) * 0.25);
                var redPeak = Math.Max(Math.Max(red0, red1), Math.Max(red2, red3));
                var redEvidence = Clamp01((redAverage * 0.68) + (redPeak * 0.32));

                var leftIndex0 = (row * VisionColumns) + Math.Max(0, column - 1);
                var leftIndex1 = ((row + 1) * VisionColumns) + Math.Max(0, column - 1);
                var rightIndex0 = (row * VisionColumns) + Math.Min(VisionColumns - 1, column + 2);
                var rightIndex1 = ((row + 1) * VisionColumns) + Math.Min(VisionColumns - 1, column + 2);
                var aboveIndex0 = (Math.Max(0, row - 1) * VisionColumns) + column;
                var aboveIndex1 = aboveIndex0 + 1;
                var belowIndex0 = (Math.Min(VisionRows - 1, row + 2) * VisionColumns) + column;
                var belowIndex1 = belowIndex0 + 1;
                var leftAverage = (vision[leftIndex0] + vision[leftIndex1]) * 0.5;
                var rightAverage = (vision[rightIndex0] + vision[rightIndex1]) * 0.5;
                var aboveAverage = (vision[aboveIndex0] + vision[aboveIndex1]) * 0.5;
                var belowAverage = (vision[belowIndex0] + vision[belowIndex1]) * 0.5;
                var sideContrast = Clamp01(Math.Max(
                    Math.Abs(leftAverage - rawAverage),
                    Math.Abs(rightAverage - rawAverage)) / 96);
                var verticalContrast = Clamp01(Math.Max(
                    Math.Abs(aboveAverage - rawAverage),
                    Math.Abs(belowAverage - rawAverage)) / 112);
                var stripeContrast = Clamp01(Math.Abs((raw0 + raw2) - (raw1 + raw3)) / 192);
                var edgePattern = Clamp01(
                    (sideContrast * 0.42)
                    + (verticalContrast * 0.22)
                    + (stripeContrast * 0.36));
                var darkPanelBand = row is >= 2 and <= 5;
                var darkPanelEvidence = darkPanelBand
                    ? Clamp01(((doorAverage * 0.72) + (doorPeak * 0.28)) * edgePattern * 1.35)
                    : 0;
                var uniformPatch = Clamp01((56 - (rawMax - rawMin)) / 56);
                var quantizedPatch = Clamp01((4 - quantizedSpread) / 4d);
                var centerDistance = Math.Abs((column + 1) - ((VisionColumns - 1) * 0.5))
                    / ((VisionColumns - 1) * 0.5);
                var centerWeight = Clamp01(1 - centerDistance);
                var midLowerWeight = row is >= 3 and <= 6 ? 1 : (row is >= 2 and <= 7 ? 0.66 : 0.32);
                var redDoorBand = row is >= 2 and <= 4;
                var floorRedRisk = row >= 6
                    ? redEvidence
                    : (row == 5 ? redEvidence * (belowAverage > rawAverage + 10 ? 0.92 : 0.72) : 0);
                var floorRedCandidate = row >= 5
                    && redEvidence >= FirstDoorRedAccentThreshold * 0.68;
                var doorRedEvidence = redDoorBand ? redEvidence : 0;
                var redGate = Clamp01(doorRedEvidence / FirstDoorRedAccentThreshold);
                var darkRedRectangle = redDoorBand
                    && doorRedEvidence >= FirstDoorRedAccentThreshold * 0.78
                    && uniformPatch >= 0.42
                    && quantizedPatch >= 0.42
                    && centerWeight >= 0.34;
                var orangeWallPenalty = redGate < 0.72 && doorAverage >= 0.24
                    ? (centerWeight >= 0.78 ? 0.08 : 0.18)
                    : 0;
                var baseScore = Clamp01(
                    (doorAverage * 0.24)
                    + (doorPeak * 0.08)
                    + (doorRedEvidence * (darkRedRectangle ? 0.34 : 0.24))
                    + (darkPanelEvidence * 0.18)
                    + (quantizedPatch * 0.11)
                    + (uniformPatch * 0.07)
                    + (edgePattern * 0.14)
                    + (centerWeight * 0.06)
                    + (midLowerWeight * 0.06)
                    + (darkRedRectangle ? 0.06 : 0)
                    - orangeWallPenalty
                    - (floorRedRisk * 0.48));
                var score = floorRedCandidate ? Math.Min(baseScore, 0.2) : baseScore;
                var kind = floorRedRisk >= FirstDoorRedAccentThreshold
                    ? "first-door-floor-red"
                    : (doorRedEvidence >= FirstDoorRedAccentThreshold
                        && (edgePattern >= 0.22 || darkRedRectangle)
                        ? "first-door-9x9-patch"
                        : (darkPanelBand
                            && darkPanelEvidence >= 0.24
                            && centerWeight >= 0.55
                            && midLowerWeight >= 0.66
                            ? "first-door-dark-panel"
                            : "first-door-wall-pattern"));
                var currentCandidate = new FirstDoorRawPaletteBox
                {
                    Column = column,
                    Row = row,
                    Score = Round2(score),
                    RedScore = Round2(doorRedEvidence),
                    EdgeScore = Round2(edgePattern),
                    DoorScore = Round2(doorAverage),
                    DarkPanelScore = Round2(darkPanelEvidence),
                    Kind = kind
                };
                candidates.Add(currentCandidate);

                heatmap[i0] = Math.Max(heatmap[i0], score);
                heatmap[i1] = Math.Max(heatmap[i1], score);
                heatmap[i2] = Math.Max(heatmap[i2], score);
                heatmap[i3] = Math.Max(heatmap[i3], score);
                bestRedScore = Math.Max(bestRedScore, doorRedEvidence);
                if (score > bestScore)
                {
                    bestScore = score;
                    bestCandidate = currentCandidate;
                }
            }
        }

        var roundedScore = Round2(bestScore);
        return new CandidateAnalysis(
            roundedScore,
            bestScore >= MinimumBoxScore ? bestCandidate : null,
            bestCandidate,
            heatmap.Select(Round2).ToArray(),
            Round2(bestRedScore),
            candidates);
    }

    private static IdentityResult ResolveIdentity(
        CandidateAnalysis candidate,
        FacadeAnalysis facade)
    {
        var best = candidate.DominantCandidate;
        if (best is null)
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "first-door-candidate-absent",
                string.Empty,
                0,
                null);
        }

        if (string.Equals(best.Kind, "first-door-floor-red", StringComparison.Ordinal))
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.No,
                "rejected-kind:first-door-floor-red",
                string.Empty,
                0,
                null);
        }

        if (candidate.Box is null)
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "first-door-candidate-below-box-threshold",
                string.Empty,
                0,
                null);
        }

        if (facade.Accepted)
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Yes,
                $"accepted-kind:{ClosedGrayTechFaceKind}",
                ClosedGrayTechFaceKind,
                facade.Confidence,
                facade.AlignmentBox);
        }

        if (string.Equals(best.Kind, "first-door-wall-pattern", StringComparison.Ordinal))
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "ambiguous-kind:first-door-wall-pattern",
                string.Empty,
                0,
                null);
        }

        if (!string.Equals(best.Kind, "first-door-9x9-patch", StringComparison.Ordinal)
            && !string.Equals(best.Kind, "first-door-dark-panel", StringComparison.Ordinal))
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "unrecognized-kind",
                string.Empty,
                0,
                null);
        }

        if (best.Column is < 3 or > 4)
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "first-door-not-centered",
                string.Empty,
                0,
                null);
        }

        if (candidate.Score < MinimumDoorIdentityScore)
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "first-door-score-below-threshold",
                string.Empty,
                0,
                null);
        }

        if (string.Equals(best.Kind, "first-door-dark-panel", StringComparison.Ordinal)
            && (best.DarkPanelScore < 0.24 || best.EdgeScore < 0.30))
        {
            return new IdentityResult(
                FirstDoorEvidenceTruth.Unknown,
                "first-door-dark-panel-evidence-below-threshold",
                string.Empty,
                0,
                null);
        }

        return new IdentityResult(
            FirstDoorEvidenceTruth.Yes,
            $"accepted-kind:{best.Kind}",
            best.Kind,
            candidate.Score,
            candidate.Box);
    }

    private static FacadeAnalysis AnalyzeClosedGrayTechFace(
        FirstDoorRawPaletteObservation input,
        CandidateAnalysis candidate,
        double gameplayLuma,
        double computerBlueScore,
        double computerRedLightScore,
        double computerDarkPanelScore,
        double computerPanelScore)
    {
        var dominant = candidate.DominantCandidate;
        if (dominant is null
            || string.Equals(dominant.Kind, "first-door-floor-red", StringComparison.Ordinal))
        {
            return FacadeAnalysis.Rejected;
        }

        var spatial = MeasureFacadeSpatialFeatures(input);
        var hasFloorRedCandidate = candidate.Candidates.Any(box => string.Equals(
            box.Kind,
            "first-door-floor-red",
            StringComparison.Ordinal));
        var cleanRedFacade = !hasFloorRedCandidate && candidate.RedScore <= 0.01;
        // This is a separate structural identity kind, not a lower generic
        // candidate threshold. The two scale profiles are frozen from exact
        // dev1046 sightline and dev969 stationary closed-door PAL8 captures;
        // dev1045 far-field, uniform gray, and COMPUTERROOM captures are the
        // fail-closed controls. Composite room score is deliberately absent.
        var wallPatternProfile = cleanRedFacade
            && string.Equals(
                dominant.Kind,
                "first-door-wall-pattern",
                StringComparison.Ordinal)
            && InRange(candidate.Score, 0.34, 0.45)
            && InRange(dominant.EdgeScore, 0.04, 0.24)
            && InRange(dominant.DoorScore, 0.18, 0.45)
            && InRange(gameplayLuma, 60, 85)
            && computerBlueScore <= 0.02
            && computerRedLightScore <= 0.08
            && InRange(computerDarkPanelScore, 0.18, 0.50)
            && InRange(computerPanelScore, 0.29, 0.45)
            && spatial.CenterNeutralRatio >= 0.60
            && spatial.CenterDarkNeutralRatio >= 0.50
            && spatial.MaximumBilateralLumaAgreement >= 0.60;
        var closeDarkPanelProfile = cleanRedFacade
            && string.Equals(
                dominant.Kind,
                "first-door-dark-panel",
                StringComparison.Ordinal)
            && InRange(candidate.Score, 0.40, 0.48)
            && InRange(dominant.EdgeScore, 0.30, 0.48)
            && InRange(dominant.DoorScore, 0.45, 0.64)
            && InRange(gameplayLuma, 36, 70)
            && computerBlueScore <= 0.02
            && computerRedLightScore <= 0.08
            && InRange(computerDarkPanelScore, 0.30, 0.70)
            && InRange(computerPanelScore, 0.16, 0.32)
            && spatial.CenterNeutralRatio >= 0.65
            && spatial.CenterDarkNeutralRatio >= 0.70
            && spatial.MaximumBilateralLumaAgreement >= 0.75;
        // The real dev1047 contact view is substantially brighter and cropped
        // compared with the dev969 close fixture. Red foreground/door accents
        // may create non-dominant floor-risk windows, so that tolerance is
        // isolated to this tightly bounded profile rather than weakening the
        // two clean-red profiles or the generic identity path.
        var brightCroppedContactProfile = (string.Equals(
                dominant.Kind,
                "first-door-wall-pattern",
                StringComparison.Ordinal)
            || string.Equals(
                dominant.Kind,
                "first-door-9x9-patch",
                StringComparison.Ordinal))
            && InRange(candidate.Score, 0.34, 0.56)
            && candidate.RedScore <= 0.37
            && InRange(dominant.EdgeScore, 0.01, 0.20)
            && InRange(dominant.DoorScore, 0.19, 0.36)
            && InRange(gameplayLuma, 88, 98)
            && computerBlueScore <= 0.01
            && computerRedLightScore <= 0.06
            && InRange(computerDarkPanelScore, 0.05, 0.12)
            && InRange(computerPanelScore, 0.29, 0.37)
            && spatial.CenterNeutralRatio >= 0.80
            && spatial.CenterDarkNeutralRatio >= 0.27
            && spatial.MaximumBilateralLumaAgreement >= 0.70;
        if (!wallPatternProfile && !closeDarkPanelProfile && !brightCroppedContactProfile)
        {
            return FacadeAnalysis.Rejected;
        }

        var minimumAnchorDoorScore = closeDarkPanelProfile ? 0.30 : 0.19;
        var minimumAnchorRow = closeDarkPanelProfile ? 2 : 3;
        // Column 3 is the actual 2x2 lattice window whose center is the 9x9
        // facade symmetry axis x=4. Keep the scored box itself as the anchor;
        // the moving dominant boxes (columns 5 -> 3 -> 2 in dev1046) are only
        // diagnostics and must never author yaw.
        var alignmentBox = candidate.Candidates
            .Where(box => box.Column == 3
                && box.Row >= minimumAnchorRow
                && box.Row <= 4
                && box.DoorScore >= minimumAnchorDoorScore
                && !string.Equals(box.Kind, "first-door-floor-red", StringComparison.Ordinal))
            .OrderByDescending(box => box.Score)
            .ThenByDescending(box => box.DoorScore)
            .ThenBy(box => Math.Abs(box.Row - 3))
            .FirstOrDefault();
        if (alignmentBox is null)
        {
            return FacadeAnalysis.Rejected;
        }

        var confidence = Round2(Clamp01(
            0.10
            + (alignmentBox.DoorScore * 0.40)
            + (spatial.CenterNeutralRatio * 0.20)
            + (spatial.CenterDarkNeutralRatio * 0.15)
            + (spatial.MaximumBilateralLumaAgreement * 0.15)));
        return new FacadeAnalysis(true, confidence, alignmentBox);
    }

    private static FacadeSpatialFeatures MeasureFacadeSpatialFeatures(
        FirstDoorRawPaletteObservation input)
    {
        var centerCount = 0;
        var centerNeutralCount = 0;
        var centerDarkNeutralCount = 0;
        for (var row = 1; row <= 10; row++)
        {
            for (var column = 4; column <= 15; column++)
            {
                ReadRgb(
                    input.PaletteIndices[(row * SampleColumns) + column],
                    input.PaletteRgbaBytes,
                    out var red,
                    out var green,
                    out var blue);
                var luma = Luma(red, green, blue);
                var spread = Math.Max(Math.Max(red, green), blue)
                    - Math.Min(Math.Min(red, green), blue);
                centerCount++;
                if (spread <= 28)
                {
                    centerNeutralCount++;
                }

                if (spread <= 36 && luma is >= 8 and <= 96)
                {
                    centerDarkNeutralCount++;
                }
            }
        }

        var centerNeutralRatio = centerCount > 0
            ? (double)centerNeutralCount / centerCount
            : 0;
        var centerDarkNeutralRatio = centerCount > 0
            ? (double)centerDarkNeutralCount / centerCount
            : 0;
        return new FacadeSpatialFeatures(
            centerNeutralRatio,
            centerDarkNeutralRatio,
            Math.Max(
                MeasureBilateralLumaAgreement(input, axisTwice: 19),
                MeasureBilateralLumaAgreement(input, axisTwice: 21)));
    }

    private static double MeasureBilateralLumaAgreement(
        FirstDoorRawPaletteObservation input,
        int axisTwice)
    {
        double differenceTotal = 0;
        var pairCount = 0;
        for (var row = 1; row <= 10; row++)
        {
            for (var column = 3; column * 2 < axisTwice; column++)
            {
                var mirrorColumn = axisTwice - column;
                if (mirrorColumn is < 0 or >= SampleColumns)
                {
                    continue;
                }

                ReadRgb(
                    input.PaletteIndices[(row * SampleColumns) + column],
                    input.PaletteRgbaBytes,
                    out var leftRed,
                    out var leftGreen,
                    out var leftBlue);
                ReadRgb(
                    input.PaletteIndices[(row * SampleColumns) + mirrorColumn],
                    input.PaletteRgbaBytes,
                    out var rightRed,
                    out var rightGreen,
                    out var rightBlue);
                differenceTotal += Math.Abs(
                    Luma(leftRed, leftGreen, leftBlue)
                    - Luma(rightRed, rightGreen, rightBlue));
                pairCount++;
            }
        }

        return pairCount > 0
            ? 1 - Clamp01((differenceTotal / pairCount) / 96)
            : 0;
    }

    private static bool InRange(double value, double minimum, double maximum)
        => double.IsFinite(value) && value >= minimum && value <= maximum;

    private static DarkPaletteScore ScoreDarkPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var saturation = Math.Max(Math.Max(red, green), blue) - Math.Min(Math.Min(red, green), blue);
        var dark = luma <= 78 && saturation >= 8;
        return new DarkPaletteScore(dark ? Clamp01((78 - luma) / 78) : 0, luma);
    }

    private static double ScoreBridgeDoorPanelPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var saturation = Math.Max(Math.Max(red, green), blue) - Math.Min(Math.Min(red, green), blue);
        var darkDoorBrown = red >= green - 4
            && green >= blue - 2
            && luma is >= 18 and <= 96
            && saturation >= 10;
        var blackPanel = luma is >= 8 and <= 42 && saturation <= 36;
        return darkDoorBrown
            ? Clamp01((96 - luma) / 78)
            : (blackPanel ? Clamp01((42 - luma) / 34) * 0.68 : 0);
    }

    private static double ScoreBridgeBrownPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var saturation = Math.Max(Math.Max(red, green), blue) - Math.Min(Math.Min(red, green), blue);
        var brown = red >= green - 2
            && green >= blue + 4
            && luma is >= 38 and <= 156
            && saturation >= 10;
        return brown ? Clamp01((saturation - 8) / 74d) : 0;
    }

    private static double ScoreSpawnCorridorPillarPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var brown = red >= green + 6 && green >= blue - 4 && luma is >= 42 and <= 154;
        var gray = Math.Max(Math.Max(red, green), blue) - Math.Min(Math.Min(red, green), blue) <= 28
            && luma is >= 54 and <= 178;
        return brown || gray ? Clamp01((luma - 32) / 108) : 0;
    }

    private static double ScoreFirstDoorRedAccentPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var hsv = RgbToHsv(red, green, blue);
        var brightness = (red + green + blue) / 3d;
        var redHue = HueInRange(hsv.Hue, 348, 18);
        var redDominance = red - Math.Max(green * 1.08, blue * 1.18);
        var softRedDominance = red - Math.Max(green * 0.94, blue * 1.02);
        var orangeLeak = green > blue + 8 && green >= red * 0.54;
        var darkRedPanel = redHue
            && red >= 34
            && softRedDominance >= 7
            && green <= red * 0.82
            && blue <= red * 0.78
            && hsv.Saturation >= 0.22
            && hsv.Value >= 0.08
            && hsv.Value <= 0.56;
        if (!darkRedPanel
            && (!redHue || orangeLeak || redDominance < 16 || hsv.Saturation < 0.34 || hsv.Value < 0.14))
        {
            return 0;
        }

        var brightRedScore = Clamp01(
            (redDominance / 148) * 0.48
            + (hsv.Saturation * 0.28)
            + (Clamp01((brightness - 28) / 156) * 0.24));
        var darkRedScore = darkRedPanel
            ? Clamp01(
                (softRedDominance / 96) * 0.46
                + (hsv.Saturation * 0.30)
                + (Clamp01((0.58 - hsv.Value) / 0.50) * 0.24))
            : 0;
        return Math.Max(brightRedScore, darkRedScore);
    }

    private static double ScoreComputerRoomBluePaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var blueDominance = blue - Math.Max(red, green);
        var darkPanelBlue = blue >= 34 && blueDominance >= 6 && luma is >= 14 and <= 116;
        return darkPanelBlue ? Clamp01((blueDominance + 18) / 88d) : 0;
    }

    private static bool IsComputerRoomStructuredDeepBluePaletteIndex(
        byte index,
        IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var blueDominance = blue - Math.Max(red, green);
        return blue >= 34 && blueDominance >= 6 && luma < 14;
    }

    private static double ScoreComputerRoomRedLightPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var redDominance = red - Math.Max(green, blue);
        var redLamp = red >= 72 && redDominance >= 24 && luma is >= 22 and <= 172;
        return redLamp ? Clamp01((redDominance - 8) / 120d) : 0;
    }

    private static double ScoreComputerRoomDarkPanelPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var saturation = Math.Max(Math.Max(red, green), blue) - Math.Min(Math.Min(red, green), blue);
        var blueFloor = blue >= Math.Max(red, green) + 18 && luma >= 28;
        var nukageGreen = green >= Math.Max(red, blue) + 18 && luma >= 34;
        var darkConsole = luma is >= 8 and <= 86 && saturation <= 78 && !blueFloor && !nukageGreen;
        return darkConsole ? Clamp01((92 - luma) / 84) : 0;
    }

    private static double ScoreComputerRoomPanelPaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var greenLed = green >= 42
            && green >= red + 4
            && green >= blue + 8
            && luma is >= 18 and <= 128;
        var amberLed = red >= 48
            && green >= 28
            && red >= blue + 14
            && green >= blue + 8
            && luma is >= 22 and <= 142;
        var grayConsole = Math.Abs(red - green) <= 24
            && Math.Abs(green - blue) <= 28
            && luma is >= 34 and <= 126;
        return greenLed
            ? Clamp01((green - blue + 16) / 92d)
            : (amberLed ? Clamp01((red + green - blue) / 210d) : (grayConsole ? 0.28 : 0));
    }

    private static double ScoreFootObstaclePaletteIndex(byte index, IReadOnlyList<byte> rgba)
    {
        ReadRgb(index, rgba, out var red, out var green, out var blue);
        var luma = Luma(red, green, blue);
        var saturation = Math.Max(Math.Max(red, green), blue) - Math.Min(Math.Min(red, green), blue);
        var barrelBrown = red >= green - 2
            && green >= blue + 2
            && luma is >= 34 and <= 134
            && saturation >= 12;
        var barrelGreen = green >= red + 4
            && green >= blue + 8
            && luma is >= 26 and <= 150
            && saturation >= 18;
        var metalGray = saturation <= 30 && luma is >= 52 and <= 162;
        return barrelBrown
            ? Clamp01((saturation - 8) / 78d)
            : (barrelGreen
                ? Clamp01((saturation - 12) / 84d)
                : (metalGray ? Clamp01((162 - Math.Abs(luma - 96)) / 162) * 0.42 : 0));
    }

    private static void ReadRgb(
        byte index,
        IReadOnlyList<byte> rgba,
        out int red,
        out int green,
        out int blue)
    {
        var offset = index * 4;
        red = rgba[offset];
        green = rgba[offset + 1];
        blue = rgba[offset + 2];
    }

    private static Hsv RgbToHsv(int red, int green, int blue)
    {
        var r = Clamp01(red / 255d);
        var g = Clamp01(green / 255d);
        var b = Clamp01(blue / 255d);
        var max = Math.Max(Math.Max(r, g), b);
        var min = Math.Min(Math.Min(r, g), b);
        var delta = max - min;
        double hue = 0;
        if (delta > 0)
        {
            if (max == r)
            {
                hue = 60 * (((g - b) / delta) % 6);
            }
            else if (max == g)
            {
                hue = 60 * (((b - r) / delta) + 2);
            }
            else
            {
                hue = 60 * (((r - g) / delta) + 4);
            }
        }

        if (hue < 0)
        {
            hue += 360;
        }

        return new Hsv(hue, max == 0 ? 0 : delta / max, max);
    }

    private static bool HueInRange(double hue, double minimum, double maximum)
    {
        var value = ((hue % 360) + 360) % 360;
        var lower = ((minimum % 360) + 360) % 360;
        var upper = ((maximum % 360) + 360) % 360;
        return lower <= upper
            ? value >= lower && value <= upper
            : value >= lower || value <= upper;
    }

    private static double Luma(int red, int green, int blue)
        => (red * 0.299) + (green * 0.587) + (blue * 0.114);

    private static double Clamp01(double value)
        => double.IsFinite(value) ? Math.Clamp(value, 0, 1) : 0;

    private static int JsRoundToInt(double value)
        => (int)Math.Floor(value + 0.5);

    private static double Round2(double value)
        => Math.Floor(value * 100 + 0.5) / 100;

    private static string ComputeObservationHash(FirstDoorRawPaletteObservation input)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        AppendString(hash, ObserverVersion);
        AppendInt32(hash, input.ContractVersion);
        AppendBoolean(hash, input.Available);
        AppendInt64(hash, input.FrameSequence);
        AppendInt64(hash, input.NativeGameticObservedAtEvaluation);
        AppendInt32(hash, input.SourceWidth);
        AppendInt32(hash, input.SourceHeight);
        AppendInt32(hash, input.GameplayHeight);
        AppendString(hash, input.Layout.Trim());
        AppendInt32(hash, input.Columns);
        AppendInt32(hash, input.Rows);
        AppendBoolean(hash, input.PaletteAvailable);
        AppendInt64(hash, input.PaletteGeneration);
        AppendString(hash, input.PaletteProvenance.Trim());
        AppendBytes(hash, input.PaletteIndices);
        AppendBytes(hash, input.PaletteRgbaBytes);
        return Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();
    }

    private static string ComputeVisualContentHash(FirstDoorRawPaletteObservation input)
    {
        using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        AppendString(hash, ObserverVersion);
        AppendString(hash, input.Layout.Trim());
        AppendInt32(hash, input.SourceWidth);
        AppendInt32(hash, input.SourceHeight);
        AppendInt32(hash, input.GameplayHeight);
        AppendInt32(hash, input.Columns);
        AppendInt32(hash, input.Rows);

        var sampledRgba = new byte[input.PaletteIndices.Count * 4];
        for (var index = 0; index < input.PaletteIndices.Count; index++)
        {
            var paletteOffset = input.PaletteIndices[index] * 4;
            var sampleOffset = index * 4;
            sampledRgba[sampleOffset] = input.PaletteRgbaBytes[paletteOffset];
            sampledRgba[sampleOffset + 1] = input.PaletteRgbaBytes[paletteOffset + 1];
            sampledRgba[sampleOffset + 2] = input.PaletteRgbaBytes[paletteOffset + 2];
            sampledRgba[sampleOffset + 3] = input.PaletteRgbaBytes[paletteOffset + 3];
        }

        AppendBytes(hash, sampledRgba);
        return Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();
    }

    private static void AppendBoolean(IncrementalHash hash, bool value)
        => hash.AppendData(new[] { value ? (byte)1 : (byte)0 });

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

    private static void AppendString(IncrementalHash hash, string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        AppendInt32(hash, bytes.Length);
        hash.AppendData(bytes);
    }

    private static void AppendBytes(IncrementalHash hash, IReadOnlyList<byte> values)
    {
        AppendInt32(hash, values.Count);
        if (values is byte[] array)
        {
            hash.AppendData(array);
            return;
        }

        var copy = new byte[values.Count];
        for (var index = 0; index < values.Count; index++)
        {
            copy[index] = values[index];
        }

        hash.AppendData(copy);
    }

    private sealed record CandidateAnalysis(
        double Score,
        FirstDoorRawPaletteBox? Box,
        FirstDoorRawPaletteBox? DominantCandidate,
        IReadOnlyList<double> Heatmap,
        double RedScore,
        IReadOnlyList<FirstDoorRawPaletteBox> Candidates);

    private readonly record struct FacadeAnalysis(
        bool Accepted,
        double Confidence,
        FirstDoorRawPaletteBox? AlignmentBox)
    {
        internal static FacadeAnalysis Rejected { get; } = new(false, 0, null);
    }

    private readonly record struct FacadeSpatialFeatures(
        double CenterNeutralRatio,
        double CenterDarkNeutralRatio,
        double MaximumBilateralLumaAgreement);

    private readonly record struct IdentityResult(
        FirstDoorEvidenceTruth Truth,
        string Reason,
        string Kind,
        double Confidence,
        FirstDoorRawPaletteBox? AlignmentBox);

    private readonly record struct DarkPaletteScore(double Score, double Luma);

    private readonly record struct Hsv(double Hue, double Saturation, double Value);
}

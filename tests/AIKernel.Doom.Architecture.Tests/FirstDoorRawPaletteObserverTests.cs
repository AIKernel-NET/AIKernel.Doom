namespace AIKernel.Doom.Architecture.Tests;

using AIKernel.Doom.Provider.Autoplay;

public sealed class FirstDoorRawPaletteObserverTests
{
    private const string ClosedGrayTechFaceKind = "first-door-closed-gray-tech-face";
    private const string ClosedGrayTechFaceAcceptedReason = "accepted-kind:first-door-closed-gray-tech-face";

    [Fact]
    public void InvalidOrMissingRawInputs_FailClosedWithReplayableReason()
    {
        var valid = ValidObservation(new byte[FirstDoorRawPaletteObserver.SampleCount]);
        var cases = new (FirstDoorRawPaletteObservation? Input, string Reason)[]
        {
            (null, "raw-palette-observation-missing"),
            (valid with { Available = false }, "raw-palette-unavailable"),
            (valid with { ContractVersion = 0 }, "raw-palette-contract-version-unsupported"),
            (valid with { ContractVersion = 99 }, "raw-palette-contract-version-unsupported"),
            (valid with { Layout = string.Empty }, "raw-palette-layout-mismatch"),
            (valid with { Layout = "pal8-unknown" }, "raw-palette-layout-mismatch"),
            (valid with { SourceWidth = 0 }, "raw-palette-source-geometry-mismatch"),
            (valid with { SourceWidth = 319 }, "raw-palette-source-geometry-mismatch"),
            (valid with { Columns = 19 }, "raw-palette-grid-mismatch"),
            (valid with { FrameSequence = -1 }, "raw-palette-evaluation-metadata-missing"),
            (valid with { NativeGameticObservedAtEvaluation = -2 }, "raw-palette-evaluation-metadata-missing"),
            (valid with { PaletteIndices = new byte[259] }, "raw-palette-index-count-invalid"),
            (valid with { PaletteAvailable = false }, "raw-palette-table-unavailable"),
            (valid with { PaletteGeneration = 0 }, "raw-palette-generation-missing"),
            (valid with { PaletteGeneration = -1 }, "raw-palette-generation-missing"),
            (valid with { PaletteProvenance = string.Empty }, "raw-palette-provenance-missing"),
            (valid with { PaletteProvenance = "unknown" }, "raw-palette-provenance-missing"),
            (valid with { PaletteRgbaBytes = new byte[1023] }, "raw-palette-entry-count-invalid")
        };

        foreach (var (input, reason) in cases)
        {
            var evidence = FirstDoorRawPaletteObserver.Observe(input);

            Assert.False(evidence.InputAccepted);
            Assert.Equal(FirstDoorEvidenceTruth.Unknown, evidence.Truth);
            Assert.Equal(reason, evidence.Reason);
            Assert.Empty(evidence.ObservationHash);
            Assert.Empty(evidence.Vision9x9);
            Assert.Empty(evidence.Door9x9);
            Assert.Empty(evidence.Red9x9);
            Assert.Empty(evidence.Heatmap9x9);
        }
    }

    [Fact]
    public void Projection_UsesExact20x13CellAssignmentAndPositiveJsRounding()
    {
        var indices = new byte[FirstDoorRawPaletteObserver.SampleCount];
        // Projected cell (0,0) receives six source cells. A total of 3 produces
        // an average of 0.5, which JavaScript Math.round maps to 1 (not banker's 0).
        indices[(1 * FirstDoorRawPaletteObserver.SampleColumns) + 2] = 3;

        var evidence = FirstDoorRawPaletteObserver.Observe(ValidObservation(indices));

        Assert.True(evidence.InputAccepted);
        Assert.Equal(81, evidence.Vision9x9.Count);
        Assert.Equal(1, evidence.Vision9x9[0]);
        Assert.All(evidence.Vision9x9.Skip(1), value => Assert.Equal(0, value));
        Assert.Equal(81, evidence.Door9x9.Count);
        Assert.Equal(81, evidence.Red9x9.Count);
        Assert.Equal(81, evidence.Heatmap9x9.Count);
    }

    [Fact]
    public void RedCenterPatch_MatchesCurrentJavascriptFramebufferFixture()
    {
        // This fixture and the expected score/box/heatmap were generated through
        // window.AIKernelBonsai.summarizeFramebuffer in the current bonsai.js.
        var indices = ProjectedFixture((row, column) =>
            row is >= 2 and <= 3 && column is >= 3 and <= 4 ? (byte)10 : (byte)200);
        var palette = EmptyPalette();
        SetPalette(palette, 10, 96, 8, 8);
        SetPalette(palette, 200, 0, 0, 200);

        var evidence = FirstDoorRawPaletteObserver.Observe(ValidObservation(indices, palette));

        Assert.True(evidence.InputAccepted);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, evidence.Truth);
        Assert.Equal("accepted-kind:first-door-9x9-patch", evidence.Reason);
        Assert.Equal("first-door-9x9-patch", evidence.CandidateKind);
        Assert.Equal("first-door-9x9-patch", evidence.IdentityKind);
        Assert.Equal(1, evidence.IdentityConfidence);
        Assert.Equal(1, evidence.Score);
        Assert.Equal(0.79, evidence.RedScore);
        Assert.Equal(0.64, evidence.EdgeScore);
        Assert.Equal(0.79, evidence.DoorScore);
        Assert.Equal(0.68, evidence.DarkPanelScore);
        Assert.NotNull(evidence.Box);
        Assert.Equal(3, evidence.Box.Column);
        Assert.Equal(2, evidence.Box.Row);
        Assert.Equal(2, evidence.Box.Columns);
        Assert.Equal(2, evidence.Box.Rows);
        Assert.Equal(1, evidence.Box.Score);
        Assert.Equal(0.79, evidence.Box.RedScore);
        Assert.Equal(0.64, evidence.Box.EdgeScore);
        Assert.Equal(0.79, evidence.Box.DoorScore);
        Assert.Equal(0.68, evidence.Box.DarkPanelScore);
        Assert.Equal(evidence.Box, evidence.AlignmentBox);

        var expectedVision = Enumerable.Repeat(200, 81).ToArray();
        expectedVision[(2 * 9) + 3] = 10;
        expectedVision[(2 * 9) + 4] = 10;
        expectedVision[(3 * 9) + 3] = 10;
        expectedVision[(3 * 9) + 4] = 10;
        Assert.Equal(expectedVision, evidence.Vision9x9.ToArray());
        Assert.Equal(0.79, evidence.Door9x9[(2 * 9) + 3]);
        Assert.Equal(0.79, evidence.Red9x9[(2 * 9) + 3]);
        Assert.Equal(0, evidence.Door9x9[0]);
        Assert.Equal(0, evidence.Red9x9[0]);

        double[] expectedHeatmap =
        [
            0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0.29, 0.29, 0.27, 0.27, 0.29, 0.29, 0.21, 0.2,
            0, 0.31, 0.62, 1, 1, 0.62, 0.31, 0.23, 0.22,
            0, 0.33, 0.62, 1, 1, 0.62, 0.33, 0.26, 0.24,
            0, 0.33, 0.46, 0.56, 0.56, 0.46, 0.33, 0.26, 0.24,
            0, 0.27, 0.31, 0.33, 0.33, 0.31, 0.27, 0.26, 0.24,
            0, 0.27, 0.28, 0.3, 0.3, 0.28, 0.27, 0.26, 0.24,
            0, 0.27, 0.28, 0.3, 0.3, 0.28, 0.27, 0.26, 0.24,
            0, 0.25, 0.26, 0.28, 0.28, 0.26, 0.25, 0.23, 0.22
        ];
        Assert.Equal(expectedHeatmap, evidence.Heatmap9x9.ToArray());

        Assert.Equal(23.46, evidence.GameplayLuma);
        Assert.Equal(0.70, evidence.DarkAreaScore);
        Assert.Equal(0.91, evidence.ComputerBlueScore);
        Assert.Equal(0.09, evidence.ComputerRedLightScore);
        Assert.Equal(0, evidence.ComputerDarkPanelScore);
        Assert.Equal(0, evidence.ComputerPanelScore);
        Assert.Equal(0.33, evidence.ComputerRoomScore);
        Assert.Equal(0, evidence.FootObstacleScore);
    }

    [Fact]
    public void GrayConsoleFrame_MatchesCurrentJavascriptComputerRoomAndFootFixture()
    {
        // Expected values are the direct per-frame result of the current JS palette
        // scorers and summarizeFramebuffer region masks for a uniform gray frame.
        var indices = Enumerable.Repeat((byte)50, FirstDoorRawPaletteObserver.SampleCount).ToArray();
        var palette = EmptyPalette();
        SetPalette(palette, 50, 80, 80, 80);

        var evidence = FirstDoorRawPaletteObserver.Observe(ValidObservation(indices, palette));

        Assert.True(evidence.InputAccepted);
        Assert.Equal(FirstDoorEvidenceTruth.Unknown, evidence.Truth);
        Assert.Equal("ambiguous-kind:first-door-wall-pattern", evidence.Reason);
        Assert.Equal("first-door-wall-pattern", evidence.CandidateKind);
        Assert.Empty(evidence.IdentityKind);
        Assert.Equal(0, evidence.IdentityConfidence);
        Assert.Null(evidence.AlignmentBox);
        Assert.Equal(0.35, evidence.Score);
        Assert.NotNull(evidence.Box);
        Assert.Equal(3, evidence.Box.Column);
        Assert.Equal(3, evidence.Box.Row);
        Assert.Equal(0.15, evidence.DoorScore);
        Assert.Equal(0, evidence.EdgeScore);
        Assert.Equal(0, evidence.DarkPanelScore);
        Assert.Equal(80, evidence.GameplayLuma);
        Assert.Equal(0, evidence.DarkAreaScore);
        Assert.Equal(0, evidence.ComputerBlueScore);
        Assert.Equal(0, evidence.ComputerRedLightScore);
        Assert.Equal(0.14, evidence.ComputerDarkPanelScore);
        Assert.Equal(0.28, evidence.ComputerPanelScore);
        Assert.Equal(0.08, evidence.ComputerRoomScore);
        Assert.Equal(0.38, evidence.FootObstacleScore);
    }

    [Fact]
    public void CenterDarkPanel_MatchesCurrentJavascriptCandidateFixture()
    {
        var indices = ProjectedFixture((row, column) =>
            row is >= 3 and <= 4 && column is >= 3 and <= 4 ? (byte)15 : (byte)200);
        var palette = EmptyPalette();
        SetPalette(palette, 15, 20, 20, 20);
        SetPalette(palette, 200, 0, 0, 200);

        var evidence = FirstDoorRawPaletteObserver.Observe(ValidObservation(indices, palette));

        Assert.True(evidence.InputAccepted);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, evidence.Truth);
        Assert.Equal("accepted-kind:first-door-dark-panel", evidence.Reason);
        Assert.Equal("first-door-dark-panel", evidence.CandidateKind);
        Assert.Equal("first-door-dark-panel", evidence.IdentityKind);
        Assert.Equal(0.52, evidence.IdentityConfidence);
        Assert.Equal(0.52, evidence.Score);
        Assert.Equal(0, evidence.RedScore);
        Assert.Equal(0.64, evidence.EdgeScore);
        Assert.Equal(0.44, evidence.DoorScore);
        Assert.Equal(0.38, evidence.DarkPanelScore);
        Assert.NotNull(evidence.Box);
        Assert.Equal(3, evidence.Box.Column);
        Assert.Equal(3, evidence.Box.Row);
        Assert.Equal(0.52, evidence.Box.Score);
        Assert.Equal(0.64, evidence.Box.EdgeScore);
        Assert.Equal(0.44, evidence.Box.DoorScore);
        Assert.Equal(0.38, evidence.Box.DarkPanelScore);
        Assert.Equal(evidence.Box, evidence.AlignmentBox);
        Assert.Equal(22.64, evidence.GameplayLuma);
        Assert.Equal(0.32, evidence.ComputerRoomScore);
        Assert.Equal(0, evidence.FootObstacleScore);
    }

    [Fact]
    public void LowEdgeDarkPanel_RemainsUnknownAtLegacyVisualEvidenceBoundary()
    {
        // The JS candidate scorer still labels this dark-panel, but legacy
        // visualEvidenceReady rejects it because edgeScore is below 0.30.
        var indices = ProjectedFixture((row, column) =>
            row is >= 3 and <= 4 && column is >= 3 and <= 4 ? (byte)65 : (byte)100);
        var palette = EmptyPalette();
        SetPalette(palette, 65, 40, 35, 5);
        SetPalette(palette, 100, 0, 0, 200);

        var evidence = FirstDoorRawPaletteObserver.Observe(ValidObservation(indices, palette));

        Assert.True(evidence.InputAccepted);
        Assert.Equal(FirstDoorEvidenceTruth.Unknown, evidence.Truth);
        Assert.Equal("first-door-dark-panel-evidence-below-threshold", evidence.Reason);
        Assert.Equal("first-door-dark-panel", evidence.CandidateKind);
        Assert.Empty(evidence.IdentityKind);
        Assert.Equal(0, evidence.IdentityConfidence);
        Assert.Null(evidence.AlignmentBox);
        Assert.Equal(0.55, evidence.Score);
        Assert.Equal(0, evidence.RedScore);
        Assert.Equal(0.22, evidence.EdgeScore);
        Assert.Equal(0.81, evidence.DoorScore);
        Assert.Equal(0.24, evidence.DarkPanelScore);
        Assert.NotNull(evidence.Box);
        Assert.Equal(3, evidence.Box.Column);
        Assert.Equal(3, evidence.Box.Row);
        Assert.Equal(23.39, evidence.GameplayLuma);
    }

    [Fact]
    public void LowerRedPatch_ProducesExplicitNoWithoutPublishingSubthresholdBox()
    {
        // Seed 6138 from the current JS candidate scorer. Its best candidate is a
        // floor-red 0.20 patch; the public JS box remains null at the 0.24 gate.
        byte[] projectedVision =
        [
            160, 0, 160, 224, 32, 0, 0, 255, 0,
            32, 192, 32, 160, 32, 128, 96, 192, 160,
            0, 192, 96, 32, 64, 96, 160, 0, 160,
            255, 64, 32, 0, 32, 32, 96, 0, 128,
            64, 160, 160, 224, 64, 160, 64, 0, 0,
            192, 224, 128, 160, 255, 160, 192, 128, 32,
            255, 64, 160, 10, 10, 96, 128, 32, 128,
            255, 224, 160, 10, 10, 224, 128, 32, 96,
            255, 0, 224, 128, 160, 160, 160, 0, 160
        ];
        var indices = ProjectedFixture((row, column) => projectedVision[(row * 9) + column]);
        var palette = EmptyPalette();
        foreach (var index in new byte[] { 0, 32, 64, 96, 128, 160, 192, 224, 255 })
        {
            SetPalette(palette, index, 0, 0, 200);
        }

        SetPalette(palette, 10, 96, 8, 8);

        var evidence = FirstDoorRawPaletteObserver.Observe(ValidObservation(indices, palette));

        Assert.True(evidence.InputAccepted);
        Assert.Equal(FirstDoorEvidenceTruth.No, evidence.Truth);
        Assert.Equal("rejected-kind:first-door-floor-red", evidence.Reason);
        Assert.Equal("first-door-floor-red", evidence.CandidateKind);
        Assert.Empty(evidence.IdentityKind);
        Assert.Equal(0, evidence.IdentityConfidence);
        Assert.Null(evidence.AlignmentBox);
        Assert.Equal(0.20, evidence.Score);
        Assert.Equal(0, evidence.RedScore);
        Assert.Equal(0.50, evidence.EdgeScore);
        Assert.Equal(0.20, evidence.DoorScore);
        Assert.Equal(0.25, evidence.DarkPanelScore);
        Assert.Null(evidence.Box);
    }

    [Fact]
    public void CapturedRawContracts_PreserveGateDWireBytesAndLiveScoreSurfaces()
    {
        var fixtures = CapturedFirstDoorRawFrameFixtures.Dev1046ApproachSequence
            .Concat(CapturedFirstDoorRawFrameFixtures.Dev1047BrightCloseSequence)
            .Append(CapturedFirstDoorRawFrameFixtures.Dev1045FarFieldLookalike013)
            .Concat(CapturedFirstDoorRawFrameFixtures.Dev1045FacadeFalsePositiveSequence);

        foreach (var fixture in fixtures)
        {
            var observation = fixture.CreateObservation();
            var evidence = FirstDoorRawPaletteObserver.Observe(observation);

            Assert.Equal(fixture.FrameSequence, observation.FrameSequence);
            Assert.Equal(
                fixture.NativeGameticObservedAtEvaluation,
                observation.NativeGameticObservedAtEvaluation);
            Assert.Equal(fixture.PaletteGeneration, observation.PaletteGeneration);
            Assert.Equal(
                fixture.PaletteIndicesBase64,
                Convert.ToBase64String(observation.PaletteIndices.ToArray()));
            Assert.True(evidence.InputAccepted);
            Assert.Equal(fixture.ExpectedCandidateScore, evidence.Score);
            Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
        }
    }

    [Fact]
    public void Dev1046ApproachSequence_RecognizesClosedGrayTechFace()
    {
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1046ApproachSequence)
        {
            var evidence = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());

            Assert.True(evidence.InputAccepted);
            Assert.Equal(FirstDoorEvidenceTruth.Yes, evidence.Truth);
            Assert.Equal(ClosedGrayTechFaceAcceptedReason, evidence.Reason);
            Assert.Equal(ClosedGrayTechFaceKind, evidence.IdentityKind);
            Assert.Equal(fixture.ExpectedCandidateScore, evidence.Score);
            Assert.True(evidence.IdentityConfidence >= 0.46);
            Assert.NotNull(evidence.AlignmentBox);
            Assert.Equal(3, evidence.AlignmentBox.Column);
            Assert.InRange(evidence.AlignmentBox.Row, 3, 4);
            Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
        }
    }

    [Fact]
    public void Dev1046StableSightline_RecognizesClosedGrayTechFace()
    {
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1046StableSightlineSequence)
        {
            var evidence = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());

            Assert.True(evidence.InputAccepted);
            Assert.Equal(FirstDoorEvidenceTruth.Yes, evidence.Truth);
            Assert.Equal(ClosedGrayTechFaceAcceptedReason, evidence.Reason);
            Assert.Equal(ClosedGrayTechFaceKind, evidence.IdentityKind);
            Assert.Equal("first-door-wall-pattern", evidence.CandidateKind);
            Assert.Equal(fixture.ExpectedCandidateScore, evidence.Score);
            Assert.True(evidence.IdentityConfidence >= 0.46);
            Assert.NotEqual(evidence.Score, evidence.IdentityConfidence);
            Assert.NotNull(evidence.Box);
            Assert.Equal(2, evidence.Box.Column);
            Assert.NotNull(evidence.AlignmentBox);
            Assert.Equal(3, evidence.AlignmentBox.Column);
            Assert.Equal(3, evidence.AlignmentBox.Row);
            Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
        }
    }

    [Fact]
    public void Dev1047BrightCloseSequence_RecognizesCurrentClosedFacadeWithCenteredAnchor()
    {
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1047BrightCloseSequence)
        {
            var evidence = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());

            Assert.True(evidence.InputAccepted);
            Assert.Equal(FirstDoorEvidenceTruth.Yes, evidence.Truth);
            Assert.Equal(ClosedGrayTechFaceAcceptedReason, evidence.Reason);
            Assert.Equal(ClosedGrayTechFaceKind, evidence.IdentityKind);
            Assert.Equal(fixture.ExpectedCandidateScore, evidence.Score);
            Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
            Assert.True(evidence.IdentityConfidence >= 0.50);
            Assert.NotNull(evidence.AlignmentBox);
            Assert.Equal(3, evidence.AlignmentBox.Column);
            Assert.InRange(evidence.AlignmentBox.Row, 3, 4);
        }
    }

    [Fact]
    public void Dev1045FarFieldLookalike_RemainsNonYes()
    {
        var fixture = CapturedFirstDoorRawFrameFixtures.Dev1045FarFieldLookalike013;
        var evidence = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());

        Assert.True(evidence.InputAccepted);
        Assert.NotEqual(FirstDoorEvidenceTruth.Yes, evidence.Truth);
        Assert.NotEqual(ClosedGrayTechFaceAcceptedReason, evidence.Reason);
        Assert.Empty(evidence.IdentityKind);
        Assert.Equal(0, evidence.IdentityConfidence);
        Assert.Null(evidence.AlignmentBox);
        Assert.Equal(fixture.ExpectedCandidateScore, evidence.Score);
        Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
    }

    [Fact]
    public void Dev1045HistoricalFacadeFalsePositives_RemainNonYes()
    {
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1045FacadeFalsePositiveSequence)
        {
            var evidence = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());

            Assert.True(evidence.InputAccepted);
            Assert.NotEqual(FirstDoorEvidenceTruth.Yes, evidence.Truth);
            Assert.NotEqual(ClosedGrayTechFaceAcceptedReason, evidence.Reason);
            Assert.Empty(evidence.IdentityKind);
            Assert.Equal(0, evidence.IdentityConfidence);
            Assert.Null(evidence.AlignmentBox);
            Assert.Equal(fixture.ExpectedCandidateScore, evidence.Score);
            Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
        }
    }

    [Fact]
    public void CapturedFrames_SeparateClosedDoorIdentityFromComputerRoomDespiteRoomScoreOverlap()
    {
        var closedDoorFixture = CapturedFirstDoorRawFrameFixtures.StationaryClosedDoorPositive055;
        var closedDoor = FirstDoorRawPaletteObserver.Observe(
            closedDoorFixture.CreateObservation(frameSequence: 55, nativeGametic: 1_055));

        Assert.True(closedDoor.InputAccepted);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, closedDoor.Truth);
        Assert.Equal(ClosedGrayTechFaceAcceptedReason, closedDoor.Reason);
        Assert.Equal(ClosedGrayTechFaceKind, closedDoor.IdentityKind);
        Assert.True(closedDoor.IdentityConfidence >= 0.46);
        Assert.NotNull(closedDoor.AlignmentBox);
        Assert.Equal(3, closedDoor.AlignmentBox.Column);
        Assert.Equal(4, closedDoor.AlignmentBox.Row);
        Assert.Equal(closedDoorFixture.ExpectedCandidateScore, closedDoor.Score);
        Assert.Equal(closedDoorFixture.ExpectedRoomScore, closedDoor.ComputerRoomScore);
        Assert.Equal(closedDoorFixture.ExpectedDarkPanelScore, closedDoor.ComputerDarkPanelScore);
        Assert.Equal(closedDoorFixture.ExpectedPanelScore, closedDoor.ComputerPanelScore);

        var frame = 56L;
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.ComputerRoomPositiveSequence)
        {
            var positive = FirstDoorRawPaletteObserver.Observe(
                fixture.CreateObservation(frameSequence: frame, nativeGametic: 1_000 + frame));

            Assert.True(positive.InputAccepted);
            Assert.NotEqual(FirstDoorEvidenceTruth.Yes, positive.Truth);
            Assert.NotEqual(ClosedGrayTechFaceAcceptedReason, positive.Reason);
            Assert.Empty(positive.IdentityKind);
            Assert.Equal(0, positive.IdentityConfidence);
            Assert.Null(positive.AlignmentBox);
            Assert.Equal(fixture.ExpectedCandidateScore, positive.Score);
            Assert.Equal(fixture.ExpectedRoomScore, positive.ComputerRoomScore);
            Assert.Equal(fixture.ExpectedDarkPanelScore, positive.ComputerDarkPanelScore);
            Assert.Equal(fixture.ExpectedPanelScore, positive.ComputerPanelScore);
            frame++;
        }

        Assert.Equal(0.20, closedDoor.ComputerRoomScore);
        Assert.All(
            CapturedFirstDoorRawFrameFixtures.ComputerRoomPositiveSequence,
            fixture => Assert.True(
                fixture.ExpectedRoomScore < closedDoor.ComputerRoomScore,
                $"{fixture.Name} must prove that a room-score-only threshold cannot separate live evidence."));
    }

    [Fact]
    public void Dev1050RoomFrames_PublishStructuredDeepBlueGridWithoutChangingGenericScores()
    {
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1050ComputerRoomSequence)
        {
            var evidence = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());

            Assert.True(evidence.InputAccepted);
            Assert.NotEqual(FirstDoorEvidenceTruth.Yes, evidence.Truth);
            Assert.Equal(0.37, evidence.Score);
            Assert.Equal(fixture.ExpectedRoomScore, evidence.ComputerRoomScore);
            Assert.Equal(0, evidence.ComputerBlueScore);
            Assert.Equal(0.24, evidence.ComputerRoomStructuredBlueScore);
            Assert.Equal(12, evidence.ComputerRoomStructuredBlueCellCount);
            Assert.Equal(4, evidence.ComputerRoomStructuredBlueRowCount);
            Assert.Equal(6, evidence.ComputerRoomStructuredBlueColumnCount);
        }
    }

    [Fact]
    public void StructuredDeepBlueGrid_RejectsFacadeCompactPickupOneRowSingleCellAndBrightBlueRecolor()
    {
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1045FacadeFalsePositiveSequence)
        {
            var facade = FirstDoorRawPaletteObserver.Observe(fixture.CreateObservation());
            Assert.True(facade.ComputerRoomStructuredBlueScore < 0.14, fixture.Name);
        }

        var closedDoor = FirstDoorRawPaletteObserver.Observe(
            CapturedFirstDoorRawFrameFixtures.StationaryClosedDoorPositive055
                .CreateObservation(frameSequence: 55, nativeGametic: 1_055));
        Assert.True(closedDoor.ComputerRoomStructuredBlueScore < 0.14);

        var palette = EmptyPalette();
        SetPalette(palette, 200, 0, 0, 64);
        SetPalette(palette, 201, 0, 0, 200);

        var oneRow = new byte[FirstDoorRawPaletteObserver.SampleCount];
        for (var column = 5; column <= 12; column++)
        {
            oneRow[(5 * FirstDoorRawPaletteObserver.SampleColumns) + column] = 200;
        }

        var singleCell = new byte[FirstDoorRawPaletteObserver.SampleCount];
        singleCell[(5 * FirstDoorRawPaletteObserver.SampleColumns) + 8] = 200;

        var compactPickup = new byte[FirstDoorRawPaletteObserver.SampleCount];
        for (var row = 4; row <= 6; row++)
        {
            for (var column = 7; column <= 9; column++)
            {
                compactPickup[(row * FirstDoorRawPaletteObserver.SampleColumns) + column] = 200;
            }
        }

        var brightRecolor = new byte[FirstDoorRawPaletteObserver.SampleCount];
        for (var row = 1; row <= 10; row++)
        {
            for (var column = 5; column <= 12; column++)
            {
                brightRecolor[(row * FirstDoorRawPaletteObserver.SampleColumns) + column] = 201;
            }
        }

        var blueFloor = new byte[FirstDoorRawPaletteObserver.SampleCount];
        for (var column = 5; column <= 12; column++)
        {
            blueFloor[(11 * FirstDoorRawPaletteObserver.SampleColumns) + column] = 200;
        }

        Assert.True(FirstDoorRawPaletteObserver.Observe(
            ValidObservation(oneRow, palette)).ComputerRoomStructuredBlueScore < 0.14);
        Assert.True(FirstDoorRawPaletteObserver.Observe(
            ValidObservation(singleCell, palette)).ComputerRoomStructuredBlueScore < 0.14);
        var compactPickupEvidence = FirstDoorRawPaletteObserver.Observe(
            ValidObservation(compactPickup, palette));
        Assert.Equal(9, compactPickupEvidence.ComputerRoomStructuredBlueCellCount);
        Assert.Equal(3, compactPickupEvidence.ComputerRoomStructuredBlueRowCount);
        Assert.Equal(3, compactPickupEvidence.ComputerRoomStructuredBlueColumnCount);
        Assert.Equal(0.12, compactPickupEvidence.ComputerRoomStructuredBlueScore);
        Assert.True(compactPickupEvidence.ComputerRoomStructuredBlueScore < 0.14);
        Assert.Equal(0, FirstDoorRawPaletteObserver.Observe(
            ValidObservation(brightRecolor, palette)).ComputerRoomStructuredBlueScore);
        Assert.Equal(0, FirstDoorRawPaletteObserver.Observe(
            ValidObservation(blueFloor, palette)).ComputerRoomStructuredBlueScore);
    }

    [Fact]
    public void ObservationHash_IsStableAndCoversScopeSampleAndPaletteProvenance()
    {
        var input = ValidObservation(Enumerable.Range(0, 260).Select(value => (byte)value).ToArray());

        var first = FirstDoorRawPaletteObserver.Observe(input);
        var replay = FirstDoorRawPaletteObserver.Observe(input);
        var nextFrame = FirstDoorRawPaletteObserver.Observe(input with { FrameSequence = input.FrameSequence + 1 });
        var laterEvaluationGametic = FirstDoorRawPaletteObserver.Observe(input with
        {
            NativeGameticObservedAtEvaluation = input.NativeGameticObservedAtEvaluation + 500
        });
        var unavailableEvaluationGametic = FirstDoorRawPaletteObserver.Observe(input with
        {
            NativeGameticObservedAtEvaluation = -1
        });
        var differentProvenance = FirstDoorRawPaletteObserver.Observe(input with
        {
            PaletteProvenance = "PLAYPAL:generation-7-reloaded"
        });

        Assert.True(first.InputAccepted);
        Assert.Equal(64, first.ObservationHash.Length);
        Assert.Matches("^[0-9a-f]{64}$", first.ObservationHash);
        Assert.Equal(first.ObservationHash, replay.ObservationHash);
        Assert.NotEqual(first.ObservationHash, nextFrame.ObservationHash);
        Assert.Equal(first.VisualContentHash, nextFrame.VisualContentHash);
        Assert.NotEqual(first.ObservationHash, laterEvaluationGametic.ObservationHash);
        Assert.Equal(first.VisualContentHash, laterEvaluationGametic.VisualContentHash);
        Assert.NotEqual(first.ObservationHash, unavailableEvaluationGametic.ObservationHash);
        Assert.NotEqual(first.ObservationHash, differentProvenance.ObservationHash);
        Assert.Equal(first.Truth, replay.Truth);
        Assert.Equal(first.Truth, laterEvaluationGametic.Truth);
        Assert.True(unavailableEvaluationGametic.InputAccepted);
        Assert.Equal(first.Truth, unavailableEvaluationGametic.Truth);
        Assert.Equal(first.Reason, replay.Reason);
        Assert.Equal(first.Reason, laterEvaluationGametic.Reason);
        Assert.Equal(first.Reason, unavailableEvaluationGametic.Reason);
        Assert.Equal(first.Vision9x9.ToArray(), replay.Vision9x9.ToArray());
        Assert.Equal(first.Heatmap9x9.ToArray(), replay.Heatmap9x9.ToArray());
        Assert.Equal(64, first.VisualContentHash.Length);
        Assert.Matches("^[0-9a-f]{64}$", first.VisualContentHash);
    }

    [Fact]
    public void RepeatedPaletteIndex_UsesTheCurrentObservationColors()
    {
        var indices = Enumerable.Repeat((byte)42, FirstDoorRawPaletteObserver.SampleCount).ToArray();
        var input = ValidObservation(indices);
        var redPalette = EmptyPalette();
        SetPalette(redPalette, 42, 110, 35, 30);

        var original = FirstDoorRawPaletteObserver.Observe(input);
        var recolored = FirstDoorRawPaletteObserver.Observe(input with
        {
            FrameSequence = input.FrameSequence + 1,
            PaletteGeneration = input.PaletteGeneration + 1,
            PaletteRgbaBytes = redPalette
        });
        var replay = FirstDoorRawPaletteObserver.Observe(input);

        Assert.All(original.Red9x9, value => Assert.Equal(0d, value));
        Assert.All(recolored.Red9x9, value => Assert.True(value > 0d));
        Assert.Equal(original.Red9x9.ToArray(), replay.Red9x9.ToArray());
        Assert.Equal(original.ObservationHash, replay.ObservationHash);
        Assert.NotEqual(original.VisualContentHash, recolored.VisualContentHash);
    }

    private static FirstDoorRawPaletteObservation ValidObservation(
        IReadOnlyList<byte> indices,
        IReadOnlyList<byte>? palette = null)
        => new()
        {
            ContractVersion = FirstDoorRawPaletteObserver.CurrentContractVersion,
            Available = true,
            FrameSequence = 42,
            NativeGameticObservedAtEvaluation = 1_800,
            SourceWidth = FirstDoorRawPaletteObserver.SourceWidth,
            SourceHeight = FirstDoorRawPaletteObserver.SourceHeight,
            GameplayHeight = FirstDoorRawPaletteObserver.GameplayHeight,
            Layout = FirstDoorRawPaletteObserver.LayoutId,
            Columns = FirstDoorRawPaletteObserver.SampleColumns,
            Rows = FirstDoorRawPaletteObserver.SampleRows,
            PaletteIndices = indices,
            PaletteAvailable = true,
            PaletteGeneration = 7,
            PaletteProvenance = "PLAYPAL:generation-7",
            PaletteRgbaBytes = palette ?? EmptyPalette()
        };

    private static byte[] ProjectedFixture(Func<int, int, byte> valueForVisionCell)
    {
        var indices = new byte[FirstDoorRawPaletteObserver.SampleCount];
        for (var row = 0; row < FirstDoorRawPaletteObserver.SampleRows; row++)
        {
            for (var column = 0; column < FirstDoorRawPaletteObserver.SampleColumns; column++)
            {
                var visionRow = row * 9 / FirstDoorRawPaletteObserver.SampleRows;
                var visionColumn = column * 9 / FirstDoorRawPaletteObserver.SampleColumns;
                indices[(row * FirstDoorRawPaletteObserver.SampleColumns) + column]
                    = valueForVisionCell(visionRow, visionColumn);
            }
        }

        return indices;
    }

    private static byte[] EmptyPalette()
    {
        var palette = new byte[FirstDoorRawPaletteObserver.PaletteRgbaByteCount];
        for (var index = 0; index < FirstDoorRawPaletteObserver.PaletteEntryCount; index++)
        {
            palette[(index * 4) + 3] = byte.MaxValue;
        }

        return palette;
    }

    private static void SetPalette(byte[] palette, int index, byte red, byte green, byte blue)
    {
        var offset = index * 4;
        palette[offset] = red;
        palette[offset + 1] = green;
        palette[offset + 2] = blue;
        palette[offset + 3] = byte.MaxValue;
    }
}

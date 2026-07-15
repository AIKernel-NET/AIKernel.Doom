namespace AIKernel.Doom.Architecture.Tests;

using AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// Reconstructs the exact 20x13 PAL8 observation boundary from analysis-safe
/// raw-framebuffer captures. The RGB samples are embedded so the deterministic
/// tests do not depend on mutable ref/TODO artifacts. Duplicate PLAYPAL colors
/// are resolved by selecting the assignment that reproduces the score recorded
/// by the same live observer; room/color scores are invariant to that choice.
/// </summary>
internal sealed record CapturedFirstDoorRawFrameFixture(
    string Name,
    string SourceArtifact,
    string SampleRgbBase64,
    double ExpectedCandidateScore,
    double ExpectedRoomScore,
    double ExpectedDarkPanelScore,
    double ExpectedPanelScore)
{
    internal FirstDoorRawPaletteObservation CreateObservation(
        long frameSequence,
        long nativeGametic,
        int paletteGeneration = 1)
    {
        var palette = CapturedFirstDoorRawFrameFixtures.CreatePaletteRgba();
        var sampleRgb = Convert.FromBase64String(SampleRgbBase64);
        Assert.Equal(FirstDoorRawPaletteObserver.SampleCount * 3, sampleRgb.Length);

        var choices = new IReadOnlyList<byte>[FirstDoorRawPaletteObserver.SampleCount];
        var ambiguousCells = new List<int>();
        for (var cell = 0; cell < FirstDoorRawPaletteObserver.SampleCount; cell++)
        {
            var rgbOffset = cell * 3;
            var matches = new List<byte>(2);
            for (var paletteIndex = 0; paletteIndex < 256; paletteIndex++)
            {
                var paletteOffset = paletteIndex * 4;
                if (palette[paletteOffset] == sampleRgb[rgbOffset]
                    && palette[paletteOffset + 1] == sampleRgb[rgbOffset + 1]
                    && palette[paletteOffset + 2] == sampleRgb[rgbOffset + 2])
                {
                    matches.Add((byte)paletteIndex);
                }
            }

            Assert.NotEmpty(matches);
            choices[cell] = matches;
            if (matches.Count > 1)
            {
                ambiguousCells.Add(cell);
            }
        }

        Assert.True(ambiguousCells.Count < 16, $"Unexpected ambiguity in {Name}.");
        var combinations = 1 << ambiguousCells.Count;
        for (var mask = 0; mask < combinations; mask++)
        {
            var indices = choices.Select(item => item[0]).ToArray();
            for (var ambiguousIndex = 0; ambiguousIndex < ambiguousCells.Count; ambiguousIndex++)
            {
                var cell = ambiguousCells[ambiguousIndex];
                var alternatives = choices[cell];
                indices[cell] = alternatives[(mask >> ambiguousIndex) & 1];
            }

            var observation = new FirstDoorRawPaletteObservation
            {
                ContractVersion = FirstDoorRawPaletteObserver.CurrentContractVersion,
                Available = true,
                FrameSequence = frameSequence,
                NativeGameticObservedAtEvaluation = nativeGametic,
                SourceWidth = FirstDoorRawPaletteObserver.SourceWidth,
                SourceHeight = FirstDoorRawPaletteObserver.SourceHeight,
                GameplayHeight = FirstDoorRawPaletteObserver.GameplayHeight,
                Layout = FirstDoorRawPaletteObserver.LayoutId,
                Columns = FirstDoorRawPaletteObserver.SampleColumns,
                Rows = FirstDoorRawPaletteObserver.SampleRows,
                PaletteIndices = indices,
                PaletteAvailable = true,
                PaletteGeneration = paletteGeneration,
                PaletteProvenance = "captured-DOOM1.WAD-PLAYPAL",
                PaletteRgbaBytes = palette
            };
            var evidence = FirstDoorRawPaletteObserver.Observe(observation);
            if (evidence.Score == ExpectedCandidateScore
                && evidence.ComputerRoomScore == ExpectedRoomScore
                && evidence.ComputerDarkPanelScore == ExpectedDarkPanelScore
                && evidence.ComputerPanelScore == ExpectedPanelScore)
            {
                return observation;
            }
        }

        throw new InvalidOperationException(
            $"Captured PAL8 fixture {Name} did not reproduce its recorded observer scores.");
    }

    internal BrowserFirstDoorRawObservation CreateBrowserObservation(
        long frameSequence,
        long nativeGametic,
        int paletteGeneration = 1)
    {
        var observation = CreateObservation(frameSequence, nativeGametic, paletteGeneration);
        return new BrowserFirstDoorRawObservation
        {
            SchemaVersion = observation.ContractVersion,
            Layout = observation.Layout,
            Available = observation.Available,
            FrameSequence = observation.FrameSequence,
            NativeGameticObservedAtEvaluation = observation.NativeGameticObservedAtEvaluation,
            SourceWidth = observation.SourceWidth,
            SourceHeight = observation.SourceHeight,
            GameplayHeight = observation.GameplayHeight,
            SampleColumns = observation.Columns,
            SampleRows = observation.Rows,
            PaletteGeneration = checked((int)observation.PaletteGeneration),
            PaletteIndicesBase64 = Convert.ToBase64String(observation.PaletteIndices.ToArray()),
            PaletteRgbaBase64 = Convert.ToBase64String(observation.PaletteRgbaBytes.ToArray())
        };
    }
}

/// <summary>
/// Replays the exact PAL8 wire contract captured by the Gate D harness. Unlike
/// <see cref="CapturedFirstDoorRawFrameFixture"/>, this fixture retains the
/// captured palette indices (including duplicate-PLAYPAL index identity) and
/// the captured evaluation metadata byte-for-byte.
/// </summary>
internal sealed record CapturedFirstDoorRawContractFixture(
    string Name,
    string SourceArtifact,
    long FrameSequence,
    long NativeGameticObservedAtEvaluation,
    int PaletteGeneration,
    string PaletteIndicesBase64,
    string PaletteRgbaSha256,
    double ExpectedCandidateScore,
    double ExpectedRoomScore)
{
    internal FirstDoorRawPaletteObservation CreateObservation()
    {
        var paletteIndices = Convert.FromBase64String(PaletteIndicesBase64);
        Assert.Equal(FirstDoorRawPaletteObserver.SampleCount, paletteIndices.Length);
        var paletteRgba = CapturedFirstDoorRawFrameFixtures.CreatePaletteRgba();
        Assert.Equal(
            PaletteRgbaSha256,
            Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(paletteRgba))
                .ToLowerInvariant());

        return new FirstDoorRawPaletteObservation
        {
            ContractVersion = FirstDoorRawPaletteObserver.CurrentContractVersion,
            Available = true,
            FrameSequence = FrameSequence,
            NativeGameticObservedAtEvaluation = NativeGameticObservedAtEvaluation,
            SourceWidth = FirstDoorRawPaletteObserver.SourceWidth,
            SourceHeight = FirstDoorRawPaletteObserver.SourceHeight,
            GameplayHeight = FirstDoorRawPaletteObserver.GameplayHeight,
            Layout = FirstDoorRawPaletteObserver.LayoutId,
            Columns = FirstDoorRawPaletteObserver.SampleColumns,
            Rows = FirstDoorRawPaletteObserver.SampleRows,
            PaletteIndices = paletteIndices,
            PaletteAvailable = true,
            PaletteGeneration = PaletteGeneration,
            PaletteProvenance = "captured-DOOM1.WAD-PLAYPAL",
            PaletteRgbaBytes = paletteRgba
        };
    }

    internal BrowserFirstDoorRawObservation CreateBrowserObservation(
        long frameSequence,
        long nativeGametic,
        int? paletteGeneration = null)
        => new()
        {
            SchemaVersion = FirstDoorRawPaletteObserver.CurrentContractVersion,
            Layout = FirstDoorRawPaletteObserver.LayoutId,
            Available = true,
            FrameSequence = frameSequence,
            NativeGameticObservedAtEvaluation = nativeGametic,
            SourceWidth = FirstDoorRawPaletteObserver.SourceWidth,
            SourceHeight = FirstDoorRawPaletteObserver.SourceHeight,
            GameplayHeight = FirstDoorRawPaletteObserver.GameplayHeight,
            SampleColumns = FirstDoorRawPaletteObserver.SampleColumns,
            SampleRows = FirstDoorRawPaletteObserver.SampleRows,
            PaletteGeneration = paletteGeneration ?? PaletteGeneration,
            PaletteIndicesBase64 = PaletteIndicesBase64,
            PaletteRgbaBase64 = Convert.ToBase64String(
                CapturedFirstDoorRawFrameFixtures.CreatePaletteRgba())
        };
}

internal static class CapturedFirstDoorRawFrameFixtures
{
    internal const string CapturedPlaypalRgbaSha256 =
        "6d2056722af8f3a92a908a05f17a4d3475ceda1ef2fbc07e7bb221ad55504d88";

    private const string CanonicalPlaypalRgbBase64 =
        "AAAAHxcLFw8HS0tL////GxsbExMTCwsLBwcHLzcfIysPFx8HDxcATzsrRzMjPysb/7e396ur86Oj65eX54+P34eH23t703Nzy2trx2Njv1tbu1dXs09Pr0dHpz8/ozs7mzMzly8vjysriyMjgx8ffxsbdxcXcxMTaw8PZwsLXwcHWwcHUwcHTwAARwAAQwAA/+vf/+PT/9vH/9O7/8+z/8en/7+b/7uT/7OD96t776Nz55tr35Nj14tbz4NTy39Pv3tLs3NHq29Do2s/m2M7j183h1czf1Mvd08ra0cnX0MjUz8fSzcbPy8XMysTKyMP7+/v5+fn39/f29vb09PTy8vLx8fHv7+/t7e3s7Ozq6urp6enn5+fl5eXk5OTi4uLg4ODf39/d3d3b29va2trY2NjW1tbV1dXT09PR0dHQ0NDOzs7Nzc3Ly8vJycnIyMjd/9vb+9nZ99fX89XW79PU69HS58/Q5M3P4MvN3MrL2MjJ1MbH0MXFzMPEyMLCxcHv6ePt5+Hr5d/p493n4dvm39rk3tji3Nbg2tXe2NPd19Lb1dDZ1M/X0s3V0MzUz8vn4Njj3dTg2tLd18/Z1MzW0crTzsjQzMbe39jb3NXZ2tPW2NHU1c7R08zP0crNz8n//9z69tX17tDw5svr3sfm1sTh0MHcysA/////9vb/7u7/5ub/3t7/19f/z8//x8f/wAA7wAA4wAA1wAAywAAvwAAswAApwAAmwAAiwAAfwAAcwAAZwAAWwAATwAAQwAA5+f/x8f/q6v/j4//c3P/U1P/Nzf/Gxv/AAD/AADjAADLAACzAACbAACDAABrAABT/////+vb/9e7/8eb/7N7/6Nb/487/38b83MX628P32cP118Ly1cHw08At0cAr0MA///////X//+z//+P//9r//9H//8j//8Apz8AnzcAky8AhyMATzsnQy8bNyMTLxsLAABTAABHAAA7AAAvAAAjAAAXAAALAAAA/59D/+dL/3v//wD/zwDPnwCbbwBrp2tr";

    internal static CapturedFirstDoorRawFrameFixture StationaryUseNegative055 { get; } = new(
        "stationary-use-negative-055",
        "ref/TODO/doom-live-20260709-dev969-1783609690656-sample-055-use.png",
        "JycnJycnJycnJycnJycnLy8vLy8vJycnJycnIyMjJycnJycnLy8vJycnIyMjGxsbIyMjIyMjJycnJycnLy8vIyMjJycnLy8vJycnJycnIyMjGxsbIyMjJycnJycnJycnJycnJycnJycnLy8vJycnJycnJycnLy8vT09PJycnIyMjIyMjIyMjIyMjIyMjIyMjGxsbIyMjIyMjIyMjGxsbGxsbGxsbIyMjGxsbIyMjIyMjIyMjLy8vNzc3T09PMysTGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbExMTGxsbExMTGxsbGxsbGxsbGxsbGxsbV1dXY2NjLy8vMysTHxcLGxsbIyMjGxsbGxsbGxsbGxsbExMTExMTGxsbGxsbGxsbGxsbGxsbExMTJycnQ0NDT09PTzsrMysTNyMTJycnJycnKyMPKyMPMysTJycnIyMjIyMjHxcLHxcLGxsbLy8vJycnExMTIyMjQ0NDQ0NDRzMjKyMPPysbGxsbJycnHxcLKyMPTzsrQ0NDOzs7TzsrPysbRzMjRzMjQ0NDOzs7IyMjJycnQ0NDQ0NDRzMjKyMPIyMjIyMjKyMPHxcLMysTPysbOzs7Ozs7RzMjPysbRzMjTzsrOzs7TzsrMysTJycnIyMjJycnRzMjMysTPysbJycnExMTCwsLMysTPysbLy8vIyMjGxsbHxcLKyMPRzMjNzc3Q0NDZ1Mzd18/Q0NDL2MjU69HP4MvX0MjLy8vGxsbJycnCwsLJycnGxsbExMTCwsLExMTExMTJycnExMTExMTExMTg2tXJycnf39/Z2tPLzcfKyMPGxsbGxsbExMTExMTGxsbAAAAJycnGxsbExMTGxsbJycnGxsbExMTLy8vLy8vS0tLi3NbR08zAAAAJycnGxsbGxsbNzc3Nzc3v7+/LzcfCxcHExMTGxsbGxsbExMTNzc3ExMTGxsbGxsbNzc3R08zGxsbExMTGxsbGxsbJycnGxsbm2M7z4NT76NzGxsbFw8HJycnR0dHOzs7GxsbIyMjLy8vGxsb",
        0.44,
        0.20,
        0.64,
        0.21);

    // Historical name retained because the same frame was originally only a
    // negative COMPUTERROOM control. D4 also establishes it as a positive
    // stationary view of the still-closed FirstDoor.
    internal static CapturedFirstDoorRawFrameFixture StationaryClosedDoorPositive055 { get; }
        = StationaryUseNegative055;

    internal static CapturedFirstDoorRawContractFixture Dev1046Approach018 { get; } = new(
        "dev1046-approach-018",
        "ref/TODO/doom-live-20260711-dev1046-1783793972347-samples.json#samples[18]",
        401,
        402,
        2,
        "g2htaWJsDW7uDgUGBWpkj44OAWqLZGJmbmqPDw8PbE6NamkNTg4PaYtmZWdmiE4PTg4FDw5sbA0NTu1pi2ZlaGdnDY7uTm4PDk5Nbk5nSGmLZmZoZ2gNDU4OaAFlZmdnZGftaotmZmhnaA0N7g5sD2djZ2dkZ+1ri2ZmaGgDDQ3uD21taGJnbWRr7WuObGxub25vb04ObW5lZGRlZWVPbo5ojWgDag0O7m1qTwFtZWdkbw9pZGhnaWptDYtODQYGBgVvBm1s7WllamxqYmdvjgYFAGwGBn8GBW8FaYuGZmluZQVvBWQABW5sa28Fbm5qiWpqBQVtbn9/SgAFbQIFbQVuBQU=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.15);

    internal static CapturedFirstDoorRawContractFixture Dev1046Approach019 { get; } = new(
        "dev1046-approach-019",
        "ref/TODO/doom-live-20260711-dev1046-1783793972347-samples.json#samples[19]",
        422,
        423,
        2,
        "R4xIjUYNZ2xtD45rA25tjQNqTk5HjEiNSY1lZm0OD20DA2xObk1OT0eNSY1Ji2aIag8Obk5OTk9NT2RoiIyMjYyLZ2dnD2NNT2poZ2RkZGiKjIxKjWVnaGkPgWhkZGJiYV5ka4qMjEqOZmdoaQ+IZWVnZGRcQWVjioyKSo1mZ2hqDmFlZGdkTGRnZGiMjItKjmhrbW8OiGRkZ2VnZGZkA42Xbk9Oamhoa2+BZkoGZWhKa2Roa2pqjI5oA2hoAWtvb4CffGRaamaKjYxKDWhsZG0PAAUGb2lsbmxkaYyMjUqXA2NsBW8Mb29ubgV/Bm9ujI0NakONawVIPToFBQUFBQIFbW4=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.13);

    internal static CapturedFirstDoorRawContractFixture Dev1046Sightline020 { get; } = new(
        "dev1046-sightline-020",
        "ref/TODO/doom-live-20260711-dev1046-1783793972347-samples.json#samples[20]",
        443,
        444,
        2,
        "bIkNDWmOjGcDjY6Mjg0PDQ1rDlxibQ0Oa05NTk1OTm5ObokNDYiLY2dlTj5OTzBKTU4wMU5eD4kNZoxjZ2iPRWhuaWZrZGdlS4EOjQ1nZmNnaI9HZW5naGdnZ2ZqYg6NDWdmZGcDj4hlbmRnZ2RiYmpjDo0OZ2ZkZwMNimVuZWdjaGRlamIOjg5nZmNrbG9raG5kZGhnZ2Rqa08PbgMDZWyNDYxmbmReWWVgXmJkD4wOa2xsZwNtPmhvb4N6AW5vblkPjg2Ni2RpAw9vZmt+b28FAH5uXo6JbI2NZWcDBW8IBm4GBlcJBgVvb24NiGdrA21uBQVqawJEPjoFbQNtbg1riFw=",
        CapturedPlaypalRgbaSha256,
        0.38,
        0.13);

    internal static CapturedFirstDoorRawContractFixture Dev1046StableSightline021 { get; } = new(
        "dev1046-stable-sightline-021",
        "ref/TODO/doom-live-20260711-dev1046-1783793972347-samples.json#samples[21]",
        465,
        466,
        2,
        "aodqDoydjWdpaI5ojg1ODogNaoNibY1OTW5OT29NTk9NTosNa4mIimZmbz5uTzA/Tk4xMU+DD4lmjIuKZmePQWZlaGdrZmRJa18NjmiMi4tmaI9IaGZlbGhmZElriA2PaI2Li2Znj0dpZmNNaGViQ2uIDY9ojYuLZmhqSGpoZmhkZGRlaIgOj2iNi4tqa29NaGRkZGdkZGQDbU8Pa4+OZW2NakplZ2ZZX2JfQl1iD41pDg5sZ2huPmZpboN5bW5vb1xOj2mNZWYDaw1GaWlub29rDG4BbuyKa49lZ2lmbwYIBgVvBQYLBm8Fb09oiWdrZmZtBQVrA25IPzsCb2hsa2oOZIM=",
        CapturedPlaypalRgbaSha256,
        0.35,
        0.14);

    internal static CapturedFirstDoorRawContractFixture Dev1046StableSightline022 { get; } = new(
        "dev1046-stable-sightline-022",
        "ref/TODO/doom-live-20260711-dev1046-1783793972347-samples.json#samples[22]",
        486,
        487,
        2,
        "aodqDoydjWdpaI5ojg1ODogNaoNibY1OTW5OT29NTk9NTosNa4mIimZmbz5uTzA/Tk4xMU+DD4lmjIuKZmePQWZlaGdrZmRJa18NjmiMi4tmaI9IaGZlbGhmZElriA2PaI2Li2Znj0dpZmNNaGViQ2uIDY9ojYuLZmhqSGpoZmhkZGRlaIgOj2iNi4tqa29NaGRkZGdkZGQDbU8Pa4+OZW2NakplZ2ZZX2JfQl1iD41pDg5sZ2huPmZpboN5bW5vb1xOj2mNZWYDaw1GaWlub29rDG4BbuyKa49lZ2lmbwYIBgVvBQYLBm8Fb09oiWdrZmZtBQVrA25IPzsCb2hsa2oOZIM=",
        CapturedPlaypalRgbaSha256,
        0.35,
        0.14);

    internal static IReadOnlyList<CapturedFirstDoorRawContractFixture> Dev1046ApproachSequence { get; }
        = new[]
        {
            Dev1046Approach018,
            Dev1046Approach019,
            Dev1046Sightline020,
            Dev1046StableSightline021,
            Dev1046StableSightline022
        };

    internal static IReadOnlyList<CapturedFirstDoorRawContractFixture> Dev1046StableSightlineSequence { get; }
        = new[] { Dev1046StableSightline021, Dev1046StableSightline022 };

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose459 { get; } = new(
        "dev1047-bright-close-459",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#transition[tick=399]",
        459,
        460,
        2,
        "amNjYWJhYmJnZGhkSGdnT5GIZ2NZY2NkamRnYmdkaGRGZ2dFiIhoY2FoY2RnZGlYZ2RmZEhlZ0aIiGhjYWhjZW9kaWdnYmdkS2dnRmKIZ2NhaGRlZGRpZ2RkZWRCaGdIY4hoY2JtaWlqZGlkZGVqYmRnZ0ljiGhiZW1lZGRkaGZrbWllpEhnSmWMamVlA2RkZGRoZWhkZGVlZ2hKaGtrbGRoZGRkZGhlZWRAZWRnbI1liWOIaFtbZVtZW2JiaGhoamhvaWWKZYliZmRtbW1kaAB+pElJXmZEkWlliV5nbm1vbgFvbwBtb28FBZSNgmeMamhub4J6aEVFSWtvbm1obI1pZV8=",
        CapturedPlaypalRgbaSha256,
        0.35,
        0.09);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose468 { get; } = new(
        "dev1047-bright-close-468",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[23]",
        468,
        469,
        2,
        "YmRkZGVkZGRkZ15eXmJnZGdiSENAYlxkZWdnZWReXFxcXmJkYlpDPmRoZGRlZWVkZGRkZGRkZGBkZUOFZGdkZGRlZWdkZGRkZGRkZWRlQoVkZ2RkZGVlZ2RkZGRkZGdiZGVAhWRnZGRkZWVlZGRkZGRkZGRkZYViZGdkZGRlZWVkZGNkZ2VnRmRlYmJkZ2RkZGVlZWRkb2Rra2tnZGVlZGRnZGRkaExnZGRoZGRJZGJoa2trbW1pZGRnZ2VkaW1tbWtnZGgGBgZtaWlpbW1tbW1taWtKaGdkaAakpGhpaW1tbW2XbVkGaGVoZ2Rob6RtZ2ltbW1tbW1DXUtnZGdnZGdJpGE=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.08);

    internal static CapturedFirstDoorRawContractFixture Dev1047StationaryUseBoundary477 { get; } = new(
        "dev1047-stationary-use-boundary-477",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#transition[tick=417]",
        477,
        478,
        2,
        "ZWRkZGdkZWdnaGdnZ2RkZGRkZGZlZGRkZ2RlZ2RlZGRkZGRkZGRiZWVkZGRnZGVnZ2hnZ2dnZ2dnZGJlZWRkZGdkZWVkZWRkZGRkZGRiZGVlZGRkZ2RlZWRlZGVnZWNkY2NiYmVkZGRnZGVlZGVkampqaGRoYkZnZWRkZGhnTGdkZWRnZGRnZEtkYmVtaWRkZ2VnZWRlaW1tbW1ta2ZGZWlpZGRnZWdlZGVpaW1tbW1nZmZlaWlkZGdlZ2VkZWlpa21tSmdlZmVpaWltbW1tbW1rDGlpZ2hnZ2VmZWltbW1tbW2XbQYLaWllaGdnZWZlaWltbW1tbW1IPjpqaWRmZ2dlZmU=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.07);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose488 { get; } = new(
        "dev1047-bright-close-488",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[24]",
        488,
        489,
        2,
        "Z2RpaGVkZ2RnaGRkZElkQ2VkZ2pnZGlobG1qZGdkZ21nSW1PbWdnaWdkaWhkYmdkYmRnZGdIZ0hnZGdrZ2RpZGJiYmVlZFxcXEdBOWFlZ2hnZGlkZ2hlZWRnZ2dnZWWFZ2Vna2dkaWRlaGVlZGRkZGRlZWJnZGdoZy1oZGVoZWVkZGtvb2dlZGdkZ2pnJGhnbW1pZWVkaW1nZWVnZ2tnaGdkaGdlZ2ltbW1paGdlb22ka2dqZ2RoZ2RnZWdlaGVlZ2VnY2VraWhnZGhnZGdiZWULDGVnZWdkZS1oZ2dkaGdkZWVlZW4AXFxlZ2RlLWgDYl5oZ2RlZWVMPzxkYmVnZGVrTWg=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.08);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose508 { get; } = new(
        "dev1047-bright-close-508",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[25]",
        508,
        509,
        2,
        "YmdoZWFkYWlkZGhnZ2RnaEmNgohgZ2VmZGpnaGRkaGdnSmVoRYqIiWBkZG1kbWdoZGJoZ2dkZGhIiIiJYmdka2RnZ2hkamZnZGRkakiIiIliYmdNZGdnZGRkZGdiYmRqk4iIiWJkZGdkZ2JnZGRlZGVnZWuMYoiJaWpoZWQnY2dkZWpqZWdka41jiYlkZWdlZC1obWRla2cGBmRqjGOJiWRkZ2dkZ2hnZGRkZ2dnZGhNbI+OZGRlZ2RnaGRkZGRiZ2Uhao2KjmxkZElnZFhnYl5sYmdnZGRoj2WIiFtiQ1tiXl5lYGEKZWRlamRqZYmMZqRvbW1kaGhHT0ikpGIrZEeRA4w=",
        CapturedPlaypalRgbaSha256,
        0.52,
        0.09);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose527 { get; } = new(
        "dev1047-bright-close-527",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[26]",
        527,
        528,
        2,
        "A2doZWRhaGhnY2hmSGdqPk1eZ2IDZ2dnZGdoYmdkaGRHZ2pNPodnYgNkXmUpbWhiZ2RoZEZnakdHiGhjaGRsZSlnZWZnZ2ZkSGVqSIiIZ2NoZ2JNTWdlZWdiZGRIYmpKSIhnY2hmZmZoZ2VnZGRnZEFoakqJiGhjamdlZGRnZWRkZGtkZWdqSomIaGNqZ2hnZGdlZW1taWWkSGpMjIhoYgMhZGVnZ2VlZ2hkZWVnaI2ObGtpA2RkZmdcZWVlZ2BkZGduj4qJY2VjaGxsWVliYmIFAGdIY2CUjIpliWQjpKRIpGdoZ1cJb29qL0g+aWWJBQUFBQVubW9EPjpub25tRUuCZ4w=",
        CapturedPlaypalRgbaSha256,
        0.47,
        0.10);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose564 { get; } = new(
        "dev1047-bright-close-564",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[28]",
        564,
        565,
        2,
        "ZWRuZGRoYkxmZGdnSUlnZWiHR4pkaGtnamhhR2dkZ2dJSWdkaZNIiGZna2dnaGdKZWVkZElIZWRrSEiIZC9rZ2doZ2hlZWdnSEtsZWhIR4hkYk1nZ2RnaGVnZGRmRWdlY4xHYmdoZGdnZGVnZGdnZ2VEZ2VojEhjZGRoZy1kZGdkZ29rZ0RnZGuLSGNnZGVnaGdqaW1taWhlSgZkaItJY2dnZWdnZ2VnZUxlZ2VlZWRol09qZ2VkZy1nZWdkZGRiZWVlZGiKRmhkZWRiYmdlZ2RrDGRlZWVkaI1KZGRlZGVkZGZmZgYLZmZqaGgDS0plZGRkZWRnZWdIPjpvSpdKYWJFamU=",
        CapturedPlaypalRgbaSha256,
        0.54,
        0.10);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose600 { get; } = new(
        "dev1047-bright-close-600",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[30]",
        600,
        601,
        2,
        "aGVcYVxkXmlkZGhnZ2RnaGs+X4xoZWRuZSlnaGRkaGdnSmVokUdgjGhnZy9lZmdkZGRnZ2FlZGmTR2GMaGZla2VkZ21kSm1nbW1iaYyIYoxoYGUpZWRkZGRnYGJaYWJojEhjjGZoZ2llZGJnZGdkZ2VnZWiMiWOMaGZkZWVnZGVkZ2RkZWdkaIyJYoxnZ2RlZWRoZm1taWdvb2RqjIljjGRmZGdlZGhkSGRkZ2dmZANqbG1sLWdnZ2ViZ2RkZF5iZ2VkA4yJio1kZ2dkZWRcXlwFAGdnZ2ZojoxjimplBgYGBl9haVcJb29vamSRaWSMKGReWlpkbmFEPjplZGVlZYw+ZI4=",
        CapturedPlaypalRgbaSha256,
        0.50,
        0.08);

    internal static CapturedFirstDoorRawContractFixture Dev1047BrightClose669 { get; } = new(
        "dev1047-bright-close-669",
        "ref/TODO/doom-live-20260712-dev1047-1783799877547-samples.json#samples[34]",
        669,
        670,
        2,
        "bGdiYVxkXmlkZGhnZ2RmaGs+X4lsZ2RuZWRnaGRkaGdnSmVokUdgiWxkZC9lZ2diZGRnZ2FlYGmTR2GJbGdka2VnZ21kSm1nbW1iaYyIYolOXGcpZWdkZGRnYGJaYU5ojEhjiWZmZWllZ2JnZGdkZ2VnZWiMiWOJZGVkZWgtZGVkZWtrZWdkaoyJYolkZWRlZWdoZm1taWdvb2RqjIljjGRkaWdlZ2hkSGRkZ2dmZANqbG1rL2RJZ2VnZ2RkZF5iZ2VkA4yHioxkZEhkZWRcXlxrDGlnZ2ZojoxjimhkSAYGBl9hZwYLb29vYWSRaWSKZl1IWlpkbm5IPztlYGVlZYw+ZI4=",
        CapturedPlaypalRgbaSha256,
        0.55,
        0.09);

    internal static IReadOnlyList<CapturedFirstDoorRawContractFixture> Dev1047BrightCloseSequence { get; }
        = new[]
        {
            Dev1047BrightClose459,
            Dev1047BrightClose468,
            Dev1047StationaryUseBoundary477,
            Dev1047BrightClose488,
            Dev1047BrightClose508,
            Dev1047BrightClose527,
            Dev1047BrightClose564,
            Dev1047BrightClose600,
            Dev1047BrightClose669
        };

    internal static CapturedFirstDoorRawContractFixture Dev1045FarFieldLookalike013 { get; } = new(
        "dev1045-far-field-lookalike-013",
        "ref/TODO/doom-live-20260711-dev1045-1783758465615-samples.json#samples[13]",
        178,
        179,
        2,
        "ampqa2tsbW1ublFqRoiJbG9vb24DAwNqbGtsbG5VZ1UBDYtnam1ubWcDZmsDaWpqbFVVakiObWxlakdEZmdmamdnamlrZ1lVSIqGamxuTk5lZmRnZWYDaANRWWpKlIuNZWpERGRkY2ZkZWZmaFlVVUqOiw1na0tKYmNhY2NjZGVmZ2dqSoyMDWhrDkphYmFhYWIDZ2xRUVVKjIwNaGsNSmJiYWJiYwNqA2dnXEqOjQ5tb08BY2NiZGRla2loWVFVD29ua4xqDpZlZWNmZWZoA2prDFxKRY2OZ24PD2ZmZWZmZwNpawYLVZaOjm1nbEpKZmdmZWppbWpIPztclo+NZ2ps7e0=",
        CapturedPlaypalRgbaSha256,
        0.32,
        0.12);

    internal static CapturedFirstDoorRawContractFixture Dev1045FacadeFalsePositive006 { get; } = new(
        "dev1045-facade-false-positive-006",
        "ref/TODO/doom-live-20260711-dev1045-1783758465615-samples.json#samples[6]",
        109,
        110,
        2,
        "bW1tbm5tbG1tbG1tbW5shGVrA2Rvb29vb29ubm9ubm5ubWVnbWdmYAVvb29vb28Fb29vb2+Ka2pdYGZgBQUFBQUFBQUFBW6NjU8DYGFiZ2QFBQUFBQUFb4wNBU8OjGdkZGJnYA8ObQ4PD2mOj49tDY+OA2RlY2dgDg5uDg5ra21sDU9pj48DZWZkZ2sPDm0OD21qBW5uAWoOjwNlZWVnYAUFBQYG8wVqbmsPag0Fa2ZmZWdgBQYFBgUFBgcFDQ9ODY+ObmpnA2ttbm9uAm1uBW5rDE+NDwOKa25tYAVpbm8GBgZrbAYLBg6NbGRmi2tgBQV/bwVvBQVIPztuBU5lamZkZms=",
        CapturedPlaypalRgbaSha256,
        0.35,
        0.15);

    internal static CapturedFirstDoorRawContractFixture Dev1045FacadeFalsePositive019 { get; } = new(
        "dev1045-facade-false-positive-019",
        "ref/TODO/doom-live-20260711-dev1045-1783758465615-samples.json#samples[19]",
        237,
        238,
        2,
        "bm5tb28Fbm5ub21ubm5ub21ubgWSimtsb29vb29vBW9vbwUFBW9vbw6OjI1mZW1vbm9vb29vbwVvbwUFkooNDm1tamtnjG0FBQUFBQYFBQWNjIuMZIljaWhtBU8OBgUGBgYFBo6MjI1ojWhraGoNlw5Pbm9vAW8FjY2NjmmNaGtpaw4PDg5sag9ODg6NjY6OaY5qbW1uBQYFDm1tD08PDg0ObWuOjQNqag4OTk4FbgYGBQUIjo+NjmlrbW1niw1PDwVtBgUGBm4NDg5paIhmbG5nCW5vBm1vbW0GBZKKjA1tbGVvAg0ABgZvbWoFBQUFDmwOiwVvbW5vPk1EbAVvBW4FBQU=",
        CapturedPlaypalRgbaSha256,
        0.36,
        0.17);

    internal static CapturedFirstDoorRawContractFixture Dev1045FacadeFalsePositive042 { get; } = new(
        "dev1045-facade-false-positive-042",
        "ref/TODO/doom-live-20260711-dev1045-1783758465615-samples.json#samples[42]",
        465,
        466,
        2,
        "i4iOjGJoZUtXVldXa5OJiFdXV2mJiY6LBWVoS1kGBVZpiomJag1qa4mKlIoFb2VLBQcFBWiNjmVubW9oioiLiW4FBksFBQYGaoyKZW4FBWmJkpSSbW1tbQUHBgdra45nbwUFa4iHkokDamltiI2OaWqMiYgFBgVriIeKim1tbW6Nbo1oaI2OaAYGB2iIhpKTA2tqa06WTZdpjIpobk9uaYiHkopubm5uamZqaGiNjmVJmYZfiIaKkwUGjIuIaGJiYoqJiUqfY2KIhpKKb5SNz84FBfHP8vPPzm3O8oiHh5OLi87y8WUA8s/y8s7Ozs7OiImJi4rP8fJBQjbx8c/O8vLOzfI=",
        CapturedPlaypalRgbaSha256,
        0.40,
        0.15);

    internal static CapturedFirstDoorRawContractFixture Dev1045FacadeFalsePositive053 { get; } = new(
        "dev1045-facade-false-positive-053",
        "ref/TODO/doom-live-20260711-dev1045-1783758465615-samples.json#samples[53]",
        574,
        575,
        2,
        "VldXVlhXVmZjjYyMZWdliIhFjIxWVldtaFdkA2eNiIlkZ2SJjJRLk1dqbW1ubQMDZQUFBQUFBgUFBQWOZW1rbgVubmlnbAUGBgUGBgYFBYlvbm8FbgUFZmNtDwYGBQYHBgYGiQUFBQYFBW9kX24NAQVPbm5PAQWSipRGl25LT2Vhaw4CBU9ubwEBAYmNjYlubm5uaGRrBQYGBgZuBQYGikxMjo2MjWFnhY8GBQUGBWxvBQaOloySiWlmX2WJioqMjY2Ji42MjYlKjU2benZ5eWVi8c7yzvPP8s7z8kuMPl2GhmScZQDyz/Py8vPx8/Lxh5JHgoSZm59+b8/z8c/yz87P8/M=",
        CapturedPlaypalRgbaSha256,
        0.38,
        0.16);

    internal static IReadOnlyList<CapturedFirstDoorRawContractFixture> Dev1045FacadeFalsePositiveSequence { get; }
        = new[]
        {
            Dev1045FacadeFalsePositive006,
            Dev1045FacadeFalsePositive019,
            Dev1045FacadeFalsePositive042,
            Dev1045FacadeFalsePositive053
        };

    internal static CapturedFirstDoorRawContractFixture Dev1050ComputerRoom056 { get; } = new(
        "dev1050-computer-room-056",
        "ref/TODO/doom-live-20260713-dev1050-1783901394969-samples.json#sample-056",
        1053,
        1054,
        2,
        "BWcHBwcHBwcHBwcHZI96BQUFBb13hgcHBwf2Bwf2BwdffQatBroFAHcGAAcHB/UHB/YHB2YFsgW2AAAGBWoAAAcFBgYFBQUHBgW6AAgICAgIBwCaB25u827PbgcFAAgACAAFBZ9+Q3t8bgXPbc5tB28ICGtvAG96b09GZ2FubvNuz24HBQgIa29ubk8IAAiDhvLOz/LP8gcIBwgACAAIAG9tAkUCigYHB+8BBWxvagYFBgcAZAWDQ4uLBwcGBgcIBm8BfmwHBQcmIk2eDmsFBm5tDAUGbWtram9ka21mB0+Kig4FBwYLBgUGB25taGptBQNui42PG39KQj0GBQUGB25uZgE=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.15);

    internal static CapturedFirstDoorRawContractFixture Dev1050ComputerRoom057 { get; } = new(
        "dev1050-computer-room-057",
        "ref/TODO/doom-live-20260713-dev1050-1783901394969-samples.json#sample-057",
        1069,
        1070,
        2,
        "BWcHBwcHBwcHBwcHZI96BQUFBb13hgcHBwf2Bwf2BwdffQatBroFAHcGAAcHB/UHB/YHB2YFsgW2AAAGBWoAAAcFBgYFBQUHBgW6AAgICAgIBwAAB25u827PbgcFAAgACAAFBZ9+BgAHbgXPbc5tB28ICGtvAG96b09PbwdubvNuz24HBQgIa29ubk8IAAgI9vLOz/LP8gcIBwgACAAIAG9tawcHBwYHB+8BBWxvagYFBgcABwUHBwYHBwcGBgcIBm8BfmwHBQcFBwZvBQUFBm5tDAUGbWtram9kawYFBwYHB38FBwYLBgUGB25taGptBQYGa24FBn9KQj0GBQUGB25uZgE=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.16);

    internal static CapturedFirstDoorRawContractFixture Dev1050ComputerRoom058 { get; } = new(
        "dev1050-computer-room-058",
        "ref/TODO/doom-live-20260713-dev1050-1783901394969-samples.json#sample-058",
        1077,
        1078,
        2,
        "BWcHBwcHBwcHBwcHZI96BQUFBb13hgcHBwf2Bwf2BwdffQatBroFAHcGAAcHB/UHB/YHB2YFsgW2AAAGBWoAAAcFBgYFBQUHBgW6AAgICAgIBwAAB25u827PbgcFAAgACAAFBZ9+BgAHbgXPbc5tB28ICGtvAG96b09PbwdubvNuz24HBQgIa29ubk8IAAgI9vLOz/LP8gcIBwgACAAIAG9tawcHBwYHB+8BBWxvagYFBgcABwUHBwYHBwcGBgcIBm8BfmwHBQcFBwZvBQUFBm5tDAUGbWtram9kawYFBwYHB38FBwYLBgUGB25taGptBQYGa24FBn9KQj0GBQUGB25uZgE=",
        CapturedPlaypalRgbaSha256,
        0.37,
        0.16);

    internal static IReadOnlyList<CapturedFirstDoorRawContractFixture> Dev1050ComputerRoomSequence { get; }
        = new[]
        {
            Dev1050ComputerRoom056,
            Dev1050ComputerRoom057,
            Dev1050ComputerRoom058
        };

    internal static CapturedFirstDoorRawFrameFixture ComputerRoomPositive056 { get; } = new(
        "computer-room-positive-056",
        "ref/TODO/doom-live-20260710-dev1016-1783648301251-sample-056-milestone.png",
        "JycnJycnJycnJycnIyMjJycnJycnIyMjLy8vb1dDZ1M/g2tLe2NPb1dDg2tXg2tLd19LLy8vAAAAJycnJycnIyMjJycnIyMjGxsbIyMjJycnGxsbJycnb1dDX0s3b1dDd18/Z1M/e2NPd18/b1dDIyMjLy8vExMTIyMjGxsbGxsbIyMjIyMjIyMjIyMjIyMjIyMjV0MzV0Mzb1dDX0s3X0s3Uz8vZ1M/Z1MzIyMjIyMjIyMjGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbRzMjUz8fV0MzUz8vV0MzUz8vZ1MzZ1M/GxsbGxsbGxsbGxsbGxsbGxsbGxsbExMTExMTGxsbGxsbGxsbRzMjUz8fUz8fSzcbUz8fSzcbX0s3X0s3GxsbExMTGxsbGxsbHxcLGxsbIyMjIyMjGxsbHxcLKyMPKyMPZ1M/g2tXb1dDZ1M/b1dDd19Ld19LZ1M/CwsLOzs7T09PIyMjPysbTzsrOzs7Q0NDRzMjQy8bPysbRzMjTzsre2NPb1dDZ1MzZ1MzV0MzX0s3b1dDCwsLLy8vNzc3GxsbPysbRzMjQ0NDOzs7RzMjNyMTNyMTRzMjW0cre2NPb1dDZ1MzZ1MzV0MzX0s3d19LExMTIyMjIyMjIyMjHxcLIyMjIyMjLy8vMysTNyMTQy8bRzMjZ1M/d19Lb1dDb1dDb1dDd18/V0Mze2NPCwsLGxsbCwsLExMTExMTExMTJycnCxcHExMTExMTGxsbGxsbZ1M/b1dDb1dDd19Lb1dDe2NPe2NPe2NPCwsLExMTLy8vFw8HFw8HGxsbExMTGxsbExMTJycnR0dHExMTPysbAAAAg2tXe2NPd19Lg2tLg2tLe2NPGxsbGxsbJycnExMTIyMjGxsbIyMjIyMjExMTIyMjIyMjIyMjIyMjDxcAg2tLe2NPd19Lk3tji3Nbd19LEyMLExMTExMTJycnLy8vT09PLy8vGxsbGxsbLy8vJycnd08r14tb76Nzg2tLg2tXd19Li3Nbg2tLd18/Uz8fUz8fUz8v",
        0.37,
        0.18,
        0.43,
        0.35);

    internal static CapturedFirstDoorRawFrameFixture ComputerRoomPositive057 { get; } = new(
        "computer-room-positive-057",
        "ref/TODO/doom-live-20260710-dev1016-1783648301251-sample-057-milestone.png",
        "Ly8vIyMjNzc3Ly8vLy8vIyMjIyMjIyMjJycnJycnLy8vg2tLe2NPd19LHxcLm1sTGxsbIyMjIyMjLy8vJycnLy8vIyMjLy8vJycnJycnJycnJycnJycnJycnd18/e2NPg2tLd18/ExMTIyMjKyMPMysTLy8vAAAAIyMjIyMjIyMjIyMjIyMjIyMjGxsbGxsbGxsbGxsbd18/e2NPe2NPd19LIyMjCxcHJycnAAAAAAAAExMTGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbExMTGxsbb1dDg2tLg2tXd19LGxsbJycnIyMjIyMjKyMPJycnExMTGxsbExMTGxsbGxsbGxsbGxsbGxsbGxsbExMTV0MzZ1M/X0s3Z1MzGxsbGxsbGxsbGxsbExMTExMTGxsbGxsbExMTPysbTzsrLy8vTzsrTzsrTzsrW1tbZ1M/Uz8vUz8vX0s3ExMTBwcHCwsLJycnIyMjIyMjGxsbGxsbGxsbRzMjRzMjJycnRzMjPysbRzMjNzc3d19Le2NPV0Mzb1dDGxsbFw8HBwcHPysbNzc3PysbExMTGxsbGxsbPysbRzMjLy8vRzMjMysTRzMjLy8vd19Ld19LZ1Mze2NPExMTBwcHCwsLMysTJycnRzMjIyMjGxsbGxsbAAA7JycnExMTExMTExMTExMTGxsbd19Lg2tLe2NPe2NPCwsLGxsbCwsLExMTExMTGxsbGxsbExMTGxsbCxcHExMTExMTExMTExMTLy8vExMTd18/e2NPg2tLd18/CwsLCxcHGxsbLy8vExMTIyMjOzs7GxsbGxsbJycnGxsbOzs7GxsbExMTIyMjPysbAAAAe2NPe2NPd18/ExMTGxsbSzcbPy8XSzcbg2tXExMTGxsbOzs7GxsbExMTGxsbIyMjJycnNzc3IyMjDxcAg2tLg2tXd18/AABTAABrAABTAABrAABrAABHGxsbIyMjGxsbFw8HJycnGxsbGxsbGxsbd08r14tb76NzZ1M/Uz8vZ1MzAABTAABTAABTAABrAAA7AAAv",
        0.36,
        0.18,
        0.52,
        0.26);

    internal static CapturedFirstDoorRawFrameFixture ComputerRoomPositive058 { get; } = new(
        "computer-room-positive-058",
        "ref/TODO/doom-live-20260710-dev1016-1783648301251-sample-058-milestone.png",
        "JycnIyMjJycnJycnLy8vLy8vLy8vJycnLy8vd19Le2NPe2NPLy8vIyMjLy8vJycnAABTLy8vLy8vJycnIyMjJycnJycnJycnLy8vJycnJycnJycnIyMje2NPi3Nbe2NPLy8vIyMjNzc3HxcLAAAAIyMjLy8vIyMjIyMjJycnJycnGxsbGxsbJycnIyMjIyMjb1dDe2NPg2tXd18/IyMjIyMjIyMjIyMjLy8vIyMjIyMjLy8vGxsbGxsbIyMjGxsbGxsbGxsbGxsbGxsbb1dDg2tLg2tXd18/IyMjGxsbExMTGxsbIyMjIyMjQ0NDIyMjExMTGxsbGxsbGxsbGxsbGxsbExMTExMTUz8fb1dDd18/b1dDGxsbExMTGxsbGxsbGxsbGxsbExMTExMTExMTExMTTzsrUz8vQ0NDLy8vSzcbX0s3SzcbUz8vUz8vX0s3ExMTFw8HCwsLExMTExMTExMTExMTGxsbIyMjFw8HRzMjNzc3Nzc3PysbNyMTRzMjd18/Z1MzV0Mzb1dDExMTExMTHxcLNyMTNzc3RzMjNzc3ExMTGxsbHxcLRzMjNzc3Ozs7RzMjKyMPRzMjb1dDb1dDZ1Mze2NPExMTCwsLCwsLQy8bR0dHV1dXS0tLExMTGxsbGxsbAAA7CwsLExMTIyMjCwsLCxcHb1dDe2NPg2tLe2NPGxsbExMTExMTGxsbCwsLExMTExMTExMTJycnGxsbExMTExMTExMTExMTJycnGxsbb1dDg2tXg2tLd18/ExMTExMTJycnExMTJycnExMTExMTExMTExMTIyMjGxsbLy8vGxsbCwsLGxsbCwsLb1dDR0dHg2tLd18/Uz8vg2tXV0MzV0Mze2NPAAAvAABTAAAvExMTGxsbExMTGxsbGxsbIyMjExMTGxsbb1dDY2NjP0crb1dDAABHAABTAABTAAA7AAA7AAA7AABrSzcbGxsbLy8vJycnLy8vGxsbGxsbLy8vIyMjo2s/m2M796t7X0s3AAAvZ1MzUz8vd19LX0s3e2NPAABHAAA7",
        0.32,
        0.18,
        0.52,
        0.26);

    internal static IReadOnlyList<CapturedFirstDoorRawFrameFixture> ComputerRoomPositiveSequence { get; }
        = new[] { ComputerRoomPositive056, ComputerRoomPositive057, ComputerRoomPositive058 };

    internal static byte[] CreatePaletteRgba()
    {
        var rgb = Convert.FromBase64String(CanonicalPlaypalRgbBase64);
        Assert.Equal(256 * 3, rgb.Length);
        var rgba = new byte[FirstDoorRawPaletteObserver.PaletteRgbaByteCount];
        for (var index = 0; index < 256; index++)
        {
            rgba[index * 4] = rgb[index * 3];
            rgba[(index * 4) + 1] = rgb[(index * 3) + 1];
            rgba[(index * 4) + 2] = rgb[(index * 3) + 2];
            rgba[(index * 4) + 3] = byte.MaxValue;
        }

        return rgba;
    }
}

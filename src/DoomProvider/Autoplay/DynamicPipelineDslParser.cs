namespace AIKernel.Doom.Provider.Autoplay;

public sealed record DynamicPipelineDslParseResult(
    AutoplayPipelineDefinition Definition,
    IReadOnlyList<string> Diagnostics);

public static class DynamicPipelineDslParser
{
    private static readonly string[] RequiredTopLevelBlocks =
    [
        "aisthesis",
        "noesis",
        "krisis",
        "kinesis"
    ];

    private static readonly string[] RequiredStageBlocks =
    [
        "aisthesis",
        "noesis.phainesis",
        "noesis.nous",
        "krisis.topos",
        "krisis.kairos",
        "kinesis.kinesis",
        "kinesis.zoe"
    ];

    public static DynamicPipelineDslParseResult Parse(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            throw new ArgumentException("DSL source is empty.", nameof(source));
        }

        var state = new DynamicPipelineDslParseState();

        foreach (var raw in source.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var line = raw.Split('#')[0].Trim();
            if (line.Length == 0)
            {
                continue;
            }

            if (line.EndsWith("{", StringComparison.Ordinal))
            {
                state.OpenBlock(line[..^1].Trim());
                continue;
            }

            if (line == "}")
            {
                state.CloseBlock();
                continue;
            }

            DynamicPipelineDslStatementParser.Parse(line, state);
        }

        state.AddUnclosedBlockDiagnostic();

        ValidateRequiredBlocks(state.SeenTopLevel, state.SeenStageBlocks, state.Diagnostics);

        return new DynamicPipelineDslParseResult(state.ToDefinition(), state.Diagnostics);
    }

    private static void ValidateRequiredBlocks(
        IReadOnlyList<string> seenTopLevel,
        IReadOnlySet<string> seenStageBlocks,
        List<string> diagnostics)
    {
        var observedTopLevel = seenTopLevel.Where(RequiredTopLevelBlocks.Contains).ToArray();
        if (!observedTopLevel.SequenceEqual(RequiredTopLevelBlocks))
        {
            diagnostics.Add("Top-level block order must be aisthesis -> noesis -> krisis -> kinesis.");
        }

        foreach (var block in RequiredTopLevelBlocks)
        {
            if (!seenTopLevel.Contains(block, StringComparer.Ordinal))
            {
                diagnostics.Add($"Missing required top-level block '{block}'.");
            }
        }

        foreach (var block in RequiredStageBlocks)
        {
            if (!seenStageBlocks.Contains(block))
            {
                diagnostics.Add($"Missing required pipeline stage block '{block}'.");
            }
        }
    }
}

namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record CompiledAutoplayPhasePipelineSet(
    string Id,
    float Priority,
    bool Exclusive,
    IReadOnlySet<string> AllowedStageIds,
    IReadOnlyList<string> AllowedStagePrefixes,
    IReadOnlyList<CompiledAutoplayActionSequence> ActionSequences,
    Func<AutoplayPipelineContext, bool> Condition)
{
    public bool Matches(AutoplayPipelineContext context)
        => Condition(context);

    public bool Allows(CompiledAutoplayPipelineStage stage)
    {
        if (AllowedStageIds.Count == 0 && AllowedStagePrefixes.Count == 0)
        {
            return true;
        }

        if (AllowedStageIds.Contains(stage.Id))
        {
            return true;
        }

        return AllowedStagePrefixes.Any(prefix =>
            !string.IsNullOrWhiteSpace(prefix)
            && stage.Id.StartsWith(prefix, StringComparison.Ordinal));
    }

    public CompiledAutoplayActionSequence? FindTriggeredSequence(string stageId)
        => ActionSequences.FirstOrDefault(sequence => sequence.CanStartFrom(stageId));
}

internal sealed record CompiledAutoplayActionSequence(
    string Id,
    bool Exclusive,
    int MaxFrames,
    IReadOnlyList<string> TriggerStagePrefixes,
    IReadOnlyList<CompiledAutoplayActionSequenceStep> Steps)
{
    public int TotalStepFrames => Steps.Sum(step => Math.Max(1, step.Frames));

    public int BudgetFrames => Math.Max(1, Math.Min(Math.Max(1, MaxFrames), Math.Max(1, TotalStepFrames)));

    public bool CanStartFrom(string stageId)
        => TriggerStagePrefixes.Any(prefix =>
            !string.IsNullOrWhiteSpace(prefix)
            && stageId.StartsWith(prefix, StringComparison.Ordinal));

    public CompiledAutoplayActionSequenceStep? StepForFrame(int frame)
    {
        var normalizedFrame = Math.Max(1, frame);
        var cursor = 0;
        foreach (var step in Steps)
        {
            cursor += Math.Max(1, step.Frames);
            if (normalizedFrame <= cursor)
            {
                return step;
            }
        }

        return Steps.LastOrDefault();
    }
}

internal sealed record CompiledAutoplayActionSequenceStep(
    string Id,
    int Frames,
    Func<AutoplayPipelineContext, ActionCommand> Action);

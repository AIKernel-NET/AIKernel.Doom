namespace AIKernel.Doom.Provider.Autoplay;

public sealed record AutoplayPipelineDecision(
    string StrategyName,
    string StageId,
    string Objective,
    float Priority,
    float Threshold,
    float EvidenceScore,
    IReadOnlyDictionary<string, float> SemanticScores,
    IReadOnlyList<AutoplayPipelineStageEvaluation> StageEvaluations,
    ActionCommand Action,
    bool ZoeVetoed = false,
    string SvcEvent = "none")
{
    /// <summary>
    /// EN: Canonical four-layer pipeline state projected from the evaluated C# runtime context.
    /// JA: 評価済み C# runtime context から射影された canonical four-layer pipeline state です。
    /// </summary>
    public PipelineStateDto PipelineState { get; init; } = PipelineStateDto.Empty;

    /// <summary>
    /// EN: Goal panel state projected from the evaluated C# runtime context.
    /// JA: 評価済み C# runtime context から射影された goal panel state です。
    /// </summary>
    public DoomGoalStateDto GoalState { get; init; } = DoomGoalStateDto.Empty;

    /// <summary>
    /// EN: Debug overlay packet projected from the evaluated C# runtime context.
    /// JA: 評価済み C# runtime context から射影された debug overlay packet です。
    /// </summary>
    public DoomDebugOverlayDto DebugOverlay { get; init; } = DoomDebugOverlayDto.Empty;

    /// <summary>
    /// EN: Aggregated autoplay packet projected from the evaluated C# runtime context.
    /// JA: 評価済み C# runtime context から射影された集約済み autoplay packet です。
    /// </summary>
    public DoomAutoplayStateDto AutoplayState { get; init; } = DoomAutoplayStateDto.Empty;
}

public sealed record AutoplayPipelineStageEvaluation(
    string StageId,
    string Objective,
    float Priority,
    float Threshold,
    float EvidenceScore,
    bool ConditionMatched,
    bool EvidenceMatched,
    bool Selected);

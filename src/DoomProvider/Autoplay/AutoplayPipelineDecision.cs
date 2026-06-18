namespace AIKernel.Doom.Provider.Autoplay;

public sealed record AutoplayPipelineDecision(
    string StrategyName,
    string StageId,
    string Objective,
    int Priority,
    float Threshold,
    float EvidenceScore,
    IReadOnlyDictionary<string, float> SemanticScores,
    IReadOnlyList<AutoplayPipelineStageEvaluation> StageEvaluations,
    ActionCommand Action,
    bool ZoeVetoed = false,
    string SvcEvent = "none");

public sealed record AutoplayPipelineStageEvaluation(
    string StageId,
    string Objective,
    int Priority,
    float Threshold,
    float EvidenceScore,
    bool ConditionMatched,
    bool EvidenceMatched,
    bool Selected);

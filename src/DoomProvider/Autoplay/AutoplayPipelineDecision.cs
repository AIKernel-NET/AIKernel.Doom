namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>AutoplayPipelineDecision</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>AutoplayPipelineDecision</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="StrategyName">
/// [EN] Supplies the <c>StrategyName</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>StrategyName</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="StageId">
/// [EN] Supplies the <c>StageId</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>StageId</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Objective">
/// [EN] Supplies the <c>Objective</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Objective</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Priority">
/// [EN] Supplies the <c>Priority</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Priority</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Threshold">
/// [EN] Supplies the <c>Threshold</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Threshold</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="EvidenceScore">
/// [EN] Supplies the <c>EvidenceScore</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EvidenceScore</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="SemanticScores">
/// [EN] Supplies the <c>SemanticScores</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>SemanticScores</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="StageEvaluations">
/// [EN] Supplies the <c>StageEvaluations</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>StageEvaluations</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Action">
/// [EN] Supplies the <c>Action</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Action</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ZoeVetoed">
/// [EN] Supplies the <c>ZoeVetoed</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ZoeVetoed</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="SvcEvent">
/// [EN] Supplies the <c>SvcEvent</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>SvcEvent</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
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

/// <summary>
/// [EN] Defines the <c>AutoplayPipelineStageEvaluation</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>AutoplayPipelineStageEvaluation</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="StageId">
/// [EN] Supplies the <c>StageId</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>StageId</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Objective">
/// [EN] Supplies the <c>Objective</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Objective</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Priority">
/// [EN] Supplies the <c>Priority</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Priority</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Threshold">
/// [EN] Supplies the <c>Threshold</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Threshold</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="EvidenceScore">
/// [EN] Supplies the <c>EvidenceScore</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EvidenceScore</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ConditionMatched">
/// [EN] Supplies the <c>ConditionMatched</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ConditionMatched</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="EvidenceMatched">
/// [EN] Supplies the <c>EvidenceMatched</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EvidenceMatched</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Selected">
/// [EN] Supplies the <c>Selected</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Selected</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record AutoplayPipelineStageEvaluation(
    string StageId,
    string Objective,
    float Priority,
    float Threshold,
    float EvidenceScore,
    bool ConditionMatched,
    bool EvidenceMatched,
    bool Selected);

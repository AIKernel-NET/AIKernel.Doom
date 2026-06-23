namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: CTG trivalent council vote.
/// JA: CTG 三値評議会の投票です。
/// </summary>
public enum CtgCouncilVote
{
    /// <summary>
    /// [EN] Indicates that the council has no sufficient evidence to approve or reject.
    /// [JA] council が approve または reject する十分な evidence を持たないことを示します。
    /// </summary>
    Abstain = 0,

    /// <summary>
    /// [EN] Indicates that the council approves the proposed action.
    /// [JA] council が proposed action を承認することを示します。
    /// </summary>
    Approve = 1,

    /// <summary>
    /// [EN] Indicates that the council rejects the proposed action.
    /// [JA] council が proposed action を拒否することを示します。
    /// </summary>
    Reject = -1
}

/// <summary>
/// EN: CTG gate decision.
/// JA: CTG gate の判定です。
/// </summary>
public enum CtgGateDecisionKind
{
    /// <summary>
    /// [EN] Allows the proposed action to pass through the CTG gate.
    /// [JA] proposed action が CTG gate を通過することを許可します。
    /// </summary>
    Allow,

    /// <summary>
    /// [EN] Denies or rewrites the proposed action at the CTG gate.
    /// [JA] CTG gate で proposed action を拒否または書き換えます。
    /// </summary>
    Deny
}

/// <summary>
/// [EN] Defines the <c>CtgGateOptions</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>CtgGateOptions</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="EnableTrivalentCouncil">
/// [EN] Supplies the <c>EnableTrivalentCouncil</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EnableTrivalentCouncil</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="EnforceGate">
/// [EN] Supplies the <c>EnforceGate</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EnforceGate</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="TraceOnly">
/// [EN] Supplies the <c>TraceOnly</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>TraceOnly</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Quorum">
/// [EN] Supplies the <c>Quorum</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Quorum</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="LogosApprovalThreshold">
/// [EN] Supplies the <c>LogosApprovalThreshold</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>LogosApprovalThreshold</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="EthosRejectDangerThreshold">
/// [EN] Supplies the <c>EthosRejectDangerThreshold</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EthosRejectDangerThreshold</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="PathosRejectDangerThreshold">
/// [EN] Supplies the <c>PathosRejectDangerThreshold</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>PathosRejectDangerThreshold</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record CtgGateOptions(
    bool EnableTrivalentCouncil = true,
    bool EnforceGate = false,
    bool TraceOnly = true,
    int Quorum = 2,
    float LogosApprovalThreshold = 0.52f,
    float EthosRejectDangerThreshold = 0.78f,
    float PathosRejectDangerThreshold = 0.72f);

/// <summary>
/// [EN] Defines the <c>CtgProposalPacket</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>CtgProposalPacket</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="TraceId">
/// [EN] Supplies the <c>TraceId</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>TraceId</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="StepIndex">
/// [EN] Supplies the <c>StepIndex</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>StepIndex</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Phase">
/// [EN] Supplies the <c>Phase</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Phase</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Objective">
/// [EN] Supplies the <c>Objective</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Objective</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="CandidateAction">
/// [EN] Supplies the <c>CandidateAction</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>CandidateAction</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="PipelineDecision">
/// [EN] Supplies the <c>PipelineDecision</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>PipelineDecision</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="SemanticScores">
/// [EN] Supplies the <c>SemanticScores</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>SemanticScores</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record CtgProposalPacket(
    string TraceId,
    int StepIndex,
    string Phase,
    string Objective,
    ActionCommand CandidateAction,
    AutoplayPipelineDecision PipelineDecision,
    IReadOnlyDictionary<string, float> SemanticScores);

/// <summary>
/// [EN] Defines the <c>CouncilDecisionTrace</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>CouncilDecisionTrace</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="Council">
/// [EN] Supplies the <c>Council</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Council</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Vote">
/// [EN] Supplies the <c>Vote</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Vote</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ReasonCode">
/// [EN] Supplies the <c>ReasonCode</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ReasonCode</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Priority">
/// [EN] Supplies the <c>Priority</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Priority</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Threshold">
/// [EN] Supplies the <c>Threshold</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Threshold</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Evidence">
/// [EN] Supplies the <c>Evidence</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Evidence</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record CouncilDecisionTrace(
    string Council,
    CtgCouncilVote Vote,
    string ReasonCode,
    int Priority,
    float Threshold,
    IReadOnlyDictionary<string, float> Evidence);

/// <summary>
/// [EN] Defines the <c>CtgGateDecisionTrace</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>CtgGateDecisionTrace</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="GateExecuted">
/// [EN] Supplies the <c>GateExecuted</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>GateExecuted</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Decision">
/// [EN] Supplies the <c>Decision</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Decision</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ReasonCode">
/// [EN] Supplies the <c>ReasonCode</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ReasonCode</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Approvals">
/// [EN] Supplies the <c>Approvals</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Approvals</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Rejects">
/// [EN] Supplies the <c>Rejects</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Rejects</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Abstentions">
/// [EN] Supplies the <c>Abstentions</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Abstentions</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Quorum">
/// [EN] Supplies the <c>Quorum</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Quorum</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="EnforceGate">
/// [EN] Supplies the <c>EnforceGate</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>EnforceGate</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="TraceOnly">
/// [EN] Supplies the <c>TraceOnly</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>TraceOnly</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ActionChangedByGate">
/// [EN] Supplies the <c>ActionChangedByGate</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ActionChangedByGate</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record CtgGateDecisionTrace(
    bool GateExecuted,
    CtgGateDecisionKind Decision,
    string ReasonCode,
    int Approvals,
    int Rejects,
    int Abstentions,
    int Quorum,
    bool EnforceGate,
    bool TraceOnly,
    bool ActionChangedByGate);

/// <summary>
/// [EN] Defines the <c>StepGovernanceTrace</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>StepGovernanceTrace</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="TraceId">
/// [EN] Supplies the <c>TraceId</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>TraceId</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="StepIndex">
/// [EN] Supplies the <c>StepIndex</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>StepIndex</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Phase">
/// [EN] Supplies the <c>Phase</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Phase</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Objective">
/// [EN] Supplies the <c>Objective</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Objective</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="ProposalPacket">
/// [EN] Supplies the <c>ProposalPacket</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ProposalPacket</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="CouncilDecisionTrace">
/// [EN] Supplies the <c>CouncilDecisionTrace</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>CouncilDecisionTrace</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="GateDecision">
/// [EN] Supplies the <c>GateDecision</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>GateDecision</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="AppliedAction">
/// [EN] Supplies the <c>AppliedAction</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>AppliedAction</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record StepGovernanceTrace(
    string TraceId,
    int StepIndex,
    string Phase,
    string Objective,
    CtgProposalPacket ProposalPacket,
    IReadOnlyList<CouncilDecisionTrace> CouncilDecisionTrace,
    CtgGateDecisionTrace GateDecision,
    ActionCommand AppliedAction);

namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: CTG trivalent council vote.
/// JA: CTG 三値評議会の投票です。
/// </summary>
public enum CtgCouncilVote
{
    Abstain = 0,
    Approve = 1,
    Reject = -1
}

/// <summary>
/// EN: CTG gate decision.
/// JA: CTG gate の判定です。
/// </summary>
public enum CtgGateDecisionKind
{
    Allow,
    Deny
}

public sealed record CtgGateOptions(
    bool EnableTrivalentCouncil = true,
    bool EnforceGate = false,
    bool TraceOnly = true,
    int Quorum = 2,
    float LogosApprovalThreshold = 0.52f,
    float EthosRejectDangerThreshold = 0.78f,
    float PathosRejectDangerThreshold = 0.72f);

public sealed record CtgProposalPacket(
    string TraceId,
    int StepIndex,
    string Phase,
    string Objective,
    ActionCommand CandidateAction,
    AutoplayPipelineDecision PipelineDecision,
    IReadOnlyDictionary<string, float> SemanticScores);

public sealed record CouncilDecisionTrace(
    string Council,
    CtgCouncilVote Vote,
    string ReasonCode,
    int Priority,
    float Threshold,
    IReadOnlyDictionary<string, float> Evidence);

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

public sealed record StepGovernanceTrace(
    string TraceId,
    int StepIndex,
    string Phase,
    string Objective,
    CtgProposalPacket ProposalPacket,
    IReadOnlyList<CouncilDecisionTrace> CouncilDecisionTrace,
    CtgGateDecisionTrace GateDecision,
    ActionCommand AppliedAction);

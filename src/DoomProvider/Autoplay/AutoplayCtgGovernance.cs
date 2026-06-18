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

/// <summary>
/// EN: Deterministic CTG gate evaluator shared by the DSL control plane and WASM migration tests.
/// JA: DSL control plane と WASM 移行検証で共有する deterministic CTG gate evaluator です。
/// </summary>
public static class AutoplayCtgGate
{
    public static StepGovernanceTrace Evaluate(CtgProposalPacket proposal, CtgGateOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        var effective = Normalize(options);
        if (!effective.EnableTrivalentCouncil)
        {
            var disabled = new CtgGateDecisionTrace(
                false,
                CtgGateDecisionKind.Allow,
                "trivalent-council-disabled",
                0,
                0,
                0,
                effective.Quorum,
                false,
                true,
                false);
            return new StepGovernanceTrace(
                proposal.TraceId,
                proposal.StepIndex,
                proposal.Phase,
                proposal.Objective,
                proposal,
                [],
                disabled,
                proposal.CandidateAction);
        }

        var votes = new[]
        {
            EvaluateLogos(proposal, effective),
            EvaluateEthos(proposal, effective),
            EvaluatePathos(proposal, effective)
        };
        var approvals = votes.Count(vote => vote.Vote == CtgCouncilVote.Approve);
        var rejects = votes.Count(vote => vote.Vote == CtgCouncilVote.Reject);
        var abstentions = votes.Count(vote => vote.Vote == CtgCouncilVote.Abstain);
        var ethos = votes.First(vote => string.Equals(vote.Council, "Ethos", StringComparison.Ordinal));

        var decision = CtgGateDecisionKind.Allow;
        var reasonCode = "quorum-met";
        if (ethos.Vote == CtgCouncilVote.Reject)
        {
            decision = CtgGateDecisionKind.Deny;
            reasonCode = "ethos-veto";
        }
        else if (approvals >= effective.Quorum)
        {
            decision = CtgGateDecisionKind.Allow;
            reasonCode = "quorum-met";
        }
        else if (rejects == 0 && abstentions > approvals)
        {
            decision = CtgGateDecisionKind.Deny;
            reasonCode = "unknown-fail-closed";
        }
        else
        {
            decision = CtgGateDecisionKind.Deny;
            reasonCode = "quorum-not-met";
        }

        var applied = proposal.CandidateAction;
        var changed = false;
        if (effective.EnforceGate && !effective.TraceOnly && decision == CtgGateDecisionKind.Deny)
        {
            applied = proposal.CandidateAction with
            {
                MoveForward = false,
                MoveBackward = false,
                StrafeLeft = false,
                StrafeRight = false,
                UseKey = false,
                AttackKey = false
            };
            changed = applied != proposal.CandidateAction;
        }

        var gate = new CtgGateDecisionTrace(
            true,
            decision,
            reasonCode,
            approvals,
            rejects,
            abstentions,
            effective.Quorum,
            effective.EnforceGate,
            effective.TraceOnly,
            changed);

        return new StepGovernanceTrace(
            proposal.TraceId,
            proposal.StepIndex,
            proposal.Phase,
            proposal.Objective,
            proposal,
            votes,
            gate,
            applied);
    }

    private static CouncilDecisionTrace EvaluateLogos(CtgProposalPacket proposal, CtgGateOptions options)
    {
        var routeEvidence = MaxScore(proposal, "door", "corridor", "bridge", "computer-room");
        var evidence = MathF.Max(routeEvidence, proposal.PipelineDecision.EvidenceScore);
        if (proposal.CandidateAction.UseKey && routeEvidence < 0.28f)
        {
            return Trace("Logos", CtgCouncilVote.Abstain, "use-target-not-logically-confirmed", 52, options.LogosApprovalThreshold, ("route", routeEvidence));
        }

        if (proposal.CandidateAction.MoveForward && evidence < options.LogosApprovalThreshold && routeEvidence < 0.34f)
        {
            return Trace("Logos", CtgCouncilVote.Reject, "action-opposes-route-evidence", 64, options.LogosApprovalThreshold, ("route", routeEvidence), ("evidence", evidence));
        }

        if (evidence >= options.LogosApprovalThreshold || routeEvidence >= 0.46f)
        {
            return Trace("Logos", CtgCouncilVote.Approve, "objective-action-aligned", 48, options.LogosApprovalThreshold, ("route", routeEvidence), ("evidence", evidence));
        }

        return Trace("Logos", CtgCouncilVote.Abstain, "insufficient-logical-evidence", 32, options.LogosApprovalThreshold, ("route", routeEvidence), ("evidence", evidence));
    }

    private static CouncilDecisionTrace EvaluateEthos(CtgProposalPacket proposal, CtgGateOptions options)
    {
        var enemy = Score(proposal, "enemy");
        var safeZone = Score(proposal, "safe-zone");
        if (proposal.CandidateAction.AttackKey && enemy < 0.24f)
        {
            return Trace("Ethos", CtgCouncilVote.Reject, "fire-without-enemy-evidence", 92, 0.24f, ("enemy", enemy));
        }

        if (proposal.CandidateAction.UseKey && MaxScore(proposal, "door", "corridor") < 0.24f)
        {
            return Trace("Ethos", CtgCouncilVote.Abstain, "unknown-use-target", 58, 0.24f, ("door", Score(proposal, "door")));
        }

        if (safeZone >= 0.42f || enemy < 0.42f)
        {
            return Trace("Ethos", CtgCouncilVote.Approve, "safety-contract-satisfied", 56, 0.48f, ("safe-zone", safeZone), ("enemy", enemy));
        }

        return Trace("Ethos", CtgCouncilVote.Abstain, "safety-contract-unknown", 44, options.EthosRejectDangerThreshold, ("safe-zone", safeZone), ("enemy", enemy));
    }

    private static CouncilDecisionTrace EvaluatePathos(CtgProposalPacket proposal, CtgGateOptions options)
    {
        var enemy = Score(proposal, "enemy");
        if (enemy >= options.PathosRejectDangerThreshold && proposal.CandidateAction.MoveForward && !proposal.CandidateAction.AttackKey)
        {
            return Trace("Pathos", CtgCouncilVote.Reject, "danger-forward-repulsion", 76, options.PathosRejectDangerThreshold, ("enemy", enemy));
        }

        if (enemy >= 0.52f && (proposal.CandidateAction.MoveBackward || proposal.CandidateAction.TurnYaw != 0 || !proposal.CandidateAction.MoveForward))
        {
            return Trace("Pathos", CtgCouncilVote.Approve, "protective-motion-selected", 62, 0.52f, ("enemy", enemy));
        }

        if (enemy < 0.28f)
        {
            return Trace("Pathos", CtgCouncilVote.Approve, "low-affect-risk", 36, 0.28f, ("enemy", enemy));
        }

        return Trace("Pathos", CtgCouncilVote.Abstain, "affective-evidence-ambiguous", 40, options.PathosRejectDangerThreshold, ("enemy", enemy));
    }

    private static CtgGateOptions Normalize(CtgGateOptions? options)
    {
        var value = options ?? new();
        return value with
        {
            Quorum = Math.Clamp(value.Quorum, 1, 3),
            LogosApprovalThreshold = Math.Clamp(value.LogosApprovalThreshold, 0, 1),
            EthosRejectDangerThreshold = Math.Clamp(value.EthosRejectDangerThreshold, 0, 1),
            PathosRejectDangerThreshold = Math.Clamp(value.PathosRejectDangerThreshold, 0, 1)
        };
    }

    private static float Score(CtgProposalPacket proposal, string symbol)
        => proposal.SemanticScores.TryGetValue(symbol, out var score) ? Math.Clamp(score, 0, 1) : 0;

    private static float MaxScore(CtgProposalPacket proposal, params string[] symbols)
        => symbols.Select(symbol => Score(proposal, symbol)).DefaultIfEmpty().Max();

    private static CouncilDecisionTrace Trace(
        string council,
        CtgCouncilVote vote,
        string reasonCode,
        int priority,
        float threshold,
        params (string Key, float Value)[] evidence)
        => new(
            council,
            vote,
            reasonCode,
            priority,
            threshold,
            evidence.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal));
}

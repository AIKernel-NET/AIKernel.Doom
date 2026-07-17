namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record BrowserPostComputerRoomRouteInput
{
    public int ContractVersion { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ExpectedFirstDoorControlTick { get; init; }

    public PostComputerRoomCombatObservation CombatObservation { get; init; } = new();

    public PostComputerRoomNativeActorSnapshot ActorSnapshot { get; init; } = new();

    public PostComputerRoomNativeWeaponSnapshot WeaponSnapshot { get; init; } = new();
}

internal sealed record PostComputerRoomNativeWeaponSnapshot
{
    public bool Available { get; init; }

    public long Gametic { get; init; } = -1;

    public int StateCount { get; init; } = -1;

    public int ReadyWeapon { get; init; } = -1;

    public int PendingWeapon { get; init; } = -1;

    public int WeaponState { get; init; } = -1;

    public int WeaponReadyState { get; init; } = -1;

    public int Refire { get; init; } = -1;
}

internal sealed record PostComputerRoomNativeActorFact
{
    public long Identity { get; init; }

    public long XFixed { get; init; }

    public long YFixed { get; init; }

    public int SectorIndex { get; init; } = -1;

    public int Type { get; init; }

    public int Health { get; init; }

    public long Flags { get; init; }

    public bool LineOfSight { get; init; }
}

internal sealed record PostComputerRoomNativeActorSnapshot
{
    public bool Available { get; init; }

    public long Gametic { get; init; } = -1;

    public int Count { get; init; }

    public int Capacity { get; init; }

    public bool Truncated { get; init; }

    public IReadOnlyList<PostComputerRoomNativeActorFact> Actors { get; init; }
        = Array.Empty<PostComputerRoomNativeActorFact>();
}

internal sealed record PostComputerRoomRawFrameProof
{
    public bool Available { get; init; }

    public bool Fresh { get; init; }

    public long FrameSequence { get; init; } = -1;

    public long NativeGameticObservedAtEvaluation { get; init; } = -1;

    public string ObservationHash { get; init; } = string.Empty;
}

internal sealed record PostComputerRoomActivationProof
{
    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public FirstDoorControlState FirstDoorState { get; init; }

    public FirstDoorOwnershipDisposition FirstDoorOwnershipDisposition { get; init; }

    public bool OpenConfirmed { get; init; }

    public FirstDoorOpenConfirmationSource OpenConfirmationSource { get; init; }

    public bool ComputerRoomConfirmed { get; init; }

    public FirstDoorProximityObservation Proximity { get; init; } = new();

    public PostComputerRoomRawFrameProof RawFrame { get; init; } = new();

    public string ContractError { get; init; } = string.Empty;
}

internal sealed class PostComputerRoomBrowserControlSession
{
    private readonly PostComputerRoomRouteNavigator _navigator;
    private PostComputerRoomRouteDecision? _lastDecision;

    internal PostComputerRoomBrowserControlSession(PostComputerRoomRoutePolicy? policy = null)
    {
        _navigator = new PostComputerRoomRouteNavigator(policy);
    }

    internal PostComputerRoomRouteDecision Evaluate(
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomActivationProof? activationProof)
    {
        _lastDecision = _navigator.Evaluate(activationProof, input);
        return _lastDecision;
    }

    internal E1M1ContinuationActivationProof? TryCreateE1M1ContinuationActivationProof(
        long expectedPostComputerRoomControlTick)
    {
        var decision = _lastDecision;
        if (decision is null
            || expectedPostComputerRoomControlTick < 0
            || decision.State != PostComputerRoomRouteState.Complete
            || decision.OwnershipDisposition != PostComputerRoomOwnershipDisposition.Completed
            || !decision.Completed
            || decision.Exclusive
            || !string.Equals(
                decision.OwnerId,
                "post-computer-room.central-hall",
                StringComparison.Ordinal)
            || !string.Equals(
                decision.ReasonCode,
                "central-hall-entry-confirmed",
                StringComparison.Ordinal)
            || decision.RunRequested
            || !IsNeutral(decision.Action)
            || !string.IsNullOrEmpty(decision.ContractError)
            || !ExactCentralHallPose(decision.Proximity)
            || decision.NativeGametic != decision.Proximity.NativeGametic
            || decision.Navigation.LegIndex != 8
            || !string.Equals(
                decision.Navigation.LegId,
                "central-hall-entry",
                StringComparison.Ordinal)
            || decision.Navigation.PlayerSectorIndex != 60
            || decision.Navigation.NativeGametic != decision.Proximity.NativeGametic
            || !decision.SemanticProjection.ComputerRoomEntered
            || !decision.SemanticProjection.CentralHallEntered
            || !string.Equals(
                decision.SemanticProjection.Telos,
                "CentralHall",
                StringComparison.Ordinal)
            || !string.Equals(
                decision.SemanticProjection.Objective,
                "reach-central-hall",
                StringComparison.Ordinal)
            || !FailureTraceIsEmpty(decision.FailureTrace)
            || !ExactCompletionTrace(
                decision,
                expectedPostComputerRoomControlTick))
        {
            return null;
        }

        var completion = decision.CompletionTrace;
        var frozenReplay = Array.AsReadOnly(completion.Replay.ToArray());
        var frozenTrace = completion with { Replay = frozenReplay };
        return new E1M1ContinuationActivationProof
        {
            SessionId = decision.SessionId,
            RunId = decision.RunId,
            RunGeneration = decision.RunGeneration,
            ActivationAtControlTick = completion.CompletionAtControlTick,
            PostCompletionTrace = frozenTrace,
            ActivationPose = decision.Proximity with { },
            ContractError = string.Empty
        };
    }

    private static bool ExactCompletionTrace(
        PostComputerRoomRouteDecision decision,
        long expectedPostComputerRoomControlTick)
    {
        var trace = decision.CompletionTrace;
        var snapshot = trace.CompletionSnapshot;
        var replay = trace.Replay;
        return trace.Completed
            && trace.CompletionAtControlTick == expectedPostComputerRoomControlTick
            && string.Equals(trace.SessionId, decision.SessionId, StringComparison.Ordinal)
            && string.Equals(trace.RunId, decision.RunId, StringComparison.Ordinal)
            && trace.RunGeneration == decision.RunGeneration
            && string.Equals(
                trace.CompletionCode,
                "central-hall-entry-confirmed",
                StringComparison.Ordinal)
            && snapshot is not null
            && replay is not null
            && replay.Count > 0
            && replay.Count <= PostComputerRoomCompletionTrace.ReplayCapacity
            && Equals(snapshot, replay[^1])
            && snapshot.ControlTick == trace.CompletionAtControlTick
            && snapshot.State == PostComputerRoomRouteState.Complete
            && string.Equals(
                snapshot.ReasonCode,
                trace.CompletionCode,
                StringComparison.Ordinal)
            && snapshot.PlayerSectorIndex == 60
            && snapshot.LegIndex == 8
            && string.Equals(snapshot.LegId, "central-hall-entry", StringComparison.Ordinal)
            && !snapshot.RunRequested
            && IsNeutral(snapshot.Action)
            && ReplayTicksAreStrictlyIncreasing(replay);
    }

    private static bool ReplayTicksAreStrictlyIncreasing(
        IReadOnlyList<PostComputerRoomRouteReplayEntry> replay)
    {
        for (var index = 1; index < replay.Count; index++)
        {
            if (replay[index - 1].ControlTick >= replay[index].ControlTick)
            {
                return false;
            }
        }

        return true;
    }

    private static bool ExactCentralHallPose(FirstDoorProximityObservation pose)
        => pose.InputAccepted
            && pose.Available
            && pose.Fresh
            && pose.WadVerified
            && string.Equals(
                pose.WadContentSha256,
                FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                StringComparison.Ordinal)
            && pose.NativeGametic >= 0
            && pose.NativeGameState == 0
            && pose.NativeGameEpisode == 1
            && pose.NativeGameMap == 1
            && pose.PlayerSectorIndex == 60;

    private static bool FailureTraceIsEmpty(PostComputerRoomFailureTrace trace)
        => !trace.Failed
            && trace.FailureAtControlTick == -1
            && string.IsNullOrEmpty(trace.FailureCode)
            && trace.FailureSnapshot is null
            && (trace.Replay?.Count ?? 0) == 0;

    private static bool IsNeutral(ActionCommand action)
        => !action.MoveForward
            && !action.MoveBackward
            && !action.StrafeLeft
            && !action.StrafeRight
            && action.TurnYaw == 0
            && !action.UseKey
            && !action.AttackKey;
}

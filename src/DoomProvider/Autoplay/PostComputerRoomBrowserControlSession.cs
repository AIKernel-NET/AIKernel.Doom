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

    internal PostComputerRoomBrowserControlSession(PostComputerRoomRoutePolicy? policy = null)
    {
        _navigator = new PostComputerRoomRouteNavigator(policy);
    }

    internal PostComputerRoomRouteDecision Evaluate(
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomActivationProof? activationProof)
        => _navigator.Evaluate(activationProof, input);
}

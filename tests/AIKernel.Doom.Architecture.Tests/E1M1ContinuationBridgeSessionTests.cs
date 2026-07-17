using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.Architecture.Tests;

public sealed class E1M1ContinuationBridgeSessionTests
{
    [Fact]
    public void CompletedPostRoute_CreatesContinuationProofAtFrozenCompletionTick()
    {
        var session = new PostComputerRoomBrowserControlSession();
        var completed = session.Evaluate(
            Input(100),
            Proof(100, Pose(100)));

        Assert.Equal(PostComputerRoomRouteState.Complete, completed.State);
        Assert.Equal(100, completed.CompletionTrace.CompletionAtControlTick);

        var current = session.Evaluate(
            Input(101),
            Proof(101, Pose(101)));
        Assert.Equal(101, current.ControlTick);
        Assert.Equal(100, current.CompletionTrace.CompletionAtControlTick);

        Assert.Null(session.TryCreateE1M1ContinuationActivationProof(101));
        var activation = session.TryCreateE1M1ContinuationActivationProof(100);

        Assert.NotNull(activation);
        Assert.Equal(100, activation.ActivationAtControlTick);
        Assert.Equal("session-1", activation.SessionId);
        Assert.Equal("run-1", activation.RunId);
        Assert.Equal(1, activation.RunGeneration);
        Assert.Equal(60, activation.ActivationPose.PlayerSectorIndex);
        Assert.True(activation.PostCompletionTrace.Completed);
        Assert.Equal(100, activation.PostCompletionTrace.CompletionAtControlTick);
        Assert.Equal(
            activation.PostCompletionTrace.CompletionSnapshot,
            activation.PostCompletionTrace.Replay[^1]);
        Assert.Empty(activation.ContractError);
    }

    [Fact]
    public void NonCompletedPostRoute_DoesNotCreateContinuationProof()
    {
        var session = new PostComputerRoomBrowserControlSession();
        var decision = session.Evaluate(
            Input(1),
            Proof(1, Pose(1) with
            {
                PlayerX = 2880,
                PlayerY = -2928,
                PlayerSectorIndex = 71
            }));

        Assert.NotEqual(PostComputerRoomRouteState.Complete, decision.State);
        Assert.Null(session.TryCreateE1M1ContinuationActivationProof(1));
    }

    private static BrowserPostComputerRoomRouteInput Input(long tick)
        => new()
        {
            ContractVersion = 2,
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ExpectedFirstDoorControlTick = tick
        };

    private static PostComputerRoomActivationProof Proof(
        long tick,
        FirstDoorProximityObservation pose)
        => new()
        {
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ControlTick = tick,
            FirstDoorState = FirstDoorControlState.Complete,
            FirstDoorOwnershipDisposition = FirstDoorOwnershipDisposition.Completed,
            OpenConfirmed = true,
            OpenConfirmationSource = FirstDoorOpenConfirmationSource.TrustedAudio,
            ComputerRoomConfirmed = true,
            Proximity = pose
        };

    private static FirstDoorProximityObservation Pose(long nativeGametic)
        => new()
        {
            InputAccepted = true,
            Available = true,
            Fresh = true,
            Truth = FirstDoorEvidenceTruth.Yes,
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            WadVerified = true,
            NativeGametic = nativeGametic,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            PlayerVitalityFactsAvailable = true,
            PlayerHealth = 100,
            PlayerState = 0,
            PlayerKillCount = 1,
            PlayerX = 2944,
            PlayerY = -3024,
            HeadingDegrees = 270,
            PlayerSectorIndex = 60
        };
}

using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.Architecture.Tests;

public sealed class AutoplayPipelineFirstDoorInvariantTests
{
    [Theory]
    [InlineData("computer-room")]
    [InlineData("bridge")]
    [InlineData("central-hall")]
    public void VisualPostDoorLabel_WithoutTrustedOpen_DoesNotReleaseDoorZero(string contextLabel)
    {
        var context = CreateContext(new SensorFusion(
            [0, 0, 0, 0, 0, 0],
            1,
            100,
            0,
            contextLabel,
            false,
            0,
            0));

        Assert.Equal(0, context.DoorOpenedCount);
        Assert.False(context.CentralHallEntered);
        Assert.False(context.BridgeLaneVisible);
        Assert.Equal(0, context.PostDoorTerminalSurface);
    }

    [Fact]
    public void TrustedFirstDoorMilestone_ReleasesDoorOne()
    {
        var context = CreateContext(new SensorFusion(
            [0, 0, 0, 0, 0, 0],
            1,
            100,
            0,
            "computer-room",
            false,
            0,
            0)
        {
            TrustedFirstDoorOpenMilestone = true
        });

        Assert.Equal(1, context.DoorOpenedCount);
    }

    [Fact]
    public void UsePulseCooldown_IsSuppliedByTrustedRuntimeInput()
    {
        var context = CreateContext(new SensorFusion(
            [0, 0, 0, 0, 0, 0],
            1,
            100,
            0,
            "corner",
            false,
            0,
            0)
        {
            UsePulseCooldownFrames = 17
        });

        Assert.Equal(17, context.UsePulseCooldownFrames);
    }

    [Fact]
    public void VisualBridgeLabel_WithoutTrustedOpen_CannotSelectPostDoorPhase()
    {
        var strategy = new DynamicPipelineAutoplayStrategy(AutoplayOptimizationProfile.Default);
        var decision = strategy.EvaluateTick(
            new SensorFusion([0, 0, 0, 0, 0, 0], 0.92f, 100, 0, "bridge", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("semantic.bridge", 0.92f),
                    ("vision.open", 0.80f),
                    ("system.health", 1.0f),
                    ("system.enabled", 1.0f))
            },
            recoveryFrames: 0);

        Assert.NotEqual("post-door-route", decision.PhasePipelineId);
        Assert.DoesNotContain("bridge", decision.StageId, StringComparison.OrdinalIgnoreCase);
    }

    private static AutoplayPipelineContext CreateContext(SensorFusion sensor)
        => new(sensor, recoveryFrames: 0, AutoplayOptimizationProfile.Default);
}

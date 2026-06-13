namespace AIKernel.Doom.Provider.Autoplay;

using AIKernel.Core.Sdk.Runtime;

public sealed class SeparatedDoorProbeStrafeRunnerV4 : IAutoplayStrategy
{
    private readonly AutoplayOptimizationProfile _profile;

    public SeparatedDoorProbeStrafeRunnerV4(AutoplayOptimizationProfile? profile = null)
    {
        _profile = profile ?? AutoplayOptimizationProfile.Default;
    }

    public string StrategyName => _profile.StrategyName;

    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
    {
        var context = NormalizeContext(sensor.ContextDict);
        var depth = Clamp01(sensor.DepthSig);
        var yawError = Math.Clamp(sensor.QDelta, -180, 180);
        var wallVector = EstimateWallVector(sensor.Screen6Regions);
        var escapeYaw = EscapeYaw(wallVector);

        if (sensor.Health > 0 && sensor.Health < _profile.LowHealthThreshold)
        {
            return new ActionCommand(
                MoveForward: depth > 0.42f,
                MoveBackward: depth <= _profile.BlockedDepth,
                StrafeLeft: wallVector >= 0,
                StrafeRight: wallVector < 0,
                TurnYaw: escapeYaw,
                UseKey: false,
                AttackKey: false);
        }

        if (recoveryFrames > 0 || sensor.StuckTicks >= _profile.EmergencyStuckTicks)
        {
            return EmergencyEscape(depth, wallVector, context is "wall" or "corner");
        }

        if (IsCombatSignal(sensor))
        {
            var combatYaw = sensor.FaceSig < -_profile.CombatFaceThreshold ? -_profile.CombatYawDegrees : _profile.CombatYawDegrees;
            return new ActionCommand(
                MoveForward: depth > 0.5f,
                MoveBackward: false,
                StrafeLeft: _profile.EnableStrafeRun && combatYaw > 0,
                StrafeRight: _profile.EnableStrafeRun && combatYaw < 0,
                TurnYaw: combatYaw,
                UseKey: false,
                AttackKey: depth < 0.82f || sensor.SoundEvent);
        }

        if (ShouldProbeDoor(context, sensor.StuckTicks, depth))
        {
            return DoorProbe(depth, yawError, wallVector);
        }

        if (context == "corner")
        {
            return new ActionCommand(
                MoveForward: depth > 0.36f,
                MoveBackward: depth <= _profile.BlockedDepth,
                StrafeLeft: wallVector >= 0,
                StrafeRight: wallVector < 0,
                TurnYaw: escapeYaw,
                UseKey: depth <= _profile.DoorUseDepth && Math.Abs(yawError) <= _profile.DoorSoftAimToleranceDegrees,
                AttackKey: false);
        }

        if (context == "open-space")
        {
            var cruiseYaw = Math.Abs(wallVector) < _profile.OpenCruiseWallVectorDeadZone
                ? 0
                : (wallVector > 0 ? -_profile.OpenCruiseYawDegrees : _profile.OpenCruiseYawDegrees);
            return new ActionCommand(
                MoveForward: true,
                MoveBackward: false,
                StrafeLeft: _profile.EnableStrafeRun && cruiseYaw >= 0,
                StrafeRight: _profile.EnableStrafeRun && cruiseYaw < 0,
                TurnYaw: cruiseYaw,
                UseKey: false,
                AttackKey: false);
        }

        return new ActionCommand(
            MoveForward: true,
            MoveBackward: false,
            StrafeLeft: wallVector >= 0,
            StrafeRight: wallVector < 0,
            TurnYaw: wallVector > 0 ? -_profile.WallAwayYawDegrees : _profile.WallAwayYawDegrees,
            UseKey: false,
            AttackKey: false);
    }

    private ActionCommand DoorProbe(float depth, int yawError, float wallVector)
    {
        var aimYaw = AimYaw(yawError, wallVector);
        var aligned = Math.Abs(yawError) <= _profile.DoorAimToleranceDegrees;
        if (!aligned)
        {
            return new ActionCommand(
                MoveForward: false,
                MoveBackward: false,
                StrafeLeft: false,
                StrafeRight: false,
                TurnYaw: aimYaw,
                UseKey: false,
                AttackKey: false);
        }

        if (depth > _profile.DoorApproachDepth || depth > _profile.DoorUseDepth)
        {
            return new ActionCommand(
                MoveForward: true,
                MoveBackward: false,
                StrafeLeft: false,
                StrafeRight: false,
                TurnYaw: 0,
                UseKey: false,
                AttackKey: false);
        }

        return new ActionCommand(
            MoveForward: false,
            MoveBackward: false,
            StrafeLeft: false,
            StrafeRight: false,
            TurnYaw: 0,
            UseKey: true,
            AttackKey: false);
    }

    private ActionCommand EmergencyEscape(float depth, float wallVector, bool mayUse)
    {
        var yaw = EscapeYaw(wallVector);
        return new ActionCommand(
            MoveForward: depth > _profile.BlockedDepth,
            MoveBackward: depth <= _profile.BlockedDepth,
            StrafeLeft: _profile.EnableStrafeRun && wallVector >= 0,
            StrafeRight: _profile.EnableStrafeRun && wallVector < 0,
            TurnYaw: yaw,
            UseKey: mayUse && depth <= _profile.DoorUseDepth,
            AttackKey: false);
    }

    private bool IsCombatSignal(SensorFusion sensor)
        => sensor.SoundEvent || Math.Abs(sensor.FaceSig) >= _profile.CombatFaceThreshold;

    private bool ShouldProbeDoor(string context, int stuckTicks, float depth)
        => context == "corner" || (context == "wall" && stuckTicks >= _profile.DoorProbeStuckTicks) || (context == "corridor" && stuckTicks >= _profile.DoorProbeStuckTicks * 2 && depth <= 0.68f);

    private int AimYaw(int yawError, float wallVector)
    {
        if (Math.Abs(yawError) > _profile.DoorSoftAimToleranceDegrees)
        {
            return Math.Clamp(yawError, -24, 24);
        }

        return wallVector > 0 ? _profile.DoorAimYawDegrees : -_profile.DoorAimYawDegrees;
    }

    private int EscapeYaw(float wallVector)
        => wallVector > 0 ? -_profile.EmergencyEscapeYawDegrees : _profile.EmergencyEscapeYawDegrees;

    private static float EstimateWallVector(IReadOnlyList<float>? regions)
    {
        if (regions is null || regions.Count < 6)
        {
            return 0;
        }

        var left = regions[0] + regions[1] + (regions[2] * 1.3f);
        var right = regions[3] + regions[4] + (regions[5] * 1.3f);
        return Math.Clamp(right - left, -1f, 1f);
    }

    private static float Clamp01(float value)
        => Math.Clamp(value, 0f, 1f);

    private static string NormalizeContext(string? context)
        => string.IsNullOrWhiteSpace(context) ? "corridor" : context.Trim().ToLowerInvariant();
}

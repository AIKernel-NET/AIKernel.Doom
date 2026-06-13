namespace AIKernel.Core.Sdk.Runtime;

public sealed record SensorFusion(
    float[] Screen6Regions,
    float DepthSig,
    int Health,
    float FaceSig,
    string ContextDict,
    bool SoundEvent,
    int StuckTicks,
    int QDelta);

public sealed record ActionCommand(
    bool MoveForward,
    bool MoveBackward,
    bool StrafeLeft,
    bool StrafeRight,
    int TurnYaw,
    bool UseKey,
    bool AttackKey);

public interface IAutoplayStrategy
{
    string StrategyName { get; }

    ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames);
}

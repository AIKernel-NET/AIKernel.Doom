namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Represents ActionCommand.
/// EN: Documentation for public API. JA: ActionCommand を表します。
/// </summary>
public sealed record ActionCommand(
    bool MoveForward,
    bool MoveBackward,
    bool StrafeLeft,
    bool StrafeRight,
    int TurnYaw,
    bool UseKey,
    bool AttackKey);

/// <summary>
/// EN: Defines the IAutoplayStrategy contract.
/// EN: Documentation for public API. JA: IAutoplayStrategy contract を定義します。
/// </summary>
public interface IAutoplayStrategy
{
    string StrategyName { get; }

    ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames);
}

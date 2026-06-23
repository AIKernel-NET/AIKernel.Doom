namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Describes the deterministic Kinesis command emitted by an autoplay strategy for one Doom tick.
/// [JA] autoplay strategy が 1 Doom tick に対して出力する決定論的な Kinesis command を表します。
/// </summary>
/// <remarks>
/// [EN] Keep this positional record stable because the runtime adapter, HUD action trace, and VM fixtures read the same movement/use/fire fields.
/// [JA] runtime adapter、HUD action trace、VM fixture が同じ movement/use/fire field を読むため、この positional record は安定させてください。
/// </remarks>
/// <param name="MoveForward">
/// [EN] Moves the player forward when true.
/// [JA] true の場合、プレイヤーを前進させます。
/// </param>
/// <param name="MoveBackward">
/// [EN] Moves the player backward when true.
/// [JA] true の場合、プレイヤーを後退させます。
/// </param>
/// <param name="StrafeLeft">
/// [EN] Strafes the player left when true.
/// [JA] true の場合、プレイヤーを左へ strafe させます。
/// </param>
/// <param name="StrafeRight">
/// [EN] Strafes the player right when true.
/// [JA] true の場合、プレイヤーを右へ strafe させます。
/// </param>
/// <param name="TurnYaw">
/// [EN] Applies the yaw turn amount used by the Doom input bridge.
/// [JA] Doom input bridge が使用する yaw turn amount を適用します。
/// </param>
/// <param name="UseKey">
/// [EN] Pulses the Doom use command when true.
/// [JA] true の場合、Doom use command を pulse します。
/// </param>
/// <param name="AttackKey">
/// [EN] Pulses the Doom attack command when true.
/// [JA] true の場合、Doom attack command を pulse します。
/// </param>
public sealed record ActionCommand(
    bool MoveForward,
    bool MoveBackward,
    bool StrafeLeft,
    bool StrafeRight,
    int TurnYaw,
    bool UseKey,
    bool AttackKey);

/// <summary>
/// [EN] Defines the autoplay strategy contract that converts fused sensor state into a deterministic Doom action.
/// [JA] fused sensor state を決定論的な Doom action に変換する autoplay strategy contract を定義します。
/// </summary>
/// <remarks>
/// [EN] Implementations should be deterministic for the same sensor packet so replay tests can compare command sequences.
/// [JA] replay test が command sequence を比較できるように、実装は同じ sensor packet に対して決定論的である必要があります。
/// </remarks>
public interface IAutoplayStrategy
{
    /// <summary>
    /// [EN] Gets the stable strategy name used in autoplay logs, HUD traces, and regression fixtures.
    /// [JA] autoplay log、HUD trace、regression fixture で使用する安定した strategy name を取得します。
    /// </summary>
    string StrategyName { get; }

    /// <summary>
    /// [EN] Produces the next Doom action command from the fused sensor state and recovery counter.
    /// [JA] fused sensor state と recovery counter から次の Doom action command を生成します。
    /// </summary>
    /// <param name="sensor">
    /// [EN] The fused visual, motion, route, and health sensor state for the current tick.
    /// [JA] 現在 tick の visual、motion、route、health を統合した sensor state です。
    /// </param>
    /// <param name="recoveryFrames">
    /// [EN] The number of frames already spent in recovery or escape behavior.
    /// [JA] recovery または escape behavior に費やした frame 数です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic action command that should be applied to the Doom runtime.
    /// [JA] Doom runtime に適用する決定論的な action command です。
    /// </returns>
    ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames);
}

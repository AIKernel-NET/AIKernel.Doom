namespace AIKernel.Doom.Architecture.Tests;

using AIKernel.Doom.Provider;
using AIKernel.Doom.Provider.Autoplay;
using AIKernel.Enums.Perception;

/// <summary>
/// EN: Tests Doom-specific mapping adapters remain scenario-local.
/// JA: Doom 固有 mapping adapter が scenario-local に留まることをテストします。
/// </summary>
public sealed class DoomMappingTests
{
    /// <summary>
    /// EN: Verifies Doom HUD mapping produces generic HUD DTOs.
    /// JA: Doom HUD mapping が generic HUD DTO を生成することを検証します。
    /// </summary>
    [Fact]
    public void DoomHudSignalMapper_State_ReturnsGenericHudSignals()
    {
        var mapper = new DoomHudSignalMapper();

        var result = mapper.Map(new DoomGameState(42, 7, true), "obs");

        Assert.Contains(result.Signals, signal => signal.Kind == HudSignalKind.Health && signal.NumericValue == 42);
        Assert.Contains(result.Signals, signal => signal.Kind == HudSignalKind.Resource && signal.NumericValue == 7);
    }

    /// <summary>
    /// EN: Verifies Doom input mapping uses generic virtual input DTOs.
    /// JA: Doom input mapping が generic virtual input DTO を使用することを検証します。
    /// </summary>
    [Fact]
    public void DoomInputMappingAdapter_ActionCommand_ReturnsKeyboardPacket()
    {
        var adapter = new DoomInputMappingAdapter();

        var request = adapter.Map(new ActionCommand(true, false, true, false, 12, true, false), "input-1");

        Assert.Contains("ArrowUp", request.Packet.Keyboard!.PressedKeys);
        Assert.Contains("KeyA", request.Packet.Keyboard.PressedKeys);
        Assert.Contains("Space", request.Packet.Keyboard.PressedKeys);
    }
}

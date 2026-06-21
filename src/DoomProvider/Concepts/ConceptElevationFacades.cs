namespace AIKernel.Doom.Provider.Concepts;

/// <summary>
/// [Visual semantics layer - Phantasia / ファンタシア]
/// [EN] Concept facade for a DOOM scene representation owned by the Doom repository.
/// [JA] Doom repository が所有する DOOM scene representation の概念 facade です。
/// Old technical name: VisualSemantics / DoomScene.
/// Do not use this term for DTO, Mapper, Adapter, Serializer, or Provider implementation names.
/// </summary>
public sealed class PhantasiaDoomScene
{
    /// <summary>
    /// [EN] Creates a stable scene identity for DOOM visual semantics.
    /// [JA] DOOM visual semantics 用の安定した scene identity を作成します。
    /// </summary>
    public string Identify(string mapName, int tick)
        => $"{mapName}:{tick.ToString(System.Globalization.CultureInfo.InvariantCulture)}";
}

/// <summary>
/// [Timing layer - Kairos / カイロス]
/// [EN] Concept facade for auto-play trigger timing in DOOM scenarios.
/// [JA] DOOM scenario における autoplay trigger timing の概念 facade です。
/// Old technical name: AutoPlayTrigger.
/// Do not use this term for DTO, Mapper, Adapter, Gate decision, or Provider implementation names.
/// </summary>
public sealed class KairosAutoPlayTrigger
{
    /// <summary>
    /// [EN] Returns whether auto-play may trigger after the recovery window.
    /// [JA] recovery window 後に autoplay が trigger 可能かを返します。
    /// </summary>
    public bool CanTrigger(int currentTick, int lastActionTick, int recoveryTicks)
        => currentTick - lastActionTick >= recoveryTicks;
}

/// <summary>
/// [Temporal layer - Chronos / クロノス]
/// [EN] Concept facade for DOOM replay windows.
/// [JA] DOOM replay window を扱う概念 facade です。
/// Old technical name: ReplayWindow.
/// Do not use this term for DTO, Mapper, Adapter, Serializer, or Provider implementation names.
/// </summary>
public sealed class ChronosReplayWindow
{
    /// <summary>
    /// [EN] Returns whether a tick belongs to the inclusive replay window.
    /// [JA] tick が inclusive replay window に属するかを返します。
    /// </summary>
    public bool Contains(int tick, int startTick, int endTick)
        => tick >= startTick && tick <= endTick;
}

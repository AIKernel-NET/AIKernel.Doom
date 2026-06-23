namespace AIKernel.Doom.Provider;

using AIKernel.Doom.Provider.Autoplay;
using AIKernel.Dtos.Input;
using AIKernel.Dtos.Perception;
using AIKernel.Enums;
using AIKernel.Enums.Perception;

/// <summary>
/// EN: Maps Doom-specific game state into generic HUD signal DTOs.
/// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Doom 固有 game state を generic HUD signal DTO に写像します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
/// </summary>
public sealed class DoomHudSignalMapper
{
    /// <summary>
    /// EN: Converts a Doom game state into HUD signals without performing CTG or Gate decisions.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] CTG / Gate decision を行わず Doom game state を HUD signal に変換します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    /// <param name="state">EN: Doom game state. JA: Doom game state です。</param>
    /// <param name="observationId">EN: Observation identifier. JA: observation 識別子です。</param>
    /// <returns>EN: HUD signal set. JA: HUD signal set を返します。</returns>
    public HudSignalSet Map(DoomGameState state, string observationId)
        => new()
        {
            SignalSetId = $"{observationId}.doom.hud",
            Succeeded = true,
            ObservedAt = DateTimeOffset.UtcNow,
            Signals =
            [
                new HudSignal
                {
                    SignalId = "doom.hud.health",
                    Kind = HudSignalKind.Health,
                    Value = state.Health.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    NumericValue = state.Health,
                    Confidence = SignalConfidenceKind.Confirmed
                },
                new HudSignal
                {
                    SignalId = "doom.hud.ammo",
                    Kind = HudSignalKind.Resource,
                    Value = state.Ammo.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    NumericValue = state.Ammo,
                    Confidence = SignalConfidenceKind.Confirmed
                },
                new HudSignal
                {
                    SignalId = "doom.hud.running",
                    Kind = HudSignalKind.Status,
                    Value = state.IsRunning ? "true" : "false",
                    Confidence = SignalConfidenceKind.Confirmed
                }
            ],
            Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["scenario"] = "doom",
                ["source"] = "doom-game-state"
            }
        };
}

/// <summary>
/// EN: Maps Doom-specific perception metadata into overlay annotation DTOs.
/// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Doom 固有 perception metadata を overlay annotation DTO に写像します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
/// </summary>
public sealed class DoomOverlayAnnotationMapper
{
    /// <summary>
    /// EN: Converts a Doom sensor fusion snapshot into overlay annotations without rendering.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] rendering を行わず Doom sensor fusion snapshot を overlay annotation に変換します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    /// <param name="sensor">EN: Doom sensor fusion snapshot. JA: Doom sensor fusion snapshot です。</param>
    /// <param name="observationId">EN: Observation identifier. JA: observation 識別子です。</param>
    /// <returns>EN: Overlay annotation set. JA: overlay annotation set を返します。</returns>
    public OverlayAnnotationSet Map(SensorFusion sensor, string observationId)
        => new()
        {
            AnnotationSetId = $"{observationId}.doom.overlay",
            Succeeded = true,
            ObservedAt = DateTimeOffset.UtcNow,
            Annotations =
            [
                new OverlayAnnotation
                {
                    AnnotationId = "doom.overlay.context",
                    ShapeKind = OverlayShapeKind.Text,
                    LayerKind = OverlayLayerKind.Perception,
                    Text = sensor.ContextDict,
                    Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["depthSig"] = sensor.DepthSig.ToString(System.Globalization.CultureInfo.InvariantCulture),
                        ["faceSig"] = sensor.FaceSig.ToString(System.Globalization.CultureInfo.InvariantCulture)
                    }
                }
            ],
            Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["scenario"] = "doom",
                ["source"] = "sensor-fusion"
            }
        };
}

/// <summary>
/// EN: Maps Doom autoplay action commands into generic virtual input DTOs.
/// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Doom autoplay action command を generic virtual input DTO に写像します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
/// </summary>
public sealed class DoomInputMappingAdapter
{
    /// <summary>
    /// EN: Converts a Doom action command into a virtual keyboard input state request.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Doom action command を virtual keyboard input state request に変換します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    /// <param name="command">EN: Doom action command. JA: Doom action command です。</param>
    /// <param name="inputId">EN: Input identifier. JA: input 識別子です。</param>
    /// <returns>EN: Input state request. JA: input state request を返します。</returns>
    public InputStateRequest Map(ActionCommand command, string inputId)
        => new()
        {
            Packet = new VirtualInputPacket
            {
                InputId = inputId,
                Kind = VirtualInputKind.Keyboard,
                Keyboard = new KeyboardInputPacket
                {
                    PressedKeys = KeysFor(command),
                    Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
                    {
                        ["scenario"] = "doom"
                    }
                },
                Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["turnYaw"] = command.TurnYaw.ToString(System.Globalization.CultureInfo.InvariantCulture)
                }
            },
            Metadata = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["source"] = "doom-action-command"
            }
        };

    private static IReadOnlyList<string> KeysFor(ActionCommand command)
    {
        var keys = new List<string>();
        if (command.MoveForward)
        {
            keys.Add("ArrowUp");
        }

        if (command.MoveBackward)
        {
            keys.Add("ArrowDown");
        }

        if (command.StrafeLeft)
        {
            keys.Add("KeyA");
        }

        if (command.StrafeRight)
        {
            keys.Add("KeyD");
        }

        if (command.UseKey)
        {
            keys.Add("Space");
        }

        if (command.AttackKey)
        {
            keys.Add("ControlLeft");
        }

        return keys;
    }
}

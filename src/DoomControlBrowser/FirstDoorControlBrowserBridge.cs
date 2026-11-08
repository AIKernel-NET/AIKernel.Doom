using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text.Json;
using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.ControlBrowser;

/// <summary>
/// Exposes the stateful C# FirstDoor controller to the browser host.
/// </summary>
[SupportedOSPlatform("browser")]
public static partial class FirstDoorControlBrowserBridge
{
    private const int MaximumBrowserSessions = 16;
    private const int MaximumInputJsonCharacters = 64 * 1024;
    private const int MaximumNativeAudioEventsPerPacket = 256;
    private const int MaximumNativeActorFactsPerPacket = 64;
    private static readonly object SyncRoot = new();
    private static readonly Dictionary<string, BrowserSessionEntry> Sessions =
        new(StringComparer.Ordinal);
    private static long _accessSequence;

    /// <summary>
    /// Evaluates one browser sensor packet while keeping signal normalization and evidence provenance in C#.
    /// </summary>
    /// <param name="inputJson">A camel-case JSON representation of <see cref="BrowserFirstDoorControlInput"/>.</param>
    /// <returns>A camel-case JSON representation of <c>FirstDoorControlDecision</c>.</returns>
    [JSExport]
    public static string EvaluateBrowser(string inputJson)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(inputJson);
        if (inputJson.Length > MaximumInputJsonCharacters)
        {
            throw new JsonException(
                $"Browser FirstDoor control input exceeds {MaximumInputJsonCharacters} characters.");
        }

        var browserInput = JsonSerializer.Deserialize(
                inputJson,
                FirstDoorControlJsonContext.Default.BrowserFirstDoorControlInput)
            ?? throw new JsonException("Browser FirstDoor control input must not be JSON null.");
        ValidatePacketBounds(browserInput);
        var sessionId = NormalizeSessionId(browserInput.SessionId);

        FirstDoorControlDecision decision;
        lock (SyncRoot)
        {
            var entry = GetOrCreateSession(sessionId);
            decision = entry.Session.Evaluate(browserInput);
            entry.LastAccessSequence = NextAccessSequence();
        }

        return JsonSerializer.Serialize(
            decision,
            FirstDoorDecisionJsonContext.Default.FirstDoorControlDecision);
    }

    /// <summary>
    /// Evaluates the bounded post-COMPUTERROOM route only from the same C# session's
    /// admitted FirstDoor handoff proof. No browser-provided completion flag is trusted.
    /// </summary>
    [JSExport]
    public static string EvaluateBrowserPostComputerRoomRoute(string inputJson)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(inputJson);
        if (inputJson.Length > MaximumInputJsonCharacters)
        {
            throw new JsonException(
                $"Browser post-COMPUTERROOM route input exceeds {MaximumInputJsonCharacters} characters.");
        }

        var browserInput = JsonSerializer.Deserialize(
                inputJson,
                FirstDoorControlJsonContext.Default.BrowserPostComputerRoomRouteInput)
            ?? throw new JsonException("Browser post-COMPUTERROOM route input must not be JSON null.");
        var sessionId = NormalizeSessionId(browserInput.SessionId);

        PostComputerRoomRouteDecision decision;
        lock (SyncRoot)
        {
            if (!Sessions.TryGetValue(sessionId, out var entry))
            {
                throw new InvalidOperationException(
                    "Post-COMPUTERROOM route requires an existing FirstDoor browser session.");
            }

            var proof = entry.Session.TryCreatePostComputerRoomActivationProof(
                browserInput.ExpectedFirstDoorControlTick);
            decision = entry.PostRouteSession.Evaluate(browserInput, proof);
            entry.LastAccessSequence = NextAccessSequence();
        }

        return JsonSerializer.Serialize(
            decision,
            FirstDoorControlJsonContext.Default.PostComputerRoomRouteDecision);
    }

    /// <summary>
    /// Evaluates the canonical E1M1 continuation only from the same C# session's
    /// immutable post-COMPUTERROOM completion trace. Browser completion claims are not accepted.
    /// </summary>
    [JSExport]
    public static string EvaluateBrowserE1M1Continuation(string inputJson)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(inputJson);
        if (inputJson.Length > MaximumInputJsonCharacters)
        {
            throw new JsonException(
                $"Browser E1M1 continuation input exceeds {MaximumInputJsonCharacters} characters.");
        }

        var browserInput = JsonSerializer.Deserialize(
                inputJson,
                FirstDoorControlJsonContext.Default.BrowserE1M1ContinuationInput)
            ?? throw new JsonException("Browser E1M1 continuation input must not be JSON null.");
        ValidatePacketBounds(browserInput);
        var sessionId = NormalizeSessionId(browserInput.SessionId);

        E1M1ContinuationDecision decision;
        lock (SyncRoot)
        {
            if (!Sessions.TryGetValue(sessionId, out var entry))
            {
                throw new InvalidOperationException(
                    "E1M1 continuation requires an existing FirstDoor browser session.");
            }

            var proof = entry.PostRouteSession.TryCreateE1M1ContinuationActivationProof(
                browserInput.ExpectedPostComputerRoomControlTick);
            decision = entry.E1M1ContinuationSession.Evaluate(browserInput, proof);
            entry.LastAccessSequence = NextAccessSequence();
        }

        return JsonSerializer.Serialize(
            decision,
            FirstDoorControlJsonContext.Default.E1M1ContinuationDecision);
    }

    /// <summary>
    /// Releases one browser-scoped controller without affecting any other Doom runtime.
    /// </summary>
    [JSExport]
    public static bool ReleaseBrowserSession(string sessionId)
    {
        var normalized = NormalizeSessionId(sessionId);
        lock (SyncRoot)
        {
            return Sessions.Remove(normalized);
        }
    }

    private static BrowserSessionEntry GetOrCreateSession(string sessionId)
    {
        if (Sessions.TryGetValue(sessionId, out var existing))
        {
            return existing;
        }

        if (Sessions.Count >= MaximumBrowserSessions)
        {
            throw new InvalidOperationException(
                $"Browser FirstDoor session capacity ({MaximumBrowserSessions}) is exhausted. "
                + "Release an inactive session before creating another one.");
        }

        var created = new BrowserSessionEntry(
            new FirstDoorBrowserControlSession(),
            NextAccessSequence());
        Sessions.Add(sessionId, created);
        return created;
    }

    private static void ValidatePacketBounds(BrowserFirstDoorControlInput input)
    {
        if ((input.Audio?.Events?.Count ?? 0) > MaximumNativeAudioEventsPerPacket)
        {
            throw new JsonException(
                $"Browser FirstDoor native audio event count exceeds {MaximumNativeAudioEventsPerPacket}.");
        }

        var raw = input.RawObservation;
        if (raw?.Available == true
            && ((raw.PaletteIndicesBase64?.Length ?? 0) != 348
                || (raw.PaletteRgbaBase64?.Length ?? 0) != 1368))
        {
            throw new JsonException("Browser FirstDoor raw observation has non-canonical Base64 lengths.");
        }
    }

    private static void ValidatePacketBounds(BrowserE1M1ContinuationInput input)
    {
        if ((input.Audio?.Events?.Count ?? 0) > MaximumNativeAudioEventsPerPacket)
        {
            throw new JsonException(
                $"Browser E1M1 native audio event count exceeds {MaximumNativeAudioEventsPerPacket}.");
        }

        if ((input.ActorSnapshot?.Actors?.Count ?? 0) > MaximumNativeActorFactsPerPacket)
        {
            throw new JsonException(
                $"Browser E1M1 native actor fact count exceeds {MaximumNativeActorFactsPerPacket}.");
        }
    }

    private static long NextAccessSequence()
    {
        _accessSequence = _accessSequence == long.MaxValue ? 1 : _accessSequence + 1;
        return _accessSequence;
    }

    private static string NormalizeSessionId(string? sessionId)
    {
        var normalized = sessionId?.Trim() ?? string.Empty;
        if (normalized.Length == 0)
        {
            throw new JsonException("Browser FirstDoor control input requires a non-empty sessionId.");
        }

        if (normalized.Length > 256)
        {
            throw new JsonException("Browser FirstDoor control sessionId exceeds 256 characters.");
        }

        return normalized;
    }

    private sealed class BrowserSessionEntry(
        FirstDoorBrowserControlSession session,
        long lastAccessSequence)
    {
        internal FirstDoorBrowserControlSession Session { get; } = session;

        internal PostComputerRoomBrowserControlSession PostRouteSession { get; } = new();

        internal E1M1ContinuationBrowserControlSession E1M1ContinuationSession { get; } = new();

        internal long LastAccessSequence { get; set; } = lastAccessSequence;
    }
}

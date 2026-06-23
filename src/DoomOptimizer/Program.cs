using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AIKernel.Doom.Provider.Autoplay;

var repoRoot = FindRepoRoot(AppContext.BaseDirectory);
var profilePath = Path.Combine(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "autoplay-profile.json");
var telemetryDir = Path.Combine(repoRoot, "artifacts", "autoplay");
Directory.CreateDirectory(telemetryDir);

if (args.Any(arg => string.Equals(arg, "--web-runner", StringComparison.OrdinalIgnoreCase)))
{
    var screenshotPath = Path.Combine(telemetryDir, "web-runner-latest.png");
    var runner = new DoomWebAutoplayRunner(new Uri(ReadArg(args, "--cdp", "http://127.0.0.1:9222")), screenshotPath);
    if (args.Any(arg => string.Equals(arg, "--use-test", StringComparison.OrdinalIgnoreCase)))
    {
        var useResult = args.Any(arg => string.Equals(arg, "--current-page", StringComparison.OrdinalIgnoreCase))
            ? await runner.RunUseTestOnCurrentPageAsync()
            : await runner.RunUseTestAsync();
        var useTelemetryPath = Path.Combine(telemetryDir, "web-runner-use-test.json");
        File.WriteAllText(useTelemetryPath, JsonSerializer.Serialize(useResult, OptimizerJson.Options));
        Console.WriteLine($"[WEB-RUNNER] use-test before={Path.GetRelativePath(repoRoot, useResult.BeforeScreenshot)}");
        Console.WriteLine($"[WEB-RUNNER] use-test after={Path.GetRelativePath(repoRoot, useResult.AfterScreenshot)}");
        Console.WriteLine($"[WEB-RUNNER] telemetry={Path.GetRelativePath(repoRoot, useTelemetryPath)}");
        return 0;
    }
    if (args.Any(arg => string.Equals(arg, "--restart-current", StringComparison.OrdinalIgnoreCase)))
    {
        var restartResult = await runner.RunRestartOnCurrentPageAsync();
        var restartTelemetryPath = Path.Combine(telemetryDir, "web-runner-restart-current.json");
        File.WriteAllText(restartTelemetryPath, JsonSerializer.Serialize(restartResult, OptimizerJson.Options));
        Console.WriteLine($"[WEB-RUNNER] restart before={Path.GetRelativePath(repoRoot, restartResult.BeforeScreenshot)}");
        Console.WriteLine($"[WEB-RUNNER] restart after={Path.GetRelativePath(repoRoot, restartResult.AfterScreenshot)}");
        Console.WriteLine($"[WEB-RUNNER] telemetry={Path.GetRelativePath(repoRoot, restartTelemetryPath)}");
        return 0;
    }
    if (args.Any(arg => string.Equals(arg, "--door-runner", StringComparison.OrdinalIgnoreCase)))
    {
        var doorTimeoutSeconds = int.Parse(ReadArg(args, "--timeout", "180"));
        var doorResult = await runner.RunUntilDoorAsync(TimeSpan.FromSeconds(doorTimeoutSeconds));
        var doorTelemetryPath = Path.Combine(telemetryDir, "web-runner-door-latest.json");
        File.WriteAllText(doorTelemetryPath, JsonSerializer.Serialize(doorResult, OptimizerJson.Options));
        Console.WriteLine($"[WEB-RUNNER] door-success={doorResult.Success}; door={doorResult.DoorOpenedCount}; elapsed={doorResult.ElapsedSeconds:F1}s; predictions={doorResult.Predictions}; fps={doorResult.Fps:F1}; safety={doorResult.SafetyReason}; mobility={doorResult.MobilityMode}");
        Console.WriteLine($"[WEB-RUNNER] telemetry={Path.GetRelativePath(repoRoot, doorTelemetryPath)}");
        return doorResult.Success ? 0 : 2;
    }

    var timeoutSeconds = int.Parse(ReadArg(args, "--timeout", "240"));
    var targetEnemies = int.Parse(ReadArg(args, "--target-enemies", "1"));
    var goal = ReadArg(args, "--goal", "enemy");
    var webResult = await runner.RunUntilGoalAsync(TimeSpan.FromSeconds(timeoutSeconds), Math.Max(1, targetEnemies), goal);
    var webTelemetryPath = Path.Combine(telemetryDir, "web-runner-latest.json");
    File.WriteAllText(webTelemetryPath, JsonSerializer.Serialize(webResult, OptimizerJson.Options));
    Console.WriteLine($"[WEB-RUNNER] success={webResult.Success}; goal={goal}; door={webResult.DoorOpenedCount}; enemy={webResult.EnemyDefeatedCount}/{targetEnemies}; elapsed={webResult.ElapsedSeconds:F1}s; predictions={webResult.Predictions}; fps={webResult.Fps:F1}");
    Console.WriteLine($"[WEB-RUNNER] telemetry={Path.GetRelativePath(repoRoot, webTelemetryPath)}");
    return webResult.Success ? 0 : 2;
}

var seed = AutoplayOptimizationProfile.Load(profilePath);
var optimizer = new ObserverRomOptimizer();
var result = optimizer.Optimize(seed);

WriteProfile(profilePath, result.Profile, result);

var telemetryPath = Path.Combine(telemetryDir, "observer-rom-latest.json");
File.WriteAllText(
    telemetryPath,
    JsonSerializer.Serialize(result, OptimizerJson.Options));

Console.WriteLine($"[OPTIMIZER] strategy={result.Profile.StrategyName}");
Console.WriteLine($"[OPTIMIZER] fitness={result.FitnessScore:F2}; door={result.DoorOpened}; enemy={result.EnemyKilled}; frames={result.TotalFrames}; stuck={result.StuckCount}");
Console.WriteLine($"[OPTIMIZER] profile={Path.GetRelativePath(repoRoot, profilePath)}");
Console.WriteLine($"[OPTIMIZER] telemetry={Path.GetRelativePath(repoRoot, telemetryPath)}");
return 0;

static string ReadArg(string[] args, string name, string fallback)
{
    for (var i = 0; i < args.Length - 1; i++)
    {
        if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
        {
            return args[i + 1];
        }
    }

    return fallback;
}

static string FindRepoRoot(string start)
{
    var directory = new DirectoryInfo(start);
    while (directory is not null)
    {
        if (File.Exists(Path.Combine(directory.FullName, "AIKernel.Doom.slnx")))
        {
            return directory.FullName;
        }

        directory = directory.Parent;
    }

    throw new InvalidOperationException("Could not locate AIKernel.Doom repository root.");
}

static void WriteProfile(string path, AutoplayOptimizationProfile profile, OptimizationResult result)
{
    var payload = new
    {
        version = profile.Version,
        strategyName = profile.StrategyName,
        source = "AIKernel.Doom optimizer profile",
        observerRom = new
        {
            targetVersion = profile.Version,
            previousStrategyName = result.PreviousStrategyName,
            diagnosis = result.Analysis,
            fitnessScore = Math.Round(result.FitnessScore, 2),
            doorOpened = result.DoorOpened,
            enemyKilled = result.EnemyKilled,
            totalFrames = result.TotalFrames,
            stuckCount = result.StuckCount,
            generatedAt = DateTimeOffset.UtcNow
        },
        parameters = ProfileParameters(profile),
        pipeline = profile.Pipeline ?? AutoplayPipelineDefinition.Default
    };

    File.WriteAllText(path, JsonSerializer.Serialize(payload, OptimizerJson.Options));
}

static object ProfileParameters(AutoplayOptimizationProfile profile)
    => profile.ToParameterDictionary();

internal sealed class ObserverRomOptimizer
{
    /// <summary>
    /// EN: Executes Optimize.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Optimize を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public OptimizationResult Optimize(AutoplayOptimizationProfile seed)
    {
        OptimizationResult? best = null;

        foreach (var candidate in GenerateCandidates(seed))
        {
            var result = Evaluate(candidate);
            if (best is null || result.FitnessScore > best.FitnessScore)
            {
                best = result;
            }
        }

        return best ?? Evaluate(seed);
    }

    private static IEnumerable<AutoplayOptimizationProfile> GenerateCandidates(AutoplayOptimizationProfile seed)
    {
        yield return seed;

        var doorAimTolerances = new[] { 10, 12, 14, 16, 18 };
        var doorUseDepths = new[] { 0.56f, 0.60f, 0.62f, 0.66f };
        var approachDepths = new[] { 0.78f, 0.82f, 0.86f, 0.90f };
        var wallAwayYaws = new[] { 6, 8, 10, 12 };
        var combatYaws = new[] { 12, 16, 20, 24 };

        foreach (var aim in doorAimTolerances)
        foreach (var useDepth in doorUseDepths)
        foreach (var approachDepth in approachDepths)
        foreach (var wallYaw in wallAwayYaws)
        foreach (var combatYaw in combatYaws)
        {
            yield return seed with
            {
                DoorAimToleranceDegrees = aim,
                DoorSoftAimToleranceDegrees = Math.Max(aim + 8, 24),
                DoorAimYawDegrees = Math.Clamp(aim - 2, 8, 14),
                DoorUseDepth = useDepth,
                DoorApproachDepth = Math.Max(approachDepth, useDepth + 0.12f),
                DoorProbeStuckTicks = 8,
                EmergencyStuckTicks = 54,
                WallAwayYawDegrees = wallYaw,
                CombatYawDegrees = combatYaw,
                EnableStrafeRun = true
            };
        }
    }

    private static OptimizationResult Evaluate(AutoplayOptimizationProfile profile)
    {
        var strategy = new SeparatedDoorProbeStrafeRunnerV4(profile);
        var observer = new ObserverRomRun(profile);

        observer.RunDoorScenario(strategy);
        observer.RunCombatScenario(strategy);

        return observer.ToResult();
    }
}

internal sealed class ObserverRomRun(AutoplayOptimizationProfile profile)
{
    private readonly List<ObserverFrame> _frames = [];
    private bool _doorOpened;
    private bool _enemyKilled;
    private int _stuckCount;
    private int _useAttempts;
    private int _attackBursts;
    /// <summary>
    /// EN: Executes RunDoorScenario.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunDoorScenario を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public void RunDoorScenario(IAutoplayStrategy strategy)
    {
        for (var frame = 0; frame < 180 && !_doorOpened; frame++)
        {
            var yawError = Math.Max(0, 42 - frame * 3);
            var depth = Math.Max(0.44f, 0.95f - frame * 0.018f);
            var stuckTicks = frame < 10 ? frame : 18 + frame / 3;
            var sensor = new SensorFusion(
                Screen6Regions: [0.72f, 0.76f, 0.80f, 0.60f, 0.64f, 0.68f],
                DepthSig: depth,
                Health: 100,
                FaceSig: 0,
                ContextDict: frame < 8 ? "wall" : "corner",
                SoundEvent: false,
                StuckTicks: stuckTicks,
                QDelta: yawError);

            var action = strategy.ExecuteTick(sensor, recoveryFrames: 0);
            if (action.UseKey)
            {
                _useAttempts++;
            }

            if (action.UseKey && depth <= profile.DoorUseDepth + 0.03f && Math.Abs(action.TurnYaw) <= profile.DoorAimToleranceDegrees)
            {
                _doorOpened = true;
            }

            Track(frame, "door", sensor, action);
        }
    }
    /// <summary>
    /// EN: Executes RunCombatScenario.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunCombatScenario を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public void RunCombatScenario(IAutoplayStrategy strategy)
    {
        for (var frame = 0; frame < 150 && !_enemyKilled; frame++)
        {
            var faceDirection = frame < 18 ? 0.62f : frame < 42 ? 0.48f : 0.18f;
            var sensor = new SensorFusion(
                Screen6Regions: [0.34f, 0.40f, 0.48f, 0.64f, 0.72f, 0.68f],
                DepthSig: 0.72f,
                Health: 91,
                FaceSig: faceDirection,
                ContextDict: "corridor",
                SoundEvent: frame < 30,
                StuckTicks: 0,
                QDelta: 0);

            var action = strategy.ExecuteTick(sensor, recoveryFrames: 0);
            if (action.AttackKey)
            {
                _attackBursts++;
            }

            if (_attackBursts >= 3 && Math.Abs(action.TurnYaw) <= profile.CombatYawDegrees)
            {
                _enemyKilled = true;
            }

            Track(frame, "combat", sensor, action);
        }
    }
    /// <summary>
    /// EN: Executes ToResult.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] ToResult を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public OptimizationResult ToResult()
    {
        var frames = Math.Max(_frames.Count, 1);
        var milestoneMultiplier = (_doorOpened ? 2.0 : 0.35) * (_enemyKilled ? 2.0 : 0.45);
        var fitness = (frames * milestoneMultiplier * (_useAttempts + 1) * (_attackBursts + 1)) / (_stuckCount + 1.0);
        var analysis = "Observer ROM optimization separates door aim, approach, and Use phases, then gives combat enough priority to yaw toward damage or sound signals and burst fire. The selected profile must open a simulated 64-unit door range probe before entering the combat scenario. Fitness rewards completing both milestones while penalizing repeated stuck frames.";

        return new OptimizationResult(
            Profile: profile,
            PreviousStrategyName: "SensorFusionStrafeProbeV3",
            Analysis: analysis,
            DoorOpened: _doorOpened,
            EnemyKilled: _enemyKilled,
            TotalFrames: frames,
            StuckCount: _stuckCount,
            UseAttempts: _useAttempts,
            AttackBursts: _attackBursts,
            FitnessScore: fitness,
            Frames: _frames);
    }

    private void Track(int frame, string scenario, SensorFusion sensor, ActionCommand action)
    {
        if (sensor.StuckTicks >= 60)
        {
            _stuckCount++;
        }

        _frames.Add(new ObserverFrame(frame, scenario, sensor.ContextDict, sensor.DepthSig, sensor.StuckTicks, sensor.QDelta, action.TurnYaw, action.UseKey, action.AttackKey));
    }
}

internal sealed record OptimizationResult(
    AutoplayOptimizationProfile Profile,
    string PreviousStrategyName,
    string Analysis,
    bool DoorOpened,
    bool EnemyKilled,
    int TotalFrames,
    int StuckCount,
    int UseAttempts,
    int AttackBursts,
    double FitnessScore,
    IReadOnlyList<ObserverFrame> Frames);

internal sealed record ObserverFrame(
    int Frame,
    string Scenario,
    string Context,
    float Depth,
    int StuckTicks,
    int QDelta,
    int TurnYaw,
    bool UseKey,
    bool AttackKey);

internal sealed class DoomWebAutoplayRunner(Uri cdpEndpoint, string screenshotPath)
{
    /// <summary>
    /// EN: Executes RunRestartOnCurrentPageAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunRestartOnCurrentPageAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public async Task<WebRestartResult> RunRestartOnCurrentPageAsync()
    {
        await using var client = await CdpClient.ConnectAsync(cdpEndpoint).ConfigureAwait(false);
        await client.SendAsync("Runtime.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.enable", new { }).ConfigureAwait(false);

        var ready = await WaitForRuntimeBridgeAsync(client).ConfigureAwait(false);
        if (!ready)
        {
            throw new InvalidOperationException("runtime command bridge did not become ready");
        }

        var beforePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-restart-current-before.png");
        var afterPath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-restart-current-after.png");
        var before = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
        await client.CaptureScreenshotAsync(beforePath).ConfigureAwait(false);
        var after = await client.EvaluateJsonAsync(
            """
            (async () => {
              if (window.runWasmCommand) {
                await window.runWasmCommand("doom.autoplay off");
              }
              if (window.holdAIKernelDoomInput) {
                for (let i = 0; i < 4; i += 1) {
                  window.holdAIKernelDoomInput("use", 360);
                  await new Promise(resolve => setTimeout(resolve, 480));
                  window.holdAIKernelDoomInput("enter", 240);
                  await new Promise(resolve => setTimeout(resolve, 360));
                }
              }
              return window.getAIKernelDoomStatus && window.getAIKernelDoomStatus();
            })()
            """).ConfigureAwait(false);
        await Task.Delay(TimeSpan.FromMilliseconds(500)).ConfigureAwait(false);
        await client.CaptureScreenshotAsync(afterPath).ConfigureAwait(false);

        return new WebRestartResult(beforePath, afterPath, before.Clone(), after.Clone());
    }
    /// <summary>
    /// EN: Executes RunUseTestOnCurrentPageAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunUseTestOnCurrentPageAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<WebUseTestResult> RunUseTestOnCurrentPageAsync()
    {
        await using var client = await CdpClient.ConnectAsync(cdpEndpoint).ConfigureAwait(false);
        await client.SendAsync("Runtime.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.enable", new { }).ConfigureAwait(false);

        var ready = await WaitForRuntimeBridgeAsync(client).ConfigureAwait(false);
        if (!ready)
        {
            throw new InvalidOperationException("runtime command bridge did not become ready");
        }

        var beforePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-use-current-before.png");
        var afterPath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-use-current-after.png");
        var before = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
        await client.CaptureScreenshotAsync(beforePath).ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.use-test"); await new Promise(resolve => setTimeout(resolve, 900)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        var after = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
        await client.CaptureScreenshotAsync(afterPath).ConfigureAwait(false);

        return new WebUseTestResult(beforePath, afterPath, before.Clone(), after.Clone());
    }
    /// <summary>
    /// EN: Executes RunUseTestAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunUseTestAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<WebUseTestResult> RunUseTestAsync()
    {
        await using var client = await CdpClient.ConnectAsync(cdpEndpoint).ConfigureAwait(false);
        await client.SendAsync("Runtime.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.reload", new { ignoreCache = true }).ConfigureAwait(false);

        var ready = await WaitForRuntimeBridgeAsync(client).ConfigureAwait(false);
        if (!ready)
        {
            throw new InvalidOperationException("runtime command bridge did not become ready");
        }

        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("yes"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.start"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        await Task.Delay(TimeSpan.FromSeconds(1)).ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { window.pulseAIKernelDoomInput && window.pulseAIKernelDoomInput("escape"); await new Promise(resolve => setTimeout(resolve, 640)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        for (var i = 0; i < 4; i++)
        {
            await client.EvaluateJsonAsync("""(async () => { window.pulseAIKernelDoomInput && window.pulseAIKernelDoomInput("enter"); await new Promise(resolve => setTimeout(resolve, 520)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        }

        var beforePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-use-before.png");
        var afterPath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-use-after.png");
        var before = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
        await client.CaptureScreenshotAsync(beforePath).ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.use-test"); await new Promise(resolve => setTimeout(resolve, 900)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        var after = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
        await client.CaptureScreenshotAsync(afterPath).ConfigureAwait(false);

        return new WebUseTestResult(beforePath, afterPath, before.Clone(), after.Clone());
    }
    /// <summary>
    /// EN: Executes RunUntilDoorAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunUntilDoorAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<WebRunnerResult> RunUntilDoorAsync(TimeSpan timeout)
    {
        await using var client = await CdpClient.ConnectAsync(cdpEndpoint).ConfigureAwait(false);
        await client.SendAsync("Runtime.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.reload", new { ignoreCache = true }).ConfigureAwait(false);

        var ready = await WaitForRuntimeBridgeAsync(client).ConfigureAwait(false);
        if (!ready)
        {
            return WebRunnerResult.Failed("runtime command bridge did not become ready");
        }

        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("yes"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.start"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        await Task.Delay(TimeSpan.FromSeconds(1)).ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { window.pulseAIKernelDoomInput && window.pulseAIKernelDoomInput("escape"); await new Promise(resolve => setTimeout(resolve, 640)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        for (var i = 0; i < 4; i++)
        {
            await client.EvaluateJsonAsync("""(async () => { window.pulseAIKernelDoomInput && window.pulseAIKernelDoomInput("enter"); await new Promise(resolve => setTimeout(resolve, 520)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        }

        await client.EvaluateJsonAsync(
            """
            (async () => {
              for (let i = 0; i < 80; i += 1) {
                const status = window.getAIKernelDoomStatus && window.getAIKernelDoomStatus();
                if (status && status.frameCount > 20 && status.fps > 0) {
                  return status;
                }
                await new Promise(resolve => setTimeout(resolve, 120));
              }
              return window.getAIKernelDoomStatus && window.getAIKernelDoomStatus();
            })()
            """).ConfigureAwait(false);

        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.autoplay on"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);

        var startedAt = DateTimeOffset.UtcNow;
        var samples = new List<JsonElement>();
        var evidenceScreenshots = new List<string>();
        while (DateTimeOffset.UtcNow - startedAt < timeout)
        {
            await Task.Delay(TimeSpan.FromSeconds(2)).ConfigureAwait(false);
            var status = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
            if (status.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                continue;
            }

            samples.Add(status.Clone());
            var autoplay = status.GetPropertyOrDefault("autoplay");
            var milestones = autoplay.GetPropertyOrDefault("milestones");
            var doorOpened = milestones.GetInt32OrDefault("doorOpened");
            Console.WriteLine(
                $"[WEB-RUNNER] door t={(DateTimeOffset.UtcNow - startedAt).TotalSeconds:F0}s fps={status.GetDoubleOrDefault("fps"):F1} door={doorOpened} " +
                $"safety={autoplay.GetStringOrDefault("safetyReason")} mobility={autoplay.GetStringOrDefault("mobilityMode")} " +
                $"depth={autoplay.GetDoubleOrDefault("depthEstimate"):F2} target={autoplay.GetDoubleOrDefault("targetConfidence"):F2} predictions={autoplay.GetInt32OrDefault("predictions")}");
            if (doorOpened >= 1)
            {
                var evidencePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-door-opened.png");
                await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                evidenceScreenshots.Add(evidencePath);
                return WebRunnerResult.FromStatus(true, DateTimeOffset.UtcNow - startedAt, status, samples, evidenceScreenshots);
            }
        }

        var last = samples.Count > 0 ? samples[^1] : default;
        await client.CaptureScreenshotAsync(screenshotPath).ConfigureAwait(false);
        return WebRunnerResult.FromStatus(false, DateTimeOffset.UtcNow - startedAt, last, samples, evidenceScreenshots);
    }
    /// <summary>
    /// EN: Executes RunUntilGoalAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RunUntilGoalAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<WebRunnerResult> RunUntilGoalAsync(TimeSpan timeout, int targetEnemies, string goal)
    {
        await using var client = await CdpClient.ConnectAsync(cdpEndpoint).ConfigureAwait(false);
        await client.SendAsync("Runtime.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.enable", new { }).ConfigureAwait(false);
        await client.SendAsync("Page.reload", new { ignoreCache = true }).ConfigureAwait(false);

        var ready = await WaitForRuntimeBridgeAsync(client).ConfigureAwait(false);

        if (!ready)
        {
            return WebRunnerResult.Failed("runtime command bridge did not become ready");
        }

        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("yes"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.start"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        await Task.Delay(TimeSpan.FromSeconds(1)).ConfigureAwait(false);
        await client.EvaluateJsonAsync("""(async () => { window.pulseAIKernelDoomInput && window.pulseAIKernelDoomInput("escape"); await new Promise(resolve => setTimeout(resolve, 640)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        for (var i = 0; i < 4; i++)
        {
            await client.EvaluateJsonAsync("""(async () => { window.pulseAIKernelDoomInput && window.pulseAIKernelDoomInput("enter"); await new Promise(resolve => setTimeout(resolve, 520)); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);
        }

        await client.EvaluateJsonAsync("""(async () => { await window.runWasmCommand("doom.autoplay on"); return window.getAIKernelDoomStatus(); })()""").ConfigureAwait(false);

        var startedAt = DateTimeOffset.UtcNow;
        var samples = new List<JsonElement>();
        var evidenceScreenshots = new List<string>();
        var lastEnemyDefeated = 0;
        var computerRoomCaptured = false;
        var centralHallCaptured = false;
        var stairsCaptured = false;
        var finalRoomCaptured = false;
        var exitSwitchCaptured = false;
        while (DateTimeOffset.UtcNow - startedAt < timeout)
        {
            await Task.Delay(TimeSpan.FromSeconds(2)).ConfigureAwait(false);
            var status = await client.EvaluateJsonAsync("window.getAIKernelDoomStatus && window.getAIKernelDoomStatus()").ConfigureAwait(false);
            if (status.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                continue;
            }

            samples.Add(status.Clone());
            var milestones = status.GetPropertyOrDefault("autoplay").GetPropertyOrDefault("milestones");
            var doorOpened = milestones.GetInt32OrDefault("doorOpened");
            var enemyDefeated = milestones.GetInt32OrDefault("enemyDefeated");
            var autoplay = status.GetPropertyOrDefault("autoplay");
            var darkZone = milestones.GetBoolOrDefault("darkZoneEntered");
            var darkArea = milestones.GetDoubleOrDefault("darkAreaScore");
            var gameplayLuma = milestones.GetDoubleOrDefault("gameplayLuma");
            var mapSector = milestones.GetStringOrDefault("mapSectorId");
            var mapDoorMatch = milestones.GetBoolOrDefault("mapDoorSectorMatch");
            var mapDarkMatch = milestones.GetBoolOrDefault("mapDarkSectorMatch");
            var mapEnemyMatch = milestones.GetBoolOrDefault("mapEnemyZoneMatch");
            var centralHallEntered = milestones.GetBoolOrDefault("centralHallEntered");
            var centralHallFrames = milestones.GetInt32OrDefault("centralHallFrames");
            var computerRoomEntered = milestones.GetBoolOrDefault("computerRoomEntered");
            var computerRoomFrames = milestones.GetInt32OrDefault("computerRoomFrames");
            var computerRoomScore = milestones.GetDoubleOrDefault("computerRoomScore");
            var stairsEntered = milestones.GetBoolOrDefault("stairsEntered");
            var stairsFrames = milestones.GetInt32OrDefault("stairsCandidateFrames");
            var finalRoomEntered = milestones.GetBoolOrDefault("finalRoomEntered");
            var finalRoomFrames = milestones.GetInt32OrDefault("finalRoomCandidateFrames");
            var exitSwitchPressed = milestones.GetBoolOrDefault("exitSwitchPressed");
            if (enemyDefeated > lastEnemyDefeated)
            {
                for (var enemy = lastEnemyDefeated + 1; enemy <= enemyDefeated; enemy++)
                {
                    var evidencePath = Path.Combine(
                        Path.GetDirectoryName(screenshotPath)!,
                        $"web-runner-enemy-{enemy:D2}.png");
                    await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                    evidenceScreenshots.Add(evidencePath);
                    Console.WriteLine($"[WEB-RUNNER] evidence enemy={enemy} screenshot={evidencePath}");
                }

                lastEnemyDefeated = enemyDefeated;
            }

            if (centralHallEntered && !centralHallCaptured)
            {
                var evidencePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-central-hall.png");
                await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                evidenceScreenshots.Add(evidencePath);
                centralHallCaptured = true;
                Console.WriteLine($"[WEB-RUNNER] evidence central-hall screenshot={evidencePath}");
            }

            if (computerRoomEntered && !computerRoomCaptured)
            {
                var evidencePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-computer-room.png");
                await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                evidenceScreenshots.Add(evidencePath);
                computerRoomCaptured = true;
                Console.WriteLine($"[WEB-RUNNER] evidence computer-room screenshot={evidencePath}");
            }

            if (stairsEntered && !stairsCaptured)
            {
                var evidencePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-stairs.png");
                await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                evidenceScreenshots.Add(evidencePath);
                stairsCaptured = true;
                Console.WriteLine($"[WEB-RUNNER] evidence stairs screenshot={evidencePath}");
            }

            if (finalRoomEntered && !finalRoomCaptured)
            {
                var evidencePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-final-room.png");
                await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                evidenceScreenshots.Add(evidencePath);
                finalRoomCaptured = true;
                Console.WriteLine($"[WEB-RUNNER] evidence final-room screenshot={evidencePath}");
            }

            if (exitSwitchPressed && !exitSwitchCaptured)
            {
                var evidencePath = Path.Combine(Path.GetDirectoryName(screenshotPath)!, "web-runner-exit-switch.png");
                await client.CaptureScreenshotAsync(evidencePath).ConfigureAwait(false);
                evidenceScreenshots.Add(evidencePath);
                exitSwitchCaptured = true;
                Console.WriteLine($"[WEB-RUNNER] evidence exit-switch screenshot={evidencePath}");
            }

            Console.WriteLine(
                $"[WEB-RUNNER] t={(DateTimeOffset.UtcNow - startedAt).TotalSeconds:F0}s state={status.GetStringOrDefault("state")} fps={status.GetDoubleOrDefault("fps"):F1} " +
                $"door={doorOpened} dark={darkZone}/{darkArea:F2}/{gameplayLuma:F1} map={mapSector}/{mapDoorMatch}/{mapDarkMatch}/{mapEnemyMatch} enemy={enemyDefeated} computer={computerRoomEntered}/{computerRoomFrames}/{computerRoomScore:F2} hall={centralHallEntered}/{centralHallFrames} stairs={stairsEntered}/{stairsFrames} final={finalRoomEntered}/{finalRoomFrames} exit={exitSwitchPressed} safety={autoplay.GetStringOrDefault("safetyReason")} mobility={autoplay.GetStringOrDefault("mobilityMode")} " +
                $"predictions={autoplay.GetInt32OrDefault("predictions")} target={autoplay.GetDoubleOrDefault("targetConfidence"):F2}");
            var normalizedGoal = goal.Trim().ToLowerInvariant();
            var reachedGoal = normalizedGoal switch
            {
                "central" or "central-hall" or "hall" => doorOpened >= 1 && centralHallEntered,
                "computer" or "computer-room" or "control-room" => doorOpened >= 1 && computerRoomEntered,
                "stairs" or "stair" => doorOpened >= 1 && stairsEntered,
                "final" or "final-room" => doorOpened >= 1 && finalRoomEntered,
                "clear" or "level-clear" or "exit" => doorOpened >= 1 && finalRoomEntered && exitSwitchPressed,
                _ => doorOpened >= 1 && enemyDefeated >= targetEnemies
            };
            if (reachedGoal)
            {
                await client.CaptureScreenshotAsync(screenshotPath).ConfigureAwait(false);
                return WebRunnerResult.FromStatus(true, DateTimeOffset.UtcNow - startedAt, status, samples, evidenceScreenshots);
            }
        }

        var last = samples.Count > 0 ? samples[^1] : default;
        await client.CaptureScreenshotAsync(screenshotPath).ConfigureAwait(false);
        return WebRunnerResult.FromStatus(false, DateTimeOffset.UtcNow - startedAt, last, samples, evidenceScreenshots);
    }

    private static Task<bool> WaitForRuntimeBridgeAsync(CdpClient client)
        => client.EvaluateAsync<bool>(
            """
            (async () => {
              for (let i = 0; i < 240; i += 1) {
                if (typeof window.runWasmCommand === "function" && typeof window.getAIKernelDoomStatus === "function") {
                  return true;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              return false;
            })()
            """);
}

internal sealed record WebUseTestResult(
    string BeforeScreenshot,
    string AfterScreenshot,
    JsonElement BeforeStatus,
    JsonElement AfterStatus);

internal sealed record WebRestartResult(
    string BeforeScreenshot,
    string AfterScreenshot,
    JsonElement BeforeStatus,
    JsonElement AfterStatus);

internal sealed class CdpClient : IAsyncDisposable
{
    private readonly ClientWebSocket _socket = new();
    private int _nextId;

    private CdpClient()
    {
    }
    /// <summary>
    /// EN: Executes ConnectAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] ConnectAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static async Task<CdpClient> ConnectAsync(Uri cdpEndpoint)
    {
        using var http = new HttpClient();
        var json = await http.GetStringAsync(new Uri(cdpEndpoint, "/json/list")).ConfigureAwait(false);
        using var document = JsonDocument.Parse(json);
        var page = document.RootElement.EnumerateArray()
            .FirstOrDefault(item => item.GetStringOrDefault("type") == "page" && item.GetStringOrDefault("url").StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase));

        if (page.ValueKind == JsonValueKind.Undefined)
        {
            throw new InvalidOperationException("No http://localhost page is available on the CDP endpoint.");
        }

        var ws = page.GetStringOrDefault("webSocketDebuggerUrl");
        if (string.IsNullOrWhiteSpace(ws))
        {
            throw new InvalidOperationException("CDP page did not expose a websocket debugger URL.");
        }

        var client = new CdpClient();
        await client._socket.ConnectAsync(new Uri(ws), CancellationToken.None).ConfigureAwait(false);
        return client;
    }
    /// <summary>
    /// EN: Executes SendAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SendAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<JsonElement> SendAsync(string method, object? parameters)
    {
        var id = Interlocked.Increment(ref _nextId);
        var payload = JsonSerializer.Serialize(new
        {
            id,
            method,
            @params = parameters
        }, OptimizerJson.Options);

        await _socket.SendAsync(Encoding.UTF8.GetBytes(payload), WebSocketMessageType.Text, true, CancellationToken.None).ConfigureAwait(false);

        while (true)
        {
            var response = await ReceiveAsync().ConfigureAwait(false);
            if (!response.TryGetProperty("id", out var responseId) || responseId.GetInt32() != id)
            {
                continue;
            }

            if (response.TryGetProperty("error", out var error))
            {
                throw new InvalidOperationException(error.ToString());
            }

            return response.GetProperty("result").Clone();
        }
    }
    /// <summary>
    /// EN: Executes EvaluateAsync&lt;T&gt;.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] EvaluateAsync&lt;T&gt; を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<T> EvaluateAsync<T>(string expression)
    {
        var value = await EvaluateJsonAsync(expression).ConfigureAwait(false);
        return value.Deserialize<T>(OptimizerJson.Options)!;
    }
    /// <summary>
    /// EN: Executes EvaluateJsonAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] EvaluateJsonAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task<JsonElement> EvaluateJsonAsync(string expression)
    {
        var result = await SendAsync("Runtime.evaluate", new
        {
            expression,
            awaitPromise = true,
            returnByValue = true
        }).ConfigureAwait(false);

        var runtimeResult = result.GetProperty("result");
        if (runtimeResult.TryGetProperty("exceptionDetails", out var exception))
        {
            throw new InvalidOperationException(exception.ToString());
        }

        if (runtimeResult.TryGetProperty("value", out var value))
        {
            return value.Clone();
        }

        return default;
    }
    /// <summary>
    /// EN: Executes CaptureScreenshotAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] CaptureScreenshotAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async Task CaptureScreenshotAsync(string path)
    {
        var result = await SendAsync("Page.captureScreenshot", new
        {
            format = "png",
            captureBeyondViewport = true
        }).ConfigureAwait(false);

        var data = result.GetStringOrDefault("data");
        if (string.IsNullOrWhiteSpace(data))
        {
            return;
        }

        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, Convert.FromBase64String(data)).ConfigureAwait(false);
    }

    private async Task<JsonElement> ReceiveAsync()
    {
        var buffer = new byte[64 * 1024];
        using var stream = new MemoryStream();
        while (true)
        {
            var result = await _socket.ReceiveAsync(buffer, CancellationToken.None).ConfigureAwait(false);
            if (result.MessageType == WebSocketMessageType.Close)
            {
                throw new InvalidOperationException("CDP websocket closed.");
            }

            stream.Write(buffer, 0, result.Count);
            if (result.EndOfMessage)
            {
                break;
            }
        }

        return JsonDocument.Parse(stream.ToArray()).RootElement.Clone();
    }
    /// <summary>
    /// EN: Executes DisposeAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DisposeAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public async ValueTask DisposeAsync()
    {
        if (_socket.State == WebSocketState.Open)
        {
            await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "done", CancellationToken.None).ConfigureAwait(false);
        }

        _socket.Dispose();
    }
}

internal sealed record WebRunnerResult(
    bool Success,
    bool DoorOpened,
    bool EnemyDefeated,
    int DoorOpenedCount,
    int EnemyDefeatedCount,
    double ElapsedSeconds,
    int Predictions,
    double Fps,
    string SafetyReason,
    string MobilityMode,
    string LastError,
    IReadOnlyList<string> EvidenceScreenshots,
    IReadOnlyList<JsonElement> Samples)
{
    /// <summary>
    /// EN: Executes Failed.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Failed を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public static WebRunnerResult Failed(string error)
        => new(false, false, false, 0, 0, 0, 0, 0, "none", "none", error, [], []);
    /// <summary>
    /// EN: Gets FromStatus.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] FromStatus を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static WebRunnerResult FromStatus(
        bool success,
        TimeSpan elapsed,
        JsonElement status,
        IReadOnlyList<JsonElement> samples,
        IReadOnlyList<string> evidenceScreenshots)
    {
        var autoplay = status.GetPropertyOrDefault("autoplay");
        var milestones = autoplay.GetPropertyOrDefault("milestones");
        var doorOpened = milestones.GetInt32OrDefault("doorOpened");
        var enemyDefeated = milestones.GetInt32OrDefault("enemyDefeated");
        return new WebRunnerResult(
            Success: success,
            DoorOpened: doorOpened >= 1,
            EnemyDefeated: enemyDefeated >= 1,
            DoorOpenedCount: doorOpened,
            EnemyDefeatedCount: enemyDefeated,
            ElapsedSeconds: elapsed.TotalSeconds,
            Predictions: autoplay.GetInt32OrDefault("predictions"),
            Fps: status.GetDoubleOrDefault("fps"),
            SafetyReason: autoplay.GetStringOrDefault("safetyReason"),
            MobilityMode: autoplay.GetStringOrDefault("mobilityMode"),
            LastError: status.GetStringOrDefault("lastError"),
            EvidenceScreenshots: evidenceScreenshots,
            Samples: samples);
    }
}

internal static class JsonElementExtensions
{
    /// <summary>
    /// EN: Executes GetPropertyOrDefault.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetPropertyOrDefault を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public static JsonElement GetPropertyOrDefault(this JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
        {
            return value;
        }

        return default;
    }
    /// <summary>
    /// EN: Executes GetStringOrDefault.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetStringOrDefault を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static string GetStringOrDefault(this JsonElement element, string name)
    {
        var value = element.GetPropertyOrDefault(name);
        return value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    }
    /// <summary>
    /// EN: Executes GetInt32OrDefault.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetInt32OrDefault を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static int GetInt32OrDefault(this JsonElement element, string name)
    {
        var value = element.GetPropertyOrDefault(name);
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
        {
            return number;
        }

        return 0;
    }
    /// <summary>
    /// EN: Executes GetDoubleOrDefault.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetDoubleOrDefault を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static double GetDoubleOrDefault(this JsonElement element, string name)
    {
        var value = element.GetPropertyOrDefault(name);
        if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number))
        {
            return number;
        }

        return 0;
    }
    /// <summary>
    /// EN: Executes GetBoolOrDefault.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetBoolOrDefault を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static bool GetBoolOrDefault(this JsonElement element, string name)
    {
        var value = element.GetPropertyOrDefault(name);
        return value.ValueKind == JsonValueKind.True
            || (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var parsed) && parsed);
    }
}

internal static class OptimizerJson
{
    /// <summary>
    /// EN: Executes Options.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Options を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public static JsonSerializerOptions Options { get; } = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}

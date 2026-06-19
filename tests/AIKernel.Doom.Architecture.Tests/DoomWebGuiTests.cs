namespace AIKernel.Doom.Architecture.Tests;

public sealed class DoomWebGuiTests
{
    [Fact]
    public void DoomPrompt_ExposesGuiSelfTestHooks()
    {
        var prompt = ReadDoomPromptScript();
        var selftest = ReadDoomGuiSelfTestScript();

        Assert.Contains("doom.gui.selftest", prompt, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomGuiSelfTest?.install", prompt, StringComparison.Ordinal);
        Assert.Contains("return false;", prompt, StringComparison.Ordinal);
        Assert.Contains("window.runAIKernelDoomGuiSelfTest", selftest, StringComparison.Ordinal);
        Assert.Contains("window.runAIKernelDoomGuiSelfTestCommand", selftest, StringComparison.Ordinal);
        Assert.Contains("window.getAIKernelDoomGuiSnapshot", selftest, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomLastGuiSelfTest", selftest, StringComparison.Ordinal);
        Assert.Contains("doomGuiSelftest", selftest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_OffersAikConsoleAndApprovalButtonConsent()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("doom-approval-accept", script, StringComparison.Ordinal);
        Assert.Contains("doom-approval-decline", script, StringComparison.Ordinal);
        Assert.Contains("runApprovalUiCommand(\"yes\")", script, StringComparison.Ordinal);
        Assert.Contains("runApprovalUiCommand(\"no\")", script, StringComparison.Ordinal);
        Assert.Contains("runWasmCommand(command, { echo: false, source: \"approval-ui\" })", script, StringComparison.Ordinal);
        Assert.Contains("Type yes in the aik console or use the approval button below", script, StringComparison.Ordinal);
        Assert.DoesNotContain("hintWord=yes", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_ExposesStructuredDebugApi()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("window.AIKernelDoomDebugApi", script, StringComparison.Ordinal);
        Assert.Contains("getSchemaDefinitions", script, StringComparison.Ordinal);
        Assert.Contains("sendSchemaDefinitions", script, StringComparison.Ordinal);
        Assert.Contains("captureGameFrame", script, StringComparison.Ordinal);
        Assert.Contains("getAnalysisLogs", script, StringComparison.Ordinal);
        Assert.Contains("getSensorTensor", script, StringComparison.Ordinal);
        Assert.Contains("runGuiSelfTest", script, StringComparison.Ordinal);
        Assert.Contains("doomSchemaDefinitionUrls", script, StringComparison.Ordinal);
        Assert.Contains("/demo/doom/autoplay-sensor-tensor.schema.json", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_SchemaDebugApiSupportsStaticHostingFallback()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("async function sendSchemaDefinitions(target = \"/api/doom/schema-definitions\", options = {})", script, StringComparison.Ordinal);
        Assert.Contains("Array.isArray(target.schemas)", script, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomLastSchemaDefinitions = payload", script, StringComparison.Ordinal);
        Assert.Contains("transport: \"local-cache\"", script, StringComparison.Ordinal);
        Assert.Contains("reason: \"schema-endpoint-not-found\"", script, StringComparison.Ordinal);
        Assert.Contains("debugApi: {", script, StringComparison.Ordinal);
        Assert.Contains("version: \"20260618-palette1\"", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomSchemaDefinitions_ExposeSensorTensorIcd()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var tensor = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "autoplay-sensor-tensor.schema.json"));
        var state = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "autoplay-state.schema.json"));
        var status = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "autoplay-status.schema.json"));

        Assert.Contains("\"version\": { \"const\": \"doom-sensor-tensor-v1\" }", tensor, StringComparison.Ordinal);
        Assert.Contains("\"const\": 4", tensor, StringComparison.Ordinal);
        Assert.Contains("\"const\": 8", tensor, StringComparison.Ordinal);
        Assert.Contains("\"minItems\": 32", tensor, StringComparison.Ordinal);
        Assert.Contains("\"maxItems\": 32", tensor, StringComparison.Ordinal);
        Assert.Contains("\"semantic.door\"", tensor, StringComparison.Ordinal);
        Assert.Contains("\"semantic.corridor\"", tensor, StringComparison.Ordinal);
        Assert.Contains("\"semantic.computer\"", tensor, StringComparison.Ordinal);
        Assert.Contains("\"semantic.bridge\"", tensor, StringComparison.Ordinal);
        Assert.Contains("\"system.combat\"", tensor, StringComparison.Ordinal);
        Assert.Contains("\"sensorTensor\": { \"$ref\": \"autoplay-sensor-tensor.schema.json\" }", state, StringComparison.Ordinal);
        Assert.Contains("\"sensorTensor\": { \"$ref\": \"autoplay-sensor-tensor.schema.json\" }", status, StringComparison.Ordinal);
        Assert.Contains("\"decisionTrace\"", status, StringComparison.Ordinal);
        Assert.Contains("\"version\": { \"const\": \"control-decision-trace-v1\" }", status, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_GuiSelfTestAutoRunIsSilentUntilExplicitCommand()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("window.AIKernelDoomLastGuiSelfTestAuto", script, StringComparison.Ordinal);
        Assert.Contains("const result = await doomGuiSelfTest.runDoomGuiSelfTest?.()", script, StringComparison.Ordinal);
        Assert.DoesNotContain("await window.runAIKernelDoomGuiSelfTestCommand();", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_FocusesAikConsoleUntilGameStarts()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("function focusAikConsole", script, StringComparison.Ordinal);
        Assert.Contains("promptInput.focus({ preventScroll: true })", script, StringComparison.Ordinal);
        Assert.DoesNotContain("promptForm?.scrollIntoView?", script, StringComparison.Ordinal);
        Assert.Contains("release-console:", script, StringComparison.Ordinal);
        Assert.Contains("focusDoomViewport(\"approved-running\")", script, StringComparison.Ordinal);
        Assert.Contains("const consoleBody = document.querySelector(\".console-body\")", script, StringComparison.Ordinal);
        Assert.Contains("consoleBody?.classList.toggle(\"is-doom-running\", gameSurfaceVisible)", script, StringComparison.Ordinal);
        Assert.Contains("function scrollDoomRuntimeIntoView", script, StringComparison.Ordinal);
        Assert.Contains("doomScreen.focus({ preventScroll: true })", script, StringComparison.Ordinal);
        Assert.Contains("const top = anchorRect.top + window.scrollY", script, StringComparison.Ordinal);
        Assert.Contains("const target = top - margin", script, StringComparison.Ordinal);
        Assert.DoesNotContain("bottom - viewportHeight + margin", script, StringComparison.Ordinal);
        Assert.DoesNotContain("doomScreenPanel?.scrollIntoView?.({ block: \"center\"", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_AutoScrollsConsoleHistoryWithoutPageScroll()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("function scrollConsoleHistoryToTail", script, StringComparison.Ordinal);
        Assert.Contains("container.scrollTo({ top: target, left: 0, behavior: \"auto\" })", script, StringComparison.Ordinal);
        Assert.Contains("window.requestAnimationFrame(scrollConsoleHistoryToTail)", script, StringComparison.Ordinal);
        Assert.Contains("window.setTimeout(scrollConsoleHistoryToTail, 80)", script, StringComparison.Ordinal);
        Assert.DoesNotContain("promptForm?.scrollIntoView?", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_AisthesisCompassShowsToposFusionEvidence()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("function compassSignalText", script, StringComparison.Ordinal);
        Assert.Contains("return \"movement+audio fusion\"", script, StringComparison.Ordinal);
        Assert.Contains("return \"relative sensor fusion\"", script, StringComparison.Ordinal);
        Assert.Contains("estimate ${Math.round(heading)}deg", script, StringComparison.Ordinal);
        Assert.Contains("fuse ${source}", script, StringComparison.Ordinal);
        Assert.Contains("rot ${formatSignedNumber(motorDelta)}", script, StringComparison.Ordinal);
        Assert.Contains("fb ${formatSignedNumber(frameDelta)}", script, StringComparison.Ordinal);
        Assert.Contains("wall ${formatSignedNumber(wallFlowDelta)}", script, StringComparison.Ordinal);
        Assert.Contains("edge ${formatSignedNumber(edgeDelta)}", script, StringComparison.Ordinal);
        Assert.Contains("button.dataset.sensorToggle === \"compass\"", script, StringComparison.Ordinal);
        Assert.Contains("button.insertBefore(needle, detail)", script, StringComparison.Ordinal);
        Assert.DoesNotContain("text.indexOf(\"relative-sensor-fusion\") >= 0 || text.indexOf(\"movement-audio-relative\") >= 0", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_CoalescesHudUpdatesAndTogglesSensorsOptimistically()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var script = ReadDoomPromptScript();
        var adapter = ReadDoomRuntimeStatusFlowScript();
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "runtime-status-flow-vm.test.mjs"));
        var normalizedScript = script.Replace("\r\n", "\n", StringComparison.Ordinal);

        Assert.Contains("onStatusChange: queueRuntimeStatusUpdate", script, StringComparison.Ordinal);
        Assert.Contains("function queueRuntimeStatusUpdate", script, StringComparison.Ordinal);
        Assert.Contains("function requireRuntimeStatusFlowAdapter", script, StringComparison.Ordinal);
        Assert.Contains("runtimeStatusFlow.queue(status, reason", script, StringComparison.Ordinal);
        Assert.Contains("let latestRuntimeStatus = null", script, StringComparison.Ordinal);
        Assert.Contains("latestRuntimeStatus = status || latestRuntimeStatus", script, StringComparison.Ordinal);
        Assert.Contains("runtimeStatusFlow.snapshot().droppedFrames", script, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomRuntimeStatusFlow", adapter, StringComparison.Ordinal);
        Assert.Contains("function hudIntervalMs", adapter, StringComparison.Ordinal);
        Assert.Contains("function createFlow", adapter, StringComparison.Ordinal);
        Assert.Contains("callbacks.light?.(status, reason)", adapter, StringComparison.Ordinal);
        Assert.Contains("callbacks.update?.(status, reason)", adapter, StringComparison.Ordinal);
        Assert.Contains("RUNTIME_STATUS_FLOW_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.DoesNotContain("function runtimeHudIntervalMs", script, StringComparison.Ordinal);
        Assert.DoesNotContain("pendingRuntimeStatus", script, StringComparison.Ordinal);
        Assert.DoesNotContain("droppedRuntimeHudFrames += 1", script, StringComparison.Ordinal);
        Assert.Contains("function applyOptimisticSensorToggle", script, StringComparison.Ordinal);
        Assert.Contains("function setSensorInputAsync", script, StringComparison.Ordinal);
        Assert.Contains("function runSensorToggleButton", script, StringComparison.Ordinal);
        Assert.Contains("function syncSingleSensorToggle", script, StringComparison.Ordinal);
        Assert.Contains("button.setAttribute(\"aria-busy\", \"true\")", script, StringComparison.Ordinal);
        Assert.Contains("applyOptimisticSensorToggle(kind, enabled, { button })", script, StringComparison.Ordinal);
        Assert.Contains("setSensorInputAsync(kind, enabled, { button }).finally", script, StringComparison.Ordinal);
        Assert.Contains("syncSingleSensorToggle(kind, enabled, status, options.button)", script, StringComparison.Ordinal);
        Assert.Contains("event.target.closest(\"button[data-sensor-toggle]\")", script, StringComparison.Ordinal);
        Assert.DoesNotContain("const status = await Promise.resolve(doomRuntime.setSensorInput(kind, enabled));", script, StringComparison.Ordinal);
        Assert.DoesNotContain("function createOptimisticSensorStatus(kind, enabled) {\n      const status = doomRuntime?.status?.() || {}", normalizedScript, StringComparison.Ordinal);
        Assert.DoesNotContain("doomRuntime?.status?.().sensors", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_UsesCanonicalAisthesisNoesisKrisisKinesisPanelMapping()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var prompt = ReadDoomPromptScript();
        var panel = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-sensor-panel.js"));
        var pipelinePanel = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-pipeline-panel.js"));
        var goalPanel = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-goal-panel.js"));
        var debugOverlay = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-debug-overlay.js"));
        var pipelineTrace = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "pipeline-trace.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-sensor-panel-vm.test.mjs"));
        var pipelineVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-pipeline-panel-vm.test.mjs"));
        var pipelineTraceVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-pipeline-trace-vm.test.mjs"));
        var goalPanelVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-goal-panel-vm.test.mjs"));
        var debugOverlayVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-debug-overlay-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomSensorPanel", panel, StringComparison.Ordinal);
        Assert.Contains("20260618-sensorpanel1", panel, StringComparison.Ordinal);
        Assert.Contains("Aisthesis", panel, StringComparison.Ordinal);
        Assert.Contains("Phainesis", panel, StringComparison.Ordinal);
        Assert.Contains("Nous", panel, StringComparison.Ordinal);
        Assert.Contains("Krisis", panel, StringComparison.Ordinal);
        Assert.Contains("Topos", panel, StringComparison.Ordinal);
        Assert.Contains("Kairos", panel, StringComparison.Ordinal);
        Assert.Contains("Kinesis", panel, StringComparison.Ordinal);
        Assert.Contains("Zoe", panel, StringComparison.Ordinal);
        Assert.Contains("loadDoomSensorPanelScript", prompt, StringComparison.Ordinal);
        Assert.Contains("refreshSensorPanelDescriptors", prompt, StringComparison.Ordinal);
        Assert.Contains("doom-sensor-panel.js?v=20260618-sensorpanel1", prompt, StringComparison.Ordinal);
        Assert.Contains("loadDoomGoalPanelScript", prompt, StringComparison.Ordinal);
        Assert.Contains("doom-goal-panel.js?v=20260619-goalpanel2", prompt, StringComparison.Ordinal);
        Assert.Contains("loadDoomDebugOverlayScript", prompt, StringComparison.Ordinal);
        Assert.Contains("doom-debug-overlay.js?v=20260619-debugoverlay3", prompt, StringComparison.Ordinal);
        Assert.Contains("sensorRow.dataset.sensorPanelVersion = sensorPanelVersion", prompt, StringComparison.Ordinal);
        Assert.Contains("node.dataset.sensorPanel = panel.key", prompt, StringComparison.Ordinal);
        Assert.Contains("stageNode.dataset.sensorStage = stage.key || \"\"", prompt, StringComparison.Ordinal);
        Assert.Contains("existing.classList.remove(\"doom-debug-switch\")", prompt, StringComparison.Ordinal);
        Assert.Contains("phainesis=${phainesisText}", prompt, StringComparison.Ordinal);
        Assert.Contains("phainesis=${detections}", prompt, StringComparison.Ordinal);
        Assert.Contains("autoplay.phainomenon || autoplay.nousDetectorResult", prompt, StringComparison.Ordinal);
        Assert.Contains("doom-pipeline-panel.js?v=20260619-pipelinepanel6", prompt, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomGoalPanel", goalPanel, StringComparison.Ordinal);
        Assert.Contains("20260619-goalpanel2", goalPanel, StringComparison.Ordinal);
        Assert.Contains("resolveTelosObjective", goalPanel, StringComparison.Ordinal);
        Assert.Contains("resolvePriorityAction", goalPanel, StringComparison.Ordinal);
        Assert.Contains("DOOM_GOAL_PANEL_VM_TEST_OK", goalPanelVmTest, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomDebugOverlay", debugOverlay, StringComparison.Ordinal);
        Assert.Contains("20260619-debugoverlay3", debugOverlay, StringComparison.Ordinal);
        Assert.Contains("function renderDebugOverlay", debugOverlay, StringComparison.Ordinal);
        Assert.Contains("DOOM_DEBUG_OVERLAY_VM_TEST_OK", debugOverlayVmTest, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomPipelinePanel", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("20260619-pipelinepanel6", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("rear-landmark-avoidance", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("[CTG OBSERVED]", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("[Hodos]", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("[Pipeline]", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("[Route]", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("Route: ${topos.routeKind}", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("formatStageTrace", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("formatRouteTrace", pipelinePanel, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomPipelineTrace", pipelineTrace, StringComparison.Ordinal);
        Assert.Contains("function buildTrace(input = {})", pipelineTrace, StringComparison.Ordinal);
        Assert.Contains("DOOM_PIPELINE_PANEL_VM_TEST_OK", pipelineVmTest, StringComparison.Ordinal);
        Assert.Contains("DOOM_PIPELINE_TRACE_VM_TEST_OK", pipelineTraceVmTest, StringComparison.Ordinal);
        Assert.DoesNotContain("det=${", prompt, StringComparison.Ordinal);
        Assert.DoesNotContain("function createDebugRegion", prompt, StringComparison.Ordinal);
        Assert.DoesNotContain("function appendVision9x9Heatmap", prompt, StringComparison.Ordinal);
        Assert.Contains("DOOM_SENSOR_PANEL_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("canonical panel order should be Aisthesis, Noesis, Krisis, Kinesis", vmTest, StringComparison.Ordinal);
        Assert.Contains("detectors should not be duplicated across panels", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_ExposesControllerDebugLogApi()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var script = ReadDoomPromptScript();
        var adapter = ReadDoomControllerDebugLogScript();
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "controller-debug-log-vm.test.mjs"));

        Assert.Contains("doom-controller-debug-log", script, StringComparison.Ordinal);
        Assert.Contains("function requireControllerDebugLogAdapter", script, StringComparison.Ordinal);
        Assert.Contains("function pushControllerDebugLog", script, StringComparison.Ordinal);
        Assert.Contains("function setControllerDebugMessage", script, StringComparison.Ordinal);
        Assert.Contains("function setControllerDebugLogEntries", script, StringComparison.Ordinal);
        Assert.Contains("function setControllerDebugLogFilter", script, StringComparison.Ordinal);
        Assert.Contains("function controllerDebugEntriesFromDecisionTrace", script, StringComparison.Ordinal);
        Assert.Contains("window.pushAIKernelDoomControllerDebugLog = pushControllerDebugLog", script, StringComparison.Ordinal);
        Assert.Contains("window.setAIKernelDoomControllerDebugMessage = setControllerDebugMessage", script, StringComparison.Ordinal);
        Assert.Contains("getControllerDebugLog: getControllerDebugLogEntries", script, StringComparison.Ordinal);
        Assert.Contains("pushControllerDebugLog", script, StringComparison.Ordinal);
        Assert.Contains("setControllerDebugMessage", script, StringComparison.Ordinal);
        Assert.Contains("syncControllerDebugLog(status, reason)", script, StringComparison.Ordinal);
        Assert.Contains("autoplay.decisionTrace", script, StringComparison.Ordinal);
        Assert.Contains("setControllerDebugLogEntries(traceEntries, { autoLimit: true })", script, StringComparison.Ordinal);
        Assert.Contains("category: \"priority\"", script, StringComparison.Ordinal);
        Assert.Contains("label: \"TELOS\"", script, StringComparison.Ordinal);
        Assert.Contains("label: \"OBJECTIVE\"", script, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomControllerDebugLog", adapter, StringComparison.Ordinal);
        Assert.Contains("entriesFromDecisionTrace", adapter, StringComparison.Ordinal);
        Assert.Contains("normalizeEntry", adapter, StringComparison.Ordinal);
        Assert.Contains("entryMatches", adapter, StringComparison.Ordinal);
        Assert.Contains("CONTROLLER_DEBUG_LOG_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.DoesNotContain("function normalizeControllerDebugLevel", script, StringComparison.Ordinal);
        Assert.DoesNotContain("replace(/[^a-z0-9._-]+/g", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_UsesDownloadProgressAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var script = ReadDoomPromptScript();
        var adapter = ReadDoomDownloadProgressScript();
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "download-progress-vm.test.mjs"));

        Assert.Contains("function requireDownloadProgressAdapter", script, StringComparison.Ordinal);
        Assert.Contains("downloadProgressTracker.update(progress, status, reason)", script, StringComparison.Ordinal);
        Assert.Contains("downloadProgressTracker.reset()", script, StringComparison.Ordinal);
        Assert.Contains("downloadProgressTracker.snapshot().lastText", script, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomDownloadProgress", adapter, StringComparison.Ordinal);
        Assert.Contains("function createTracker", adapter, StringComparison.Ordinal);
        Assert.Contains("function createView", adapter, StringComparison.Ordinal);
        Assert.Contains("function summarizeAssets", adapter, StringComparison.Ordinal);
        Assert.Contains("DOWNLOAD_PROGRESS_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.DoesNotContain("function formatDownloadBytes", script, StringComparison.Ordinal);
        Assert.DoesNotContain("function summarizeDownloadAssets", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_UsesDebugbarAutoplayToggle()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("doom-autoplay-toggle", script, StringComparison.Ordinal);
        Assert.Contains("function syncAutoplayToggle", script, StringComparison.Ordinal);
        Assert.Contains("function runAutoplayToggleButton", script, StringComparison.Ordinal);
        Assert.Contains("doom.autoplay toggle", script, StringComparison.Ordinal);
        Assert.Contains("event.target.closest(\"#doom-autoplay-toggle\")", script, StringComparison.Ordinal);
        Assert.Contains("createOptimisticAutoplayStatus", script, StringComparison.Ordinal);
        Assert.Contains("setControllerDebugMessage", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_KeepsApprovalNoticeLayoutStable()
    {
        var script = ReadDoomPromptScript();

        Assert.Contains("approvalActions.classList.toggle(\"is-collapsed\", hidden)", script, StringComparison.Ordinal);
        Assert.Contains("approvalActions.setAttribute(\"aria-hidden\", hidden ? \"true\" : \"false\")", script, StringComparison.Ordinal);
        Assert.Contains("halted.classList.add(\"is-visible\")", script, StringComparison.Ordinal);
        Assert.DoesNotContain("approvalActions.hidden = hidden", script, StringComparison.Ordinal);
        Assert.DoesNotContain("halted.style.display = \"block\"", script, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("doomController.addEventListener(\"click\"")]
    [InlineData("doomDebugBar?.addEventListener(\"click\"")]
    [InlineData("doomOverlayToggle?.addEventListener(\"click\"")]
    [InlineData("doomManualMoveToggle?.addEventListener(\"click\"")]
    [InlineData("doomSenseOnlyToggle?.addEventListener(\"click\"")]
    [InlineData("doomDetectionToggles.forEach")]
    [InlineData("doomController.addEventListener(\"pointerdown\"")]
    [InlineData("doomController.addEventListener(\"pointerup\"")]
    public void DoomPrompt_WiresExpectedGuiEventHandlers(string expected)
    {
        var script = ReadDoomPromptScript();

        Assert.Contains(expected, script, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("doom.status")]
    [InlineData("doom.phase.check")]
    [InlineData("doom.autoplay toggle")]
    [InlineData("doom.autoplay manual-move toggle")]
    [InlineData("model.status")]
    [InlineData("wasm.exports")]
    [InlineData("copy.logs")]
    [InlineData("clear")]
    [InlineData("doom.audio toggle")]
    public void DoomPrompt_GuiSelfTestCoversCriticalButtonCommands(string command)
    {
        var script = ReadDoomGuiSelfTestScript();

        Assert.Contains(command, script, StringComparison.Ordinal);
        Assert.Contains("findDoomCommandButton", script, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("[data-sensor-toggle=\"visual\"]")]
    [InlineData("[data-detection-toggle=\"door\"]")]
    [InlineData("manual-move-toggle")]
    [InlineData("autoplay-toggle")]
    [InlineData("autoplay-toggle-wired")]
    [InlineData("sense-only-toggle")]
    [InlineData("overlay-toggle")]
    [InlineData("ctg-detail-toggle")]
    [InlineData("audio-toggle-wired")]
    [InlineData("controller-debug-log-visible")]
    [InlineData("controller-debug-log-filter")]
    [InlineData("sensor-panel-canon-grid")]
    [InlineData("phainesis-det-panelized")]
    [InlineData("zoe-veto-panelized")]
    public void DoomPrompt_GuiSelfTestCoversCriticalToggles(string marker)
    {
        var script = ReadDoomGuiSelfTestScript();

        Assert.Contains(marker, script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_PreservesWasmDecisionTraceInStatus()
    {
        var script = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "doom.js"));

        Assert.Contains("this.autoplayDecisionStage", script, StringComparison.Ordinal);
        Assert.Contains("this.autoplayEvidenceScore", script, StringComparison.Ordinal);
        Assert.Contains("this.autoplaySemanticScores", script, StringComparison.Ordinal);
        Assert.Contains("this.autoplayDecisionTrace", script, StringComparison.Ordinal);
        Assert.Contains("stage: rawAction.stage || rawAction.pipeline", script, StringComparison.Ordinal);
        Assert.Contains("semanticScores: rawAction.semanticScores", script, StringComparison.Ordinal);
        Assert.Contains("decisionTrace: wasmStatus.decisionTrace || rawAction.decisionTrace || null", script, StringComparison.Ordinal);
        Assert.Contains("decisionTrace: this.autoplayDecisionTrace", script, StringComparison.Ordinal);
        Assert.Contains("evidenceScore: this.autoplayEvidenceScore", script, StringComparison.Ordinal);
        Assert.Contains("hudFlowControl: this.createHudFlowControlStatus()", script, StringComparison.Ordinal);
        Assert.Contains("createHudFlowControlStatus()", script, StringComparison.Ordinal);
        Assert.Contains("source: \"runtime-fps-control\"", script, StringComparison.Ordinal);
        Assert.Contains("dropPolicy: \"latest-only\"", script, StringComparison.Ordinal);
        Assert.Contains("this.controlRuntime.predict(wasmState)", script, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWasmState(\"createState\")(this, state)", script, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWasmState(\"resolveObjective\")(signals)", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesWasmAutoplayStateAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "wasm-state.js"));
        var objectiveRouting = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "objective-routing.js"));

        Assert.Contains("function requireDoomWasmState", runtime, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomWasmState", adapter, StringComparison.Ordinal);
        Assert.Contains("function createState(runtime, state)", adapter, StringComparison.Ordinal);
        Assert.Contains("function buildWasmSensorTensor", adapter, StringComparison.Ordinal);
        Assert.Contains("function resolveObjective", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireObjectiveRouting", adapter, StringComparison.Ordinal);
        Assert.Contains("return requireObjectiveRouting(\"resolveObjective\")(signals)", adapter, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomObjectiveRouting", objectiveRouting, StringComparison.Ordinal);
        Assert.Contains("function resolveObjectiveRoute", objectiveRouting, StringComparison.Ordinal);
        Assert.Contains("canonicalObjectiveMap", objectiveRouting, StringComparison.Ordinal);
        Assert.DoesNotContain("\"cross-bridge\": \"reach-bridge\"", adapter, StringComparison.Ordinal);
        Assert.Contains("sensorTensor: wasmSensorTensor", adapter, StringComparison.Ordinal);
        Assert.DoesNotContain("const buildWasmSensorTensor = tensor =>", runtime, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesTemporaryControlRuntimeShimForFutureWasmControl()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var shim = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control-runtime.js"));
        var sensorTensor = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "sensor-tensor.js"));
        var expressionDsl = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "expression-dsl.js"));
        var doomContext = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "doom-context.js"));
        var evidence = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "evidence.js"));
        var arbitration = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "arbitration.js"));
        var decisionTrace = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "decision-trace.js"));
        var pipelineGraph = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "pipeline-graph.js"));
        var zoeVeto = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "zoe-veto.js"));
        var runtimePackets = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "control", "runtime-packets.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "control-runtime-vm.test.mjs"));
        var doomContextVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "control-doom-context-vm.test.mjs"));
        var evidenceVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "control-evidence-vm.test.mjs"));
        var arbitrationVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "control-arbitration-vm.test.mjs"));
        var runtimePacketsVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "control-runtime-packets-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomControlRuntime", shim, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomExpressionDsl", expressionDsl, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomControlContext", doomContext, StringComparison.Ordinal);
        Assert.Contains("function createContext", doomContext, StringComparison.Ordinal);
        Assert.Contains("function wallVector", doomContext, StringComparison.Ordinal);
        Assert.Contains("screen6Regions", doomContext, StringComparison.Ordinal);
        Assert.Contains("doorAimYawDegrees", doomContext, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomControlEvidence", evidence, StringComparison.Ordinal);
        Assert.Contains("function semanticScore", evidence, StringComparison.Ordinal);
        Assert.Contains("function evidenceScore", evidence, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomControlArbitration", arbitration, StringComparison.Ordinal);
        Assert.Contains("function sortStages", arbitration, StringComparison.Ordinal);
        Assert.Contains("function evaluateStages", arbitration, StringComparison.Ordinal);
        Assert.Contains("function evaluateWhen", expressionDsl, StringComparison.Ordinal);
        Assert.Contains("function requireExpressionDsl", shim, StringComparison.Ordinal);
        Assert.Contains("function requireControlContext", shim, StringComparison.Ordinal);
        Assert.Contains("return requireControlContext(\"createContext\")(profile, state)", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("screen6Regions", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("doorAimYawDegrees", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("function wallVector", shim, StringComparison.Ordinal);
        Assert.Contains("function requireSensorTensor", evidence, StringComparison.Ordinal);
        Assert.DoesNotContain("function requireSensorTensor", shim, StringComparison.Ordinal);
        Assert.Contains("function requireDecisionTrace", shim, StringComparison.Ordinal);
        Assert.Contains("function requireControlEvidence", shim, StringComparison.Ordinal);
        Assert.Contains("requireControlEvidence(\"evidenceScore\")", shim, StringComparison.Ordinal);
        Assert.Contains("requireControlEvidence(\"semanticScores\")", shim, StringComparison.Ordinal);
        Assert.Contains("function requireControlArbitration", shim, StringComparison.Ordinal);
        Assert.Contains("requireControlArbitration(\"sortStages\")", shim, StringComparison.Ordinal);
        Assert.Contains("requireControlArbitration(\"evaluateStages\")", shim, StringComparison.Ordinal);
        Assert.DoesNotContain(".sort((a, b) =>", shim, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomDecisionTrace", decisionTrace, StringComparison.Ordinal);
        Assert.Contains("control-decision-trace-v1", decisionTrace, StringComparison.Ordinal);
        Assert.Contains("CATEGORY_CODES", decisionTrace, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomControlPipelineGraph", pipelineGraph, StringComparison.Ordinal);
        Assert.Contains("function compileCanonicalGraph", pipelineGraph, StringComparison.Ordinal);
        Assert.Contains("function normalizeRules", pipelineGraph, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomControlZoeVeto", zoeVeto, StringComparison.Ordinal);
        Assert.Contains("function applyZoeVeto", zoeVeto, StringComparison.Ordinal);
        Assert.Contains("function normalizeVetoRules", zoeVeto, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomControlRuntimePackets", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function actionFromStage", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function idleAction", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function statusFromAction", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function initializedStatus", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function requirePipelineGraph", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("return requirePipelineGraph(\"compileCanonicalGraph\")(profile)", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function requireZoeVeto", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("return requireZoeVeto(\"applyZoeVeto\")(action, state, profile, helpers)", runtimePackets, StringComparison.Ordinal);
        Assert.DoesNotContain("function normalizeRules", runtimePackets, StringComparison.Ordinal);
        Assert.DoesNotContain("function normalizeVetoRules", runtimePackets, StringComparison.Ordinal);
        Assert.DoesNotContain("node(\"aisthesis\"", runtimePackets, StringComparison.Ordinal);
        Assert.Contains("function requireRuntimePackets", shim, StringComparison.Ordinal);
        Assert.Contains("requireRuntimePackets(\"actionFromStage\")", shim, StringComparison.Ordinal);
        Assert.Contains("requireRuntimePackets(\"idleAction\")", shim, StringComparison.Ordinal);
        Assert.Contains("requireRuntimePackets(\"statusFromAction\")", shim, StringComparison.Ordinal);
        Assert.Contains("requireRuntimePackets(\"initializedStatus\")", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("function turnFromYaw", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("const moveBackward = evaluateWhen", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("const initializedTrace", shim, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"semanticScore\")(packet, normalized)", evidence, StringComparison.Ordinal);
        Assert.DoesNotContain("SENSOR_TENSOR_OFFSETS", shim, StringComparison.Ordinal);
        Assert.Contains("function semanticScore(packet, symbol)", sensorTensor, StringComparison.Ordinal);
        Assert.Contains("safe-zone", sensorTensor, StringComparison.Ordinal);
        Assert.Contains("return requireExpressionDsl(\"evaluateWhen\")(context, expression)", shim, StringComparison.Ordinal);
        Assert.DoesNotContain("function compare(left, right, op)", shim, StringComparison.Ordinal);
        Assert.Contains("CONTROL_RUNTIME_ID", shim, StringComparison.Ordinal);
        Assert.Contains("deterministic", File.ReadAllText(Path.Combine(root, "docs", "issues", "control-wasm-runtime-library-extraction.md")), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CONTROL_RUNTIME_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("CONTROL_DOOM_CONTEXT_VM_TEST_OK", doomContextVmTest, StringComparison.Ordinal);
        Assert.Contains("CONTROL_EVIDENCE_VM_TEST_OK", evidenceVmTest, StringComparison.Ordinal);
        Assert.Contains("CONTROL_ARBITRATION_VM_TEST_OK", arbitrationVmTest, StringComparison.Ordinal);
        Assert.Contains("CONTROL_RUNTIME_PACKETS_VM_TEST_OK", runtimePacketsVmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/sensor-tensor.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/doom-context.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/evidence.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/arbitration.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/decision-trace.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/pipeline-graph.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/zoe-veto.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("autoplay/control/runtime-packets.js", vmTest, StringComparison.Ordinal);
        Assert.Contains("same-priority arbitration should be deterministic", vmTest, StringComparison.Ordinal);
        Assert.Contains("sensor tensor bridge evidence should select bridge route", vmTest, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/objective-routing.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/expression-dsl.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/doom-context.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/evidence.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/arbitration.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/decision-trace.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/pipeline-graph.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/zoe-veto.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/runtime-packets.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control-runtime.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/combat-route.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/pipeline-trace.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("const controlRuntimeFactory = self.AIKernelDoomControlRuntime?.create", runtime, StringComparison.Ordinal);
        Assert.Contains("this.autoplayControllerKind = \"control-runtime-shim\"", runtime, StringComparison.Ordinal);
        Assert.Contains("this.controlRuntime.predict(wasmState)", runtime, StringComparison.Ordinal);
        Assert.Contains("native doom.wasm remains engine/I/O only", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("aik_autoplay_init", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("callWasmJson", runtime, StringComparison.Ordinal);
        Assert.Contains("ControlRuntimeAdapter", File.ReadAllText(Path.Combine(root, "docs", "issues", "control-wasm-runtime-library-extraction.md")), StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesDoomActionAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "doom-action-adapter.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-action-adapter-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomActionAdapter", adapter, StringComparison.Ordinal);
        Assert.Contains("function createInputPlan", adapter, StringComparison.Ordinal);
        Assert.Contains("function applyAction", adapter, StringComparison.Ordinal);
        Assert.Contains("function releaseMoveInputs", adapter, StringComparison.Ordinal);
        Assert.Contains("function releaseInputs", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomActionAdapter", runtime, StringComparison.Ordinal);
        Assert.Contains("requireDoomActionAdapter(\"applyAction\")(action", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomActionAdapter(\"releaseMoveInputs\")", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomActionAdapter(\"releaseInputs\")", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("const desired = {", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("for (const [name, keycode] of Object.entries(AUTOPLAY_KEYS))", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("for (const keycode of Object.values(AUTOPLAY_KEYS))", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-action-adapter.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_ACTION_ADAPTER_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("native ABI path should be selected", vmTest, StringComparison.Ordinal);
        Assert.Contains("manual move mode should not queue movement keys", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesDoomRetryDispatchStateMachine()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "doom-retry-dispatch.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-retry-dispatch-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomRetryDispatch", adapter, StringComparison.Ordinal);
        Assert.Contains("function createState", adapter, StringComparison.Ordinal);
        Assert.Contains("function schedule", adapter, StringComparison.Ordinal);
        Assert.Contains("function process", adapter, StringComparison.Ordinal);
        Assert.Contains("function clear", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomRetryDispatch", runtime, StringComparison.Ordinal);
        Assert.Contains("this.autoplayRetryDispatch = requireDoomRetryDispatch(\"createState\")()", runtime, StringComparison.Ordinal);
        Assert.Contains("retryDispatch: requireDoomRetryDispatch(\"snapshot\")(this.autoplayRetryDispatch)", runtime, StringComparison.Ordinal);
        Assert.Contains("requireDoomRetryDispatch(\"schedule\")(this.autoplayRetryDispatch", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomRetryDispatch(\"process\")(this.autoplayRetryDispatch", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomRetryDispatch(\"clear\")(this.autoplayRetryDispatch", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("this.autoplayRetrySequence", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("this.autoplayRetryWaitFrames", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("this.autoplayRetryCooldownFrames", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("this.autoplayRetryReason", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("this.autoplayHealthRetryFrames", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-retry-dispatch.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_RETRY_DISPATCH_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("third retry frame should schedule retry dispatch", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesDoomSensorInputState()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "doom-sensor-inputs.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-sensor-inputs-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomSensorInputs", adapter, StringComparison.Ordinal);
        Assert.Contains("function createMap", adapter, StringComparison.Ordinal);
        Assert.Contains("function statusMap", adapter, StringComparison.Ordinal);
        Assert.Contains("function normalizeKind", adapter, StringComparison.Ordinal);
        Assert.Contains("function attachObservation", adapter, StringComparison.Ordinal);
        Assert.Contains("function setEnabled", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomSensorInputs", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomSensorInputs(\"createMap\")()", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomSensorInputs(\"statusMap\")(this.sensorInputs)", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomSensorInputs(\"attachObservation\")(sensors, key, observed, metadata)", runtime, StringComparison.Ordinal);
        Assert.Contains("const result = requireDoomSensorInputs(\"setEnabled\")(this.sensorInputs, kind, enabled)", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("Object.keys(this.sensorInputs).sort()", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("movement-vector", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("sensor !== false", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-sensor-inputs.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_SENSOR_INPUTS_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("vision alias should normalize to visual", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesBinaryAssetCacheAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "doom-binary-assets.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-binary-assets-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomBinaryAssets", adapter, StringComparison.Ordinal);
        Assert.Contains("async function fetchBinary", adapter, StringComparison.Ordinal);
        Assert.Contains("async function tryFetchBinaryFromCache", adapter, StringComparison.Ordinal);
        Assert.Contains("async function validateBinaryBytes", adapter, StringComparison.Ordinal);
        Assert.Contains("function normalizeByteCount", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomBinaryAssets", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomBinaryAssets(\"fetchBinary\")(url, expected, onProgress)", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomBinaryAssets(\"fetchJson\")(url)", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomBinaryAssets(\"normalizeByteCount\")(value)", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("async function tryFetchBinaryFromCache", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("async function validateBinaryBytes", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("async function readBinaryResponse", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("async function sha256", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-binary-assets.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_BINARY_ASSETS_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("invalid cache entry should emit refresh progress", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesWadMetadataAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-wad-metadata.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-wad-metadata-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomWadMetadata", adapter, StringComparison.Ordinal);
        Assert.Contains("function parseMapHints", adapter, StringComparison.Ordinal);
        Assert.Contains("function parsePlaypal", adapter, StringComparison.Ordinal);
        Assert.Contains("function defaultPalette", adapter, StringComparison.Ordinal);
        Assert.Contains("function buildPaletteCache", adapter, StringComparison.Ordinal);
        Assert.Contains("function readDirectory", adapter, StringComparison.Ordinal);
        Assert.Contains("const DOOR_SPECIALS", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomWadMetadata", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWadMetadata(\"parseMapHints\")(wadBytes, mapName)", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWadMetadata(\"parsePlaypal\")(wadBytes)", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWadMetadata(\"defaultPalette\")()", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWadMetadata(\"buildPaletteCache\")(palette)", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("function readWadDirectory", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("function parseLinedefs", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("function parseSidedefs", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("function summarizeNearestDoor", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("function isDoorSpecial", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-wad-metadata.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_WAD_METADATA_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("missing map should return null", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesWasmImportAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-wasm-imports.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-wasm-imports-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomWasmImports", adapter, StringComparison.Ordinal);
        Assert.Contains("function createImports", adapter, StringComparison.Ordinal);
        Assert.Contains("wasi_snapshot_preview1", adapter, StringComparison.Ordinal);
        Assert.Contains("fd_write: fdWrite", adapter, StringComparison.Ordinal);
        Assert.Contains("emscripten_sleep: () => 0", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomWasmImports", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomWasmImports(\"createImports\")(this)", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("function fdWrite", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("wasi_snapshot_preview1: {", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("emscripten_sleep: () => 0", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-wasm-imports.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_WASM_IMPORTS_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("proc_exit should throw an explicit error", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesNativeAudioAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-native-audio.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-native-audio-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomNativeAudio", adapter, StringComparison.Ordinal);
        Assert.Contains("function isAvailable", adapter, StringComparison.Ordinal);
        Assert.Contains("function drain", adapter, StringComparison.Ordinal);
        Assert.Contains("doom_audio_buffer", adapter, StringComparison.Ordinal);
        Assert.Contains("doom_audio_consume_frames", adapter, StringComparison.Ordinal);
        Assert.Contains("Float32Array", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomNativeAudio", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomNativeAudio(\"isAvailable\")(this.exports)", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomNativeAudio(\"drain\")(this)", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("new Int16Array(this.exports.memory.buffer", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("this.exports.doom_audio_consume_frames(frames)", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("bridge.playPcm({", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-native-audio.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_NATIVE_AUDIO_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("muted native audio should still drain without playback", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_SeparatesAuditoryRuntimeAdapter()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-auditory-runtime.js"));
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var vmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-auditory-runtime-vm.test.mjs"));

        Assert.Contains("self.AIKernelDoomAuditoryRuntime", adapter, StringComparison.Ordinal);
        Assert.Contains("function createNeutralSnapshot", adapter, StringComparison.Ordinal);
        Assert.Contains("function readBridgeSnapshot", adapter, StringComparison.Ordinal);
        Assert.Contains("function snapshotAgeMs", adapter, StringComparison.Ordinal);
        Assert.Contains("function snapshotEnergy", adapter, StringComparison.Ordinal);
        Assert.Contains("function createRuntimeSnapshot", adapter, StringComparison.Ordinal);
        Assert.Contains("function attachRuntimeSource", adapter, StringComparison.Ordinal);
        Assert.Contains("function requireDoomAuditoryRuntime", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomAuditoryRuntime(\"createRuntimeSnapshot\")(this", runtime, StringComparison.Ordinal);
        Assert.Contains("return requireDoomAuditoryRuntime(\"attachRuntimeSource\")(audio", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("const bridgeSnapshot = this.readBridgeAuditorySnapshot()", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("Date.parse(snapshot.timestamp || \"\")", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("uploadGpuAudioSnapshot(\"doom.audio\", audio)", runtime, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-auditory-runtime.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("DOOM_AUDITORY_RUNTIME_VM_TEST_OK", vmTest, StringComparison.Ordinal);
        Assert.Contains("fresh higher-energy bridge snapshot should be preferred", vmTest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomNativeAutoplay_IsExperimentalAndExcludedFromProductionAbi()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var source = File.ReadAllText(Path.Combine(
            root, "src", "DoomWasm.Native", "src", "aik_autoplay.c"));
        var header = File.ReadAllText(Path.Combine(root, "src", "DoomWasm.Native", "include", "aik_doom_abi.h"));
        var makefile = File.ReadAllText(Path.Combine(root, "src", "DoomWasm.Native", "Makefile"));
        var buildPs1 = File.ReadAllText(Path.Combine(root, "src", "DoomWasm.Native", "build.ps1"));
        var buildSh = File.ReadAllText(Path.Combine(root, "src", "DoomWasm.Native", "build.sh"));

        Assert.Contains("Experimental only", source, StringComparison.Ordinal);
        Assert.Contains("native doom.wasm", source, StringComparison.Ordinal);
        Assert.DoesNotContain("aik_autoplay_init", header, StringComparison.Ordinal);
        Assert.DoesNotContain("aik_autoplay_predict", header, StringComparison.Ordinal);
        Assert.DoesNotContain("aik_autoplay_status", header, StringComparison.Ordinal);
        Assert.DoesNotContain("_aik_autoplay_init", makefile, StringComparison.Ordinal);
        Assert.DoesNotContain("src/aik_autoplay.c", makefile, StringComparison.Ordinal);
        Assert.DoesNotContain("_aik_autoplay_init", buildPs1, StringComparison.Ordinal);
        Assert.DoesNotContain("src\\aik_autoplay.c", buildPs1, StringComparison.Ordinal);
        Assert.DoesNotContain("_aik_autoplay_init", buildSh, StringComparison.Ordinal);
        Assert.DoesNotContain("src/aik_autoplay.c", buildSh, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomControlRuntimePackets_DefineProductNeutralExtractionBoundary()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var adapter = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlRuntimeAdapter.cs"));
        var statePacket = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlStateTensorPacket.cs"));
        var actionPacket = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlActionPacket.cs"));
        var tracePacket = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlDecisionTracePacket.cs"));
        var issue = File.ReadAllText(Path.Combine(root, "docs", "issues", "control-wasm-runtime-library-extraction.md"));

        Assert.Contains("IControlRuntimeAdapter", adapter, StringComparison.Ordinal);
        Assert.Contains("ControlStateTensorPacket", statePacket, StringComparison.Ordinal);
        Assert.Contains("ControlActionPacket", actionPacket, StringComparison.Ordinal);
        Assert.Contains("ControlDecisionTracePacket", tracePacket, StringComparison.Ordinal);
        Assert.Contains("SemanticScore(string symbol)", statePacket, StringComparison.Ordinal);
        Assert.Contains("ControlRuntimeAdapter", issue, StringComparison.Ordinal);
        Assert.Contains("ControlStateTensorPacket", issue, StringComparison.Ordinal);
        Assert.Contains("ControlActionPacket", issue, StringComparison.Ordinal);
        Assert.Contains("ControlDecisionTracePacket", issue, StringComparison.Ordinal);
        Assert.Contains("Energeia", issue, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_LeavesCtgGateOutsideBonsaiAndDocumentsLibraryExtraction()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var issue = File.ReadAllText(Path.Combine(root, "docs", "issues", "control-wasm-runtime-library-extraction.md"));

        Assert.DoesNotContain("function buildProposalPacket", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("function evaluateCtgGate", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("function createCouncilDecisionTrace", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const CTG_VOTE", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("CTG_DENY_REASON.UNKNOWN_FAIL_CLOSED", bonsai, StringComparison.Ordinal);
        Assert.Contains("function buildToposDecisionCarrier", bonsai, StringComparison.Ordinal);
        Assert.Contains("applyCtgToposFeedback(action", bonsai, StringComparison.Ordinal);
        Assert.Contains("function createCtgCarrier", bonsai, StringComparison.Ordinal);
        Assert.Contains("requireCtgCognition(\"createCarrier\")", bonsai, StringComparison.Ordinal);
        Assert.Contains("requireKinesisCognition(\"mapToposDecision\")", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const weights = overrides.weights || normalizeToposWeights", bonsai, StringComparison.Ordinal);

        Assert.Contains("AIKernel.Control", issue, StringComparison.Ordinal);
        Assert.Contains("AIKernel.Wasm", issue, StringComparison.Ordinal);
        Assert.Contains("Do not add dynamic control logic to the external native `doom.wasm` engine assembly.", issue, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomAutoplayCognition_ModularizesToposCtgAndKinesisCarriers()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var semantics = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "semantics.js"));
        var routing = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "routing.js"));
        var topos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "topos.js"));
        var ctg = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "ctg.js"));
        var sensory = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "sensory.js"));
        var visionPalette = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "vision-palette.js"));
        var phainesis = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "phainesis.js"));
        var nous = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "nous.js"));
        var phantasia = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "phantasia.js"));
        var kairos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kairos.js"));
        var kinesis = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kinesis.js"));
        var zoe = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "zoe.js"));

        Assert.Contains("window.AIKernelDoomSemantics", semantics.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("createE1M1SemanticMemory", semantics, StringComparison.Ordinal);
        Assert.Contains("semanticSymbols", semantics, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomRouting", routing.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("activeDetectionsForPipeline", routing, StringComparison.Ordinal);
        Assert.Contains("inferControlPipeline", routing, StringComparison.Ordinal);
        Assert.Contains("inferFirstDoorObjective", routing, StringComparison.Ordinal);
        Assert.Contains("inferObjective", routing, StringComparison.Ordinal);
        Assert.Contains("rankFirstDoorObjective", routing, StringComparison.Ordinal);
        Assert.Contains("stabilizeFirstDoorObjective", routing, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomTopos", topos.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("composeDecisionCarrier", topos, StringComparison.Ordinal);
        Assert.Contains("createDecisionCarrier", topos, StringComparison.Ordinal);
        Assert.Contains("resolveEthosScore", topos, StringComparison.Ordinal);
        Assert.Contains("resolveEthosVector", topos, StringComparison.Ordinal);
        Assert.Contains("resolveKairos", topos, StringComparison.Ordinal);
        Assert.Contains("resolveLogosVector", topos, StringComparison.Ordinal);
        Assert.Contains("resolvePathosVector", topos, StringComparison.Ordinal);
        Assert.Contains("normalizeVector", topos, StringComparison.Ordinal);
        Assert.Contains("normalizeWeights", topos, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomCtg", ctg.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("composeObservedSignals", ctg, StringComparison.Ordinal);
        Assert.Contains("createObservedScores", ctg, StringComparison.Ordinal);
        Assert.Contains("createCarrier", ctg, StringComparison.Ordinal);
        Assert.Contains("gateDecision: overrides.gateDecision || null", ctg, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomSensory", sensory.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("buildAuditorySnapshot", sensory, StringComparison.Ordinal);
        Assert.Contains("createAuditorySnapshot", sensory, StringComparison.Ordinal);
        Assert.Contains("createHealthSensorSnapshot", sensory, StringComparison.Ordinal);
        Assert.Contains("createDisabledHealthState", sensory, StringComparison.Ordinal);
        Assert.Contains("createVisionSensorSnapshot", sensory, StringComparison.Ordinal);
        Assert.Contains("createSpatialSnapshot", sensory, StringComparison.Ordinal);
        Assert.Contains("countActiveColumns", sensory, StringComparison.Ordinal);
        Assert.Contains("estimateFaceDeathScore", sensory, StringComparison.Ordinal);
        Assert.Contains("refineHealthState", sensory, StringComparison.Ordinal);
        Assert.Contains("normalizeVision9x9", sensory, StringComparison.Ordinal);
        Assert.Contains("normalizeAuditoryEventType", sensory, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", sensory, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomVisionPalette", visionPalette.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("scoreEnemyPaletteIndex", visionPalette, StringComparison.Ordinal);
        Assert.Contains("scoreProjectilePaletteIndex", visionPalette, StringComparison.Ordinal);
        Assert.Contains("scoreResourcePaletteIndex", visionPalette, StringComparison.Ordinal);
        Assert.Contains("scoreDarkPaletteIndex", visionPalette, StringComparison.Ordinal);
        Assert.Contains("scoreFirstDoorRedAccentPaletteIndex", visionPalette, StringComparison.Ordinal);
        Assert.Contains("scoreComputerRoomPanelPaletteIndex", visionPalette, StringComparison.Ordinal);
        Assert.Contains("scoreEnemyRgb", visionPalette, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", visionPalette, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomPhainesis", phainesis.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("function createPhainomenon(overrides = {})", phainesis, StringComparison.Ordinal);
        Assert.Contains("function evaluatePhainomenon(input = {})", phainesis, StringComparison.Ordinal);
        Assert.Contains("function activePhainesisEvents(input = {})", phainesis, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", phainesis, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomNous", nous.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("createNousCarrier", nous, StringComparison.Ordinal);
        Assert.Contains("createNousDetectorResult", nous, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomPhainesis?.createPhainomenon", nous, StringComparison.Ordinal);
        Assert.Contains("normalizeNousSensorMap", nous, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", nous, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomPhantasia", phantasia.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("createChronosWindow", phantasia, StringComparison.Ordinal);
        Assert.Contains("createPhantasiaSnapshot", phantasia, StringComparison.Ordinal);
        Assert.Contains("normalizeRelativeDirection", phantasia, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", phantasia, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomKairos", kairos.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("function composeFirstDoorPriorityContext(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("function resolveMonitoringState(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("function resolveKairos(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("function resolvePriorityAxes(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("function normalizePriorityAxes(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("firstDoorAlignmentWindow:", kairos, StringComparison.Ordinal);
        Assert.Contains("contactUseReady:", kairos, StringComparison.Ordinal);
        Assert.Contains("firstDoorRouteEvidence", kairos, StringComparison.Ordinal);
        Assert.Contains("routeAdvanceProtected", kairos, StringComparison.Ordinal);
        Assert.Contains("pathosPriority", kairos, StringComparison.Ordinal);
        Assert.Contains("shouldAdvanceFirstDoor", kairos, StringComparison.Ordinal);
        Assert.Contains("state = \"CombatWatch\"", kairos, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", kairos, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomKinesis", kinesis.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("actionSignature", kinesis, StringComparison.Ordinal);
        Assert.Contains("actionTurnToX", kinesis, StringComparison.Ordinal);
        Assert.Contains("analyzeRegion9Motion", kinesis, StringComparison.Ordinal);
        Assert.Contains("commandPriority", kinesis, StringComparison.Ordinal);
        Assert.Contains("createCompassSensorSnapshot", kinesis, StringComparison.Ordinal);
        Assert.Contains("createMovementSensorSnapshot", kinesis, StringComparison.Ordinal);
        Assert.Contains("createMotorSensorSnapshot", kinesis, StringComparison.Ordinal);
        Assert.Contains("createSpatialSensorSnapshot", kinesis, StringComparison.Ordinal);
        Assert.Contains("describeActionVector", kinesis, StringComparison.Ordinal);
        Assert.Contains("mapToposDecision", kinesis, StringComparison.Ordinal);
        Assert.Contains("neutralAction", kinesis, StringComparison.Ordinal);
        Assert.Contains("normalizeAction", kinesis, StringComparison.Ordinal);
        Assert.Contains("resolveMotionIntent", kinesis, StringComparison.Ordinal);
        Assert.Contains("ternaryScore", kinesis, StringComparison.Ordinal);
        Assert.Contains("ternarySigned", kinesis, StringComparison.Ordinal);
        Assert.Contains("const kairos = input.kairos || {}", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("healthRetryRequested", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("healthLikelyDead", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("weights.pathos", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("const observed = input.observed", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("composeFirstDoorContext", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("firstDoorRouteEvidence", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", kinesis, StringComparison.Ordinal);

        Assert.Contains("window.AIKernelDoomZoe", zoe.Replace("self.", "window."), StringComparison.Ordinal);
        Assert.Contains("function auditAction(input = {})", zoe, StringComparison.Ordinal);
        Assert.Contains("function normalizeHealthSignal(health = {})", zoe, StringComparison.Ordinal);
        Assert.DoesNotContain("controller.", zoe, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesPhainesisEventProjectionToCognitionModule()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var phainesis = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "phainesis.js"));

        Assert.Contains("function createPhainomenon(overrides = {})", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePhainesisCognition(\"createPhainomenon\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePhainesisCognition(\"evaluatePhainomenon\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("controller.phainomenon = evaluateNousDetectorResult", bonsai, StringComparison.Ordinal);
        Assert.Contains("controller.nousDetectorResult = controller.phainomenon", bonsai, StringComparison.Ordinal);
        Assert.Contains("phainomenon: this.phainomenon", bonsai, StringComparison.Ordinal);
        Assert.Contains("return activePhainesisEvents({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePhainesisCognition(\"activePhainesisEvents\")(input);", bonsai, StringComparison.Ordinal);
        Assert.Contains("function requirePhainesisCognition(name)", bonsai, StringComparison.Ordinal);
        Assert.Contains("function evaluatePhainomenon(input = {})", phainesis, StringComparison.Ordinal);
        Assert.Contains("function activePhainesisEvents(input = {})", phainesis, StringComparison.Ordinal);
        Assert.DoesNotContain("function detectLooming", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("function detectStuck", bonsai, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesZoeHealthVetoAfterKinesisGeneration()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var kinesis = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kinesis.js"));
        var zoe = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "zoe.js"));

        Assert.Contains("const feedback = mapKinesisToposDecision({", bonsai, StringComparison.Ordinal);
        Assert.Contains("const audited = auditZoeAction(feedback.action", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireZoeCognition(\"auditAction\")({ action, health });", bonsai, StringComparison.Ordinal);
        Assert.Contains("function requireZoeCognition(name)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("input.healthRetryRequested", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("input.healthLikelyDead", kinesis, StringComparison.Ordinal);
        Assert.Contains("function auditAction(input = {})", zoe, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesKairosPriorityAxesBeforeKinesisGeneration()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var kairos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kairos.js"));
        var kinesis = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kinesis.js"));

        Assert.Contains("const kairos = resolveKairosPriorityAxes({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKairosCognition(\"resolvePriorityAxes\")(input);", bonsai, StringComparison.Ordinal);
        Assert.Contains("function requireKairosCognition(name)", bonsai, StringComparison.Ordinal);
        Assert.Contains("kairos,", bonsai, StringComparison.Ordinal);
        Assert.Contains("function resolvePriorityAxes(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("pathosDominant", kairos, StringComparison.Ordinal);
        Assert.Contains("const kairos = input.kairos || {}", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("const weights = input.weights", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("const observed = input.observed", kinesis, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesSemanticMemoryFactoryToCognitionModule()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var semantics = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "semantics.js"));

        Assert.Contains("return requireSemanticCognition(\"createE1M1SemanticMemory\")();", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSemanticCognition(\"updateE1M1SemanticMemory\")(memory, observation);", bonsai, StringComparison.Ordinal);
        Assert.Contains("function updateE1M1SemanticMemory(memory, observation = {})", semantics, StringComparison.Ordinal);
        Assert.Contains("\"door\"", semantics, StringComparison.Ordinal);
        Assert.Contains("\"corridor\"", semantics, StringComparison.Ordinal);
        Assert.Contains("\"enemy\"", semantics, StringComparison.Ordinal);
        Assert.Contains("\"safe-zone\"", semantics, StringComparison.Ordinal);
        Assert.Contains("\"bridge\"", semantics, StringComparison.Ordinal);
        Assert.Contains("\"computer-room\"", semantics, StringComparison.Ordinal);
        Assert.Contains("symbolIndex: SEMANTIC_SYMBOLS.slice()", semantics, StringComparison.Ordinal);
        Assert.Contains("symbols,", semantics, StringComparison.Ordinal);
        Assert.Contains("updateSymbol(next.symbols.bridge", semantics, StringComparison.Ordinal);
        Assert.DoesNotContain("const corridorConfidence = clamp01(", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const firstDoorConfidence = clamp01(", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("coordinateHint: \"spawn=south; firstDoor=north", bonsai, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesFirstDoorObjectiveStabilizationToRoutingModule()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var routing = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "routing.js"));
        var combatRoute = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "combat-route.js"));
        var pipelineTrace = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "pipeline-trace.js"));
        var routingVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-routing-vm.test.mjs"));
        var combatRouteVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-combat-route-vm.test.mjs"));
        var pipelineTraceVmTest = File.ReadAllText(Path.Combine(root, "tests", "js", "doom-pipeline-trace-vm.test.mjs"));

        Assert.Contains("return requireRoutingCognition(\"rankFirstDoorObjective\")(objective);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireRoutingCognition(\"stabilizeFirstDoorObjective\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireRoutingCognition(\"inferFirstDoorObjective\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireRoutingCognition(\"inferControlPipeline\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireRoutingCognition(\"inferObjective\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireRoutingCognition(\"activeDetectionsForPipeline\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("function activeDetectionsForPipeline(input = {})", routing, StringComparison.Ordinal);
        Assert.Contains("function inferControlPipeline(input = {})", routing, StringComparison.Ordinal);
        Assert.Contains("function inferObjective(input = {})", routing, StringComparison.Ordinal);
        Assert.Contains("function inferFirstDoorObjective(input = {})", routing, StringComparison.Ordinal);
        Assert.Contains("function rankFirstDoorObjective(objective)", routing, StringComparison.Ordinal);
        Assert.Contains("function stabilizeFirstDoorObjective(input = {})", routing, StringComparison.Ordinal);
        Assert.Contains("const useEvidence = activeUseProbe", routing, StringComparison.Ordinal);
        Assert.Contains("const alignmentStarted = number(input.spawnCorridorGapFrames)", routing, StringComparison.Ordinal);
        Assert.Contains("spawnLandmarkRouteEvidence", routing, StringComparison.Ordinal);
        Assert.Contains("spawnLandmarkRouteFrames", bonsai, StringComparison.Ordinal);
        Assert.Contains("pipelineTrace: buildAutoplayPipelineTrace(this)", bonsai, StringComparison.Ordinal);
        Assert.Contains("function buildAutoplayPipelineTrace(controller)", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePipelineTraceCognition(\"buildTrace\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("function requirePipelineTraceCognition(name)", bonsai, StringComparison.Ordinal);
        Assert.Contains("function requireCombatRouteCognition(name)", bonsai, StringComparison.Ordinal);
        Assert.Contains("return self.AIKernelDoomCombatRoute?.inferPostEnemyObjective", routing, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomCombatRoute", combatRoute, StringComparison.Ordinal);
        Assert.Contains("function planCentralHallEnemySweep(input = {})", combatRoute, StringComparison.Ordinal);
        Assert.Contains("function inferPostEnemyObjective(input = {})", combatRoute, StringComparison.Ordinal);
        Assert.Contains("function buildRoute(input = {})", pipelineTrace, StringComparison.Ordinal);
        Assert.Contains("function buildTrace(input = {})", pipelineTrace, StringComparison.Ordinal);
        Assert.Contains("key: \"finalRoom\"", pipelineTrace, StringComparison.Ordinal);
        Assert.Contains("key: \"exitSwitch\"", pipelineTrace, StringComparison.Ordinal);
        Assert.Contains("centralHallEnemySweepAction", bonsai, StringComparison.Ordinal);
        Assert.Contains("central-hall-front-enemy-sweep", bonsai, StringComparison.Ordinal);
        Assert.Contains("central-hall-enemy-probe-fire", combatRoute, StringComparison.Ordinal);
        Assert.Contains("this.safetyReason === \"central-hall-front-enemy-sweep\"", bonsai, StringComparison.Ordinal);
        Assert.Contains("frontConfidence >= 0.18", combatRoute, StringComparison.Ordinal);
        Assert.Contains("DOOM_ROUTING_VM_TEST_OK", routingVmTest, StringComparison.Ordinal);
        Assert.Contains("DOOM_COMBAT_ROUTE_VM_TEST_OK", combatRouteVmTest, StringComparison.Ordinal);
        Assert.Contains("DOOM_PIPELINE_TRACE_VM_TEST_OK", pipelineTraceVmTest, StringComparison.Ordinal);
        Assert.Contains("return \"SensorRecovery\"", routing, StringComparison.Ordinal);
        Assert.Contains("return \"Bridge\"", routing, StringComparison.Ordinal);
        Assert.Contains("\"open-first-door\"", routing, StringComparison.Ordinal);
        Assert.Contains("\"enter-computer-control-room\"", routing, StringComparison.Ordinal);
        Assert.Contains("return \"retry-after-death\"", routing, StringComparison.Ordinal);
        Assert.Contains("return \"cross-bridge\"", routing, StringComparison.Ordinal);
        Assert.Contains("return \"restore-relative-motion\"", routing, StringComparison.Ordinal);
        Assert.Contains("\"combat-context\"", routing, StringComparison.Ordinal);
        Assert.Contains("\"topology-blocked\"", routing, StringComparison.Ordinal);
        Assert.DoesNotContain("const previousRank = firstDoorDemoObjectiveRank(previous);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const useEvidence = activeUseProbe", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const alignmentStarted = Number(controller.spawnCorridorGapFrames", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("return \"SensorRecovery\";", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("return \"Bridge\";", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("return \"retry-after-death\";", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("return \"cross-bridge\";", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("return \"restore-relative-motion\";", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const withSensorEvents = (detections)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("detections.push(\"enemy\")", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("candidate === \"follow-demo-route-to-first-door\"", bonsai, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesToposGovernanceScoringToCognitionModule()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var kairos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kairos.js"));
        var topos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "topos.js"));

        Assert.Contains("return requireKairosCognition(\"resolveMonitoringState\")({", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("return requireToposCognition(\"resolveKairos\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireToposCognition(\"resolveEthosScore\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("function resolveMonitoringState(input = {})", kairos, StringComparison.Ordinal);
        Assert.Contains("state = \"CombatWatch\"", kairos, StringComparison.Ordinal);
        Assert.Contains("function resolveKairos(input = {})", topos, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomKairos?.resolveMonitoringState", topos, StringComparison.Ordinal);
        Assert.DoesNotContain("state = \"CombatWatch\"", topos, StringComparison.Ordinal);
        Assert.Contains("function resolveEthosScore(input = {})", topos, StringComparison.Ordinal);
        Assert.Contains("objective === \"open-first-door\"", topos, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesToposVectorGenerationToCognitionModule()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var topos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "topos.js"));

        Assert.Contains("return requireToposCognition(\"resolveLogosVector\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireToposCognition(\"resolvePathosVector\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireToposCognition(\"resolveEthosVector\")({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireToposCognition(\"composeDecisionCarrier\")({", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const rawX = (weights.logos * logosVector.x)", bonsai, StringComparison.Ordinal);
        Assert.Contains("function resolveLogosVector(input = {})", topos, StringComparison.Ordinal);
        Assert.Contains("function resolvePathosVector(input = {})", topos, StringComparison.Ordinal);
        Assert.Contains("function resolveEthosVector(input = {})", topos, StringComparison.Ordinal);
        Assert.Contains("function composeDecisionCarrier(input = {})", topos, StringComparison.Ordinal);
        Assert.Contains("source: firstDoorClosed ? \"local-door-landmark\" : \"local-route-landmark\"", topos, StringComparison.Ordinal);
        Assert.Contains("source: danger >= stuck ? \"danger-repulsion\" : \"stall-repulsion\"", topos, StringComparison.Ordinal);
        Assert.Contains("source: `telos-${objective}`", topos, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_DelegatesFirstDoorPriorityContextToKairosModule()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var bonsai = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "bonsai.js"));
        var sensory = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "sensory.js"));
        var visionPalette = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "vision-palette.js"));
        var nous = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "nous.js"));
        var phantasia = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "phantasia.js"));
        var kairos = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kairos.js"));
        var kinesis = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "kinesis.js"));

        Assert.Contains("return requireKinesisCognition(\"actionSignature\")(action);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"actionTurnToX\")(turn);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"analyzeRegion9Motion\")(previous, current, action);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"commandPriority\")(reason);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"describeActionVector\")(action);", bonsai, StringComparison.Ordinal);
        Assert.Contains("const firstDoorKairosContext = composeKairosFirstDoorContext({", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKairosCognition(\"composeFirstDoorPriorityContext\")(input);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("composeKinesisFirstDoorContext", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("requireKinesisCognition(\"composeFirstDoorContext\")", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"createCompassSensorSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"createMovementSensorSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"createMotorSensorSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"createSpatialSensorSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"buildAuditorySnapshot\")(state);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"createAuditorySnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"countActiveColumns\")(sample, columns);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"createDisabledHealthState\")(signature);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"createHealthSensorSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"createVisionSensorSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"createSpatialSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"estimateFaceDeathScore\")(quantizedFace);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"refineHealthState\")(healthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"chooseDominantAudioBand\")(lowEnergy, midEnergy, highEnergy);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"normalizeVision9x9\")(values);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensoryCognition(\"normalizeAuditoryEventType\")(value);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreEnemyPaletteIndex\")(index, rgbaBytes);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreProjectilePaletteIndex\")(index, rgbaBytes);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreResourcePaletteIndex\")(index, rgbaBytes);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreDarkPaletteIndex\")(index, rgbaBytes);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreFirstDoorRedAccentPaletteIndex\")(index, rgbaBytes);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreComputerRoomPanelPaletteIndex\")(index, rgbaBytes);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireVisionPalette(\"scoreEnemyRgb\")(red, green, blue);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireNousCognition(\"createNousCarrier\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePhainesisCognition(\"createPhainomenon\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireNousCognition(\"normalizeNousSensorMap\")(sensors);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePhantasiaCognition(\"createChronosWindow\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requirePhantasiaCognition(\"createPhantasiaSnapshot\")(overrides);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"neutralAction\")();", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"normalizeAction\")(action, fallback);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"resolveMotionIntent\")(action);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"ternaryScore\")(value, low, high);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireKinesisCognition(\"ternarySigned\")(value, threshold);", bonsai, StringComparison.Ordinal);
        Assert.Contains("function actionSignature(action)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function actionTurnToX(turn)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function analyzeRegion9Motion(previous, current, action)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function commandPriority(reason)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function composeFirstDoorPriorityContext(input = {})", kairos, StringComparison.Ordinal);
        Assert.DoesNotContain("function composeFirstDoorContext(input = {})", kinesis, StringComparison.Ordinal);
        Assert.Contains("function createCompassSensorSnapshot(overrides = {})", kinesis, StringComparison.Ordinal);
        Assert.Contains("function createMovementSensorSnapshot(overrides = {})", kinesis, StringComparison.Ordinal);
        Assert.Contains("function createMotorSensorSnapshot(overrides = {})", kinesis, StringComparison.Ordinal);
        Assert.Contains("function createSpatialSensorSnapshot(overrides = {})", kinesis, StringComparison.Ordinal);
        Assert.Contains("function buildAuditorySnapshot(state)", sensory, StringComparison.Ordinal);
        Assert.Contains("function createAuditorySnapshot(overrides = {})", sensory, StringComparison.Ordinal);
        Assert.Contains("function countActiveColumns(sample, columns)", sensory, StringComparison.Ordinal);
        Assert.Contains("function createDisabledHealthState(signature)", sensory, StringComparison.Ordinal);
        Assert.Contains("function createHealthSensorSnapshot(overrides = {})", sensory, StringComparison.Ordinal);
        Assert.Contains("function createVisionSensorSnapshot(overrides = {})", sensory, StringComparison.Ordinal);
        Assert.Contains("function createSpatialSnapshot(overrides = {})", sensory, StringComparison.Ordinal);
        Assert.Contains("function estimateFaceDeathScore(quantizedFace)", sensory, StringComparison.Ordinal);
        Assert.Contains("function refineHealthState(healthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta)", sensory, StringComparison.Ordinal);
        Assert.Contains("function chooseDominantAudioBand(lowEnergy, midEnergy, highEnergy)", sensory, StringComparison.Ordinal);
        Assert.Contains("function normalizeVision9x9(values)", sensory, StringComparison.Ordinal);
        Assert.Contains("function normalizeAuditoryEventType(value)", sensory, StringComparison.Ordinal);
        Assert.Contains("function scoreEnemyPaletteIndex(index, rgbaBytes)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function scoreProjectilePaletteIndex(index, rgbaBytes)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function scoreResourcePaletteIndex(index, rgbaBytes)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function scoreDarkPaletteIndex(index, rgbaBytes)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function scoreFirstDoorRedAccentPaletteIndex(index, rgbaBytes)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function scoreComputerRoomPanelPaletteIndex(index, rgbaBytes)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function scoreEnemyRgb(red, green, blue)", visionPalette, StringComparison.Ordinal);
        Assert.Contains("function createNousCarrier(overrides = {})", nous, StringComparison.Ordinal);
        Assert.Contains("function createNousDetectorResult(overrides = {})", nous, StringComparison.Ordinal);
        Assert.Contains("function normalizeNousSensorMap(sensors)", nous, StringComparison.Ordinal);
        Assert.Contains("function createChronosWindow(overrides = {})", phantasia, StringComparison.Ordinal);
        Assert.Contains("function createPhantasiaSnapshot(overrides = {})", phantasia, StringComparison.Ordinal);
        Assert.Contains("function describeActionVector(action)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function neutralAction()", kinesis, StringComparison.Ordinal);
        Assert.Contains("function normalizeAction(action = {}, fallback = null)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function resolveMotionIntent(action)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function ternaryScore(value, low = 0.25, high = 0.62)", kinesis, StringComparison.Ordinal);
        Assert.Contains("function ternarySigned(value, threshold = 0.22)", kinesis, StringComparison.Ordinal);
        Assert.Contains("firstDoorAlignmentWindow:", kairos, StringComparison.Ordinal);
        Assert.Contains("contactUseReady:", kairos, StringComparison.Ordinal);
        Assert.Contains("firstDoorRouteEvidence", kairos, StringComparison.Ordinal);
        Assert.Contains("routeAdvanceProtected", kairos, StringComparison.Ordinal);
        Assert.DoesNotContain("firstDoorRouteEvidence", kinesis, StringComparison.Ordinal);
        Assert.DoesNotContain("return turn === \"right\" ? 1 : (turn === \"left\" ? -1 : 0);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("`${safe.turn || \"none\"}:${safe.move || \"none\"}", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const motion = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const forwardProgress = clamp01((center * 0.55", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const parts = [move, turn, strafe].filter(Boolean);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const speed = clamp01(Number(overrides.speed", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("advance: ternarySigned(vectorY)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("move: overrides.move || \"none\"", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("fire: Boolean(overrides.fire),\n      vectorX: round2(vectorX)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const heading = ((Number(overrides.heading ?? 0) % 360) + 360) % 360;", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("landmarkForced: Boolean(overrides.landmarkForced)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("fusedDirection: round2(Number(overrides.fusedDirection ?? 0))", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const warmHue = hueInRange(hsv.hue, 8, 54)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const dark = luma <= DARK_ZONE_LUMA_THRESHOLD && saturation >= 8", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const darkDoorBrown = red >= green - 4", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("for (let index = 0; index < ENEMY_COLOR_CLUSTERS.length", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("historyFrames: Number(overrides.historyFrames || 0)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const text = String(value || \"spatial-event\").toLowerCase();", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("gain: Number(overrides.gain ?? 0)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("dominantFreq: round2(Number(overrides.dominantFreq ?? 0))", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const low = source?.lowEnergy ?? source?.lowBandEnergy", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const quantized = normalizeVision9x9(overrides.quantized);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("gridColumns: VISION_GRID_COLUMNS,\n      gridRows: VISION_GRID_ROWS,\n      quantized,", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const zeroScore = clamp01(Number(overrides.zeroScore ?? 0));", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("retryPipeline: retryRequested ? \"Retry\" : \"none\"", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("retryReason: \"sensor-cutoff\"", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const faceStable = Number(faceQuantizedFrameChange ?? 255) <= 0.08;", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const active = new Set();", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("normalizedSensorMap: overrides.normalizedSensorMap || {}", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("looming: Object.assign({ active: false, direction: null }", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const keys = Object.keys(sensors || {}).sort();", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const frames = Array.isArray(overrides.frames) ? overrides.frames.slice(-CHRONOS_WINDOW_LIMIT) : [];", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("projectileScore: round2(clamp01(Number(overrides.projectileScore ?? 0)))", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("safe.fire ? \"f\" : \"-\"", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("if (number >= threshold)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("if (number <= low)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("reason === \"loop-escape\"", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("move: source.move === \"back\" || source.move === \"backward\"", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const firstDoorAlignmentWindow = firstDoorContext", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const contactUseReady = firstDoorContext", bonsai, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_SeparatesFrameFeatureConstructionFromControlRules()
    {
        var script = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "bonsai.js"));

        Assert.Contains("function buildAutoplayFrameFeatures", script, StringComparison.Ordinal);
        Assert.Contains("const features = buildAutoplayFrameFeatures(this, normalized, state, frame)", script, StringComparison.Ordinal);
        Assert.Contains("quantizedVision9x9", script, StringComparison.Ordinal);
        Assert.Contains("buildSensorFusionPacket", script, StringComparison.Ordinal);
        Assert.Contains("return {", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_SeparatesSensorStateMirrorFromControlRules()
    {
        var script = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "bonsai.js"));

        Assert.Contains("function updateAutoplaySensorState", script, StringComparison.Ordinal);
        Assert.Contains("function updateEnemyAlertState", script, StringComparison.Ordinal);
        Assert.Contains("updateAutoplaySensorState(this, features, state, frame, normalized)", script, StringComparison.Ordinal);
        Assert.Contains("controller.targetConfidence = clamp01", script, StringComparison.Ordinal);
        Assert.Contains("refreshSensorCognition(controller, state, frame", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_SeparatesSemanticRouteStateFromControlRules()
    {
        var script = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "bonsai.js"));
        var applyStart = script.IndexOf("applyControlRules(action, state)", StringComparison.Ordinal);
        var helperStart = script.IndexOf("function buildAutoplayFrameFeatures", StringComparison.Ordinal);
        Assert.True(applyStart >= 0);
        Assert.True(helperStart > applyStart);
        var applyControlRules = script[applyStart..helperStart];

        Assert.Contains("function updateAutoplaySemanticRouteState", script, StringComparison.Ordinal);
        Assert.Contains("const routeState = updateAutoplaySemanticRouteState(this, features, state, frame, enemy, effectiveTargetConfidence, auditorySnapshot)", script, StringComparison.Ordinal);
        Assert.Contains("controller.updateSemanticMemory(frame", script, StringComparison.Ordinal);
        Assert.Contains("controller.mapDoorSectorMatch", script, StringComparison.Ordinal);
        Assert.Contains("combatContextActive", script, StringComparison.Ordinal);
        Assert.DoesNotContain("const darkZoneScoreThreshold", applyControlRules, StringComparison.Ordinal);
        Assert.DoesNotContain("const computerRoomConfirmFrames", applyControlRules, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_RepresentsLowLayerSensorStateAsTensorWithSemanticIcd()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var tensor = File.ReadAllText(Path.Combine(
            root,
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "autoplay",
            "sensor-tensor.js"));
        var bonsai = File.ReadAllText(Path.Combine(
            root,
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "bonsai.js"));

        Assert.Contains("const SENSOR_TENSOR_ROWS = 4", tensor, StringComparison.Ordinal);
        Assert.Contains("const SENSOR_TENSOR_COLS = 8", tensor, StringComparison.Ordinal);
        Assert.Contains("const SENSOR_TENSOR_ICD", tensor, StringComparison.Ordinal);
        Assert.Contains("\"semantic.door\"", tensor, StringComparison.Ordinal);
        Assert.Contains("\"vision.enemy\"", tensor, StringComparison.Ordinal);
        Assert.Contains("new Float32Array(SENSOR_TENSOR_SIZE)", tensor, StringComparison.Ordinal);
        Assert.Contains("self.AIKernelDoomSensorTensor = Object.freeze", tensor, StringComparison.Ordinal);
        Assert.Contains("function averageSampleDelta(previous, current)", tensor, StringComparison.Ordinal);
        Assert.Contains("function quantizeFrameSample(sample, step = DEFAULT_WALL_QUANTIZATION_STEP)", tensor, StringComparison.Ordinal);
        Assert.Contains("function regionSignature(sample, fallback = \"000000\")", tensor, StringComparison.Ordinal);
        Assert.Contains("function normalizeScreenRegions(regions, columns = 3, rows = 2)", tensor, StringComparison.Ordinal);
        Assert.Contains("function normalizeRegion9(regions, columns = 3, rows = 3)", tensor, StringComparison.Ordinal);
        Assert.Contains("function buildSensorTensorPacket", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"buildPacket\")(controller, features)", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"averageSampleDelta\")(previous, current);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"quantizeFrameSample\")(sample, WALL_QUANTIZATION_STEP);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"regionSignature\")(sample, \"000000\");", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"normalizeScreenRegions\")(regions, REGION_COLUMNS, REGION_ROWS);", bonsai, StringComparison.Ordinal);
        Assert.Contains("return requireSensorTensor(\"normalizeRegion9\")(regions, REGION9_COLUMNS, REGION9_ROWS);", bonsai, StringComparison.Ordinal);
        Assert.Contains("sensorTensor: serializeSensorTensorPacket", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("const count = Math.min(previous.length, current.length);", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("Math.round((sample[index] || 0) / WALL_QUANTIZATION_STEP)", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("sample.map(value => Math.max(0, Math.min(15, value || 0)).toString(16)).join(\"\")", bonsai, StringComparison.Ordinal);
        Assert.DoesNotContain("result[index] = clamp01((regions[index] || 0) / 255);", bonsai, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomBonsai_RoutesCtgEvidenceThroughSensorTensorIcd()
    {
        var script = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "bonsai.js"));
        var ctgStart = script.IndexOf("function buildCtgObservedScores", StringComparison.Ordinal);
        var toposStart = script.IndexOf("function buildToposDecisionCarrier", StringComparison.Ordinal);
        Assert.True(ctgStart >= 0);
        Assert.True(toposStart > ctgStart);
        var ctgObservedScores = script[ctgStart..toposStart];

        var tensor = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "autoplay",
            "cognition",
            "ctg.js"));
        var tensorModule = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "autoplay",
            "sensor-tensor.js"));

        Assert.Contains("function readEvidence", tensorModule, StringComparison.Ordinal);
        Assert.Contains("read(\"semantic.door\")", tensorModule, StringComparison.Ordinal);
        Assert.Contains("read(\"semantic.corridor\")", tensorModule, StringComparison.Ordinal);
        Assert.Contains("const tensorEvidence = readSensorTensorEvidence(controller)", ctgObservedScores, StringComparison.Ordinal);
        Assert.Contains("const observedSignals = composeCtgObservedSignals({", ctgObservedScores, StringComparison.Ordinal);
        Assert.Contains("tensorEvidence,", ctgObservedScores, StringComparison.Ordinal);
        Assert.Contains("Math.max(number(tensorEvidence.routeEvidence), directRouteEvidence)", tensor, StringComparison.Ordinal);
        Assert.Contains("Math.max(number(tensorEvidence.corridorConfidence), directCorridorConfidence)", tensor, StringComparison.Ordinal);
    }

    private static string ReadDoomPromptScript()
    {
        var path = Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "js",
            "doom-prompt.js");
        return File.ReadAllText(path);
    }

    private static string ReadDoomGuiSelfTestScript()
    {
        var path = Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "js",
            "doom-gui-selftest.js");
        return File.ReadAllText(path);
    }

    private static string ReadDoomControllerDebugLogScript()
    {
        var path = Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "js",
            "doom-controller-debug-log.js");
        return File.ReadAllText(path);
    }

    private static string ReadDoomDownloadProgressScript()
    {
        var path = Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "js",
            "doom-download-progress.js");
        return File.ReadAllText(path);
    }

    private static string ReadDoomRuntimeStatusFlowScript()
    {
        var path = Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "js",
            "doom-runtime-status-flow.js");
        return File.ReadAllText(path);
    }

    private static string FindRepoRoot(string start)
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
}

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadScript(context, relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const source = readFileSync(filePath, "utf8");
  vm.runInContext(source, context, { filename: filePath });
}

const sandbox = {
  self: {},
  console,
  Number,
  Object
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/pipeline-graph.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/zoe-veto.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/gpu-contracts.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/runtime-packets.js");

const graph = context.self.AIKernelDoomControlPipelineGraph;
const zoeVeto = context.self.AIKernelDoomControlZoeVeto;
const packets = context.self.AIKernelDoomControlRuntimePackets;
assert(graph?.compileCanonicalGraph, "control pipeline graph module should export compileCanonicalGraph");
assert(zoeVeto?.applyZoeVeto, "control Zoe veto module should export applyZoeVeto");
assert(packets?.actionFromStage, "runtime packet module should export actionFromStage");
assert(packets?.idleAction, "runtime packet module should export idleAction");
assert(packets?.statusFromAction, "runtime packet module should export statusFromAction");
assert(packets?.compileCanonicalGraph, "runtime packet module should retain compileCanonicalGraph compatibility export");

const customGraph = graph.compileCanonicalGraph({
  pipeline: {
    krisis: {
      topos: { vectors: ["CustomDecisionVector"] },
      kairos: { priorities: ["logos"] }
    },
    kinesis: {
      motion: { actions: ["turnYaw"] }
    }
  }
});
assert(customGraph.nodes.map(node => node.id).join(">") === "aisthesis>phainesis>nous>topos>kairos>kinesis>zoe", "pipeline graph should keep canonical order");
assert(customGraph.nodes.find(node => node.id === "kairos").inputs[0] === "CustomDecisionVector", "Kairos should consume the configured Topos vector");
assert(packets.compileCanonicalGraph({}).version === "dynamic-pipeline-4layer/v1", "runtime packets should delegate graph compatibility export");
const vetoed = packets.applyZoeVeto({ move: "forward", fire: true }, { health: 4 }, { pipeline: { kinesis: { zoe: { vetoRules: [{ when: "hp < 10" }] } } } }, {
  evaluateWhen: (context, expression) => expression === "hp < 10" && context.values.hp < 10,
  buildContext: (profile, state) => ({ profile, state, values: state })
});
assert(vetoed.zoeVetoed === true, "runtime packets should delegate Zoe veto compatibility export");
assert(vetoed.move === "none" && vetoed.fire === false, "delegated Zoe veto should neutralize unsafe action");

function evaluateDefaultZoeRule(context, expression) {
  if (expression === "hp <= 0") {
    return context.values.hp <= 0;
  }

  if (expression === "criticalHealth && lethalRisk > 0.65") {
    return Boolean(context.values.criticalHealth) && context.values.lethalRisk > 0.65;
  }

  if (expression === "lethalRisk > 0.90") {
    return context.values.lethalRisk > 0.90;
  }

  return false;
}

const zoeHelpers = {
  evaluateWhen: evaluateDefaultZoeRule,
  buildContext: (profile, state) => ({ profile, state, values: state })
};
const lowHealthGoalAction = packets.applyZoeVeto({ move: "forward", fire: false }, { health: 42 }, {
  parameters: { lowHealthThreshold: 50, criticalHealthThreshold: 18 }
}, zoeHelpers);
assert(lowHealthGoalAction.zoeVetoed === false, "Default Zoe guard should not stop goal-first low-health routing");
assert(lowHealthGoalAction.move === "forward", "Default Zoe guard should preserve low-health route movement");
const criticalHealthVeto = packets.applyZoeVeto({ move: "forward", fire: true }, { health: 12 }, {
  parameters: { lowHealthThreshold: 50, criticalHealthThreshold: 18 }
}, zoeHelpers);
assert(criticalHealthVeto.zoeVetoed === true, "Default Zoe guard should stop critical-health unsafe actions");
assert(criticalHealthVeto.move === "none" && criticalHealthVeto.fire === false, "Critical-health Zoe veto should neutralize movement and fire");

const action = packets.actionFromStage(
  {
    profile: { strategyName: "PacketProfile" },
    state: { semanticMemory: {} },
    values: { run: true, yaw: -3 }
  },
  {
    id: "door-route",
    objective: "open-door",
    priority: 7,
    action: {
      moveForward: "true",
      turnYaw: "yaw",
      useKey: "true",
      runKey: "run"
    }
  },
  {
    evaluateWhen: (state, expression) => expression === "true" || state.values[expression] === true,
    valueOf: (state, token) => state.values[token] ?? token,
    evidenceScore: () => 0.66,
    semanticScores: () => ({ door: 0.8 }),
    number: value => Number(value) || 0
  }
);

assert(action.move === "forward", "stage action should map moveForward to forward");
assert(action.turn === "left", "negative yaw should map to left turn");
assert(action.turnYaw === -3, "stage action should preserve the numeric turn yaw");
assert(action.use === true, "stage action should preserve use command");
assert(action.evidenceScore === 0.66, "stage action should include evidence score");
assert(action.semanticScores.door === 0.8, "stage action should include semantic scores");

const status = packets.statusFromAction(action, [{ id: "door-route" }], {
  profile: { strategyName: "PacketProfile" },
  values: {
    currentRoute: "first-door-route",
    routeMode: "door-approach",
    routeLoopKind: "slide-stall",
    routeAbortHint: "slide-stall",
    routeLoopBudgetSource: "csharp-route-loop-budget",
    routeLoopBudgetExceeded: true,
    routeSlideUsed: 8,
    routeSlideBudget: 6,
    currentLandmark: "spawn-corridor-gap",
    routeConfidence: 0.74,
    recommendedYaw: 9,
    useProbeConfidence: 0.68,
    firstDoorRouteEvidence: 0.42,
    firstDoorRouteEvidenceReady: true,
    routeBarrelLaneRisk: true,
    routeDeadEndRisk: true,
    routeDeadEndTrimRequired: true,
    routeTopologyWallDistanceNormalized: 0.22,
    routeTopologyBarrelZoneEvidence: 0.96,
    routeTopologyCenterCorridorAlignment: -0.36,
    postDoorTerminalSurface: 0.58,
    computerRoomConfidence: 0.48,
    computerRoomScore: 0.19,
    computerPanelScore: 0.24,
    computerDarkPanelScore: 0.58,
    bridgeConfidence: 0.55,
    doorOpenedCount: 1,
    centralHallEntered: false,
    visualEnemyVisible: false,
    footObstacleScore: 0.58,
    motionObstacleScore: 0.28,
    spawnCorridorGapScore: 0.22,
    spawnLandmarkRouteEvidence: 0.41,
    firstDoorVision9x9Heatmap: Array.from({ length: 81 }, (_, index) => index === 40 ? 0.84 : 0.01),
    firstDoorVision9x9Box: { row: 3, column: 4, rows: 3, columns: 2, score: 0.58, redScore: 0.20, edgeScore: 0.44 },
    actionRepeatFrames: 20,
    moveRepeatFrames: 20,
    turnRepeatFrames: 6,
    usePulseCooldown: 45,
    usePulseSuppressedFrames: 3,
    lastUsePulsePrediction: 1201,
    lethalRisk: 0.8
  }
}, 3, {
  runtimeId: "packet-runtime",
  createDecisionTrace: payload => ({ version: "trace-test", payload })
});

assert(status.runtimeId === "packet-runtime", "status should preserve runtime id");
assert(status.controlPipeline === "door-route", "status should expose selected pipeline");
assert(status.decisionTrace.payload.objective === "open-door", "status should build decision trace from action");
assert(status.stageEvaluations.length === 1, "status should preserve stage evaluations");
assert(status.pipelineState?.krisis?.kairos?.selectedAxis, "status should expose PipelineState DTO");
assert(status.pipelineState?.noesis?.phainesisEvents?.goalDirection > 0, "PipelineState should expose non-empty Phainesis events");
assert(status.pipelineState?.noesis?.eventLabels?.includes("door-route"), "PipelineState should expose Phainesis event labels");
assert(Array.isArray(status.pipelineState?.noesis?.meaningVector4) && status.pipelineState.noesis.meaningVector4.length === 4, "PipelineState should expose compact Noesis Vector4");
assert(status.pipelineState?.noesis?.topology?.barrelZoneEvidence > 0.5, "PipelineState should expose Noesis topology barrel-zone evidence");
assert(status.pipelineState?.noesis?.topology?.wallDistanceNormalized < 0.6, "PipelineState should expose Noesis topology wall distance");
assert(status.pipelineState?.noesis?.topology?.centerlineDirectionX < 0, "PipelineState should expose centerline direction away from barrel-lane pressure");
assert(status.pipelineState?.noesis?.topology?.centerCorridorAlignment < 0, "PipelineState should expose negative center/corridor alignment for barrel-lane traps");
assert(status.pipelineState?.noesis?.topology?.deadEndRisk === true, "PipelineState should preserve topology dead-end risk");
assert(status.pipelineState?.noesis?.nousVectors?.goalVector > 0, "PipelineState should expose non-empty Nous vectors");
assert(status.pipelineState?.krisis?.toposVectors?.LogosVector > 0, "PipelineState should expose non-empty Topos vectors");
assert(status.pipelineState?.krisis?.toposLabels?.includes("route-abort"), "PipelineState should expose Topos labels");
assert(status.pipelineState?.kinesis?.turnYaw === -3, "PipelineState should expose numeric Kinesis yaw");
assert(status.pipelineState?.kinesis?.actionRepeatFrames === 20, "PipelineState should expose Kinesis action repeat frames");
assert(status.pipelineState?.kinesis?.moveRepeatFrames === 20, "PipelineState should expose Kinesis movement repeat frames");
assert(status.pipelineState?.kinesis?.turnRepeatFrames === 6, "PipelineState should expose Kinesis turn repeat frames");
assert(status.pipelineState?.kinesis?.usePulseCooldownFrames === 45, "PipelineState should expose Use pulse cooldown frames");
assert(status.pipelineState?.kinesis?.usePulseSuppressedFrames === 3, "PipelineState should expose Use pulse suppression frames");
assert(status.pipelineState?.kinesis?.lastUsePulsePrediction === 1201, "PipelineState should expose the last bounded Use pulse prediction");
assert(status.pipelineState?.aisthesis?.routePlan?.routeMode === "door-approach", "PipelineState route plan should expose route mode");
assert(status.pipelineState?.aisthesis?.routePlan?.routeLoopKind === "slide-stall", "PipelineState route plan should expose route loop kind");
assert(status.pipelineState?.aisthesis?.routePlan?.routeLoopBudgetSource === "csharp-route-loop-budget", "PipelineState route plan should expose whether C# or JS produced route loop budget");
assert(status.pipelineState?.aisthesis?.routePlan?.routeLoopBudgetExceeded === true, "PipelineState route plan should expose loop budget exhaustion");
assert(status.pipelineState?.aisthesis?.routePlan?.routeBarrelLaneRisk === true, "PipelineState route plan should expose barrel-lane risk");
assert(status.pipelineState?.aisthesis?.routePlan?.routeDeadEndRisk === true, "PipelineState route plan should expose topology dead-end risk");
assert(status.pipelineState?.aisthesis?.routePlan?.routeDeadEndTrimRequired === true, "PipelineState route plan should expose topology dead-end trim evidence");
assert(status.goalState?.telos === "FirstDoor", "status should expose GoalState DTO");
assert(status.debugOverlay?.regions?.length > 0, "status should expose DebugOverlay DTO regions");
assert(Array.isArray(status.debugOverlay?.vision9x9) && status.debugOverlay.vision9x9.length === 81, "DebugOverlay should expose DTO 9x9 vision heat grid");
assert(status.debugOverlay?.vision9x9?.[40] === 0.84, "DebugOverlay should preserve the 9x9 door heat peak");
assert(status.debugOverlay?.doorCandidates?.length === 1, "DebugOverlay should expose DTO door candidate boxes");
assert(status.debugOverlay?.doorCandidates?.[0]?.redScore === 0.20, "DebugOverlay should preserve red-panel candidate evidence");
assert(status.debugOverlay?.gpuHud?.contractVersion === 1, "GPU HUD fallback should expose a contract version for future canon adapters");
assert(status.debugOverlay?.gpuHud?.analysisCaptureSource === "raw-framebuffer", "GPU HUD fallback should keep analysis capture on the raw framebuffer");
assert(status.debugOverlay?.gpuHud?.rawFrameTarget?.kind === "RawFramebuffer", "GPU HUD fallback should expose structured raw frame target");
assert(status.debugOverlay?.gpuHud?.rawFrameTarget?.hudExcluded === true, "GPU HUD raw frame target should exclude HUD overlays");
assert(status.debugOverlay?.gpuHud?.displayFrameTarget?.kind === "HudCompositeOffscreen", "GPU HUD fallback should expose structured HUD display target");
assert(status.debugOverlay?.gpuHud?.readback?.wireName === "none", "GPU HUD fallback should expose structured no-readback policy");
assert(status.debugOverlay?.gpuHud?.frameToken?.phase === "hud-fallback", "GPU HUD fallback should expose a pending frame token");
assert(Array.isArray(status.debugOverlay?.gpuHud?.panelValues) && status.debugOverlay.gpuHud.panelValues.length === 16, "DebugOverlay should expose GPU HUD panel values for thin JS forwarding");
assert(Array.isArray(status.debugOverlay?.gpuHud?.cells) && status.debugOverlay.gpuHud.cells.length === 81, "DebugOverlay should expose canonical GPU HUD 9x9 cells for thin JS forwarding");
assert(status.debugOverlay?.gpuHud?.cells?.[40] === 0.84, "GPU HUD cells should preserve the canonical 9x9 heat peak");
assert(status.debugOverlay?.gpuHud?.rectangles?.some(rect => rect.kind === "door"), "DebugOverlay should expose GPU HUD door rectangles");
assert(status.debugOverlay?.gpuHud?.rectangles?.some(rect => rect.kind === "door" && Array.isArray(rect.color) && rect.color[0] === 1 && rect.color[1] > 0.7), "GPU HUD fallback rectangles should carry shader-ready door colors");
assert(Array.isArray(status.debugOverlay?.gpuHud?.rectangleValues) && status.debugOverlay.gpuHud.rectangleValues.length >= 8, "GPU HUD fallback should expose flattened rectangle values for direct WebGPU upload");
assert(status.debugOverlay?.gpuHud?.rectangleStride === 8, "GPU HUD fallback should expose the rectangle buffer stride");
assert(status.debugOverlay?.gpuHud?.rectangleLayout === "rect8:left,top,right,bottom,r,g,b,alpha", "GPU HUD fallback should expose the rectangle flat-buffer layout");
assert(status.debugOverlay?.gpuHud?.rectangleBufferLayout?.name === "rect8", "GPU HUD fallback should expose structured rectangle buffer layout");
assert(status.debugOverlay?.gpuHud?.rectangleBufferLayout?.stride === 8, "GPU HUD fallback rectangle buffer layout should expose stride");
assert(status.debugOverlay?.gpuHud?.rectangleBufferLayout?.fields?.includes("alpha"), "GPU HUD fallback rectangle buffer layout should expose alpha field");
assert(status.debugOverlay?.gpuHud?.panelBufferLayout?.name === "panel16", "GPU HUD fallback should expose structured panel buffer layout");
assert(status.debugOverlay?.gpuHud?.labels?.some(label => label.label === "DOOR"), "DebugOverlay should expose GPU HUD text labels so JS does not re-infer diagnostics");
assert(status.debugOverlay?.gpuHud?.cssOverlayMode === "reduced", "DebugOverlay should request reduced CSS overlay when GPU HUD projection is available");
assert(status.debugOverlay?.gpuAisthesis?.inputTarget === "doom", "DebugOverlay should expose the raw framebuffer target for GPU Aisthesis");
assert(status.debugOverlay?.gpuAisthesis?.contractVersion === 1, "GPU Aisthesis fallback should expose a contract version for future canon adapters");
assert(status.debugOverlay?.gpuAisthesis?.captureSource === "raw-framebuffer", "GPU Aisthesis fallback should exclude HUD overlays from analysis capture");
assert(status.debugOverlay?.gpuAisthesis?.inputFrameTarget?.kind === "RawFramebuffer", "GPU Aisthesis fallback should expose structured input frame target");
assert(status.debugOverlay?.gpuAisthesis?.captureFrameTarget?.hudExcluded === true, "GPU Aisthesis capture target should exclude HUD overlays");
assert(status.debugOverlay?.gpuAisthesis?.readbackPolicy === "debug-only", "GPU Aisthesis fallback should mark feature readback as debug-only");
assert(status.debugOverlay?.gpuAisthesis?.readback?.wireName === "debug-only", "GPU Aisthesis fallback should expose structured debug readback policy");
assert(status.debugOverlay?.gpuAisthesis?.frameToken?.phase === "gpu-aisthesis-js-adapter", "GPU Aisthesis adapter should expose the GPU Aisthesis frame token phase");
assert(status.debugOverlay?.gpuAisthesis?.features?.includes("vision-heatmap"), "DebugOverlay should expose GPU Aisthesis feature contracts");
assert(status.debugOverlay?.gpuAisthesis?.features?.includes("mask9x9-texture"), "GPU Aisthesis fallback should expose the GPU mask texture feature contract");
assert(status.debugOverlay?.gpuAisthesis?.maskTextureEnabled === true, "GPU Aisthesis fallback should request the 9x9 mask texture");
assert(status.debugOverlay?.gpuAisthesis?.maskTexture?.target === "doom.gpu.aisthesis.mask9x9", "GPU Aisthesis fallback should expose the mask texture target");
assert(status.debugOverlay?.gpuAisthesis?.maskTextureLayout === "mask9x9:heat,red,edge,corner", "GPU Aisthesis fallback should expose the mask texture channel layout");
assert(status.debugOverlay?.gpuAisthesis?.matrixBufferLayout?.name === "matrix", "GPU Aisthesis fallback should expose structured matrix buffer layout");
assert(status.debugOverlay?.gpuAisthesis?.matrixBufferLayout?.maxFloats === 512, "GPU Aisthesis fallback matrix layout should expose max float count");
assert(status.debugOverlay?.gpuAisthesis?.stateVectorBufferLayout?.name === "state16", "GPU Aisthesis fallback should expose structured state vector layout");
assert(status.debugOverlay?.gpuAisthesis?.matrixKinds?.includes("topos9x9"), "GPU Aisthesis fallback should expose canonical matrix kinds");
assert(status.debugOverlay?.gpuAisthesis?.matrixKindSummary?.includes("topos9x9"), "GPU Aisthesis fallback should expose a matrix kind summary for thin HUD rendering");
assert(status.debugOverlay?.gpuAisthesis?.bufferLayoutSummary?.includes("matrix v1"), "GPU Aisthesis fallback should expose a canonical buffer layout summary");
assert(status.debugOverlay?.gpuAisthesis?.matrices?.some(matrix => matrix.kind === "topos9x9" && matrix.values.length === 81), "GPU Aisthesis should expose Topos as a 9x9 matrix");
assert(status.debugOverlay?.gpuAisthesis?.matrices?.some(matrix => matrix.kind === "ctg-state" && matrix.values.length === 16), "GPU Aisthesis should expose CTG state as a compact vector matrix");
assert(status.debugOverlay?.gpuAisthesis?.stateVector?.length === 16, "GPU Aisthesis should expose the compact state vector");
assert(Array.isArray(status.debugOverlay?.gpuAisthesis?.matrixValues) && status.debugOverlay.gpuAisthesis.matrixValues.length === status.debugOverlay.gpuAisthesis.matrixFloatCount, "GPU Aisthesis adapter should expose flattened MatrixValues for direct WebGPU upload");
assert(status.debugOverlay?.gpuAisthesis?.matrixValues?.[0] === 1, "GPU Aisthesis flat matrix payload should start with the Topos kind code");
assert(status.debugOverlay?.gpuSpatialReasoning?.contractVersion === 1, "GPU Spatial Reasoning fallback should expose a contract version for future canon adapters");
assert(status.debugOverlay?.gpuSpatialReasoning?.inputSource === "doom.gpu.aisthesis.features", "GPU Spatial Reasoning fallback should consume GPU Aisthesis features");
assert(status.debugOverlay?.gpuSpatialReasoning?.matrixSource === "doom.gpu.aisthesis.matrix", "GPU Spatial Reasoning fallback should consume GPU Aisthesis matrices");
assert(status.debugOverlay?.gpuSpatialReasoning?.maskTextureSource === "doom.gpu.aisthesis.mask9x9", "GPU Spatial Reasoning fallback should consume the GPU Aisthesis mask texture");
assert(status.debugOverlay?.gpuSpatialReasoning?.maskTexture?.wireName === "gpu-aisthesis-mask9x9", "GPU Spatial Reasoning fallback should expose the structured mask texture descriptor");
assert(status.debugOverlay?.gpuSpatialReasoning?.maskTextureLayout === "mask9x9:heat,red,edge,corner", "GPU Spatial Reasoning fallback should expose the mask texture channel layout");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputTarget === "doom.gpu.spatial.reasoning", "GPU Spatial Reasoning fallback should expose a stable output target");
assert(status.debugOverlay?.gpuSpatialReasoning?.readback?.wireName === "runtime-summary", "GPU Spatial Reasoning fallback should use summary readback only");
assert(status.debugOverlay?.gpuSpatialReasoning?.readback?.allowsFullReadback === false, "GPU Spatial Reasoning fallback should not allow full runtime readback");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputVectorLayout?.name === "spatial32", "GPU Spatial Reasoning fallback should expose structured output vector layout");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputVectorLayout?.fields?.includes("maskHeat"), "GPU Spatial Reasoning output layout should expose the reduced mask heat channel");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputVectorLayout?.fields?.includes("maskRed"), "GPU Spatial Reasoning output layout should expose the reduced mask red channel");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputVectorLayout?.fields?.includes("maskEdge"), "GPU Spatial Reasoning output layout should expose the reduced mask edge channel");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputVectorLayout?.fields?.includes("maskCorner"), "GPU Spatial Reasoning output layout should expose the reduced mask corner channel");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputFloatCount === 32, "GPU Spatial Reasoning fallback should expose output float count");
assert(status.debugOverlay?.gpuSpatialReasoning?.matrixCount === status.debugOverlay.gpuAisthesis.matrices.length, "GPU Spatial Reasoning fallback should preserve matrix count");
assert(status.debugOverlay?.gpuSpatialReasoning?.featureCount === status.debugOverlay.gpuAisthesis.features.length, "GPU Spatial Reasoning fallback should preserve feature count");
assert(status.debugOverlay?.gpuSpatialReasoning?.matrixKindSummary?.includes("topos9x9"), "GPU Spatial Reasoning fallback should inherit matrix kind diagnostics");
assert(status.debugOverlay?.gpuSpatialReasoning?.featureFlagSummary?.includes("route-reduce"), "GPU Spatial Reasoning fallback should expose reducer flag diagnostics");
assert(status.debugOverlay?.gpuSpatialReasoning?.outputLayoutSummary?.includes("spatial32"), "GPU Spatial Reasoning fallback should expose canonical output layout diagnostics");
assert(status.debugOverlay?.gpuSpatialReasoning?.featureFlags?.includes("topos-reduce"), "GPU Spatial Reasoning fallback should expose reducer flags");
assert(status.debugOverlay?.gpuSpatialReasoning?.featureFlags?.includes("mask-texture-reduce"), "GPU Spatial Reasoning fallback should expose the mask texture reducer flag");
assert(status.autoplayState?.goalState?.priority, "status should expose aggregate AutoplayState DTO");
assert(status.autoplayState?.currentRoute === "first-door-route", "aggregate AutoplayState should preserve route planner route name");
assert(status.autoplayState?.routeAbortHint === "slide-stall", "aggregate AutoplayState should preserve route abort hint");
assert(status.autoplayState?.recommendedYaw === 9, "aggregate AutoplayState should preserve recommended yaw");
assert(status.autoplayState?.suggestedAction?.yaw === -3, "aggregate AutoplayState should preserve action yaw over fallback yaw");
assert(status.debugOverlay?.useProbe?.confidence === 0.68, "DebugOverlay should expose UseProbe confidence");
assert(status.pipelineState?.kinesis?.zoe?.vetoed === false, "PipelineState should reserve Zoe veto for actual action suppression");
assert(status.pipelineState?.kinesis?.zoe?.warning === true, "PipelineState should expose high-risk Zoe warning state");
assert(status.debugOverlay?.regions?.some(region => region.kind === "zoe"), "DebugOverlay should expose Zoe warning regions");
assert(status.debugRouteValues?.routeLoopKind === "slide-stall", "debug route values should expose route loop kind");
assert(status.debugRouteValues?.routeLoopBudgetSource === "csharp-route-loop-budget", "debug route values should expose route loop budget source");
assert(status.debugRouteValues?.routeLoopBudgetExceeded === true, "debug route values should expose loop budget exhaustion");
assert(status.debugRouteValues?.postDoorTerminalSurface === 0.58, "debug route values should expose post-door terminal surface");
assert(status.debugRouteValues?.computerDarkPanelScore === 0.58, "debug route values should expose computer dark-panel evidence");

const canonicalPipelineState = {
  aisthesis: {
    routePlan: {
      routeMode: "canonical-post-door",
      routeLoopKind: "canonical-loop"
    }
  },
  noesis: {
    phainesisEvents: { goalDirection: 0.77 },
    eventLabels: ["canonical-event"],
    meaningVector4: [0.77, 0.12, 0.34, 0.56]
  },
  krisis: {
    kairos: {
      logos: 0.12,
      pathos: 0.81,
      ethos: 0.21,
      selectedAxis: "pathos"
    },
    toposLabels: ["canonical-topos"]
  },
  kinesis: {
    turnYaw: 13,
    actionRepeatFrames: 4
  }
};
const canonicalGoalState = {
  telos: "CanonicalTelos",
  objective: "CanonicalObjective",
  priority: "CanonicalPriority"
};
const canonicalDebugOverlay = {
  regions: [{ kind: "canonical", label: "C#", score: 1 }]
};
const canonicalAutoplayState = {
  currentRoute: "canonical-route",
  routeAbortHint: "canonical-abort",
  suggestedAction: { yaw: 13 }
};
const canonicalStatus = packets.statusFromAction(
  Object.assign({}, action, { pipelineState: canonicalPipelineState }),
  [],
  {
    profile: { strategyName: "PacketProfile" },
    goalState: canonicalGoalState,
    debugOverlay: canonicalDebugOverlay,
    autoplayState: canonicalAutoplayState,
    values: {
      routeMode: "fallback-route",
      spawnCorridorGapScore: 0,
      routeConfidence: 0
    }
  },
  5,
  {
    runtimeId: "packet-runtime",
    createDecisionTrace: payload => ({ version: "trace-test", payload })
  });
assert(canonicalStatus.pipelineState?.krisis?.kairos?.selectedAxis === "pathos", "canonical PipelineState should override JS fallback projection");
assert(canonicalStatus.pipelineState?.noesis?.phainesisEvents?.goalDirection === 0.77, "canonical PipelineState should preserve C# Noesis projection");
assert(canonicalStatus.pipelineState?.aisthesis?.routePlan?.routeMode === "canonical-post-door", "canonical PipelineState should preserve C# route mode");
assert(canonicalStatus.kairosPriorityAxis?.selectedAxis === "pathos", "status kairos axis should follow canonical PipelineState");
assert(canonicalStatus.goalState?.telos === "CanonicalTelos", "canonical GoalState should override JS fallback projection");
assert(canonicalStatus.debugOverlay?.regions?.[0]?.kind === "canonical", "canonical DebugOverlay should override JS fallback projection");
assert(canonicalStatus.autoplayState?.currentRoute === "canonical-route", "canonical AutoplayState should override JS fallback projection");
assert(canonicalStatus.autoplayState?.pipelineState?.krisis?.kairos?.selectedAxis === "pathos", "canonical AutoplayState should be completed with PipelineState for UI clients");
assert(canonicalStatus.autoplayState?.goalState?.priority === "CanonicalPriority", "canonical AutoplayState should be completed with GoalState for UI clients");
assert(canonicalStatus.autoplayState?.debugOverlay?.regions?.[0]?.kind === "canonical", "canonical AutoplayState should be completed with DebugOverlay for UI clients");

const combatStatus = packets.statusFromAction(
  Object.assign({}, action, { stage: "combat-visual-center-fire", pipeline: "combat-visual-center-fire", objective: "engage-front-enemy", fire: false }),
  [{ id: "combat-visual-center-fire" }],
  {
    profile: { strategyName: "PacketProfile" },
    values: {
      enemyConfidence: 0.54,
      audioEnemyConfidence: 0.34,
      audioEnemyDirection: "left",
      visualEnemyVisible: true,
      visualEnemyCentered: false,
      visualEnemyYaw: -12,
      enemyCombatYaw: -12,
      spawnCorridorGapScore: 0,
      routeConfidence: 0.18
    }
  },
  4,
  {
    runtimeId: "packet-runtime",
    createDecisionTrace: payload => ({ version: "trace-test", payload })
  });
assert(combatStatus.debugOverlay?.regions?.some(region => region.kind === "combat"), "DebugOverlay should expose combat alert DTO regions");
assert(combatStatus.debugOverlay?.regions?.some(region => region.kind === "enemy-circle"), "DebugOverlay should expose an enemy direction circle DTO region");
assert(combatStatus.debugOverlay?.enemyCircle?.type === "av", "DebugOverlay should expose a structured A/V enemy circle when visual and audio evidence agree");
assert(combatStatus.debugOverlay?.enemyCircle?.yaw === -12, "Structured enemy circle should preserve combat yaw for HUD projection");
assert(combatStatus.debugOverlay?.gpuHud?.rectangles?.some(rect => rect.kind === "enemy-circle"), "GPU HUD projection should carry enemy circles without doom.js re-inference");
assert(combatStatus.debugOverlay?.gpuHud?.rectangles?.some(rect => rect.kind === "enemy-circle" && Array.isArray(rect.color) && rect.color[1] > 0.25 && rect.color[1] < 0.45), "GPU HUD fallback rectangles should carry A/V enemy circle colors");
assert(combatStatus.debugOverlay?.gpuHud?.rectangleValues?.length >= 8, "GPU HUD fallback should flatten enemy circle rectangles");
assert(combatStatus.debugOverlay?.gpuHud?.labels?.some(label => label.className.includes("is-enemy-circle")), "GPU HUD projection should carry enemy labels without doom-debug-overlay re-inference");
assert(combatStatus.debugOverlay?.gpuAisthesis?.enemyDirection === true, "GPU Aisthesis should request enemy direction extraction during combat");
assert(combatStatus.debugOverlay?.gpuAisthesis?.matrices?.some(matrix => matrix.kind === "threat9x9"), "GPU Aisthesis should expose combat threat matrices during combat");
assert(combatStatus.pipelineState?.noesis?.eventLabels?.includes("visual-combat"), "PipelineState should label visual combat evidence");
assert(combatStatus.enemyCombatYaw === -12, "status should expose the combat yaw used by Kinesis");

const weakTerminalLikeVisualStatus = packets.statusFromAction(
  Object.assign({}, action, { stage: "post-door-cruise", pipeline: "post-door-cruise", objective: "enter-computer-control-room", fire: false }),
  [{ id: "post-door-cruise" }],
  {
    profile: { strategyName: "PacketProfile" },
    values: {
      doorOpenedCount: 1,
      enemyConfidence: 0.28,
      visualEnemyConfidence: 0.28,
      audioEnemyConfidence: 0,
      audioEnemyDirection: "front",
      visualEnemyVisible: true,
      visualEnemyFireReady: false,
      enemyCombatYaw: 0
    }
  },
  5,
  {
    runtimeId: "packet-runtime",
    createDecisionTrace: payload => ({ version: "trace-test", payload })
  });
assert(!weakTerminalLikeVisualStatus.debugOverlay?.enemyCircle, "Weak post-door visual noise should not render an enemy circle");
assert(!weakTerminalLikeVisualStatus.debugOverlay?.regions?.some(region => region.kind === "enemy-circle"), "Weak post-door visual noise should not create legacy enemy-circle regions");

const initialized = packets.initializedStatus({
  runtimeId: "packet-runtime",
  strategyName: "PacketProfile",
  predictions: 2,
  createDecisionTrace: payload => ({ version: "trace-test", payload })
});

assert(initialized.stage === "initialized", "initialized status should expose initialized stage");
assert(initialized.decisionTrace.payload.predictions === 2, "initialized status should pass prediction count to trace");

console.log("CONTROL_RUNTIME_PACKETS_VM_TEST_OK", {
  move: action.move,
  turn: action.turn,
  stage: status.stage
});

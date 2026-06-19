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

const sandbox = {
  self: {},
  console,
  Math,
  Number,
  Object,
  String,
  Boolean
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-runtime-format.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-runtime-format.js" });

const formatter = context.self.AIKernelDoomRuntimeFormat;
assert(formatter?.formatRuntimeStatus, "Runtime formatter should expose formatRuntimeStatus");
assert(formatter?.routeDebugText, "Runtime formatter should expose routeDebugText");

const status = {
  state: "running",
  wasmLoaded: true,
  wadLoaded: true,
  modelLoaded: true,
  inputReady: true,
  actionInputReady: true,
  loopActive: true,
  fps: 22.5,
  targetFps: 30,
  frameCount: 1200,
  lastFrameWorkMs: 6,
  uiYieldMs: 16,
  lastGpuWaitMs: 4,
  gpuWaitTimeouts: 1,
  gpuDelegate: "WebGpuComputeProvider(browser-webgpu)",
  framebuffer: "320x200 paletted-8bit",
  hudFlowControl: { mode: "adaptive" },
  autoplay: {
    enabled: true,
    mode: "idle",
    controlPipeline: "spawn-east-window-route-recover",
    objective: "follow-demo-route-to-first-door",
    strategyName: "SeparatedDoorProbeStrafeRunnerV4",
    strategyContext: "unknown",
    strategyPriority: 84,
    vision: "webgpu-texture-binding",
    zeroCopy: true,
    activeDetections: ["objective", "motion", "door"],
    debugRouteValues: {
      context: "open-space",
      routeMode: "spawn-approach",
      depthSig: 1,
      footObstacleScore: 0.65,
      routeFootObstacle: true,
      motionObstacleScore: 0.65,
      routeTextureWallOcclusion: true,
      eastWindowRecoverAnchor: true,
      routeLoopKind: "turn-stall",
      routeLoopBudgetExceeded: true,
      routePivotUsed: 13,
      routePivotBudget: 12,
      spawnCorridorGapScore: 0.18,
      spawnSecretDoorScore: 0.09,
      spawnLandmarkRouteEvidence: 0.45
    },
    actionSignature: "forward:right:-:-:-:r",
    actionRepeatFrames: 24,
    action: { move: "back", turn: "left", use: false, fire: false, run: true },
    milestones: {
      doorOpened: 0,
      courtyardScore: 0.4,
      courtyardTurn: "left",
      spawnSecretDoorScore: 0.09,
      spawnCorridorGapScore: 0.18,
      spawnCorridorGapTurn: "right",
      spawnLandmarkRouteEvidence: 0.45,
      firstDoorVision9x9Score: 0,
      firstDoorVision9x9RedScore: 0,
      firstDoorUse3x3Score: 0
    },
    stageEvaluations: [
      { stageId: "low-health-escape", conditionMatched: false, evidenceMatched: true },
      { stageId: "spawn-east-window-route-recover", conditionMatched: true, evidenceMatched: true }
    ],
    movementSensor: { vectorX: -0.2, vectorY: 0.7, confidence: 0.7 },
    auditorySnapshot: { eventDetected: false, eventType: "none", leftEnergy: 0, rightEnergy: 0 },
    nousCarrier: { bonsaiTernary: { aisthesis: "neutral", kinesis: "neutral", phantasia: "neutral" } }
  }
};

const route = formatter.routeDebugText(status.autoplay);
assert(route.includes("tex!"), "Route debug should expose texture-wall occlusion");
assert(route.includes("east!"), "Route debug should expose east-window anchor");
assert(route.includes("foot0.65!"), "Route debug should expose confirmed foot obstacle");
assert(route.includes("mode=spawn-approach"), "Route debug should expose route mode");
assert(route.includes("loop=turn-stall!:13/12"), "Route debug should expose loop budget exhaustion");

const formatted = formatter.formatRuntimeStatus(status, { droppedFrames: 3 });
assert(formatted.text.includes("pipeline=spawn-east-window-route-recover"), "Runtime text should include pipeline");
assert(formatted.text.includes("routeDbg=ctx=open-space"), "Runtime text should include route debug");
assert(formatted.text.includes("mode=spawn-approach"), "Runtime text should preserve route mode");
assert(formatted.text.includes("loop=turn-stall!:13/12"), "Runtime text should preserve loop budget status");
assert(formatted.text.includes("tex!"), "Runtime text should preserve texture-wall marker");
assert(formatted.text.includes("kRepeat=24"), "Runtime text should expose Kinesis action repeat frames");
assert(formatted.html.includes("<strong>runtime</strong>=running"), "Runtime HTML should include strong runtime label");
assert(formatted.fpsText.includes("drop3"), "FPS HUD text should include dropped-frame count");
assert(formatted.objectiveText === "follow-demo-route-to-first-door", "Formatter should expose objective text");

console.log("DOOM_RUNTIME_FORMAT_VM_TEST_OK", { route, objective: formatted.objectiveText });

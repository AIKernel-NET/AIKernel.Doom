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

function createNode(tagName) {
  const node = {
    tagName,
    className: "",
    textContent: "",
    title: "",
    children: [],
    dataset: {},
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      this.children = children;
      return undefined;
    }
  };
  return node;
}

function flatten(node, output = []) {
  if (!node) {
    return output;
  }

  output.push(node);
  for (const child of node.children || []) {
    flatten(child, output);
  }
  return output;
}

const documentStub = {
  documentElement: { dataset: {} },
  createElement: createNode,
  createDocumentFragment() {
    return createNode("#fragment");
  }
};

const sandbox = {
  self: { document: documentStub },
  document: documentStub,
  console,
  Math,
  Number,
  Object,
  String,
  Set
};
sandbox.window = sandbox.self;
sandbox.self.AIKernelDoomGoalPanel = {
  resolvePriorityAction() {
    return "[L] Approach Target";
  },
  resolveKairosSignal() {
    return "Kairos: Use Latch 4";
  }
};

const context = vm.createContext(sandbox);
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-debug-overlay.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-debug-overlay.js" });

const overlay = createNode("div");
const status = {
  autoplay: {
    enabled: true,
    objective: "open-first-door",
    controlPipeline: "FirstDoor",
    region9Signature: "008090000",
    motion9Signature: "000040000",
    firstDoorUseLatchFrames: 4,
    kairosPriorityAxis: {
      logos: 0.42,
      pathos: 0.18,
      ethos: 0.64,
      selectedAxis: "ethos"
    },
    activeDetections: ["objective", "motion", "door", "wall", "hud"],
    milestones: {
      spawnCorridorGapScore: 0.33,
      firstDoorUseSignature: 0.52,
      firstDoorUse3x3Score: 0.38,
      firstDoorUse3x3Turn: "right",
      firstDoorVision9x9Heatmap: Array.from({ length: 81 }, (_, index) => index === 40 ? 0.84 : 0),
      firstDoorVision9x9Box: {
        row: 4,
        column: 4,
        rows: 2,
        columns: 2,
        score: 0.47,
        redScore: 0.12,
        edgeScore: 0.68
      }
    }
  }
};

const renderer = context.self.AIKernelDoomDebugOverlay;
assert(renderer?.version === "20260621-debugoverlay-gpu1", "Debug overlay should expose the current version");
assert(typeof renderer.renderDebugOverlay === "function", "Debug overlay should expose renderDebugOverlay");
assert(typeof renderer.resolveDebugOverlayDto === "function", "Debug overlay should expose DTO resolver");

const dtoOverlay = createNode("div");
renderer.renderDebugOverlay(dtoOverlay, {
  autoplay: {
    debugOverlay: {
      vision9x9: Array.from({ length: 81 }, (_, index) => index === 40 ? 0.82 : 0.01),
      grid: [
        { row: 1, column: 1, score: 0.82, kind: "vision", active: true }
      ],
      doorCandidates: [
        { row: 2, column: 4, rows: 3, columns: 2, score: 0.68, redScore: 0.31, edgeScore: 0.52 }
      ],
      cornerCandidates: [
        { row: 3, column: 1, rows: 2, columns: 2, score: 0.44, edgeScore: 0.66 }
      ],
      regions: [
        { kind: "objective", label: "PRIORITY:", value: "[L] Approach Target", left: 33, top: 49, width: 34, height: 16, priority: "mid", active: true },
        { kind: "door", label: "route", value: "first-door 0.42", left: 30, top: 18, width: 40, height: 42, priority: "high", active: true },
        { kind: "bridge", label: "bridge", value: "post-door 0.66", left: 30, top: 68, width: 40, height: 10, priority: "mid", active: true },
        { kind: "zoe", label: "ZOE WARN", value: "hp=42 risk=0.16 low-health-goal-first", left: 4, top: 5, width: 28, height: 8, priority: "mid", active: true }
      ],
      enemyCircle: { type: "visual", yaw: -12, direction: "left", confidence: 0.54, left: 21, top: 32, width: 12, height: 14, active: true },
      useProbe: { active: true, direction: "right", frames: 1 },
      kairosBlink: true,
      kairosLabel: "Kairos: Logos 0.64"
    }
  }
});
const dtoNodes = flatten(dtoOverlay);
assert(dtoNodes.some(node => String(node.className).includes("is-grid-vision")), "DTO overlay should render grid cells");
assert(dtoNodes.some(node => String(node.className).includes("is-grid-3x3")), "DTO overlay should mark 3x3 aim cells separately from the 9x9 heat grid");
assert(dtoNodes.filter(node => String(node.className).includes("is-grid-9x9")).length === 81, "DTO overlay should render all 81 vision9x9 cells");
assert(dtoNodes.some(node => String(node.className).includes("is-objective")), "DTO overlay should render objective frame");
assert(dtoNodes.some(node => String(node.className).includes("is-door")), "DTO overlay should render door frame");
assert(dtoNodes.some(node => String(node.className).includes("is-door-candidate")), "DTO overlay should render door candidate frame");
assert(dtoNodes.some(node => String(node.className).includes("is-corner-candidate")), "DTO overlay should render corner candidate frame");
assert(dtoNodes.some(node => String(node.className).includes("is-enemy-circle")), "DTO overlay should render enemy vector circles");
assert(dtoNodes.some(node => String(node.className).includes("is-enemy-circle-visual")), "DTO overlay should classify visual enemy circles");
assert(dtoNodes.some(node => node.dataset?.enemyType === "visual"), "DTO overlay should expose enemy circle type for diagnostics");
assert(dtoNodes.some(node => String(node.className).includes("is-bridge")), "DTO overlay should render bridge route frame");
assert(dtoNodes.some(node => String(node.className).includes("is-zoe")), "DTO overlay should render Zoe warning frames");
assert(dtoNodes.some(node => String(node.className).includes("is-zoe-warning")), "DTO overlay should distinguish amber Zoe warnings from red vetoes");
assert(dtoNodes.some(node => String(node.className).includes("debug-probe-arrow")), "DTO overlay should render use-probe arrow");

const audioCircleOverlay = createNode("div");
renderer.renderDebugOverlay(audioCircleOverlay, {
  autoplay: {
    debugOverlay: {
      enemyCircle: { type: "audio", yaw: 22, direction: "right", confidence: 0.61, active: true }
    }
  }
}, { force: true });
const audioCircleNodes = flatten(audioCircleOverlay);
assert(audioCircleNodes.some(node => String(node.className).includes("is-enemy-circle-audio")), "DTO overlay should classify audio enemy circles");
renderer.renderDebugOverlay(overlay, status, { detectionVisibility: new Map([["objective", true], ["motion", true], ["door", true], ["wall", true], ["hud", true]]) });

const nodes = flatten(overlay);
assert(nodes.some(node => String(node.className).includes("is-objective")), "Overlay should render the PRIORITY region");
assert(nodes.some(node => String(node.className).includes("is-vision-heat")), "Overlay should render 9x9 heatmap cells");
assert(nodes.some(node => String(node.className).includes("is-door-candidate")), "Overlay should render door candidate boxes");
assert(nodes.some(node => String(node.className).includes("is-kairos-pulse")), "Overlay should render Kairos timing pulse");
assert(nodes.some(node => String(node.className).includes("is-kairos-axis")), "Overlay should render Kairos priority axis pulse");
assert(nodes.some(node => String(node.className).includes("debug-probe-arrow")), "Overlay should render UseProbe arrow");

const combatOverlay = createNode("div");
renderer.renderDebugOverlay(combatOverlay, {
  autoplay: {
    enabled: true,
    activeDetections: ["combat-visual-center-fire", "audio-enemy-left"],
    enemyConfidence: 0.34,
    enemyTurn: "left",
    audioEnemyConfidence: 0.42,
    audioEnemyDirection: "left",
    enemyCenterCellConfidence: 0.16,
    milestones: {
      firstDoorVision9x9Heatmap: Array.from({ length: 81 }, (_, index) => index === 36 ? 0.66 : 0)
    },
    action: { move: "none", turn: "left", fire: false }
  }
}, { detectionVisibility: new Map([["enemy", true], ["objective", true], ["hud", true]]), gpuBacked: true });
const combatNodes = flatten(combatOverlay);
assert(combatNodes.some(node => String(node.className).includes("is-combat-alert")), "Combat overlay should render a clear combat alert even when active detections use route labels");
assert(combatNodes.some(node => String(node.className).includes("debug-gpu-label")), "GPU-backed combat overlay should keep diagnostics as lightweight text labels");
assert(!combatNodes.some(node => String(node.className).includes("is-vision-heat")), "GPU-backed overlay should let the WebGPU HUD own heat-grid rendering");
assert(!combatNodes.some(node => String(node.className).includes("debug-region")), "GPU-backed overlay should not duplicate rectangular CSS regions");
assert(combatOverlay.dataset.cssOverlayMode === "reduced", "GPU-backed overlay should mark CSS overlay work as reduced");

const gpuDtoOverlay = createNode("div");
renderer.renderDebugOverlay(gpuDtoOverlay, {
  autoplay: {
    debugOverlay: {
      vision9x9: Array.from({ length: 81 }, (_, index) => index === 40 ? 0.92 : 0.02),
      grid: [
        { row: 1, column: 1, score: 0.82, kind: "vision", active: true }
      ],
      doorCandidates: [
        { row: 2, column: 4, rows: 3, columns: 2, score: 0.68, redScore: 0.31, edgeScore: 0.52 }
      ],
      regions: [
        { kind: "objective", label: "PRIORITY:", value: "[L] Approach Target", left: 33, top: 49, width: 34, height: 16, priority: "mid", active: true },
        { kind: "combat", label: "COMBAT", value: "enemy", left: 28, top: 5, width: 44, height: 12, priority: "high", active: true }
      ],
      gpuHud: {
        labels: [
          { className: "is-door is-door-candidate", label: "DOOR", value: "score=0.68 red=0.31 edge=0.52", priority: "high", active: true, slot: 0, source: "gpu-hud-dto", left: 44, top: 18, width: 22, height: 14, anchor: "below" },
          { className: "is-combat", label: "COMBAT", value: "enemy", priority: "high", active: true, slot: 1, source: "gpu-hud-dto", left: 28, top: 5, width: 44, height: 12 }
        ]
      },
      useProbe: { active: true, direction: "right", frames: 1 }
    }
  }
}, { force: true, gpuBacked: true, gpuHud: { hudCompositeActive: true, cssOverlayMode: "reduced" } });
const gpuDtoNodes = flatten(gpuDtoOverlay);
assert(!gpuDtoNodes.some(node => String(node.className).includes("is-grid-9x9")), "GPU-backed DTO overlay should not duplicate 9x9 heat cells in CSS");
assert(!gpuDtoNodes.some(node => String(node.className).includes("debug-probe-arrow")), "GPU-backed DTO overlay should not duplicate UseProbe arrows in CSS");
assert(gpuDtoNodes.some(node => String(node.className).includes("is-door-candidate") && String(node.className).includes("debug-gpu-label")), "GPU-backed DTO overlay should keep high-value candidate diagnostics as labels");
assert(gpuDtoNodes.some(node => String(node.className).includes("is-combat") && String(node.className).includes("debug-gpu-label")), "GPU-backed DTO overlay should keep high-priority combat diagnostics as labels");
assert(gpuDtoNodes.filter(node => String(node.className).includes("debug-gpu-label")).length === 2, "GPU-backed DTO overlay should prefer GPU HUD label DTOs over re-derived labels");
const rectBoundLabel = gpuDtoNodes.find(node => String(node.className).includes("is-door-candidate") && String(node.className).includes("debug-gpu-label"));
assert(rectBoundLabel?.dataset.gpuLabelLayout === "rect", "GPU-backed DTO labels should be bound to their GPU HUD rectangle coordinates");
assert(rectBoundLabel?.dataset.gpuLabelAnchor === "below", "Candidate labels should use a below-rectangle anchor");
assert(rectBoundLabel?.style?.values?.["--label-left"], "GPU-backed DTO labels should expose CSS left coordinates");
assert(!gpuDtoNodes.some(node => String(node.className).includes("debug-region")), "GPU-backed DTO overlay should leave rectangles to the WebGPU HUD");
assert(!gpuDtoNodes.some(node => String(node.className).includes("is-objective")), "GPU-backed DTO overlay should drop mid-priority regions already represented by the HUD");

console.log("DOOM_DEBUG_OVERLAY_VM_TEST_OK", {
  version: renderer.version,
  nodes: nodes.length,
  heat: nodes.filter(node => String(node.className).includes("is-vision-heat")).length
});

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
assert(renderer?.version === "20260619-debugoverlay3", "Debug overlay should expose the current version");
assert(typeof renderer.renderDebugOverlay === "function", "Debug overlay should expose renderDebugOverlay");
assert(typeof renderer.resolveDebugOverlayDto === "function", "Debug overlay should expose DTO resolver");

const dtoOverlay = createNode("div");
renderer.renderDebugOverlay(dtoOverlay, {
  autoplay: {
    debugOverlay: {
      grid: [
        { row: 1, column: 1, score: 0.82, kind: "vision", active: true }
      ],
      regions: [
        { kind: "objective", label: "PRIORITY:", value: "[L] Approach Target", left: 33, top: 49, width: 34, height: 16, priority: "mid", active: true },
        { kind: "door", label: "route", value: "first-door 0.42", left: 30, top: 18, width: 40, height: 42, priority: "high", active: true }
      ],
      useProbe: { active: true, direction: "right", frames: 1 },
      kairosBlink: true,
      kairosLabel: "Kairos: Logos 0.64"
    }
  }
});
const dtoNodes = flatten(dtoOverlay);
assert(dtoNodes.some(node => String(node.className).includes("is-grid-vision")), "DTO overlay should render grid cells");
assert(dtoNodes.some(node => String(node.className).includes("is-objective")), "DTO overlay should render objective frame");
assert(dtoNodes.some(node => String(node.className).includes("is-door")), "DTO overlay should render door frame");
assert(dtoNodes.some(node => String(node.className).includes("debug-probe-arrow")), "DTO overlay should render use-probe arrow");
renderer.renderDebugOverlay(overlay, status, { detectionVisibility: new Map([["objective", true], ["motion", true], ["door", true], ["wall", true], ["hud", true]]) });

const nodes = flatten(overlay);
assert(nodes.some(node => String(node.className).includes("is-objective")), "Overlay should render the PRIORITY region");
assert(nodes.some(node => String(node.className).includes("is-vision-heat")), "Overlay should render 9x9 heatmap cells");
assert(nodes.some(node => String(node.className).includes("is-door-candidate")), "Overlay should render door candidate boxes");
assert(nodes.some(node => String(node.className).includes("is-kairos-pulse")), "Overlay should render Kairos timing pulse");
assert(nodes.some(node => String(node.className).includes("is-kairos-axis")), "Overlay should render Kairos priority axis pulse");
assert(nodes.some(node => String(node.className).includes("debug-probe-arrow")), "Overlay should render UseProbe arrow");

console.log("DOOM_DEBUG_OVERLAY_VM_TEST_OK", {
  version: renderer.version,
  nodes: nodes.length,
  heat: nodes.filter(node => String(node.className).includes("is-vision-heat")).length
});

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
    children: [],
    dataset: {},
    append(...children) {
      this.children.push(...children);
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      this.children = children;
    }
  };
  node.ownerDocument = documentStub;
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
  createElement: createNode
};

const sandbox = {
  self: { document: documentStub },
  document: documentStub,
  console,
  Math,
  Number,
  Object,
  String,
  Boolean,
  Array
};
sandbox.window = sandbox.self;
sandbox.self.AIKernelDoomGoalPanel = {
  labelize(value) {
    return String(value || "none")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  },
  resolveTelosObjective() {
    return "ComputerRoom";
  },
  resolvePrimaryObjective() {
    return "Enter Computer Room";
  },
  resolvePriorityAction() {
    return "[L] Approach Target";
  }
};

const context = vm.createContext(sandbox);
const gpuPathStatusSource = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-gpu-path-status.js"), "utf8");
vm.runInContext(gpuPathStatusSource, context, { filename: "doom-gpu-path-status.js" });
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-objective-status-panel.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-objective-status-panel.js" });

const panel = context.self.AIKernelDoomObjectiveStatusPanel;
assert(panel?.version === "20260621-objectivestatus-gpu1", "Objective status panel should expose the current version");
assert(typeof panel.resolveRows === "function", "Objective status panel should expose row resolver");
assert(typeof panel.renderObjectiveStatusPanel === "function", "Objective status panel should expose renderer");
assert(context.self.document.documentElement.dataset.doomObjectiveStatusPanelVersion === "20260621-objectivestatus-gpu1", "Objective status panel should publish its version for live diagnostics");

const status = {
  renderer: "WebGpuComputeProvider(texture)",
  lastGpuWaitMs: 4,
  gpuWaitTimeouts: 1,
  gpuDelegate: "WebGpuComputeProvider(browser-webgpu)",
  autoplay: {
    enabled: true,
    objective: "find-corridor-to-first-door",
    controlPipeline: "OpeningHome",
    vision: "webgpu-texture-binding",
    zeroCopy: true,
    action: { move: "forward", turn: "left", fire: false, use: false },
    healthEstimatedPercent: 42,
    useCooldown: 7,
    firstDoorUseLatchFrames: 2,
    milestones: {
      doorOpened: 1,
      computerRoomEntered: true,
      centralHallEntered: false,
      enemyDefeated: 0
    },
    autoplayState: {
      currentRoute: "first-door-route",
      routeMode: "door-approach",
      routeConfidence: 0.58
    },
    pipelineState: {
      krisis: {
        kairos: {
          selectedAxis: "logos",
          confidence: 0.61
        }
      },
      kinesis: {
        zoe: {
          health: 42,
          lethalRisk: 0.23
        }
      }
    },
    framebuffer: {
      source: {
        kind: "webgpu-texture-binding",
        backend: "browser-webgpu"
      },
      zeroCopy: true
    },
    runtime: {
      renderer: "WebGpuComputeProvider(texture)",
      gpuDelegate: "WebGpuComputeProvider(browser-webgpu)"
    },
    debugOverlay: {
      gpuHud: {
        hudCompositeActive: true,
        displaySource: "hud-composite-offscreen",
        cssOverlayMode: "reduced",
        providerInitialized: true,
        providerRendererInitialized: true,
        providerUsingCpuFallback: false,
        deviceReady: true,
        rawTextureReady: true,
        storageTextureReady: true,
        gpuBufferReady: true,
        gpuComputeReady: true,
        gpuComputeActive: true,
        adapterPowerPreference: "high-performance",
        gpuMemory: {
          totalBytes: 25165824,
          totalMB: 24
        },
        gpuAisthesis: {
          zeroCopyReady: true,
          computeReady: true,
          gpuComputeActive: true,
          featureBufferReady: true,
          matrixUploadSource: "dto-flat"
        },
        gpuSpatialReasoning: {
          computeReady: true,
          gpuComputeActive: true,
          matrixUploadSource: "dto-flat"
        }
      }
    }
  }
};

const rows = panel.resolveRows(status);
const labels = rows.map(row => row.label).join("|");
assert(rows.length === 12, "Objective status panel should include the compact summary and the GPU path table");
assert(labels === "TELOS|OBJECTIVE|PRIORITY|ROUTE|KAIROS|GAME|BONSAI|HUD|SENSOR|ACTION|HEALTH|PROGRESS", "Objective status rows should remain stable");
assert(rows.some(row => row.label === "TELOS" && row.value === "ComputerRoom"), "TELOS should be resolved from the goal panel contract");
assert(rows.some(row => row.label === "OBJECTIVE" && row.value === "Enter Computer Room"), "OBJECTIVE should be resolved from the goal panel contract");
assert(rows.some(row => row.label === "PRIORITY" && row.value === "[L] Approach Target"), "PRIORITY should be resolved from the goal panel contract");
assert(rows.some(row => row.label === "GAME" && row.value.includes("GPU") && row.tone === "gpu"), "GAME should show the renderer backend");
assert(rows.some(row => row.label === "GAME" && row.value.includes("mem≈24MB")), "GAME should show estimated GPU allocation memory");
assert(rows.some(row => row.label === "BONSAI" && row.value.includes("zero-copy") && row.tone === "gpu"), "BONSAI should show zero-copy vision status");
assert(rows.some(row => row.label === "HUD" && row.value.includes("GPU composite") && row.tone === "gpu"), "HUD should show composite backend");
assert(rows.some(row => row.label === "SENSOR" && row.value.includes("ais=gpu") && row.value.includes("matrix=dto-flat") && row.tone === "gpu"), "SENSOR should show active Aisthesis/Spatial GPU status");
assert(rows.some(row => row.label === "HEALTH" && row.value.includes("hp=42")), "HEALTH should carry Zoe/health sensor state");
assert(rows.some(row => row.label === "PROGRESS" && row.value.includes("door=1")), "PROGRESS should carry phase milestones");

const fallbackRows = panel.resolveRows({
  usingCpuFallback: true,
  renderer: "canvas-fallback(WebGpuComputeProvider-cpu)",
  gpuDelegate: "WebGpuComputeProvider(cpu-fallback)",
  autoplay: {
    vision: "webgpu-state-buffer",
    zeroCopy: false,
    framebuffer: {
      source: {
        kind: "webgpu-state-buffer",
        backend: "cpu-fallback"
      }
    }
  }
});
assert(fallbackRows.some(row => row.label === "GAME" && row.value.includes("CPU fallback") && row.tone === "warn"), "CPU renderer fallback should be visible and warning-toned");
assert(fallbackRows.some(row => row.label === "GAME" && row.value.includes("mem=0MB")), "CPU renderer fallback should show zero GPU allocation memory");
assert(fallbackRows.some(row => row.label === "BONSAI" && row.value.includes("CPU/readback") && row.tone === "warn"), "Bonsai readback fallback should be visible and warning-toned");

const root = createNode("section");
panel.renderObjectiveStatusPanel(root, status);
const nodes = flatten(root);
assert(nodes.filter(node => String(node.className).includes("doom-objective-status-row")).length === 12, "Renderer should create one row node per summary row");
assert(nodes.some(node => node.textContent === "TELOS"), "Renderer should emit TELOS label");
assert(nodes.some(node => node.textContent === "ComputerRoom"), "Renderer should emit TELOS value");
assert(nodes.some(node => node.textContent === "hp=42 risk=0.23"), "Renderer should emit health risk value");

console.log("DOOM_OBJECTIVE_STATUS_PANEL_VM_TEST_OK", {
  version: panel.version,
  rows: rows.length,
  telos: rows[0].value
});

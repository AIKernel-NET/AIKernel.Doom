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
assert(panel?.version === "20260622-objectivestatus-gpu2", "Objective status panel should expose the current version");
assert(typeof panel.resolveRows === "function", "Objective status panel should expose row resolver");
assert(typeof panel.renderObjectiveStatusPanel === "function", "Objective status panel should expose renderer");
assert(context.self.document.documentElement.dataset.doomObjectiveStatusPanelVersion === "20260622-objectivestatus-gpu2", "Objective status panel should publish its version for live diagnostics");

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
        canonicalBridge: {
          diagnostics: {
            Passes: {
              Aisthesis: {
                ShaderBound: true,
                PipelineCached: true,
                BuiltInExecutor: true,
                InjectedExecutor: false,
                ReadyForBuiltIn: true
              },
              SpatialReasoning: {
                ShaderBound: true,
                PipelineCached: true,
                BuiltInExecutor: true,
                InjectedExecutor: false,
                ReadyForBuiltIn: true
              },
              HudComposite: {
                ShaderBound: true,
                PipelineCached: true,
                BuiltInExecutor: true,
                InjectedExecutor: false,
                ReadyForBuiltIn: true
              }
            }
          }
        },
        gpuAisthesis: {
          zeroCopyReady: true,
          computeReady: true,
          gpuComputeActive: true,
          featureBufferReady: true,
          matrixUploadSource: "dto-flat",
          canonicalPilot: {
            summary: { mode: "compute-vector" },
            featureMaskStorageTexture: true,
            comparison: {
              available: true,
              meanAbsDelta: 0.125,
              thresholdState: "within",
              promotionGate: "trace-candidate"
            },
            history: {
              candidateStreak: 4,
              withinStreak: 4,
              requiredStreak: 8,
              ready: false
            }
          }
        },
        gpuSpatialReasoning: {
          computeReady: true,
          gpuComputeActive: true,
          matrixUploadSource: "dto-flat",
          canonicalPilot: {
            summary: { mode: "matrix-state-vector" },
            comparison: {
              available: false,
              reason: "diagnostic-only"
            },
            history: {
              diagnosticStreak: 3,
              requiredStreak: 8,
              ready: false
            }
          }
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
const hudRow = rows.find(row => row.label === "HUD");
assert(hudRow?.metadata?.pass_readiness === "hud:on", "HUD row should expose canonical pass readiness metadata");
const sensorRow = rows.find(row => row.label === "SENSOR");
assert(sensorRow?.metadata?.pass_id === "sensor", "SENSOR row should carry canonical pass metadata");
assert(sensorRow?.metadata?.pass_readiness === "ais:on/sp:on", "SENSOR row should expose canonical Aisthesis/Spatial readiness metadata");
assert(sensorRow?.metadata?.feature_mask_storage_texture === "true", "SENSOR row should expose canonical FeatureMask storage texture metadata");
assert(sensorRow?.metadata?.pilot_state === "ais:within;sp:unavailable", "SENSOR row should merge Aisthesis and Spatial pilot states");
assert(sensorRow?.metadata?.promotion_gate === "ais:trace-candidate;sp:unavailable", "SENSOR row should merge Aisthesis and Spatial promotion gates");
assert(sensorRow?.metadata?.promotion_blocked === "true", "SENSOR row should expose blocked promotion readiness");
assert(sensorRow?.metadata?.promotion_reason === "sp:unavailable", "SENSOR row should identify the blocking promotion side");
assert(sensorRow?.metadata?.candidate_streak === "4", "SENSOR row should expose Aisthesis candidate streak");
assert(sensorRow?.metadata?.diagnostic_streak === "4", "SENSOR row should expose the strongest diagnostic streak");
assert(sensorRow?.metadata?.required_streak === "8", "SENSOR row should expose required pilot streak");
assert(sensorRow?.metadata?.doom_runtime_stamped === "true", "SENSOR row should mark runtime metadata projection");
assert(rows.some(row => row.label === "SENSOR" && row.value.includes("mask=canonical")), "SENSOR should show canonical FeatureMask storage texture readiness");
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
const renderedSensorRow = nodes.find(node => node.dataset?.passId === "sensor");
assert(renderedSensorRow?.dataset?.pilotState === "ais:within;sp:unavailable", "Rendered SENSOR row should retain Canonical pilot state metadata");
assert(renderedSensorRow?.dataset?.passReadiness === "ais:on/sp:on", "Rendered SENSOR row should retain Canonical pass readiness metadata");
assert(renderedSensorRow?.dataset?.featureMaskStorageTexture === "true", "Rendered SENSOR row should retain FeatureMask storage texture metadata");
assert(renderedSensorRow?.dataset?.promotionGate === "ais:trace-candidate;sp:unavailable", "Rendered SENSOR row should retain Canonical promotion gate metadata");
assert(renderedSensorRow?.dataset?.promotionBlocked === "true", "Rendered SENSOR row should retain promotion blocked metadata");
assert(renderedSensorRow?.dataset?.promotionReason === "sp:unavailable", "Rendered SENSOR row should retain promotion reason metadata");
assert(renderedSensorRow?.dataset?.doomRuntimeStamped === "true", "Rendered SENSOR row should retain Doom runtime stamp metadata");
assert(renderedSensorRow?.dataset?.doomZeroCopy === "true", "Rendered SENSOR row should retain zero-copy metadata");

const canonicalStatus = {
  autoplay: {
    debugOverlay: {
      gpuPathStatus: {
        rows: [
          { label: "GAME", mode: "GPU contract", value: "RawFramebuffer:raw-framebuffer -> doom", tone: "gpu", zeroCopy: true },
          { label: "BONSAI", mode: "zero-copy requested", value: "raw=raw-framebuffer hudExcluded=True", tone: "gpu", zeroCopy: true },
          { label: "HUD", mode: "GPU composite", value: "hud-composite-offscreen panel=panel16 rect=rect8", tone: "gpu", zeroCopy: true },
          { label: "SENSOR", mode: "GPU matrix", value: "ais=doom mask=doom.gpu.aisthesis.mask9x9 spatial=doom.gpu.spatial.reasoning", tone: "gpu", zeroCopy: true }
        ],
        text: "game=contract; bonsai=zcp; hud=gpu-contract; sensor=matrix",
        shortText: "GPU contract | B:zcp H:panel S:matrix"
      }
    }
  }
};
const canonicalRows = panel.resolveRows(canonicalStatus);
const liveGpuRows = rows.filter(row => ["GAME", "BONSAI", "HUD", "SENSOR"].includes(row.label));
const canonicalGpuRows = canonicalRows.filter(row => ["GAME", "BONSAI", "HUD", "SENSOR"].includes(row.label));
assert(canonicalGpuRows.map(row => row.label).join("|") === liveGpuRows.map(row => row.label).join("|"), "Canonical and live GPU path labels should match in the Objective/Status panel");
for (const row of canonicalGpuRows) {
  assert(row.metadata?.pass_id === row.label.toLowerCase(), `Canonical ${row.label} row should carry a deterministic Canonical pass id`);
  assert(row.metadata?.doom_runtime_stamped === "false", `Canonical ${row.label} row should remain marked as pre-runtime DTO metadata`);
}
const canonicalSensorRow = canonicalGpuRows.find(row => row.label === "SENSOR");
const liveSensorRow = liveGpuRows.find(row => row.label === "SENSOR");
assert(canonicalSensorRow?.metadata?.pass_id === liveSensorRow?.metadata?.pass_id, "Canonical and live SENSOR metadata should share the same Canonical pass id");
assert(canonicalSensorRow?.metadata?.path_role === liveSensorRow?.metadata?.path_role, "Canonical and live SENSOR metadata should share the same Canonical path role");
assert(canonicalSensorRow?.metadata?.doom_zero_copy === liveSensorRow?.metadata?.doom_zero_copy, "Canonical and live SENSOR metadata should preserve zero-copy parity");
const canonicalRoot = createNode("section");
panel.renderObjectiveStatusPanel(canonicalRoot, canonicalStatus);
const canonicalNodes = flatten(canonicalRoot);
const renderedCanonicalSensorRow = canonicalNodes.find(node => node.dataset?.passId === "sensor");
assert(renderedCanonicalSensorRow?.dataset?.doomRuntimeStamped === "false", "Rendered canonical SENSOR row should preserve pre-runtime metadata stamp");
assert(renderedCanonicalSensorRow?.dataset?.pilotState === "dto-projected", "Rendered canonical SENSOR row should preserve DTO-projected pilot state");
assert(renderedCanonicalSensorRow?.dataset?.promotionBlocked === "true", "Rendered canonical SENSOR row should preserve blocked promotion metadata");
assert(renderedCanonicalSensorRow?.dataset?.promotionReason === "runtime-stamp-required", "Rendered canonical SENSOR row should preserve runtime stamp promotion reason");

console.log("DOOM_OBJECTIVE_STATUS_PANEL_VM_TEST_OK", {
  version: panel.version,
  rows: rows.length,
  telos: rows[0].value
});

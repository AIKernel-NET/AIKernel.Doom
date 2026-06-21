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

const documentStub = {
  documentElement: { dataset: {} }
};

const sandbox = {
  self: { document: documentStub },
  document: documentStub,
  console,
  Date,
  Object,
  Boolean,
  Number,
  String
};
sandbox.window = sandbox.self;

const context = vm.createContext(sandbox);
const gpuContractsSource = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "js", "autoplay", "gpu-contracts.js"), "utf8");
vm.runInContext(gpuContractsSource, context, { filename: "gpu-contracts.js" });
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-debug-capture.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-debug-capture.js" });

const module = context.self.AIKernelDoomDebugCaptureModule;
assert(module?.version === "20260621-debugcapture3", "Debug capture module should publish its version");
assert(context.self.document.documentElement.dataset.doomDebugCaptureVersion === "20260621-debugcapture3", "Debug capture module should expose its version on the document dataset");
assert(typeof module.createDebugCapture === "function", "Debug capture module should expose a factory");

const published = [];
let runtimeCapture = {
  imageDataUrl: "data:image/png;base64,raw",
  captureSource: "offscreen-framebuffer",
  captureTarget: "doom",
  displayTarget: "doom-hud",
  displaySource: "hud-composite-offscreen",
  overlayExcluded: true,
  hudComposite: {
    displayTarget: "doom-hud",
    rawCaptureTarget: "doom",
    cssOverlayMode: "reduced"
  },
  timestamp: "2026-06-21T00:00:00.000Z",
  frame: 42
};
const api = module.createDebugCapture({
  getRuntime: () => ({
    captureSenseOnlyFrame: async () => runtimeCapture
  }),
  getGpuAisthesisFeatures: async () => ({
    ok: true,
    source: "doom.gpu.aisthesis.features",
    frame: 42,
    floatCount: 32,
    values: [1, 0.22, 0.81, 0.12],
    summary: {
      enabled: true,
      redMaximum: 0.81
    }
  }),
  getGpuSpatialReasoningOutput: async () => ({
    ok: true,
    source: "doom.gpu.spatial.reasoning",
    frame: 42,
    floatCount: 32,
    values: [],
    summary: {
      enabled: true,
      routeScore: 0.73,
      threatScore: 0.12,
      recommendedYaw: -0.25
    }
  }),
  publishCapture: frame => {
    published.push(frame);
    return frame;
  }
});

const analysis = await api.captureAnalysisFrame();
assert(analysis.ok === true, "Analysis capture should accept offscreen raw frames");
assert(analysis.usage === "analysis-raw-framebuffer", "Analysis capture should carry raw-framebuffer usage");
assert(analysis.overlayExcluded === true, "Analysis capture should mark HUD as excluded");
assert(analysis.analysisSafe === true, "Analysis capture should be analysis-safe when raw image data excludes overlays");
assert(analysis.captureTarget === "doom", "Analysis capture should keep the raw framebuffer target");
assert(analysis.displayTarget === "doom-hud", "Analysis capture should report the HUD-composited display target separately");
assert(analysis.displaySource === "hud-composite-offscreen", "Analysis capture should distinguish display source from raw capture source");
assert(analysis.hudComposite?.rawCaptureTarget === "doom", "Analysis capture should carry the HUD/raw split contract");
assert(published.length === 1, "Analysis capture should publish by default");

runtimeCapture = {
  imageDataUrl: "data:image/png;base64,display",
  captureSource: "display-canvas-fallback",
  overlayExcluded: false,
  frame: 43
};
const suppressed = await api.captureAnalysisFrame();
assert(suppressed.ok === false, "Analysis capture should suppress display fallbacks");
assert(suppressed.reason === "raw-framebuffer-unavailable", "Suppressed display fallback should report raw framebuffer unavailable");
assert(suppressed.overlayExcluded === false, "Suppressed display fallback should preserve overlayExcluded=false for diagnostics");
assert(suppressed.analysisSafe === false, "Suppressed display fallback should never be analysis-safe");

const gpuFeatures = await api.captureGpuAisthesisFeatures();
assert(gpuFeatures.ok === true, "GPU Aisthesis feature capture should expose explicit readback results");
assert(gpuFeatures.usage === "debug-gpu-aisthesis-readback", "GPU Aisthesis feature capture should use a separate debug usage");
assert(gpuFeatures.source === "doom.gpu.aisthesis.features", "GPU Aisthesis feature capture should identify the GPU feature buffer source");
assert(gpuFeatures.summary?.redMaximum === 0.81, "GPU Aisthesis feature capture should preserve the provider summary");

const gpuSpatial = await api.captureGpuSpatialReasoningOutput();
assert(gpuSpatial.ok === true, "GPU Spatial Reasoning capture should expose explicit readback results");
assert(gpuSpatial.usage === "debug-gpu-spatial-reasoning-readback", "GPU Spatial Reasoning capture should use a separate debug usage");
assert(gpuSpatial.source === "doom.gpu.spatial.reasoning", "GPU Spatial Reasoning capture should identify the GPU spatial buffer source");
assert(gpuSpatial.summary?.routeScore === 0.73, "GPU Spatial Reasoning capture should preserve the provider summary");

const displayApi = module.createDebugCapture({
  getRuntime: () => null,
  getCanvas: () => ({
    width: 320,
    height: 200,
    toDataURL: () => "data:image/png;base64,display"
  }),
  publishCapture: frame => {
    published.push(frame);
    return frame;
  }
});
const display = await displayApi.captureDisplayFrame();
assert(display.ok === true, "Display capture should allow the canvas fallback");
assert(display.usage === "debug-display-fallback", "Display capture should carry display-fallback usage");
assert(display.overlayExcluded === false, "Display capture should declare that HUD/display overlays may be present");
assert(display.analysisSafe === false, "Display capture should not be analysis-safe");

console.log("DOOM_DEBUG_CAPTURE_VM_TEST_OK", {
  version: module.version,
  analysis: analysis.source,
  display: display.source,
  gpu: gpuFeatures.source,
  spatial: gpuSpatial.source
});

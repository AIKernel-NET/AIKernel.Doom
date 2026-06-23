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
  self: { document: { documentElement: { dataset: {} } } },
  console,
  Math,
  Number,
  Object,
  String,
  Boolean,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-gpu-path-status.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-gpu-path-status.js" });

const gpuPath = context.self.AIKernelDoomGpuPathStatus;
assert(gpuPath?.version === "20260622-gpupathstatus19", "GPU path status module should expose the current version");
assert(typeof gpuPath.resolveGpuPathStatus === "function", "GPU path status module should expose resolver");
assert(context.self.document.documentElement.dataset.doomGpuPathStatusVersion === "20260622-gpupathstatus19", "GPU path status module should publish its live diagnostics version");
assert(context.AIKernelDoomGpuPathStatus === gpuPath, "GPU path status module should publish the same API on globalThis");

const healthy = gpuPath.resolveGpuPathStatus({
  renderer: "WebGpuComputeProvider(texture)",
  gpuDelegate: "WebGpuComputeProvider(browser-webgpu)",
  lastGpuWaitMs: 6,
  gpuWaitTimeouts: 2,
  gpuHud: {
    rawZeroCopy: true,
    providerBackend: "browser-webgpu",
    providerSupported: true,
    providerInitialized: true,
    deviceReady: true,
    adapterPowerPreference: "high-performance",
    adapterSummary: "NVIDIA T1000 8GB",
    providerRendererInitialized: true,
    providerUsingCpuFallback: false,
    rawTextureReady: true,
    storageTextureReady: true,
    gpuBufferReady: true,
    gpuComputeReady: true,
    gpuComputeActive: true,
    rev3Bridge: {
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
    hudPanelOverlayReady: true,
    hudPanelDoubleBuffered: true,
    gpuMemory: {
      totalBytes: 28311552,
      totalMB: 27.0
    }
  },
  autoplay: {
    vision: "webgpu-texture-binding",
    zeroCopy: true,
    framebuffer: {
      source: { kind: "webgpu-texture-binding", backend: "browser-webgpu" },
      zeroCopy: true
    },
    debugOverlay: {
      gpuHud: {
        hudCompositeActive: true,
        hudCompositeReady: true,
        displaySource: "hud-composite-offscreen",
        cssOverlayMode: "reduced",
        gpuAisthesis: {
          zeroCopyReady: true,
          computeReady: true,
          gpuComputeActive: true,
          featureBufferReady: true,
          maskTextureReady: true,
          matrixUploadSource: "dto-flat",
          rev3Pilot: {
            summary: { mode: "compute-vector" },
            featureMaskStorageTexture: true,
            comparison: { available: true, meanAbsDelta: 0.125, thresholdState: "within", promotionGate: "trace-candidate" },
            history: { candidateStreak: 3, withinStreak: 3, requiredStreak: 8, ready: false }
          }
        },
        gpuSpatialReasoning: {
          computeReady: true,
          gpuComputeActive: true,
          matrixUploadSource: "dto-flat",
          rev3Pilot: {
            summary: { mode: "matrix-state-vector" },
            comparison: { available: false, reason: "diagnostic-only" }
          }
        }
      }
    }
  }
});

assert(healthy.rows.length === 4, "GPU path status should render four path rows");
assert(healthy.text === "game=GPU; bonsai=zcp; hud=gpu; sensor=gpu", "healthy GPU path text should be compact and stable");
assert(healthy.shortText === "GPU | B:zcp H:gpu S:gpu", "healthy GPU path short text should fit the FPS line");
assert(healthy.rows.some(row => row.label === "GAME" && row.tone === "gpu" && row.value.includes("WebGpuComputeProvider")), "GAME row should show WebGPU backend");
assert(healthy.rows.some(row => row.label === "GAME" && row.value.includes("pref=high-performance") && row.value.includes("NVIDIA T1000 8GB")), "GAME row should expose high-performance adapter diagnostics");
assert(healthy.rows.some(row => row.label === "GAME" && row.value.includes("mem≈27MB")), "GAME row should expose estimated WebGPU allocation memory");
assert(healthy.rows.some(row => row.label === "BONSAI" && row.value.includes("raw=zcp")), "BONSAI row should expose raw framebuffer zero-copy state");
assert(healthy.rows.some(row => row.label === "HUD" && row.value.includes("panel=gpux2")), "HUD row should expose GPU panel double-buffer state");
assert(healthy.rows.some(row => row.label === "HUD" && row.value.includes("pass=hud:on")), "HUD row should expose rev3 HUD pass readiness");
assert(healthy.hud.metadata.rev3_pass_readiness === "hud:on", "runtime HUD metadata should expose rev3 HUD pass readiness");
assert(healthy.rows.some(row => row.label === "SENSOR" && row.value.includes("mask=rev3")), "SENSOR row should expose canonical FeatureMask storage texture readiness");
assert(healthy.rows.some(row => row.label === "SENSOR" && row.value.includes("rev3=ais:ok3/8:d0.125/sp:matrix-state")), "SENSOR row should expose rev3 pilot parity diagnostics");
assert(healthy.rows.some(row => row.label === "SENSOR" && row.value.includes("pass=ais:on/sp:on")), "SENSOR row should expose rev3 Aisthesis/Spatial pass readiness");
assert(healthy.sensor.metadata.rev3_pass_readiness === "ais:on/sp:on", "runtime SENSOR metadata should expose rev3 Aisthesis/Spatial pass readiness");
assert(healthy.sensor.metadata.rev3_feature_mask_storage_texture === "true", "runtime SENSOR metadata should expose canonical FeatureMask storage texture readiness");
assert(healthy.sensor.rev3Aisthesis?.summary?.mode === "compute-vector", "resolved sensor status should retain rev3 Aisthesis pilot summary");
assert(healthy.sensor.rev3Spatial?.summary?.mode === "matrix-state-vector", "resolved sensor status should retain rev3 Spatial pilot summary");
assert(healthy.sensor.metadata.rev3_pass_id === "sensor", "runtime SENSOR metadata should expose the canonical pass id");
assert(healthy.sensor.metadata.rev3_pilot_state === "ais:within;sp:unavailable", "runtime SENSOR metadata should combine Aisthesis and Spatial pilot states");
assert(healthy.sensor.metadata.rev3_promotion_gate === "ais:trace-candidate;sp:unavailable", "runtime SENSOR metadata should combine Aisthesis and Spatial promotion gates");
assert(healthy.sensor.metadata.rev3_promotion_blocked === "true", "runtime SENSOR metadata should mark blocked composite promotion readiness");
assert(healthy.sensor.metadata.rev3_promotion_candidate_ready === "false", "runtime SENSOR metadata should expose promotion candidate readiness");
assert(healthy.sensor.metadata.rev3_promotion_diagnostic_stable === "false", "runtime SENSOR metadata should expose diagnostic stability");
assert(healthy.sensor.metadata.rev3_promotion_reason === "sp:unavailable", "runtime SENSOR metadata should identify the blocking promotion side");
assert(healthy.sensor.metadata.rev3_candidate_streak === "3", "runtime SENSOR metadata should expose Aisthesis candidate streak");
assert(healthy.sensor.metadata.rev3_diagnostic_streak === "3", "runtime SENSOR metadata should expose the strongest diagnostic streak");
assert(healthy.sensor.metadata.rev3_required_streak === "8", "runtime SENSOR metadata should expose the required streak");
assert(healthy.sensor.metadata.doom_runtime_stamped === "true", "runtime SENSOR metadata should be marked as runtime stamped");
assert(healthy.rows.find(row => row.label === "SENSOR")?.metadata?.doom_zero_copy === "true", "runtime SENSOR row metadata should preserve zero-copy state");
assert(healthy.game.memoryMB === 27, "resolved game status should expose estimated memory as a numeric diagnostic");
assert(healthy.game.providerBackend === "browser-webgpu" && healthy.game.providerRendererInitialized === true, "resolved game status should expose provider backend and renderer state");
assert(healthy.rows.some(row => row.label === "HUD" && row.value.includes("GPU composite")), "HUD row should show active composite");
assert(healthy.rows.some(row => row.label === "SENSOR" && row.value.includes("ais=gpu") && row.value.includes("spatial=gpu") && row.value.includes("matrix=dto-flat") && row.value.includes("compute=active")), "SENSOR row should show active GPU Aisthesis, GPU Spatial, DTO-flat matrix upload, and compute activity");

const stringFalseMask = gpuPath.resolveGpuPathStatus({
  renderer: "WebGpuComputeProvider(texture)",
  gpuHud: {
    providerBackend: "browser-webgpu",
    providerInitialized: true,
    providerRendererInitialized: true,
    gpuAisthesis: {
      computeReady: true,
      gpuComputeActive: true,
      maskTextureReady: true,
      rev3Pilot: {
        featureMaskStorageTexture: "false"
      }
    }
  },
  autoplay: {
    zeroCopy: true
  }
});

assert(stringFalseMask.rows.some(row => row.label === "SENSOR" && row.value.includes("mask=gpu")), "SENSOR row should keep legacy GPU mask when canonical FeatureMask storage metadata is string false");
assert(!stringFalseMask.rows.some(row => row.label === "SENSOR" && row.value.includes("mask=rev3")), "SENSOR row should not promote string false canonical FeatureMask metadata to rev3");

const canvasCpu = gpuPath.resolveGpuPathStatus({
  renderer: "canvas-fallback(WebGpuComputeProvider)",
  gpuDelegate: "WebGpuComputeProvider(browser-webgpu)",
  gpuHud: {
    providerBackend: "browser-webgpu",
    providerInitialized: true,
    deviceReady: true,
    providerRendererInitialized: false,
    providerUsingCpuFallback: false,
    rawZeroCopy: false,
    hudCompositeReady: true,
    hudCompositeActive: false
  },
  autoplay: {
    vision: "webgpu-state-buffer",
    zeroCopy: false,
    framebuffer: {
      source: { kind: "webgpu-state-buffer", backend: "browser-webgpu" },
      zeroCopy: false
    }
  }
});

assert(canvasCpu.text === "game=Canvas CPU; bonsai=copy; hud=ready; sensor=dto", "canvas CPU path should not be mislabeled as GPU rendering");
assert(canvasCpu.game.providerGpuAvailable === true, "canvas CPU path should still expose that the WebGPU provider is available");
assert(canvasCpu.rows.some(row => row.label === "GAME" && row.tone === "warn" && row.value.includes("Canvas CPU")), "canvas CPU GAME row should be warning toned");
assert(canvasCpu.game.reason === "renderer-pending", "canvas CPU path should expose why texture rendering is not active");

const fallback = gpuPath.resolveGpuPathStatus({
  usingCpuFallback: true,
  lastError: "navigator.gpu is unavailable.",
  renderer: "canvas-fallback(WebGpuComputeProvider-cpu)",
  gpuDelegate: "WebGpuComputeProvider(cpu-fallback)",
  autoplay: {
    vision: "display-canvas-fallback",
    zeroCopy: false,
    framebuffer: {
      source: { kind: "display-canvas-fallback", backend: "cpu-fallback" },
      zeroCopy: false
    }
  }
});

assert(fallback.text === "game=CPU fallback; bonsai=copy; hud=dto; sensor=dto", "fallback GPU path text should expose CPU/copy state");
assert(fallback.rows.some(row => row.label === "GAME" && row.tone === "warn"), "CPU fallback GAME row should be warning toned");
assert(fallback.rows.some(row => row.label === "GAME" && row.value.includes("mem=0MB")), "CPU fallback GAME row should expose zero GPU allocation memory");
assert(fallback.rows.some(row => row.label === "GAME" && row.value.includes("reason=navigator.gpu is unavailable.")), "CPU fallback GAME row should expose the fallback reason");
assert(fallback.rows.some(row => row.label === "BONSAI" && row.tone === "warn" && row.value.includes("CPU/readback")), "BONSAI readback row should be warning toned");

const canonical = gpuPath.resolveGpuPathStatus({
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
});

assert(canonical.canonical === true, "canonical C# GPU path DTO should be used when runtime telemetry is absent");
assert(canonical.text === "game=contract; bonsai=zcp; hud=gpu-contract; sensor=matrix", "canonical GPU path text should be preserved");
assert(canonical.shortText === "GPU contract | B:zcp H:panel S:matrix", "canonical GPU path short text should be preserved");
assert(canonical.rows.length === 4, "canonical GPU path DTO should preserve four lanes");
assert(canonical.rows.some(row => row.label === "SENSOR" && row.value.includes("doom.gpu.spatial.reasoning")), "canonical SENSOR row should preserve spatial target");
assert(canonical.sensor.metadata.rev3_pass_id === "sensor", "canonical SENSOR metadata should preserve the Rev3 pass id");
assert(canonical.sensor.metadata.rev3_path_role === "sensor", "canonical SENSOR metadata should preserve the Rev3 path role");
assert(canonical.sensor.metadata.rev3_pilot_state === "dto-projected", "canonical SENSOR metadata should expose pre-runtime pilot state");
assert(canonical.sensor.metadata.rev3_promotion_blocked === "true", "canonical SENSOR metadata should expose blocked promotion readiness before runtime stamp");
assert(canonical.sensor.metadata.rev3_promotion_reason === "runtime-stamp-required", "canonical SENSOR metadata should expose runtime-stamp-required as the promotion reason");
assert(canonical.sensor.metadata.doom_mode === "GPU matrix", "canonical SENSOR metadata should preserve Doom row mode");
assert(canonical.sensor.metadata.doom_zero_copy === "true", "canonical SENSOR metadata should preserve zero-copy state");

const providerMetadata = gpuPath.resolveGpuPathStatus({
  autoplay: {
    debugOverlay: {
      gpuPathStatus: {
        rows: [
          { label: "GAME", mode: "GPU contract", value: "RawFramebuffer:raw-framebuffer -> doom", tone: "gpu", zeroCopy: true },
          { label: "BONSAI", mode: "zero-copy requested", value: "raw=raw-framebuffer hudExcluded=True", tone: "gpu", zeroCopy: true },
          { label: "HUD", mode: "GPU composite", value: "hud-composite-offscreen panel=panel16 rect=rect8", tone: "gpu", zeroCopy: true },
          {
            label: "SENSOR",
            mode: "GPU matrix",
            value: "ais=doom mask=doom.gpu.aisthesis.mask9x9 spatial=doom.gpu.spatial.reasoning",
            tone: "gpu",
            zeroCopy: true,
            metadata: {
              rev3_promotion_reason: "authoritative-not-ready",
              rev3_promotion_blocked: "false",
              rev3_promotion_candidate_ready: "true",
              rev3_promotion_diagnostic_stable: "true"
            }
          }
        ],
        text: "game=contract; bonsai=zcp; hud=gpu-contract; sensor=matrix",
        shortText: "GPU contract | B:zcp H:panel S:matrix"
      }
    }
  }
});

assert(providerMetadata.sensor.metadata.rev3_promotion_reason === "authoritative-not-ready", "canonical SENSOR metadata should preserve provider-supplied promotion reason");
assert(providerMetadata.sensor.metadata.rev3_promotion_blocked === "false", "canonical SENSOR metadata should preserve provider-supplied blocked value");
assert(providerMetadata.sensor.metadata.rev3_promotion_candidate_ready === "true", "canonical SENSOR metadata should preserve provider-supplied candidate readiness");
assert(providerMetadata.sensor.metadata.rev3_promotion_diagnostic_stable === "true", "canonical SENSOR metadata should preserve provider-supplied diagnostic stability");

const metadataInvalid = gpuPath.resolveGpuPathStatus({
  autoplay: {
    debugOverlay: {
      gpuPathStatus: {
        rows: [
          { label: "GAME", mode: "GPU contract", value: "RawFramebuffer:raw-framebuffer -> doom", tone: "gpu", zeroCopy: true },
          { label: "BONSAI", mode: "zero-copy requested", value: "raw=raw-framebuffer hudExcluded=True", tone: "gpu", zeroCopy: true },
          { label: "HUD", mode: "GPU composite", value: "hud-composite-offscreen panel=panel16 rect=rect8", tone: "gpu", zeroCopy: true },
          {
            label: "SENSOR",
            mode: "GPU matrix",
            value: "deterministic-fallback",
            tone: "cpu",
            zeroCopy: false,
            cpuFallback: true,
            metadata: {
              rev3_metadata_validation_error: "rev3_promotion_gate"
            }
          }
        ],
        text: "sensor=fallback",
        shortText: "S:cpu"
      }
    }
  }
});

assert(metadataInvalid.sensor.reason === "metadata-invalid:rev3_promotion_gate", "canonical SENSOR reason should expose Rev3 metadata validation errors");
assert(metadataInvalid.sensor.metadata.doom_reason === "metadata-invalid:rev3_promotion_gate", "canonical SENSOR metadata should expose metadata validation fallback reason");
assert(metadataInvalid.sensor.metadata.rev3_metadata_validation_error === "rev3_promotion_gate", "canonical SENSOR metadata should preserve validation error key");

console.log("DOOM_GPU_PATH_STATUS_VM_TEST_OK", {
  version: gpuPath.version,
  healthy: healthy.shortText,
  fallback: fallback.shortText,
  canonical: canonical.shortText
});

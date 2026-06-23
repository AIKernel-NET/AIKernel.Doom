(function () {
  "use strict";

  const script = document.currentScript;
  const version = script?.dataset?.version || "20260621-public-doom1";
  const DEFAULT_MODEL_MANIFEST_URL = "/models/bonsai1.7b/manifest.json";
  const DEFAULT_MODEL_HOSTED_FILE = "/models/bonsai1.7b/Bonsai-1.7B-Q1_0.gguf";
  const existingConfig = window.AIKernelDoomPublic || {};
  const deploymentConfig = window.AIKernelDoomConfig || {};
  const modelManifestUrl = script?.dataset?.modelManifestUrl ||
    deploymentConfig.modelManifestUrl ||
    existingConfig.modelManifestUrl ||
    DEFAULT_MODEL_MANIFEST_URL;
  const modelHostedFile = script?.dataset?.modelHostedFile ||
    deploymentConfig.modelHostedFile ||
    existingConfig.modelHostedFile ||
    DEFAULT_MODEL_HOSTED_FILE;
  const base = (() => {
    try {
      return new URL(script?.src || "/demo/doom/js/doom-public-loader.js", document.baseURI)
        .pathname
        .replace(/[^/]+$/, "");
    } catch {
      return "/demo/doom/js/";
    }
  })();

  const scripts = [
    "autoplay-profile.js",
    "autoplay/gpu-contracts.js",
    "webgpu-provider.js",
    "autoplay/cognition/semantics.js",
    "autoplay/cognition/combat-route.js",
    "autoplay/cognition/routing.js",
    "autoplay/cognition/topos.js",
    "autoplay/cognition/ctg.js",
    "autoplay/cognition/sensory.js",
    "autoplay/cognition/vision-palette.js",
    "autoplay/cognition/phainesis.js",
    "autoplay/cognition/nous.js",
    "autoplay/cognition/phantasia.js",
    "autoplay/cognition/kairos.js",
    "autoplay/cognition/kinesis.js",
    "autoplay/cognition/zoe.js",
    "autoplay/cognition/pipeline-trace.js",
    "autoplay/sensor-tensor.js",
    "autoplay/control/objective-routing.js",
    "autoplay/control/expression-dsl.js",
    "autoplay/control/route-planner.js",
    "autoplay/control/route-loop-budget.js",
    "autoplay/control/doom-context.js",
    "autoplay/control/evidence.js",
    "autoplay/control/arbitration.js",
    "autoplay/control/decision-trace.js",
    "autoplay/control/pipeline-graph.js",
    "autoplay/control/zoe-veto.js",
    "autoplay/control/runtime-packets.js",
    "autoplay/wasm-state.js",
    "autoplay/control-runtime.js",
    "autoplay/doom-sensor-inputs.js",
    "autoplay/doom-action-adapter.js",
    "autoplay/doom-retry-dispatch.js",
    "autoplay/doom-binary-assets.js",
    "doom-wasm-imports.js",
    "doom-native-audio.js",
    "doom-auditory-runtime.js",
    "doom-wad-metadata.js",
    "bonsai.js",
    "doom-debug-audio.js",
    "doom.js",
    "doom-worker-proxy.js",
    "doom-gui-selftest.js",
    "doom-controller-debug-log.js",
    "doom-download-progress.js",
    "doom-runtime-status-flow.js",
    "doom-sensor-panel.js",
    "doom-gpu-path-status.js",
    "doom-runtime-format.js",
    "doom-pipeline-panel.js",
    "doom-goal-panel.js",
    "doom-objective-status-panel.js",
    "doom-debug-overlay.js",
    "doom-debug-capture.js",
    "doom-prompt.js"
  ];

  window.AIKernelDoomPublic = Object.assign({}, window.AIKernelDoomPublic || {}, {
    scriptBase: base,
    version,
    modelManifestUrl,
    modelHostedFile,
    sharedModel: true,
    loadedScripts: []
  });

  function loadScript(relativePath) {
    return new Promise((resolve, reject) => {
      const node = document.createElement("script");
      node.src = `${base}${relativePath}?v=${encodeURIComponent(version)}`;
      node.async = false;
      node.onload = () => {
        window.AIKernelDoomPublic.loadedScripts.push(relativePath);
        resolve();
      };
      node.onerror = () => reject(new Error(`Failed to load ${relativePath}`));
      document.head.appendChild(node);
    });
  }

  function installRev3Bridge(module) {
    if (!module) {
      return false;
    }

    window.AIKernelWebGpuRev3 = Object.assign({}, window.AIKernelWebGpuRev3 || {}, {
      createWebGpuRev3EnvelopeBridge: module.createWebGpuRev3EnvelopeBridge,
      createWebGpuRev3BrowserExecutor: module.createWebGpuRev3BrowserExecutor,
      createNullWebGpuRev3Executor: module.createNullWebGpuRev3Executor
    });
    return true;
  }

  function loadRev3Bridge() {
    const assetBase = `${base}aikernel/`;
    window.AIKernelDoomRev3AssetBase = assetBase;
    const moduleUrl = `${assetBase}webgpu-rev3-envelope-bridge.js?v=${encodeURIComponent(version)}`;
    window.AIKernelWebGpuRev3Ready = import(moduleUrl)
      .then(module => installRev3Bridge(module))
      .catch(error => {
        window.AIKernelWebGpuRev3Error = error?.message || String(error);
        console.warn("[AIKernel.Doom] rev3 WebGPU bridge unavailable", error);
        return false;
      });
    return window.AIKernelWebGpuRev3Ready;
  }

  loadRev3Bridge()
    .then(() => scripts.reduce((chain, relativePath) => chain.then(() => loadScript(relativePath)), Promise.resolve()))
    .then(() => {
      document.documentElement.dataset.doomPublicBundle = version;
    })
    .catch((error) => {
      document.documentElement.dataset.doomPublicBundleError = error?.message || String(error);
      console.error("[AIKernel.Doom] public loader failed", error);
    });
})();

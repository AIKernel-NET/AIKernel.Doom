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

function createFakeDocument() {
  const documentRef = {
    createElement(tagName) {
      return createFakeElement(tagName, documentRef);
    }
  };
  return documentRef;
}

function createFakeElement(tagName, ownerDocument) {
  const classes = new Set();
  const element = {
    tagName: String(tagName || "div").toUpperCase(),
    ownerDocument,
    parentNode: null,
    children: [],
    attributes: {},
    dataset: {},
    style: { cssText: "" },
    className: "",
    hidden: false,
    classList: {
      add(...names) {
        names.forEach(name => classes.add(name));
      },
      remove(...names) {
        names.forEach(name => classes.delete(name));
      },
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
        return enabled;
      },
      contains(name) {
        return classes.has(name);
      }
    },
    appendChild(child) {
      if (child.parentNode && child.parentNode !== element) {
        child.parentNode.removeChild(child);
      }
      child.parentNode = element;
      if (!element.children.includes(child)) {
        element.children.push(child);
      }
      return child;
    },
    append(...children) {
      children.forEach(child => element.appendChild(child));
    },
    removeChild(child) {
      const index = element.children.indexOf(child);
      if (index >= 0) {
        element.children.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    },
    remove() {
      element.parentNode?.removeChild(element);
    },
    setAttribute(name, value) {
      element.attributes[name] = String(value);
    },
    removeAttribute(name) {
      delete element.attributes[name];
      if (name === "data-pipeline-panel-pending") {
        delete element.dataset.pipelinePanelPending;
      }
    },
    getAttribute(name) {
      return element.attributes[name] ?? null;
    },
    querySelectorAll(selector) {
      const className = String(selector || "").startsWith(".")
        ? String(selector).slice(1)
        : "";
      const matches = [];
      const visit = candidate => {
        const declaredClasses = String(candidate.className || "").split(/\s+/).filter(Boolean);
        if (className && (declaredClasses.includes(className) || candidate.classList?.contains(className))) {
          matches.push(candidate);
        }
        candidate.children?.forEach(visit);
      };
      element.children.forEach(visit);
      return matches;
    },
    querySelector(selector) {
      return element.querySelectorAll(selector)[0] || null;
    }
  };
  Object.defineProperty(element, "parentElement", {
    get() {
      return element.parentNode;
    }
  });
  let ownText = "";
  Object.defineProperty(element, "firstChild", {
    get() {
      return element.children[0] || null;
    }
  });
  Object.defineProperty(element, "textContent", {
    get() {
      return ownText + element.children.map(child => child.textContent || "").join("");
    },
    set(value) {
      ownText = String(value ?? "");
      if (ownText === "") {
        element.children.length = 0;
      }
    }
  });
  return element;
}

const sandbox = {
  self: {},
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
const gpuPathStatusSource = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-gpu-path-status.js"), "utf8");
vm.runInContext(gpuPathStatusSource, context, { filename: "doom-gpu-path-status.js" });
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-pipeline-panel.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-pipeline-panel.js" });

const panel = context.self.AIKernelDoomPipelinePanel;
assert(panel?.formatToposHud, "Pipeline panel should expose formatToposHud");
assert(panel?.resolveObservedScores, "Pipeline panel should expose observed score projection");
assert(panel?.resolveEnemyCue, "Pipeline panel should expose structured enemy cue projection");

const ownerTestDocument = createFakeDocument();
context.document = ownerTestDocument;
context.self.document = ownerTestDocument;
const hudHost = createFakeElement("div", ownerTestDocument);
const hudScreen = createFakeElement("canvas", ownerTestDocument);
hudHost.appendChild(hudScreen);
const pendingHud = createFakeElement("div", ownerTestDocument);
pendingHud.className = "doom-topos-hud";
pendingHud.dataset.pipelinePanelPending = "true";
pendingHud.style.cssText = "position:absolute;right:10px;top:10px;";
pendingHud.textContent = "[CTG] legacy prompt placeholder";
hudHost.appendChild(pendingHud);
const duplicateHud = createFakeElement("div", ownerTestDocument);
duplicateHud.className = "doom-topos-hud";
hudHost.appendChild(duplicateHud);
const ownedHud = panel.ensureToposHud({ doomScreen: hudScreen, node: pendingHud });
assert(ownedHud === pendingHud, "Pipeline panel should adopt the pre-module carrier as its sole owner");
assert(hudHost.querySelectorAll(".doom-topos-hud").length === 1, "Pipeline panel should remove duplicate CTG carriers");
assert(ownedHud.dataset.pipelinePanelOwner === "true", "Canonical CTG carrier should identify the pipeline panel as its owner");
assert(ownedHud.dataset.pipelinePanelPending === undefined, "Pipeline ownership should clear the prompt-pending marker");

panel.renderToposHud(ownedHud, { autoplay: { enabled: true, pipelineState: null } }, { force: true });
assert(ownedHud.hidden === true, "No-projection CTG state must remain hidden");
assert(ownedHud.getAttribute("aria-hidden") === "true", "No-projection CTG state must be hidden from accessibility output");
assert(ownedHud.dataset.ctgLayout === "none", "No-projection CTG state must not retain a legacy panel layout");
assert(ownedHud.textContent === "", "No-projection CTG state must not retain a boxed [CTG] placeholder");
assert(!ownedHud.style.cssText.includes("right:10px") && !ownedHud.style.cssText.includes("top:10px"), "No-projection CTG state must not use the legacy upper-right position");

const promptSource = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-prompt.js"), "utf8");
const promptOwnerStart = promptSource.indexOf("function ensureDoomToposHud()");
const promptOwnerEnd = promptSource.indexOf("function createSensorToggleButton", promptOwnerStart);
const promptOwnerSource = promptSource.slice(promptOwnerStart, promptOwnerEnd);
assert(promptOwnerStart >= 0 && promptOwnerEnd > promptOwnerStart, "Prompt CTG ownership block should remain discoverable");
assert(promptOwnerSource.includes("doomToposHud.hidden = true"), "Pre-module prompt carrier must stay hidden until the pipeline panel owns rendering");
assert(promptOwnerSource.includes('doomToposHud.style.cssText = "display:none;"'), "Pre-module prompt carrier must have no visible fallback style");
assert(!promptOwnerSource.includes("right:10px;top:10px"), "Prompt must not recreate the legacy upper-right CTG panel");
assert(!promptOwnerSource.includes("panel module loading"), "Prompt must not publish a visible boxed loading placeholder");

const status = {
  autoplay: {
    enabled: true,
    objective: "locate-first-door-corridor",
    controlPipeline: "OpeningHome",
    spawnLandmarkRouteEvidence: 0.44,
    spawnLandmarkRouteKind: "spawn-center-anchor",
    milestones: {
      spawnLandmarkRouteEvidence: 0.44,
      spawnLandmarkRouteKind: "spawn-center-anchor",
      spawnCorridorGapScore: 0.2
    },
    compassSensor: {
      heading: 42,
      confidence: 0.51,
      headingReliability: "relative-stable",
      landmarkKind: "spawn-center-anchor",
      landmarkConfidence: 0.44
    },
    toposDecisionCarrier: {
      dominantAxis: "ETHOS",
      confidence: 0.76,
      source: "vector-superposition",
      feedbackApplied: true,
      feedbackReason: "logos-ethos-route-protected",
      decisionVector: {
        x: 0.38,
        y: 0.92,
        arrow: "^>",
        turn: "right",
        move: "forward"
      }
    },
    pipelineTrace: {
      version: "doom-pipeline-trace/v1",
      phase: "OpeningHome",
      objective: "locate-first-door-corridor",
      priority: 3,
      selectedAxis: "ETHOS",
      action: { signature: "forward/right" },
      stages: [
        { key: "aisthesis", label: "Aisthesis", active: true, signal: "sensors:5", score: 0.44 },
        { key: "topos", label: "Topos", active: true, signal: "ETHOS:^>", score: 0.76 },
        { key: "kinesis", label: "Kinesis", active: true, signal: "forward/right", score: 1 }
      ],
      route: [
        { key: "firstDoor", label: "First Door", active: true, complete: false, score: 0.44, signal: "spawn-center-anchor" },
        { key: "computerRoom", label: "Computer Room", active: false, complete: false, score: 0, signal: "advance" }
      ]
    }
  }
};

const simple = panel.formatToposHud(status, { detail: false });
assert(simple.includes("[CTG]"), "Simple panel should include CTG section");
assert(simple.includes("Dominant: ETHOS"), "Simple panel should show actual dominant axis");
assert(simple.includes("Route: Spawn Center Anchor (0.44)"), "Simple panel should show route evidence");
assert(simple.includes("[Pipeline]"), "Simple panel should include pipeline summary");
assert(simple.includes("Aisthesis > Topos > Kinesis"), "Simple panel should show active pipeline stages");

const detail = panel.formatToposHud(status, { detail: true });
assert(detail.includes("[CTG OBSERVED]"), "Detail panel should include observed CTG section");
assert(detail.includes("[CTG DECISION CARRIER]"), "Detail panel should include carrier section");
assert(detail.includes("[Hodos]"), "Detail panel should include Hodos section");
assert(detail.includes("Reliability: relative-stable"), "Detail panel should show heading reliability");
assert(detail.includes("[Pipeline]"), "Detail panel should include pipeline trace");
assert(detail.includes("* Topos 0.76 ETHOS:^>"), "Detail panel should show active Topos stage");
assert(detail.includes("[Route]"), "Detail panel should include route progress");
assert(detail.includes("active First Door 0.44 spawn-center-anchor"), "Detail panel should show first door route progress");

const zeroCarrierStatus = {
  autoplay: {
    enabled: true,
    objective: "find-corridor-to-first-door",
    controlPipeline: "demo-spawn-map-centerline",
    action: { move: "forward", turn: "none", use: false, fire: false },
    ctgObservedScores: {
      logos: 0,
      pathos: 0,
      ethos: 0,
      weights: { logos: 0, pathos: 0, ethos: 0 }
    },
    toposDecisionCarrier: {
      dominantAxis: "LOGOS",
      confidence: 0,
      decisionVector: { x: 0, y: 0, arrow: "-", move: "none", turn: "none" }
    },
    milestones: {
      spawnCorridorGapScore: 0.18,
      spawnLandmarkRouteEvidence: 0.35
    },
    compassSensor: {
      heading: 0,
      confidence: 0.5,
      headingReliability: "relative-stable"
    }
  }
};
const zeroCarrierPanel = panel.formatToposHud(zeroCarrierStatus, { detail: false });
assert(!zeroCarrierPanel.includes("W: L=0.00 P=0.00 E=0.00"), "Zero carrier scores should fall back to observed scores");
assert(zeroCarrierPanel.includes("Vector: ^"), "Zero decision vector should not hide the observed forward action");
assert(zeroCarrierPanel.includes("Route: Landmark Route (0.35)"), "Landmark route evidence should receive a readable route label");

const debugRouteStatus = {
  autoplay: {
    enabled: true,
    objective: "find-corridor-to-first-door",
    controlPipeline: "demo-spawn-map-corridor-sustain",
    action: { move: "forward", turn: "right" },
    debugRouteValues: {
      context: "open-space",
      spawnCorridorGapScore: 0.42,
      spawnSecretDoorScore: 0.06,
      spawnLandmarkRouteEvidence: 0
    },
    milestones: {},
    compassSensor: { confidence: 0.4, headingReliability: "relative-stable" }
  }
};
const debugRoutePanel = panel.formatToposHud(debugRouteStatus, { detail: false });
assert(debugRoutePanel.includes("Route: Corridor Gap (0.42)"), "Debug route gap evidence should surface in Topos route display");

const pipelineStateStatus = {
  renderer: "WebGpuComputeProvider(texture)",
  gpuDelegate: "WebGpuComputeProvider(browser-webgpu)",
  autoplay: {
    enabled: true,
    objective: "find-corridor-to-first-door",
    controlPipeline: "demo-spawn-map-centerline",
    vision: "webgpu-texture-binding",
    zeroCopy: true,
    framebuffer: {
      source: { kind: "webgpu-texture-binding", backend: "browser-webgpu" },
      zeroCopy: true
    },
    action: { move: "forward", turn: "right" },
    debugOverlay: {
      gpuHud: {
        enabled: true,
        cssOverlayMode: "reduced",
        summary: "hud=dto cells81 rect1 txt1 panel16 reduced",
        cells: Array.from({ length: 81 }, (_, index) => index === 40 ? 0.82 : 0.01),
        panelValues: Array.from({ length: 16 }, (_, index) => index === 0 ? 0.7 : 0.1),
        rectangles: [{ kind: "door", left: 32, top: 20, width: 24, height: 30, score: 0.82, alpha: 0.86 }],
        labels: [{ label: "DOOR", value: "score=0.82", className: "is-door" }]
      },
      gpuAisthesis: {
        enabled: true,
        inputTarget: "doom",
        hudTarget: "doom-hud",
        output: "heatmap+vector",
        summary: "gpu=dto m1 f81 vision-heatmap+edge-detect",
        zeroCopyReady: true,
        features: ["vision-heatmap", "edge-detect"],
        matrixCount: 1,
        matrixFloatCount: 81,
        matrixKinds: ["topos9x9"],
        matrixKindSummary: "matrices=topos9x9",
        bufferLayoutSummary: "matrix v1 stride0 max0; state16 v1 stride16 max1",
        matrices: [{ kind: "topos9x9", rows: 9, columns: 9, values: Array.from({ length: 81 }, () => 0.1) }],
        stateVector: Array.from({ length: 16 }, () => 0.1)
      },
      gpuSpatialReasoning: {
        enabled: true,
        inputSource: "doom.gpu.aisthesis.features",
        matrixSource: "doom.gpu.aisthesis.matrix",
        outputTarget: "doom.gpu.spatial.reasoning",
        readback: { wireName: "runtime-summary" },
        outputVectorLayout: { name: "spatial32" },
        matrixKindSummary: "matrices=topos9x9",
        featureFlagSummary: "reducers=topos-reduce+route-reduce",
        outputLayoutSummary: "spatial32 v1 stride32 max1",
        matrixCount: 1,
        matrixFloatCount: 81,
        featureCount: 2
      }
    },
    gpuHud: {
      hudCompositeActive: true,
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
      gpuAisthesis: {
        zeroCopyReady: true,
        infoBufferReady: true,
        computeReady: true,
        gpuComputeActive: true,
        featureBufferReady: true,
        featureReadbackReady: true,
        heatCellsGpuWritable: true,
        maskTextureReady: true,
        matrixSource: "dto-flat",
        matrixKindSummary: "matrices=topos9x9",
        bufferLayoutSummary: "matrix v1 stride0 max0; state16 v1 stride16 max1",
        lastSummary: {
          source: "doom.gpu.aisthesis.features",
          frame: 42,
          summary: {
            lumaAverage: 0.22,
            redMaximum: 0.81,
            edgeAverage: 0.33,
            cornerMaximum: 0.44
          }
        }
      },
      gpuSpatialReasoning: {
        enabled: true,
        computeReady: true,
        gpuComputeActive: true,
        outputBufferReady: true,
        featureInputReady: true,
        matrixInputReady: true,
        maskTextureInputReady: true,
        matrixCount: 1,
        matrixFloatCount: 81,
        featureCount: 2,
        outputVectorLayout: { name: "spatial32" },
        readback: { wireName: "runtime-summary" },
        matrixKindSummary: "matrices=topos9x9",
        featureFlagSummary: "reducers=topos-reduce+route-reduce",
        outputLayoutSummary: "spatial32 v1 stride32 max1",
        lastSummary: {
          source: "doom.gpu.spatial.reasoning",
          frame: 42,
          summary: {
            routeScore: 0.73,
            threatScore: 0.12,
            zoeScore: 0.04,
            recommendedYaw: -0.25,
            maskHeat: 0.52,
            maskRed: 0.31,
            maskEdge: 0.47,
            maskCorner: 0.18
          }
        }
      }
    },
    pipelineState: {
      aisthesis: {
        sensorReadings: {
          visual: 0.44,
          movement: 0.18,
          collision: 0,
          spatial: 0.42
        },
        routePlan: {
          firstDoorRouteEvidence: 0.42,
          firstDoorRouteEvidenceReady: true,
          routeMode: "door-approach",
          routeLoopKind: "slide-stall",
          routeLoopBudgetExceeded: true,
          routeSlideUsed: 8,
          routeSlideBudget: 6,
          routeDeadEndTrimRequired: true,
          routeActionHint: "advance-first-door",
          useProbeConfidence: 0.68
        }
      },
      noesis: {
        eventLabels: ["first-door-vision-approach", "gap-visible"],
        meaningVector4: [0.42, 0.30, 0.12, 0.08],
        topology: {
          wallDistanceNormalized: 0.44,
          centerlineDirectionX: -0.62,
          centerlineDirectionY: 0.38,
          barrelZoneEvidence: 0.62,
          corridorDirectionHintX: 0.54,
          corridorDirectionHintY: 0.54,
          centerCorridorAlignment: -0.13
        },
        phainesisEvents: {
          gap: 0.42,
          stuck: 0.02
        },
        nousVectors: {
          gapVector: 0.42
        }
      },
      krisis: {
        toposLabels: ["route-structural", "structural-follow"],
        toposVectors: {
          LogosVector: 0.64,
          EthosVector: 0.42
        },
        kairos: {
          logos: 0.64,
          pathos: 0.12,
          ethos: 0.42,
          selectedAxis: "logos"
        }
      },
      kinesis: {
        moveForward: true,
        turnYaw: 1,
        useKey: false,
        attackKey: false,
        actionRepeatFrames: 20,
        moveRepeatFrames: 20,
        turnRepeatFrames: 6,
        usePulseCooldownFrames: 45,
        usePulseSuppressedFrames: 3,
        lastUsePulsePrediction: 1201,
        sourceAxis: "logos",
        zoe: {
          vetoed: false,
          lethalRisk: 0
        }
      }
    },
    goalState: {
      telos: "FirstDoor"
    },
    autoplayState: {
      routeMode: "door-approach",
      currentRoute: "first-door-route",
      currentLandmark: "spawn-corridor-gap"
    },
    milestones: {
      spawnCorridorGapScore: 0.42
    },
    compassSensor: { confidence: 0.4, headingReliability: "relative-stable" }
  }
};
const pipelineStatePanel = panel.formatToposHud(pipelineStateStatus, { detail: false });
assert(pipelineStatePanel.includes("[CTG SIMPLE]"), "PipelineState simple mode should render the compact CTG summary");
assert(pipelineStatePanel.includes("[A] First Door Route 0.00 loop=Slide Stall! 8/6 trim"), "Simple mode should show the Aisthesis route, loop state, and trim hint");
assert(pipelineStatePanel.includes("hud=dto cmp cells81 rect1 txt1 panel16 reduced"), "Simple mode should expose canonical GPU HUD DTO status");
assert(pipelineStatePanel.includes("[G] GPU | B:zcp H:gpu S:gpu"), "Simple mode should expose unified GPU path status");
assert(pipelineStatePanel.includes("[N] First Door Vision Approach > Gap Visible wall=0.44 barrel=0.62 align=-0.13 clear"), "Simple mode should show Noesis labels and topology status");
assert(pipelineStatePanel.includes("[Kr] LOGOS L=0.64 P=0.12 E=0.42"), "Simple mode should show Krisis axis weights");
assert(pipelineStatePanel.includes("[Ki] forward(20)/right(6) Zoe=clear"), "Simple mode should show Kinesis action repeat counters");
assert(pipelineStatePanel.includes("Use=cd=45 sup=3 last=1201"), "Simple mode should show Use pulse-gate state");

const rootGpuHudStatus = {
  gpuHud: {
    hudCompositeActive: true,
    cssOverlayMode: "reduced",
    summary: "hud=root cells81 rect1 txt1 panel16 reduced",
    cells: Array.from({ length: 81 }, () => 0.05),
    panelValues: Array.from({ length: 16 }, () => 0.2),
    rectangles: [{ kind: "door", left: 10, top: 12, width: 8, height: 12 }],
    labels: [{ label: "ROOT", value: "ok", className: "is-root" }]
  },
  autoplay: {
    enabled: true,
    pipelineState: pipelineStateStatus.autoplay.pipelineState,
    autoplayState: pipelineStateStatus.autoplay.autoplayState
  }
};
const rootGpuHudPanel = panel.formatToposHud(rootGpuHudStatus, { detail: false });
assert(rootGpuHudPanel.includes("hud=root cmp cells81 rect1 txt1 panel16 reduced"), "Pipeline panel should read root status.gpuHud when autoplay.gpuHud is absent");

const pipelineStateDetailPanel = panel.formatToposHud(pipelineStateStatus, { detail: true });
assert(pipelineStateDetailPanel.includes("[Aisthesis]"), "PipelineState detail should render the Aisthesis layer");
assert(pipelineStateDetailPanel.includes("[Noesis]"), "PipelineState detail should render the Noesis layer");
assert(pipelineStateDetailPanel.includes("[Krisis]"), "PipelineState detail should render the Krisis layer");
assert(pipelineStateDetailPanel.includes("[Kinesis]"), "PipelineState detail should render the Kinesis layer");
assert(pipelineStateDetailPanel.includes("Labels: First Door Vision Approach > Gap Visible"), "PipelineState detail should render Noesis event labels");
assert(pipelineStateDetailPanel.includes("Vector4: [0.42,0.30,0.12,0.08]"), "PipelineState detail should render Noesis compact Vector4");
assert(pipelineStateDetailPanel.includes("Topology: wall=0.44 barrel=0.62 align=-0.13 risk=clear center=(-0.62,0.38) corridor=(0.54,0.54)"), "PipelineState detail should render Noesis topology projection");
assert(pipelineStateDetailPanel.includes("Axis LOGOS"), "PipelineState selected axis should render without JS inference");
assert(pipelineStateDetailPanel.includes("Topos Labels: Route Structural > Structural Follow"), "PipelineState detail should render Topos labels");
assert(pipelineStateDetailPanel.includes("Route: First Door Route mode=Door Approach"), "PipelineState detail should render route mode from DTO");
assert(pipelineStateDetailPanel.includes("Loop: Slide Stall! 8/6"), "PipelineState detail should render loop budget exhaustion");
assert(pipelineStateDetailPanel.includes("Hint: Advance First Door useProbe=0.68 trim=yes"), "PipelineState detail should render route hint, UseProbe confidence, and trim state from DTO");
assert(pipelineStateDetailPanel.includes("GPU Path: game=GPU; bonsai=zcp; hud=gpu; sensor=gpu"), "PipelineState detail should render the unified GPU path status");
assert(pipelineStateDetailPanel.includes("GPU HUD: hud=dto cmp cells81 rect1 txt1 panel16 reduced"), "PipelineState detail should render GPU HUD DTO projection status");
assert(pipelineStateDetailPanel.includes("GPU Aisthesis: gpu=zero ctl cmp vec rb heat mask flat m1 f81 vision-heatmap+edge-detect"), "PipelineState detail should render GPU Aisthesis provider readiness, mask texture readiness, flattened matrix source, and matrix float count");
assert(pipelineStateDetailPanel.includes("matrices=topos9x9"), "PipelineState detail should render canonical GPU Aisthesis matrix kind diagnostics");
assert(pipelineStateDetailPanel.includes("layout=matrix v1 stride0 max0; state16 v1 stride16 max1"), "PipelineState detail should render canonical GPU Aisthesis buffer layout diagnostics");
assert(pipelineStateDetailPanel.includes("GPU Spatial: spatial=gpu in mat mask cmp out m1 f81 feat2 spatial32 rb=runtime-summary"), "PipelineState detail should render GPU Spatial Reasoning provider readiness, mask texture input, and compact readback policy");
assert(pipelineStateDetailPanel.includes("reducers=topos-reduce+route-reduce"), "PipelineState detail should render canonical GPU Spatial reducer diagnostics");
assert(pipelineStateDetailPanel.includes("layout=spatial32 v1 stride32 max1"), "PipelineState detail should render canonical GPU Spatial output layout diagnostics");
assert(pipelineStateDetailPanel.includes("luma=0.22 red=0.81 edge=0.33 corner=0.44"), "PipelineState detail should render the latest GPU Aisthesis readback summary when available");
assert(pipelineStateDetailPanel.includes("route=0.73 threat=0.12 zoe=0.04 yaw=-0.25 mask=0.52/0.31/0.47/0.18"), "PipelineState detail should render the latest GPU Spatial Reasoning readback summary and reduced mask channels when available");
assert(pipelineStateDetailPanel.includes("Action: forward(20)/right(6)"), "PipelineState detail action should render Kinesis component repeat counters");
assert(pipelineStateDetailPanel.includes("Use Pulse: cd=45 sup=3 last=1201"), "PipelineState detail should render bounded Use pulse diagnostics");

const dtoEnemyCue = panel.resolveEnemyCue({
  debugOverlay: {
    enemyCircle: {
      type: "audio",
      yaw: 22,
      direction: "right",
      confidence: 0.61,
      audioConfidence: 0.61,
      visualConfidence: 0,
      active: true
    }
  },
  enemyConfidence: 0.04,
  audioEnemyConfidence: 0.02,
  enemyCombatYaw: -8
});
assert(dtoEnemyCue.type === "audio", "Enemy cue should prefer the structured DebugOverlay DTO over raw values");
assert(dtoEnemyCue.text.includes("Audio=0.61 yaw=22"), "Enemy cue should render DTO confidence and yaw");

const dtoSuppressedEnemyCue = panel.resolveEnemyCue({
  debugOverlay: {
    regions: []
  },
  enemyConfidence: 0.32,
  visualEnemyConfidence: 0.32,
  audioEnemyConfidence: 0,
  visualEnemyFireReady: true,
  enemyCombatYaw: 0
});
assert(dtoSuppressedEnemyCue.active === false, "Enemy cue should respect DebugOverlay suppression when no structured enemy circle is present");
assert(dtoSuppressedEnemyCue.text === "calm", "Suppressed DebugOverlay enemy cue should render as calm");

const secretDoorStatus = {
  autoplay: {
    enabled: true,
    objective: "find-corridor-to-first-door",
    controlPipeline: "demo-spawn-map-centerline",
    action: { move: "back", turn: "right" },
    debugRouteValues: {
      context: "wall",
      spawnCorridorGapScore: 0.12,
      spawnSecretDoorScore: 0.72,
      spawnLandmarkRouteEvidence: 0
    },
    milestones: {},
    compassSensor: { confidence: 0.34, headingReliability: "relative-stable" }
  }
};
const secretDoorPanel = panel.formatToposHud(secretDoorStatus, { detail: false });
assert(secretDoorPanel.includes("Route: Rear Landmark Avoidance (0.72)"), "Spawn secret-door evidence should render as route avoidance, not a target route");
assert(!secretDoorPanel.includes("Secret Door Anchor"), "Spawn secret-door evidence should not look like a route objective");

const canonicalMoribundPanel = panel.formatToposHud({
  autoplay: {
    enabled: true,
    healthFaceLifePhase: "moribund",
    healthFaceLifeLevel: 1,
    healthSensor: {
      faceHeartbeatAlive: false,
      healthFaceHeartbeatAlive: true,
      faceLifeTemplatePhase: "healthy",
      healthFaceLifeTemplatePhase: "healthy",
      faceLifeTemplateLevel: 5,
      healthFaceLifeTemplateLevel: 5
    },
    pipelineState: {
      aisthesis: {},
      noesis: {},
      krisis: { kairos: {} },
      kinesis: { zoe: { faceLifePhase: "healthy", faceLifeLevel: 5 } }
    }
  }
}, { detail: false });
assert(canonicalMoribundPanel.includes("heart 1 fade0.00"), "Canonical stabilized face life and explicit no-heartbeat should beat stale Zoe/template healthy aliases");

const invulnerablePanel = panel.formatToposHud({
  autoplay: {
    enabled: true,
    healthFaceLifePhase: "invulnerable",
    healthFaceLifeLevel: 5,
    healthSensor: {
      faceHeartbeatAlive: false,
      healthFaceHeartbeatAlive: true,
      faceLifeTemplatePhase: "moribund",
      faceLifeTemplateLevel: 1
    },
    pipelineState: {
      aisthesis: {},
      noesis: {},
      krisis: { kairos: {} },
      kinesis: { zoe: {} }
    }
  }
}, { detail: false });
assert(invulnerablePanel.includes("heart ∞ hb"), "Explicit canonical invulnerability should retain its infinity heartbeat glyph");

const csharpOnlyStatus = {
  autoplay: {
    enabled: true,
    controller: "csharp-post-computer-room",
    objective: "reach-central-hall",
    pipelineState: null,
    csharpFirstDoor: {
      state: "Complete",
      ownerId: "first-door.computer-room-confirmation",
      ownershipDisposition: "Completed",
      nativeDeathConfirmed: false,
      restartRequested: false,
      vitalityTrace: {
        available: true,
        fresh: true,
        playerHealth: 17,
        playerState: 0
      }
    },
    csharpPostComputerRoom: {
      state: "Navigate",
      ownerId: "post-computer-room.main-route",
      ownershipDisposition: "Exclusive",
      reasonCode: "canonical-waypoint-advance",
      exclusive: true,
      runRequested: true,
      action: {
        moveForward: true,
        moveBackward: false,
        strafeLeft: false,
        strafeRight: false,
        turnYaw: -6,
        useKey: false,
        attackKey: false
      },
      semanticProjection: {
        telos: "CentralHall",
        objective: "reach-central-hall",
        computerRoomEntered: true,
        centralHallEntered: false
      },
      navigation: {
        status: "Active",
        nativeGametic: 2456,
        playerSectorIndex: 71,
        targetDistance: 48.5,
        poseMissingFrames: 0,
        legIndex: 7,
        legId: "sector-71-south-lane",
        routeFrames: 599,
        routeTimeoutFrames: 900,
        legFrames: 172,
        legTimeoutFrames: 180,
        nativeActorTargetIdentity: 1234,
        nativeActorTargetSectorIndex: 60,
        nativeActorTargetHealth: 5,
        nativeActorTargetRetained: true,
        nativeActorTargetLineOfSight: true,
        nativeActorKillConfirmed: false,
        nativeWeaponFireOpportunity: false,
        nativeActorCombatReason: "weapon-cycle-busy"
      }
    }
  }
};
const csharpProjection = panel.resolveCSharpHudProjection(csharpOnlyStatus.autoplay);
assert(csharpProjection?.source === "post-computer-room", "C# HUD projection should mechanically prefer the current post-COMPUTERROOM decision");
assert(csharpProjection?.decision === csharpOnlyStatus.autoplay.csharpPostComputerRoom, "C# HUD projection must retain the authoritative decision object without recomputing behavior");

panel.renderToposHud(ownedHud, csharpOnlyStatus, { force: true });
assert(ownedHud.hidden === false, "An active C# projection must reveal the pipeline-owned lower CTG carrier");
assert(ownedHud.getAttribute("aria-hidden") === "false", "An active C# projection must restore the lower CTG to accessibility output");
assert(ownedHud.dataset.ctgLayout === "gpu-panel", "The adopted prompt carrier must switch directly from hidden to the lower CTG layout");
assert(!ownedHud.style.cssText.includes("right:10px;top:10px"), "The adopted prompt carrier must never pass through the legacy upper-right layout");

const fakeDocument = createFakeDocument();
const csharpHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(csharpHudNode, csharpOnlyStatus, { force: true });
assert(csharpHudNode.dataset.ctgLayout === "gpu-panel", "C# exact control without PipelineState must retain the lower GPU-panel layout");
assert(csharpHudNode.dataset.ctgSource === "csharp-post-computer-room", "C# HUD should identify its mechanical source decision");
assert(csharpHudNode.classList.contains("is-thought-grid"), "C# exact control should render the thought-grid container");
assert(csharpHudNode.style.cssText.includes("position:absolute;inset:0"), "C# exact control should occupy the canonical full overlay used by the lower panel cards");
assert(!csharpHudNode.style.cssText.includes("right:10px;top:10px"), "C# exact control must not fall back to the legacy upper-right CTG panel");
const csharpCards = csharpHudNode.children.filter(child => child.dataset?.hudPanel);
assert(csharpCards.length === 7, "C# exact control should render all seven lower HUD cards");
const cardByKey = key => csharpCards.find(card => card.dataset.hudPanel === key);
assert(cardByKey("aisthesis")?.textContent.includes("sector=71 distance=48.5"), "Aisthesis card should transport native C# navigation facts");
assert(cardByKey("noesis")?.textContent.includes("TELOS=CentralHall objective=reach-central-hall"), "Noesis card should transport the C# semantic projection without inference");
assert(cardByKey("krisis")?.textContent.includes("owner=post-computer-room.main-route"), "Krisis card should transport C# ownership facts");
assert(cardByKey("kinesis")?.textContent.includes("forward yaw=-6"), "Kinesis card should transport the authoritative C# action");
assert(cardByKey("route")?.textContent.includes("route=599/900"), "Route card should transport the unchanged C# route budget");
assert(cardByKey("route")?.textContent.includes("legFrames=172/180"), "Route card should transport the unchanged C# leg budget");
assert(cardByKey("combat")?.textContent.includes("retained=true los=true kill=false"), "Combat card should transport retained-target C# facts");
assert(cardByKey("combat")?.textContent.includes("fireOpportunity=false reason=weapon-cycle-busy"), "Combat card should transport the native weapon-cycle decision facts");
assert(cardByKey("zoe")?.textContent.includes("health=17 playerState=0"), "Zoe card should transport authoritative C# vitality facts");

const continuationDecision = {
  state: "NavigateExitDoor",
  ownerId: "e1m1-continuation.exclusive",
  ownershipDisposition: "Exclusive",
  reasonCode: "exit-door-canonical-route",
  exclusive: true,
  runRequested: true,
  nativeGametic: 3012,
  nativeDeathConfirmed: false,
  restartRequested: false,
  action: {
    moveForward: true,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  navigation: {
    active: true,
    legIndex: 10,
    legId: "sector-74-south-clearance",
    targetDistance: 31.5,
    routeFrames: 412,
    routeTimeoutFrames: 900,
    legFrames: 28,
    legTimeoutFrames: 180,
    poseMissingFrames: 0,
    pose: {
      nativeGametic: 3012,
      playerSectorIndex: 74
    }
  },
  semanticProjection: {
    telos: "ExitRoom",
    objective: "reach-exit-door",
    doorOpenedCount: 2
  },
  gatekeeperTrace: {
    acquiredAlive: true,
    identity: 4321,
    expectedSectorIndex: 74,
    health: -10,
    lineOfSight: false,
    killed: true,
    reason: "canonical-gatekeeper-death-and-killcount-confirmed"
  },
  threatTrace: {
    threatMatched: false,
    identity: 0,
    sectorIndex: -1,
    health: 0,
    lineOfSight: false,
    stationaryFireAuthorized: false,
    reason: "fresh-route-threat-not-present"
  },
  vitalityTrace: {
    available: true,
    fresh: true,
    playerHealth: 41,
    playerState: 0
  }
};
const continuationStatus = {
  autoplay: Object.assign({}, csharpOnlyStatus.autoplay, {
    csharpE1M1Continuation: continuationDecision
  })
};
const continuationProjection = panel.resolveCSharpHudProjection(continuationStatus.autoplay);
assert(continuationProjection?.source === "e1m1-continuation", "The lower CTG must prefer the active C# E1M1 continuation owner");
assert(continuationProjection?.decision === continuationDecision, "The continuation HUD must retain the exact authoritative C# decision object");
const continuationHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(continuationHudNode, continuationStatus, { force: true });
assert(continuationHudNode.dataset.ctgLayout === "gpu-panel", "E1M1 continuation must retain the lower GPU-panel layout");
assert(continuationHudNode.dataset.ctgSource === "csharp-e1m1-continuation", "The lower CTG must identify the continuation decision source");
assert(!continuationHudNode.style.cssText.includes("right:10px;top:10px"), "E1M1 continuation must not resurrect the legacy upper-right CTG panel");
const continuationCards = continuationHudNode.children.filter(child => child.dataset?.hudPanel);
assert(continuationCards.length === 7, "E1M1 continuation must render all seven lower CTG cards");
const continuationCard = key => continuationCards.find(card => card.dataset.hudPanel === key);
assert(continuationCard("aisthesis")?.textContent.includes("sector=74 distance=31.5"), "Continuation Aisthesis must project nested native pose facts");
assert(continuationCard("noesis")?.textContent.includes("TELOS=ExitRoom objective=reach-exit-door"), "Continuation Noesis must project C# TELOS without inference");
assert(continuationCard("combat")?.textContent.includes("target=n/a sector=n/a hp=n/a"), "A killed gatekeeper with no retained threat must not remain an active HUD target");
assert(continuationCard("combat")?.textContent.includes("kill=true"), "Continuation Combat must retain the required gatekeeper kill proof");
assert(continuationCard("zoe")?.textContent.includes("health=41 playerState=0"), "Continuation Zoe must project current native C# vitality");

const completedContinuationStatus = {
  autoplay: Object.assign({}, continuationStatus.autoplay, {
    pipelineState: pipelineStateStatus.autoplay.pipelineState,
    csharpE1M1Continuation: Object.assign({}, continuationDecision, {
      state: "Complete",
      ownerId: "e1m1-continuation.completed",
      ownershipDisposition: "Completed",
      reasonCode: "e1m1-level-completion-confirmed",
      exclusive: false,
      runRequested: false,
      navigation: Object.assign({}, continuationDecision.navigation, { active: false }),
      semanticProjection: {
        telos: "E1M1Complete",
        objective: "level-completed",
        doorOpenedCount: 3,
        levelCompleted: true
      }
    })
  })
};
const completedContinuationHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(completedContinuationHudNode, completedContinuationStatus, { force: true });
assert(completedContinuationHudNode.dataset.ctgSource === "csharp-e1m1-continuation", "terminal E1M1 completion must keep the C# continuation in the lower CTG instead of reviving a stale legacy panel");
assert(completedContinuationHudNode.dataset.ctgLayout === "gpu-panel", "terminal E1M1 completion must retain the canonical lower CTG layout");
assert(!completedContinuationHudNode.style.cssText.includes("right:10px;top:10px"), "terminal E1M1 completion must not revive the upper-right CTG fallback");

const csharpWithLatchedLegacyPipeline = {
  autoplay: Object.assign({}, csharpOnlyStatus.autoplay, {
    pipelineState: pipelineStateStatus.autoplay.pipelineState
  })
};
const latchedPipelineHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(latchedPipelineHudNode, csharpWithLatchedLegacyPipeline, { force: true });
assert(latchedPipelineHudNode.dataset.ctgSource === "csharp-post-computer-room", "An authoritative C# decision must replace a latched legacy PipelineState in the lower HUD");
assert(latchedPipelineHudNode.children.filter(child => child.dataset?.hudPanel).length === 7, "Latched legacy PipelineState must not hide the seven C# decision cards");

const legacyOwnedPipelineStatus = {
  autoplay: Object.assign({}, csharpWithLatchedLegacyPipeline.autoplay, {
    csharpPostComputerRoom: null,
    csharpFirstDoor: Object.assign({}, csharpOnlyStatus.autoplay.csharpFirstDoor, {
      ownershipDisposition: "NotAcquired"
    })
  })
};
const legacyOwnedHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(legacyOwnedHudNode, legacyOwnedPipelineStatus, { force: true });
assert(legacyOwnedHudNode.dataset.ctgSource !== "csharp-first-door", "A NotAcquired C# decision must not displace the active legacy PipelineState HUD owner");

const completedHandoffPipelineStatus = {
  autoplay: Object.assign({}, csharpWithLatchedLegacyPipeline.autoplay, {
    csharpPostComputerRoom: Object.assign({}, csharpOnlyStatus.autoplay.csharpPostComputerRoom, {
      state: "Complete",
      ownershipDisposition: "Completed",
      exclusive: false,
      completed: true,
      action: {
        moveForward: false,
        moveBackward: false,
        strafeLeft: false,
        strafeRight: false,
        turnYaw: 0,
        useKey: false,
        attackKey: false
      }
    })
  })
};
const completedHandoffHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(completedHandoffHudNode, completedHandoffPipelineStatus, { force: true });
assert(completedHandoffHudNode.dataset.ctgSource !== "csharp-post-computer-room", "A Completed C# handoff must not hide the current next-owner PipelineState/action");

const firstDoorOnlyStatus = {
  autoplay: {
    enabled: true,
    controller: "csharp-first-door",
    pipelineState: null,
    csharpFirstDoor: {
      state: "Approach",
      ownerId: "first-door.opening-transit",
      ownershipDisposition: "Exclusive",
      reasonCode: "opening-navigation-advance",
      exclusive: true,
      runRequested: false,
      action: {
        moveForward: true,
        moveBackward: false,
        strafeLeft: false,
        strafeRight: false,
        turnYaw: 0,
        useKey: false,
        attackKey: false
      },
      openingNavigation: {
        status: "Navigating",
        nativeGametic: 412,
        playerSectorIndex: 1,
        targetDistance: 96,
        poseMissingFrames: 0,
        legIndex: 2,
        legId: "opening-corridor",
        routeFrames: 88,
        routeTimeoutFrames: 256,
        legFrames: 44,
        legTimeoutFrames: 96
      },
      vitalityTrace: {
        available: true,
        fresh: true,
        playerHealth: 100,
        playerState: 0
      },
      nativeDeathConfirmed: false,
      restartRequested: false
    }
  }
};
const firstDoorHudNode = createFakeElement("div", fakeDocument);
panel.renderToposHud(firstDoorHudNode, firstDoorOnlyStatus, { force: true });
assert(firstDoorHudNode.dataset.ctgLayout === "gpu-panel", "C# FirstDoor exact control without PipelineState must retain the lower GPU-panel layout");
assert(firstDoorHudNode.dataset.ctgSource === "csharp-first-door", "FirstDoor HUD should identify the authoritative C# source");
const firstDoorCards = firstDoorHudNode.children.filter(child => child.dataset?.hudPanel);
assert(firstDoorCards.length === 7, "C# FirstDoor exact control should render all seven lower HUD cards");
assert(!firstDoorHudNode.style.cssText.includes("right:10px;top:10px"), "C# FirstDoor exact control must not use the legacy upper-right CTG panel");
assert(firstDoorCards.find(card => card.dataset.hudPanel === "combat")?.textContent.includes("target=n/a sector=n/a hp=n/a"), "Missing C# combat facts must remain unavailable instead of being synthesized as zero");

console.log("DOOM_PIPELINE_PANEL_VM_TEST_OK", { simple, detail });

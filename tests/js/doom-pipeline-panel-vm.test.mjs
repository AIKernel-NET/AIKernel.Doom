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

console.log("DOOM_PIPELINE_PANEL_VM_TEST_OK", { simple, detail });

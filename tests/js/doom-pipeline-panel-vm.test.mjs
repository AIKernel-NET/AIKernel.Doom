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
  String
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-pipeline-panel.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-pipeline-panel.js" });

const panel = context.self.AIKernelDoomPipelinePanel;
assert(panel?.formatToposHud, "Pipeline panel should expose formatToposHud");
assert(panel?.resolveObservedScores, "Pipeline panel should expose observed score projection");

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
  autoplay: {
    enabled: true,
    objective: "find-corridor-to-first-door",
    controlPipeline: "demo-spawn-map-centerline",
    action: { move: "forward", turn: "right" },
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
          routeActionHint: "advance-first-door",
          useProbeConfidence: 0.68
        }
      },
      noesis: {
        eventLabels: ["first-door-vision-approach", "gap-visible"],
        meaningVector4: [0.42, 0.30, 0.12, 0.08],
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
assert(pipelineStatePanel.includes("[Aisthesis]"), "PipelineState should render the Aisthesis layer");
assert(pipelineStatePanel.includes("[Noesis]"), "PipelineState should render the Noesis layer");
assert(pipelineStatePanel.includes("[Krisis]"), "PipelineState should render the Krisis layer");
assert(pipelineStatePanel.includes("[Kinesis]"), "PipelineState should render the Kinesis layer");
assert(pipelineStatePanel.includes("Labels: First Door Vision Approach > Gap Visible"), "PipelineState should render Noesis event labels");
assert(pipelineStatePanel.includes("Vector4: [0.42,0.30,0.12,0.08]"), "PipelineState should render Noesis compact Vector4");
assert(pipelineStatePanel.includes("Axis LOGOS"), "PipelineState selected axis should render without JS inference");
assert(pipelineStatePanel.includes("Topos Labels: Route Structural > Structural Follow"), "PipelineState should render Topos labels");
assert(pipelineStatePanel.includes("Route: First Door Route mode=Door Approach"), "PipelineState should render route mode from DTO");
assert(pipelineStatePanel.includes("Loop: Slide Stall! 8/6"), "PipelineState should render loop budget exhaustion");
assert(pipelineStatePanel.includes("Hint: Advance First Door useProbe=0.68"), "PipelineState should render route hint and UseProbe confidence from DTO");
assert(pipelineStatePanel.includes("Action: forward(20)/right(6)"), "PipelineState action should render Kinesis component repeat counters");

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

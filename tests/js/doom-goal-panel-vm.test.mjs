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
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "doom-goal-panel.js"), "utf8");
vm.runInContext(source, context, { filename: "doom-goal-panel.js" });

const panel = context.self.AIKernelDoomGoalPanel;
assert(panel?.version === "20260619-goalpanel2", "Goal panel should expose the current version");
assert(panel.resolveTelosObjective, "Goal panel should expose TELOS resolver");
assert(panel.resolvePriorityAction, "Goal panel should expose PRIORITY resolver");
assert(panel.resolveGoalState, "Goal panel should expose DTO resolver");

const dtoAutoplay = {
  enabled: true,
  goalState: {
    telos: "FirstDoor",
    objective: "Find Door Corridor",
    priorityAxis: "Logos",
    priority: "[L] Approach Target",
    kairosSignal: "Kairos: Logos 0.64",
    subObjectives: [
      { kind: "objective", label: "Find Door Corridor" },
      { kind: "kairos", label: "Kairos: Logos 0.64" }
    ]
  }
};
assert(panel.resolveTelosObjective(dtoAutoplay) === "FirstDoor", "Goal panel should render TELOS from DTO");
assert(panel.resolvePrimaryObjective(dtoAutoplay) === "Find Door Corridor", "Goal panel should render objective from DTO");
assert(panel.resolvePriorityPrefix(dtoAutoplay) === "L", "Goal panel should render priority axis from DTO");
assert(panel.resolvePriorityAction(dtoAutoplay) === "[L] Approach Target", "Goal panel should render PRIORITY from DTO");
assert(panel.resolveSubObjectives(dtoAutoplay).length === 2, "Goal panel should render DTO sub chips");

const spawnAutoplay = {
  enabled: true,
  objective: "find-corridor-to-first-door",
  controlPipeline: "demo-spawn-map-centerline",
  milestones: {}
};
assert(panel.resolveTelosObjective(spawnAutoplay) === "FirstDoor", "Demo spawn route should keep TELOS locked on FirstDoor");
assert(panel.resolvePrimaryObjective(spawnAutoplay) === "Find Door Corridor", "Primary objective should be readable");

const computerRoomAutoplay = {
  enabled: true,
  objective: "enter-computer-control-room",
  controlPipeline: "ComputerRoom",
  milestones: { doorOpened: 1, computerRoomEntered: true }
};
assert(panel.resolveTelosObjective(computerRoomAutoplay) === "ComputerRoom", "Opened door milestone should unlock ComputerRoom TELOS");

const pathosAutoplay = {
  enabled: true,
  safetyReason: "pathos-stall-wall-follow",
  mobilityMode: "wall-follow",
  currentAction: { move: "back", turn: "right" },
  toposDecisionCarrier: { dominantAxis: "PATHOS" }
};
assert(panel.resolvePriorityPrefix(pathosAutoplay) === "P", "PATHOS carrier should map to priority prefix P");
assert(panel.resolvePriorityAction(pathosAutoplay) === "[P] Avoid Threat", "PATHOS priority should prefer avoid threat");

const ethosAutoplay = {
  enabled: true,
  safetyReason: "ethos-route-protected",
  mobilityMode: "goal-route",
  currentAction: { move: "forward", turn: "right" },
  toposDecisionCarrier: { dominantAxis: "ETHOS" }
};
assert(panel.resolvePriorityPrefix(ethosAutoplay) === "E", "ETHOS carrier should map to priority prefix E");
assert(panel.resolvePriorityAction(ethosAutoplay) === "[E] Pursue Goal", "ETHOS priority should display goal pursuit");

const useAutoplay = {
  enabled: true,
  objective: "open-first-door",
  firstDoorUseLatchFrames: 8,
  currentAction: { use: true },
  activeDetections: ["door", "audio"]
};
const subObjectives = panel.resolveSubObjectives(useAutoplay);
assert(subObjectives.some(item => item.label === "Open First Door"), "Sub objectives should include canonical objective label");
assert(subObjectives.some(item => item.label === "Kairos: Use Latch 8"), "Sub objectives should include Kairos use latch");
assert(panel.resolvePriorityAction(useAutoplay).includes("Use / Open"), "Use action should display an open command");

console.log("DOOM_GOAL_PANEL_VM_TEST_OK", {
  telos: panel.resolveTelosObjective(spawnAutoplay),
  primary: panel.resolvePrimaryObjective(spawnAutoplay),
  priority: panel.resolvePriorityAction(pathosAutoplay)
});

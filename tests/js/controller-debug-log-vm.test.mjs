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
  window: {},
  Date,
  Math,
  Number,
  Object,
  Set,
  String
};
const context = vm.createContext(sandbox);
const source = readFileSync(
  path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/js/doom-controller-debug-log.js"),
  "utf8"
);
vm.runInContext(source, context, { filename: "doom-controller-debug-log.js" });

const adapter = context.window.AIKernelDoomControllerDebugLog;
assert(adapter?.entriesFromDecisionTrace, "controller debug log adapter was not exported");

const entries = adapter.entriesFromDecisionTrace({
  predictions: 7,
  entries: [
    { category: "priority", code: "P", message: "priority 10", value: 10, level: "active" },
    { category: "telos", code: "T", message: "reach-bridge", level: "selected" },
    { category: "objective", code: "O", message: "bridge-route", level: "ready" }
  ]
}, "auto=on manual=false sense=false hud=adaptive", "autoplay-predicted");

assert(entries.length === 4, "decision trace entries should include control option telemetry");
assert(entries[0].category === "priority" && entries[0].label === "P", "priority entry should keep P glyph");
assert(entries[0].level === "ok", "active trace level should normalize to ok");
assert(entries[1].category === "telos" && entries[1].label === "T", "telos entry should keep T glyph");
assert(entries[2].category === "objective" && entries[2].label === "O", "objective entry should keep O glyph");
assert(entries[3].category === "control" && entries[3].message.includes("autoplay-predicted"), "control option entry should include reason");
assert(adapter.entryMatches(entries[0], "priority"), "priority filter should match priority entries");
assert(adapter.categoryGlyph(entries[1]) === "T", "glyph helper should render telos as T");

const actionEntry = adapter.actionEntryFromStatus({
  state: "running",
  frameCount: 123,
  autoplay: {
    enabled: true,
    predictions: 42,
    controlPipeline: "ComputerRoom",
    objective: "reach-central-hall",
    strategyContext: "post-door-straight",
    action: { move: "forward", turn: "right", run: true, use: false, fire: false },
    actionRepeatFrames: 18,
    moveRepeatFrames: 18,
    repeatTurnFrames: 4,
    useCooldown: 7
  }
}, "autoplay-tick");

assert(actionEntry.category === "action", "runtime action entry should use action category");
assert(actionEntry.commandSignature === "forward+turn:right+run", "action signature should preserve movement command");
assert(actionEntry.message.includes("#42 forward+turn:right+run"), "action entry should expose prediction and command sequence");
assert(actionEntry.message.includes("rep=18"), "action entry should expose same-action repeat frames");
assert(actionEntry.message.includes("stage=post-door-straight"), "action entry should expose decision stage");
assert(adapter.entryMatches(actionEntry, "action"), "action filter should match command trace entries");
assert(adapter.categoryGlyph(actionEntry) === "A", "glyph helper should render action entries as A");

console.log("CONTROLLER_DEBUG_LOG_VM_TEST_OK", {
  entries: entries.length,
  first: entries[0].label,
  control: entries[3].label,
  action: actionEntry.commandSignature
});

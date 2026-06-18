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

console.log("CONTROLLER_DEBUG_LOG_VM_TEST_OK", {
  entries: entries.length,
  first: entries[0].label,
  control: entries[3].label
});

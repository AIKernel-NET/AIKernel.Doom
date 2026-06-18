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

let now = 100;
const scheduled = [];
const sandbox = {
  window: {},
  Date,
  Math,
  Number,
  Object,
  String,
  performance: { now: () => now }
};
sandbox.window.setTimeout = (callback, delay) => {
  scheduled.push({ callback, delay });
  return scheduled.length;
};
sandbox.window.requestAnimationFrame = callback => {
  scheduled.push({ callback, delay: 0 });
  return scheduled.length;
};

const context = vm.createContext(sandbox);
const source = readFileSync(
  path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/js/doom-runtime-status-flow.js"),
  "utf8"
);
vm.runInContext(source, context, { filename: "doom-runtime-status-flow.js" });

const statusFlow = context.window.AIKernelDoomRuntimeStatusFlow;
assert(statusFlow?.createFlow, "runtime status flow adapter was not exported");
assert(statusFlow.hudIntervalMs({ fps: 10, targetFps: 30 }) === 250, "low fps should slow HUD updates");
assert(statusFlow.hudIntervalMs({ hudFlowControl: { minIntervalMs: 5 } }) === 16, "configured interval should clamp to minimum");
assert(statusFlow.isSensorStatusReason("visual-sensor-on"), "sensor status reasons should be light path");
assert(statusFlow.isUrgentReason("autoplay-predicted"), "autoplay statuses should be urgent");

const updates = [];
const lights = [];
const flow = statusFlow.createFlow({
  now: () => now,
  schedule(callback, delay) {
    scheduled.push({ callback, delay });
    return scheduled.length;
  }
});
const callbacks = {
  update: (status, reason) => updates.push({ status, reason }),
  light: (status, reason) => lights.push({ status, reason })
};

flow.queue({ fps: 30, targetFps: 30 }, "status", callbacks);
scheduled.shift().callback();
assert(updates.length === 1, "first regular status should paint once enough time elapsed");

now = 120;
flow.queue({ fps: 30, targetFps: 30 }, "status", callbacks);
scheduled.shift().callback();
assert(updates.length === 1, "regular status inside interval should be coalesced");
assert(flow.snapshot().droppedFrames === 1, "coalesced status should increment dropped frame count");

now = 170;
scheduled.shift().callback();
assert(updates.length === 2, "coalesced latest status should flush after interval");

now = 175;
flow.queue({ fps: 30, targetFps: 30 }, "autoplay-predicted", callbacks);
scheduled.shift().callback();
assert(updates.length === 3, "urgent status should bypass interval");

flow.queue({ sensors: {} }, "visual-sensor-on", callbacks);
assert(lights.length === 1, "sensor status should use light callback immediately");

console.log("RUNTIME_STATUS_FLOW_VM_TEST_OK", {
  updates: updates.length,
  lights: lights.length,
  dropped: flow.snapshot().droppedFrames
});

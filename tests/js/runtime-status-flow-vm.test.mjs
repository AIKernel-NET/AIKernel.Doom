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
assert(!statusFlow.isUrgentReason("autoplay-predicted"), "per-frame autoplay predictions should be coalescible");
assert(statusFlow.isUrgentReason("autoplay-error"), "autoplay errors should remain urgent");
assert(statusFlow.isUrgentReason("autoplay-retry-dispatch"), "autoplay retries should remain urgent");
assert(statusFlow.isUrgentReason("ready"), "lifecycle statuses should remain urgent");

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
flow.queue({ fps: 30, targetFps: 30, marker: "superseded-prediction" }, "autoplay-predicted", callbacks);
scheduled.shift().callback();
assert(updates.length === 2, "per-frame autoplay predictions should be coalesced inside the interval");
assert(flow.snapshot().droppedFrames === 2, "coalesced autoplay predictions should increment dropped frame count");

now = 180;
flow.queue({ marker: "urgent-error" }, "autoplay-error", callbacks);
assert(updates.length === 3, "an urgent error should paint immediately while a prediction is pending");
assert(updates[2].reason === "autoplay-error" && updates[2].status.marker === "urgent-error", "the urgent error must replace the pending prediction");
assert(flow.snapshot().hasPending === false, "an urgent error should discard the pending prediction");

now = 185;
flow.queue({ fps: 30, targetFps: 30, marker: "post-error-prediction" }, "autoplay-predicted", callbacks);
scheduled.pop().callback();
assert(updates.length === 3, "a later prediction should remain coalesced from the urgent error paint time");

now = 236;
scheduled.shift().callback();
assert(updates.length === 3, "the invalidated pre-error callback should be harmless after a later prediction is queued");

now = 246;
scheduled.shift().callback();
assert(updates.length === 4, "a later prediction should flush after the interval measured from the urgent error");
assert(updates[3].status.marker === "post-error-prediction", "the discarded pre-error prediction must never overwrite the urgent error");

now = 250;
flow.queue({ fps: 30, targetFps: 30, marker: "pre-lifecycle-prediction" }, "autoplay-predicted", callbacks);
scheduled.shift().callback();
assert(updates.length === 4, "a prediction before a lifecycle event should be pending");

now = 255;
flow.queue({ marker: "urgent-lifecycle" }, "ready", callbacks);
assert(updates.length === 5, "an urgent lifecycle status should paint immediately while a prediction is pending");
assert(updates[4].reason === "ready" && updates[4].status.marker === "urgent-lifecycle", "the lifecycle status must replace the pending prediction");
assert(flow.snapshot().hasPending === false, "an urgent lifecycle status should discard the pending prediction");

now = 260;
flow.queue({ fps: 30, targetFps: 30, marker: "post-lifecycle-prediction" }, "autoplay-predicted", callbacks);
scheduled.pop().callback();
assert(updates.length === 5, "a post-lifecycle prediction should remain coalesced from the lifecycle paint time");

now = 312;
scheduled.shift().callback();
assert(updates.length === 5, "the invalidated pre-lifecycle callback must not overwrite lifecycle status");

now = 321;
scheduled.shift().callback();
assert(updates.length === 6, "a later prediction should flush after the interval measured from the lifecycle paint");
assert(updates[5].status.marker === "post-lifecycle-prediction", "the pre-lifecycle prediction must never overwrite lifecycle status");

flow.queue({ sensors: {} }, "visual-sensor-on", callbacks);
assert(lights.length === 1, "sensor status should use light callback immediately");

console.log("RUNTIME_STATUS_FLOW_VM_TEST_OK", {
  updates: updates.length,
  lights: lights.length,
  dropped: flow.snapshot().droppedFrames
});

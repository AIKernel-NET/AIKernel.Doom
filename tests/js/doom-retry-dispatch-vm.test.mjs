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

function loadScript(context, relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const source = readFileSync(filePath, "utf8");
  vm.runInContext(source, context, { filename: filePath });
}

const sandbox = {
  self: {},
  console,
  Number,
  Boolean,
  Object,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/doom-retry-dispatch.js");

const retry = context.self.AIKernelDoomRetryDispatch;
assert(retry?.createState, "retry dispatch should export createState");
assert(retry?.schedule, "retry dispatch should export schedule");
assert(retry?.process, "retry dispatch should export process");
assert(retry?.clear, "retry dispatch should export clear");

const keys = { use: 0xa2 };
const state = retry.createState();
const queued = [];
let releaseInputs = 0;
let releaseMove = 0;
const queuedReasons = [];
const completedReasons = [];
const settledReasons = [];
const sensorResets = [];
const host = {
  keys,
  enterKey: 13,
  tapFrames: 2,
  cooldownFrames: 5,
  settleFrames: 3,
  runtimeState: "running",
  releaseInputs: () => { releaseInputs += 1; },
  releaseMoveInputs: () => { releaseMove += 1; },
  resetSensors: (phase, reason) => sensorResets.push({ phase, reason }),
  queueInput: (keycode, pressed, name) => queued.push({ keycode, pressed, name }),
  logQueued: reason => queuedReasons.push(reason),
  logCompleted: reason => completedReasons.push(reason),
  logSettled: reason => settledReasons.push(reason)
};
const retryStatus = {
  healthSensor: {
    retryRequested: true,
    likelyDead: true,
    retryReason: "health-death"
  }
};

assert(retry.schedule(state, retryStatus, host).scheduled === false, "first retry frame should debounce");
assert(retry.schedule(state, retryStatus, host).scheduled === false, "second retry frame should debounce");
const scheduled = retry.schedule(state, retryStatus, host);
assert(scheduled.scheduled === true, "third retry frame should schedule retry dispatch");
assert(scheduled.queuedSteps === 24, "retry dispatch should build three use/enter tap cycles");
assert(releaseInputs === 1, "scheduling should release existing inputs");
assert(sensorResets[0].phase === "pre-retry-reset", "scheduling should clear stale sensors before retry input");
assert(queuedReasons[0] === "health-death", "queued reason should come from health sensor");
assert(retry.snapshot(state).active === true, "scheduled retry should be active");

assert(retry.process(state, host) === true, "first retry step should be processed");
assert(queued[0].keycode === keys.use && queued[0].pressed === true, "first retry step should press use");
assert(retry.process(state, host) === true, "wait step should consume a frame");
assert(releaseMove === 1, "wait step should release movement inputs");

let guard = 100;
while (completedReasons.length === 0 && retry.process(state, host) && guard > 0) {
  guard -= 1;
}

assert(guard > 0, "retry dispatch should finish within bounded steps");
assert(completedReasons[0] === "health-death", "completion should preserve retry reason");
assert(sensorResets.some(item => item.phase === "post-retry-reset"), "completion should clear sensors again before settling");
assert(retry.snapshot(state).active === true, "completed retry should remain active while sensors settle");
assert(retry.snapshot(state).cooldownFrames === 5, "completed retry should set cooldown");
assert(retry.snapshot(state).settleFrames === 3, "completed retry should expose post-reset settle frames");

assert(retry.schedule(state, { healthSensor: { retryRequested: false } }, host).reason === "settling", "settle should not be cleared when health no longer requests retry");
assert(retry.process(state, host) === true, "settle frame should be processed");
assert(retry.process(state, host) === true, "second settle frame should be processed");
assert(retry.process(state, host) === true, "final settle frame should be processed");
assert(settledReasons[0] === "health-death", "settle completion should preserve reason");
assert(retry.snapshot(state).active === false, "retry should become inactive after settle");

const repeatState = retry.createState();
retry.schedule(repeatState, retryStatus, host);
retry.schedule(repeatState, retryStatus, host);
assert(retry.schedule(repeatState, retryStatus, host).scheduled === true, "repeat fixture should schedule a retry");
guard = 100;
while (completedReasons.length < 2 && retry.process(repeatState, host) && guard > 0) {
  guard -= 1;
}

assert(guard > 0, "repeat fixture should complete retry dispatch");
assert(retry.snapshot(repeatState).awaitingRecovery === true, "completed retry should wait for health evidence to clear");
assert(retry.process(repeatState, host) === true, "repeat fixture first settle frame should be processed");
assert(retry.process(repeatState, host) === true, "repeat fixture second settle frame should be processed");
assert(retry.process(repeatState, host) === true, "repeat fixture final settle frame should be processed");
const blockedRepeat = retry.schedule(repeatState, retryStatus, host);
assert(blockedRepeat.scheduled === false && blockedRepeat.reason === "awaiting-recovery", "same death evidence should not schedule another retry after settling");
let timeoutRepeat = blockedRepeat;
guard = 20;
while (!timeoutRepeat.scheduled && guard > 0) {
  timeoutRepeat = retry.schedule(repeatState, retryStatus, host);
  guard -= 1;
}

assert(timeoutRepeat.scheduled === true, "persistent death evidence should retry after the recovery cooldown expires");
const recovered = retry.schedule(repeatState, { healthSensor: { retryRequested: false } }, host);
assert(recovered.reason === "not-requested", "cleared health evidence should release the retry recovery latch");
assert(retry.snapshot(repeatState).awaitingRecovery === false, "recovery latch should clear when health retry evidence clears");

const noReasonRetryState = retry.createState();
const noReasonRetryStatus = {
  healthSensor: {
    retryRequested: true,
    likelyDead: false,
    retryReason: "none"
  }
};
assert(retry.schedule(noReasonRetryState, noReasonRetryStatus, host).reason === "not-requested", "health retry with reason=none and no death evidence must not schedule");
assert(retry.schedule(noReasonRetryState, { healthSensor: { retryRequested: true, likelyDead: false } }, host).reason === "not-requested", "health retry without reason and no death evidence must not schedule");
assert(retry.snapshot(noReasonRetryState).active === false, "reasonless retry must leave retry dispatcher inactive");

const nativeRestartState = retry.createState();
const nativeRestartStatus = {
  csharpFirstDoor: {
    nativeDeathConfirmed: true,
    restartRequested: true,
    restartRequestId: "native-death:1:512:9",
    restartReason: "native-player-death-confirmed"
  },
  healthSensor: {
    retryRequested: false,
    likelyDead: false,
    retryReason: "none"
  }
};
const nativeRestartScheduled = retry.schedule(nativeRestartState, nativeRestartStatus, host);
assert(nativeRestartScheduled.scheduled === true, "validated C# restart requests should enter the existing retry sequence immediately");
assert(nativeRestartScheduled.queuedSteps === 24, "native restart transport must retain the existing bounded tap sequence");
assert(nativeRestartScheduled.reason === "native-player-death-confirmed", "native C# restart reason should cross mechanically");
assert(nativeRestartScheduled.restartRequestId === "native-death:1:512:9", "native C# restart id should cross mechanically");
assert(retry.snapshot(nativeRestartState).restartRequestId === "native-death:1:512:9", "retry snapshot should retain native restart correlation");
retry.clear(nativeRestartState, host);

const malformedNativeRestartState = retry.createState();
const malformedNativeRestart = retry.schedule(malformedNativeRestartState, {
  csharpFirstDoor: {
    restartRequested: true,
    restartRequestId: "",
    restartReason: "native-player-death-confirmed"
  },
  healthSensor: { retryRequested: false }
}, host);
assert(malformedNativeRestart.reason === "not-requested", "incomplete native restart transport must fail closed");

const deadWithoutReasonState = retry.createState();
const deadWithoutReasonStatus = {
  healthSensor: {
    retryRequested: true,
    likelyDead: true
  }
};
retry.schedule(deadWithoutReasonState, deadWithoutReasonStatus, host);
retry.schedule(deadWithoutReasonState, deadWithoutReasonStatus, host);
const deadWithoutReasonScheduled = retry.schedule(deadWithoutReasonState, deadWithoutReasonStatus, host);
assert(deadWithoutReasonScheduled.scheduled === true, "likely-dead evidence without explicit reason should still schedule");
assert(deadWithoutReasonScheduled.reason === "health-death", "likely-dead evidence without explicit reason should normalize to health-death");

retry.clear(state, host);
assert(retry.snapshot(state).reason === "none", "clear should reset reason");
assert(queued.some(item => item.name === "enter" && item.pressed === false), "clear should release enter key");

console.log("DOOM_RETRY_DISPATCH_VM_TEST_OK", {
  queuedSteps: scheduled.queuedSteps,
  queuedInputs: queued.length,
  releaseMove
});

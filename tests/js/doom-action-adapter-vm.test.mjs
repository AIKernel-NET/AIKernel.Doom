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
  Object,
  Boolean,
  Number
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/doom-action-adapter.js");

const adapter = context.self.AIKernelDoomActionAdapter;
assert(adapter?.createInputPlan, "Doom action adapter should export createInputPlan");
assert(adapter?.applyAction, "Doom action adapter should export applyAction");
assert(adapter?.releaseMoveInputs, "Doom action adapter should export releaseMoveInputs");
assert(adapter?.releaseInputs, "Doom action adapter should export releaseInputs");
assert(adapter?.EXACT_ACTION_MODE === "csharp-exact", "Doom action adapter should export the explicit C# exact mode");

const nativeCalls = [];
const nativeQueued = [];
const nativeResult = adapter.applyAction({
  move: "forward",
  turn: "left",
  fire: true,
  strafe: true,
  use: true,
  run: true
}, {
  ok: 0,
  nativeAction: (move, turn, fire, strafe) => {
    nativeCalls.push({ move, turn, fire, strafe });
    return 0;
  },
  resolveUsePulse: wantsUse => wantsUse,
  queueInput: (keycode, pressed, name) => {
    nativeQueued.push({ keycode, pressed, name });
    return true;
  },
  isManualInputActive: keycode => keycode === 0xb6
});

assert(nativeResult.mode === "native-action", "native ABI path should be selected when available");
assert(nativeCalls.length === 1, "native ABI should be called once");
assert(nativeCalls[0].move === 0 && nativeCalls[0].turn === 0, "Use pulse should neutralize native move/turn axes");
assert(nativeCalls[0].fire === 0 && nativeCalls[0].strafe === 0, "Use pulse should suppress fire/strafe flags");
assert(nativeQueued.length === 1 && nativeQueued[0].name === "use", "native ABI path should queue use/run only when not manually held");
assert(nativeResult.appliedAction.path.nativeAccepted === true, "applied snapshot should record the accepted native path");
assert(nativeResult.appliedAction.use.resolution === "pulse", "legacy path should record Use pulse resolution");
assert(nativeResult.appliedAction.use.eventQueued === true, "applied snapshot should record the queued Use event");
assert(nativeResult.appliedAction.applied.use === true, "accepted native-path Use should be reported as applied");
assert(nativeResult.appliedAction.applied.run === false, "manual input block should keep native-path Run unapplied");

const fallbackQueued = [];
const fallbackResult = adapter.applyAction({
  move: "back",
  turn: "right",
  fire: true,
  strafe: true,
  use: true,
  run: false
}, {
  manualMove: true,
  resolveUsePulse: () => true,
  queueInput: (keycode, pressed, name) => {
    fallbackQueued.push({ keycode, pressed, name });
    return true;
  },
  isManualInputActive: () => false
});

assert(fallbackResult.mode === "key-events", "fallback key path should be used without native ABI");
assert(fallbackQueued.every(item => !["forward", "back", "left", "right", "strafe"].includes(item.name)), "manual move mode should not queue movement keys");
assert(fallbackQueued.some(item => item.name === "fire" && item.pressed === false), "Use pulse should release fire while opening a door");
assert(fallbackQueued.some(item => item.name === "use" && item.pressed === true), "fallback path should queue pulsed use");
assert(fallbackResult.appliedAction.path.keyEventsUsed === true, "applied snapshot should record the key-event path");
assert(fallbackResult.appliedAction.effects.manualMoveProtectedKeys.length === 5, "applied snapshot should record manual movement protection");

let exactNormalizerCalls = 0;
let exactPulseCalls = 0;
const exactQueued = [];
const exactResult = adapter.applyAction({
  move: "forward",
  turn: "left",
  fire: true,
  strafe: true,
  use: true,
  run: true
}, {
  actionMode: adapter.EXACT_ACTION_MODE,
  normalizeAction: () => {
    exactNormalizerCalls += 1;
    return { use: false };
  },
  resolveUsePulse: () => {
    exactPulseCalls += 1;
    return false;
  },
  queueInput: (keycode, pressed, name) => {
    exactQueued.push({ keycode, pressed, name });
    return true;
  },
  isManualInputActive: () => false
});

assert(exactNormalizerCalls === 0, "C# exact mode must bypass Bonsai normalization");
assert(exactPulseCalls === 0, "C# exact mode must bypass JS Use pulse resolution");
assert(exactQueued.some(item => item.name === "use" && item.pressed === true), "C# exact boolean Use must reach input projection unchanged");
assert(exactResult.appliedAction.actionMode === "csharp-exact", "applied snapshot should identify C# exact mode");
assert(exactResult.appliedAction.proposed.use === true && exactResult.appliedAction.applied.use === true, "applied snapshot should preserve proposed and applied Use");
assert(exactResult.appliedAction.use.resolution === "exact", "applied snapshot should identify exact Use resolution");
assert(exactResult.appliedAction.use.pulseResolverCalled === false, "exact snapshot should prove the pulse resolver was not called");
assert(exactResult.appliedAction.effects.normalizationBypassed === true, "exact snapshot should prove normalization was bypassed");
assert(exactResult.appliedAction.effects.useNeutralizedAction === true, "exact snapshot should record stationary Use projection");

const manualBlocked = adapter.applyAction({ move: "forward", use: true }, {
  actionMode: adapter.EXACT_ACTION_MODE,
  manualMove: true,
  queueInput: () => true,
  isManualInputActive: (keycode, name) => name === "use"
});

assert(manualBlocked.appliedAction.effects.manualMoveProtectedKeys.length === 5, "manual override should be visible in the applied snapshot");
assert(manualBlocked.appliedAction.effects.manualInputBlockedKeys.includes("use"), "manual key ownership should be visible in the applied snapshot");
assert(manualBlocked.appliedAction.use.blockedByManualInput === true, "Use delivery blocked by manual input should be explicit");
assert(manualBlocked.appliedAction.use.eventQueued === false, "blocked Use must not be reported as queued");
assert(manualBlocked.appliedAction.applied.use === false, "manual-blocked Use must not be reported as applied");

const rejectedQueue = adapter.applyAction({ move: "none", use: true }, {
  actionMode: adapter.EXACT_ACTION_MODE,
  queueInput: () => false,
  isManualInputActive: () => false
});

assert(rejectedQueue.queued === 0, "rejected queue writes must not count as queued");
assert(rejectedQueue.appliedAction.use.eventQueued === false, "rejected Use must not be reported as queued");
assert(rejectedQueue.appliedAction.applied.use === false, "rejected Use must not be reported as applied");
assert(rejectedQueue.appliedAction.effects.rejectedKeys.includes("use"), "queue rejection should be explicit in the applied snapshot");

const fireQueued = [];
adapter.applyAction({ move: "none", turn: "none", fire: true, use: false }, {
  resolveUsePulse: () => false,
  queueInput: (keycode, pressed, name) => {
    fireQueued.push({ keycode, pressed, name });
    return true;
  },
  isManualInputActive: () => false
});
assert(fireQueued.some(item => item.name === "fire" && item.pressed === true), "fallback path should queue fire when Use is not active");

const yawOnlyPlan = adapter.createInputPlan({ move: "none", turn: "none", turnYaw: -9 }, { normalized: true });
assert(yawOnlyPlan.turn === -1, "numeric turnYaw should recover the turn axis when turn text is none");
assert(yawOnlyPlan.desired.left === true && yawOnlyPlan.desired.right === false, "numeric turnYaw should queue the matching turn key");

let clearCount = 0;
let releaseCount = 0;
const senseOnly = adapter.applyAction({ move: "forward" }, {
  senseOnly: true,
  clearRetry: () => { clearCount += 1; },
  releaseInputs: () => { releaseCount += 1; }
});

assert(senseOnly.mode === "sense-only", "sense-only should suppress action output");
assert(clearCount === 1 && releaseCount === 1, "sense-only should clear retry and release inputs");
assert(senseOnly.appliedAction.path.senseOnly === true && senseOnly.appliedAction.path.selected === "sense-only", "sense-only suppression should be visible in the applied snapshot");
assert(senseOnly.appliedAction.effects.releaseInputsRequested === true, "sense-only snapshot should record input release");

const releaseQueued = [];
const releaseNative = [];
adapter.releaseMoveInputs({
  nativeAction: (move, turn, fire, strafe) => releaseNative.push({ move, turn, fire, strafe }),
  queueInput: (keycode, pressed, name) => releaseQueued.push({ keycode, pressed, name })
});

assert(releaseNative.length === 1 && releaseNative[0].move === 0 && releaseNative[0].turn === 0, "release move should reset native action");
assert(releaseQueued.length === 5, "release move should release movement keys only");

const allReleaseQueued = [];
adapter.releaseInputs({
  queueInput: (keycode, pressed, name) => allReleaseQueued.push({ keycode, pressed, name })
});

assert(allReleaseQueued.length === 8, "release all should release every autoplay key");

console.log("DOOM_ACTION_ADAPTER_VM_TEST_OK", {
  nativeQueued: nativeQueued.length,
  fallbackQueued: fallbackQueued.length,
  releaseMove: releaseQueued.length
});

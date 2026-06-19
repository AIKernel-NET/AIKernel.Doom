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
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/objective-routing.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/wasm-state.js");

const wasmState = context.self.AIKernelDoomWasmState;
assert(wasmState?.createState, "WASM state adapter should export createState");

const useAttemptOnlyState = wasmState.createState({
  frameCount: 16,
  autoplayObjective: "OpenSpaceCruise",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "cross-bridge",
        milestones: {
          firstDoorUseAttempted: true,
          doorOpened: 0,
          bridgeBrownScore: 0.8
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.8
  },
  audio: {},
  player: { health: 100 }
});

assert(useAttemptOnlyState.objective === "find-corridor-to-first-door", "Use attempts alone must not unlock bridge routing");
assert(useAttemptOnlyState.objectiveRoute.reason === "first-door-locked", "WASM state should expose the pre-door gate reason");

const openedDoorState = wasmState.createState({
  frameCount: 32,
  autoplayObjective: "OpenSpaceCruise",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "cross-bridge",
        doorOpenedCount: 1,
        milestones: {
          firstDoorUseAttempted: true,
          doorOpened: 1,
          bridgeBrownScore: 0.8
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.7,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.8
  },
  audio: {},
  player: { health: 100 }
});

assert(openedDoorState.objective === "reach-bridge", "Actual first-door opening should unlock bridge routing");

const gapLockRuntime = {
  frameCount: 48,
  autoplayObjective: "OpenSpaceCruise",
  autoplayActionSignature: "forward:right:-:-:-:r",
  autoplayActionRepeatFrames: 24,
  autoplayMoveRepeatFrames: 20,
  autoplayTurnRepeatFrames: 6,
  autoplayProfile: {
    parameters: {
      spawnCorridorGapLockThreshold: 0.2,
      spawnCorridorGapLockFrames: 12,
      spawnCorridorGapSwitchMargin: 0.12
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-door",
        milestones: {
          doorOpened: 0
        }
      };
    }
  }
};

const lockedRightState = wasmState.createState(gapLockRuntime, {
  framebuffer: {
    depthEstimate: 1,
    left: 80,
    center: 80,
    right: 80,
    spawnCorridorGapScore: 0.31,
    spawnCorridorGapTurn: "right"
  },
  audio: {},
  player: { health: 100 }
});

const lowConfidenceOppositeState = wasmState.createState(gapLockRuntime, {
  framebuffer: {
    depthEstimate: 1,
    left: 80,
    center: 80,
    right: 80,
    spawnCorridorGapScore: 0.24,
    spawnCorridorGapTurn: "left"
  },
  audio: {},
  player: { health: 100 }
});

assert(lockedRightState.spawnCorridorGapTurn === "right", "First confident spawn gap should lock to the detected side");
assert(lowConfidenceOppositeState.spawnCorridorGapTurn === "right", "Low-margin opposite gap should not break the spawn gap lock");
assert(lowConfidenceOppositeState.spawnCorridorGapLocked === true, "Spawn gap lock should remain active across noisy frames");
assert(lowConfidenceOppositeState.actionSignature === "forward:right:-:-:-:r", "WASM state should expose Kinesis action signature");
assert(lowConfidenceOppositeState.actionRepeatFrames === 24, "WASM state should expose Kinesis action repeat frames");
assert(lowConfidenceOppositeState.moveRepeatFrames === 20, "WASM state should expose Kinesis movement repeat frames");
assert(lowConfidenceOppositeState.turnRepeatFrames === 6, "WASM state should expose Kinesis turn repeat frames");

console.log("DOOM_WASM_STATE_VM_TEST_OK", {
  useAttemptOnly: useAttemptOnlyState.objective,
  openedDoor: openedDoorState.objective,
  gapLock: lowConfidenceOppositeState.spawnCorridorGapTurn
});

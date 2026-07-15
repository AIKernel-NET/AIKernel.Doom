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

const legacyVisionProjectionState = wasmState.createState({
  frameCount: 8,
  autoplayObjective: "find-corridor-to-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "find-corridor-to-first-door",
        milestones: { doorOpened: 0, doorOpenedCount: 0 }
      };
    }
  }
}, {
  framebuffer: {
    width: 320,
    height: 200,
    sample: Array.from({ length: 20 * 13 }, (_, index) => index % 256),
    depthEstimate: 0.72,
    left: 10,
    center: 10,
    right: 10,
    firstDoorVision9x9Score: 0.60,
    firstDoorVision9x9RedScore: 0.20,
    firstDoorVision9x9Box: {
      kind: "first-door-9x9-patch",
      column: 3,
      row: 3,
      columns: 2,
      rows: 2,
      score: 0.60,
      redScore: 0.20
    }
  },
  audio: {},
  player: { health: 100 }
});

assert(legacyVisionProjectionState.firstDoorVision9x9Score === 0.60,
  "legacy WASM state may retain its postprocessed FirstDoor score");
assert(legacyVisionProjectionState.firstDoorVision9x9Box?.kind === "first-door-9x9-patch",
  "legacy WASM state may retain its semantic FirstDoor kind");
assert(legacyVisionProjectionState.firstDoorVision9x9Locked === true,
  "legacy WASM state may retain its temporal FirstDoor lock");
assert(legacyVisionProjectionState.firstDoorVision9x9LockFrames > 0,
  "legacy WASM state may retain its temporal FirstDoor lock frames");
assert(!Object.prototype.hasOwnProperty.call(legacyVisionProjectionState, "rawObservation"),
  "legacy WASM state must not masquerade as the C# raw observation envelope");

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

assert(useAttemptOnlyState.objective !== "reach-bridge", "Use attempts alone must not unlock bridge routing");
assert(useAttemptOnlyState.objective !== "enter-computer-room", "Use attempts alone must not unlock ComputerRoom routing");
assert(useAttemptOnlyState.doorOpenedCount === 0, "Use attempts alone should keep the first-door milestone closed");

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

assert(openedDoorState.objective === "enter-computer-room", "Actual first-door opening should unlock post-door ComputerRoom entry before Central Hall routing");
assert(openedDoorState.milestones?.doorOpened === 1, "WASM state should publish the door-open milestone to Control consumers");

const stickyOpenedDoorState = wasmState.createState({
  frameCount: 36,
  autoplayObjective: "OpenSpaceCruise",
  autoplayMilestones: {
    doorOpened: 1
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        doorOpenedCount: 0,
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
    depthEstimate: 0.7,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.8
  },
  audio: {},
  player: { health: 100 }
});

assert(stickyOpenedDoorState.doorOpenedCount === 1, "Runtime sticky door-open milestone should feed back into WASM state");
assert(stickyOpenedDoorState.milestones?.doorOpened === 1, "Sticky milestone should be republished for Context/RoutePlanner");
assert(stickyOpenedDoorState.objective === "enter-computer-room", "Sticky first-door opening should keep routing in the post-door phase toward ComputerRoom entry");

const resetCountDominatesLegacyDoorState = wasmState.createState({
  frameCount: 38,
  autoplayObjective: "OpenSpaceCruise",
  autoplayMilestones: {
    doorOpened: 1,
    doorOpenedCount: 0
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        doorOpenedCount: 0,
        milestones: {
          firstDoorUseAttempted: true,
          doorOpened: 1,
          doorOpenedCount: 0,
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

assert(resetCountDominatesLegacyDoorState.doorOpenedCount === 0, "Explicit zero doorOpenedCount should dominate stale legacy doorOpened aliases in WASM state");
assert(resetCountDominatesLegacyDoorState.milestones?.doorOpened === 0, "WASM state should republish the canonical reset door milestone");
assert(resetCountDominatesLegacyDoorState.objective !== "reach-bridge", "Reset door count should not unlock bridge routing from stale legacy aliases");

const retrySettleComputerVisualState = wasmState.createState({
  frameCount: 44,
  autoplayMode: "settling",
  autoplayControlPipeline: "RetrySettle",
  autoplayDecisionStage: "RetrySettle",
  autoplayObjective: "retry-after-death",
  autoplayPredictions: 4,
  autoplayMilestones: {
    doorOpened: 0,
    doorOpenedCount: 0
  },
  autoplayAutoplayState: {
    doorOpenedCount: 0,
    milestones: {
      doorOpened: 0,
      doorOpenedCount: 0
    },
    kinesis: {
      lastUsePulsePrediction: 0
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "retry-after-death",
        controlPipeline: "RetrySettle",
        predictions: 4,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          doorOpenedCount: 0,
          computerPanelScore: 0.72,
          computerDarkPanelScore: 0.58
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.92,
    left: 10,
    center: 10,
    right: 10,
    firstDoorVision9x9Score: 0.42,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    spawnCorridorGapScore: 0.40,
    bridgeDoorScore: 0.20,
    bridgeGreenCenter: 0.48,
    computerRoomScore: 0.32,
    computerPanelScore: 0.72,
    computerDarkPanelScore: 0.58
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.01,
    rightEnergy: 0.01
  },
  player: { health: 100 }
});

assert(retrySettleComputerVisualState.retrySettleActive === true, "Retry settle should be visible in projected WASM state");
assert(retrySettleComputerVisualState.doorOpenedCount === 0, "Retry settle should suppress stale ComputerRoom visual door-open inference");
assert(retrySettleComputerVisualState.postDoorVisualOpenCue === false, "Retry settle should block post-door visual open cues");
assert(retrySettleComputerVisualState.postDoorStrongComputerVisualCue === false, "Retry settle should block strong ComputerRoom visual open cues");

const retrySettleStaleDoorState = wasmState.createState({
  frameCount: 48,
  autoplayMode: "settling",
  autoplayControlPipeline: "RetrySettle",
  autoplayDecisionStage: "RetrySettle",
  autoplayObjective: "retry-after-death",
  autoplayPredictions: 6,
  autoplayMilestones: {
    doorOpened: 1,
    doorOpenedCount: 1,
    computerRoomEntered: true
  },
  autoplayAutoplayState: {
    doorOpenedCount: 1,
    milestones: {
      doorOpened: 1,
      doorOpenedCount: 1,
      computerRoomEntered: true
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "retry-after-death",
        controlPipeline: "RetrySettle",
        predictions: 6,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: true,
          bridgeBrownScore: 0.8
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.9,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.8,
    computerRoomScore: 0.5,
    computerPanelScore: 0.68
  },
  audio: {},
  player: { health: 100 }
});

assert(retrySettleStaleDoorState.retrySettleActive === true, "Retry settle should remain active even when stale milestones exist");
assert(retrySettleStaleDoorState.doorOpenedCount === 0, "Retry settle must zero stale door-open milestones before projecting Control state");
assert(retrySettleStaleDoorState.milestones?.doorOpened === 0, "Retry settle should republish a closed first-door milestone for the new life");
assert(retrySettleStaleDoorState.objective !== "reach-bridge", "Retry settle should not route to bridge from stale post-door milestones");

const healthSensorRetryOnlyState = wasmState.createState({
  frameCount: 52,
  autoplayMode: "autoplay",
  autoplayControlPipeline: "ComputerRoom",
  autoplayObjective: "reach-central-hall",
  autoplayHealthSensor: {
    retryRequested: true,
    retryReason: "health-fixed-face-death"
  },
  autoplayMilestones: {
    doorOpened: 1,
    doorOpenedCount: 1,
    computerRoomEntered: true
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        controlPipeline: "ComputerRoom",
        predictions: 7,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: true,
          bridgeBrownScore: 0.8
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.9,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.8,
    computerRoomScore: 0.5,
    computerPanelScore: 0.68
  },
  audio: {},
  player: { health: 100 }
});

assert(healthSensorRetryOnlyState.retrySettleActive === true, "Health sensor retry should force retry-settle even when the route text is still ComputerRoom");
assert(healthSensorRetryOnlyState.doorOpenedCount === 0, "Health sensor retry should zero stale door-open milestones");
assert(healthSensorRetryOnlyState.computerRoomEntered === false, "Health sensor retry should clear stale ComputerRoom entry");
assert(healthSensorRetryOnlyState.semanticMemory?.phase === "OpeningHome", "Health sensor retry should project OpeningHome for the next life");

const retryCompletedOpeningGuardState = wasmState.createState({
  frameCount: 72,
  autoplayMode: "autoplay",
  autoplayControlPipeline: "OpeningHome",
  autoplayDecisionStage: "OpeningHome",
  autoplayObjective: "find-and-open-first-door",
  autoplaySafetyReason: "retry-settle-completed:health-face-blood-death",
  autoplayActiveDetections: ["objective", "motion", "door", "wall", "hud", "opening-reset"],
  autoplayPostRetryHealthGuardFrames: 38,
  autoplayPredictions: 1200,
  autoplayAutoplayState: {
    kinesis: {
      lastUsePulsePrediction: 1188
    }
  },
  autoplaySemanticMemory: {
    phase: "ComputerRoom",
    objective: "reach-central-hall",
    computerRoom: { confidence: 0.82 },
    bridge: { confidence: 0.66 }
  },
  autoplayMilestones: {
    doorOpened: 1,
    doorOpenedCount: 1,
    computerRoomEntered: true
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        controlPipeline: "ComputerRoom",
        strategyContext: "retry-reset",
        predictions: 1200,
        doorOpenedCount: 1,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: true,
          bridgeBrownScore: 0.84,
          computerRoomScore: 0.72,
          computerPanelScore: 0.78
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.96,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.84,
    bridgeGreenCenter: 0.48,
    computerRoomScore: 0.72,
    computerPanelScore: 0.78,
    computerDarkPanelScore: 0.44,
    firstDoorVision9x9Score: 0.34,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.01,
    rightEnergy: 0.01
  },
  player: { health: 100 }
});

assert(retryCompletedOpeningGuardState.openingResetProjectionActive === true, "Retry-completed opening guard should be visible in the projected state");
assert(retryCompletedOpeningGuardState.doorOpenedCount === 0, "Retry-completed opening guard must suppress stale door-open milestones");
assert(retryCompletedOpeningGuardState.postDoorVisualOpenCue === false, "Retry-completed opening guard should block stale post-door visual cues");
assert(retryCompletedOpeningGuardState.postDoorStrongComputerVisualCue === false, "Retry-completed opening guard should block strong stale ComputerRoom cues");
assert(retryCompletedOpeningGuardState.objective !== "reach-bridge", "Retry-completed opening guard should not keep stale bridge routing");
assert(retryCompletedOpeningGuardState.objective !== "enter-computer-room", "Retry-completed opening guard should not keep stale ComputerRoom routing");
assert(retryCompletedOpeningGuardState.semanticMemory?.phase === "OpeningHome", "Retry-completed opening guard should project OpeningHome instead of stale ComputerRoom");
assert(retryCompletedOpeningGuardState.semanticMemory?.computerRoom?.confidence === 0, "Retry-completed opening guard should clear stale ComputerRoom confidence");
assert(retryCompletedOpeningGuardState.semanticMemory?.bridge?.confidence === 0, "Retry-completed opening guard should clear stale bridge confidence");

const staleComputerRoomIntentBeforeDoorState = wasmState.createState({
  frameCount: 96,
  autoplayControlPipeline: "ComputerRoom",
  autoplayObjective: "reach-central-hall",
  autoplaySemanticMemory: {
    phase: "ComputerRoom",
    objective: "reach-central-hall",
    computerRoom: { confidence: 0.78 }
  },
  autoplayMilestones: {
    doorOpened: 0,
    doorOpenedCount: 0,
    computerRoomEntered: true
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        controlPipeline: "ComputerRoom",
        doorOpenedCount: 0,
        computerRoomEntered: true,
        milestones: {
          doorOpened: 0,
          doorOpenedCount: 0,
          computerRoomEntered: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.96,
    left: 10,
    center: 10,
    right: 10,
    spawnCorridorGapScore: 0.42,
    firstDoorVision9x9Score: 0.36,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    computerRoomScore: 0.44,
    computerPanelScore: 0.58
  },
  audio: {},
  player: { health: 100 }
});

assert(staleComputerRoomIntentBeforeDoorState.doorOpenedCount === 0, "Closed first-door milestone should dominate stale ComputerRoom intent");
assert(staleComputerRoomIntentBeforeDoorState.computerRoomEntered === false, "Closed first-door milestone should suppress stale ComputerRoom entered state");
assert(staleComputerRoomIntentBeforeDoorState.objective !== "reach-bridge", "Stale ComputerRoom intent before door opening should not unlock bridge routing");
assert(staleComputerRoomIntentBeforeDoorState.objective !== "enter-computer-room", "Stale ComputerRoom intent before door opening should not unlock ComputerRoom routing");
assert(staleComputerRoomIntentBeforeDoorState.semanticMemory?.phase === "OpeningHome", "Stale ComputerRoom phase before door opening should project OpeningHome");

const postDoorAudioState = wasmState.createState({
  frameCount: 4000,
  autoplayPredictions: 3800,
  autoplayObjective: "find-corridor-to-first-door",
  autoplayAutoplayState: {
    kinesis: {
      lastUsePulsePrediction: 3634
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "find-corridor-to-first-door",
        predictions: 3800,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          computerRoomScore: 0.15
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    computerRoomScore: 0.15,
    computerDarkPanelScore: 0.44,
    computerPanelScore: 0.2
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.008,
    rightEnergy: 0.006,
    lowEnergy: 0.003,
    midEnergy: 0.006,
    highEnergy: 0.002
  },
  player: { health: 100 }
});

assert(postDoorAudioState.postDoorAudioCue === true, "Use-adjacent native SFX plus computer-room visual evidence should create a post-door audio cue");
assert(postDoorAudioState.doorOpenedCount === 0, "Native SFX plus weak visual evidence must not unlock first-door routing without a visual open cue");
assert(postDoorAudioState.semanticMemory?.phase !== "PostDoor", "Use-failure-like native SFX should not advance semantic phase to PostDoor");
assert(postDoorAudioState.objective !== "enter-computer-room", "Use-failure-like native SFX should not route toward ComputerRoom");

const computerRoomEnteredSemanticState = wasmState.createState({
  frameCount: 4010,
  autoplayPredictions: 3810,
  autoplayObjective: "enter-computer-room",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "enter-computer-room",
        predictions: 3810,
        doorOpenedCount: 1,
        computerRoomEntered: true,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: true,
          computerRoomScore: 0.56,
          computerPanelScore: 0.48
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.82,
    left: 12,
    center: 12,
    right: 12,
    computerRoomScore: 0.56,
    computerPanelScore: 0.48
  },
  audio: {},
  player: { health: 100 }
});

assert(computerRoomEnteredSemanticState.semanticMemory?.phase === "ComputerRoom", "Confirmed ComputerRoom entry should promote semantic phase to ComputerRoom");
assert(computerRoomEnteredSemanticState.objective === "reach-central-hall", "Confirmed ComputerRoom entry should advance the objective toward Central Hall");

const postDoorVisualOpenState = wasmState.createState({
  frameCount: 4050,
  autoplayPredictions: 3850,
  autoplayObjective: "open-first-door",
  autoplayAutoplayState: {
    kinesis: {
      lastUsePulsePrediction: 3812
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3850,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        pendingUseResponseFrames: 12,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.49,
    firstDoorVision9x9Score: 0.45,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenCenter: 0.39,
    computerDarkPanelScore: 0.44,
    computerPanelScore: 0.20
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorVisualOpenState.postDoorVisualOpenCue === true, "Use-adjacent open corridor and bridge-green evidence should create a visual post-door open cue");
assert(postDoorVisualOpenState.doorOpenedCount === 0, "Weak post-door visual open cue should remain diagnostic and must not unlock first-door routing");

const postDoorStrongComputerVisualOpenState = wasmState.createState({
  frameCount: 4050,
  autoplayPredictions: 3850,
  autoplayObjective: "open-first-door",
  autoplayAutoplayState: {
    kinesis: {
      lastUsePulsePrediction: 3812
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3850,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        pendingUseResponseFrames: 12,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.49,
    firstDoorVision9x9Score: 0.45,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenCenter: 0.46,
    computerRoomScore: 0.32,
    computerDarkPanelScore: 0.44,
    computerPanelScore: 0.68
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorStrongComputerVisualOpenState.postDoorStrongComputerVisualCue === true, "Strong ComputerRoom visual evidence should confirm a real first-door opening");
assert(postDoorStrongComputerVisualOpenState.doorOpenedCount === 1, "Strong ComputerRoom visual evidence may unlock first-door routing after Use");

const ambiguousUseSfxVisualOpenState = wasmState.createState({
  frameCount: 4051,
  autoplayPredictions: 3851,
  autoplayObjective: "open-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3851,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        pendingUseResponseFrames: 12,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.49,
    firstDoorVision9x9Score: 0.45,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenCenter: 0.39,
    computerDarkPanelScore: 0.44,
    computerPanelScore: 0.20
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.008,
    rightEnergy: 0.006,
    lowEnergy: 0.003,
    midEnergy: 0.006,
    highEnergy: 0.002
  },
  player: { health: 100 }
});

assert(ambiguousUseSfxVisualOpenState.postDoorAudioCue === true, "Use-adjacent native SFX should be visible as an ambiguous door response cue");
assert(ambiguousUseSfxVisualOpenState.postDoorVisualOpenCue === false, "Ambiguous native SFX frame must not synthesize a visual door-open cue");
assert(ambiguousUseSfxVisualOpenState.ambiguousDoorSfxGuardFrames > 0, "Ambiguous native SFX should arm a short door-open verification guard");
assert(ambiguousUseSfxVisualOpenState.doorOpenedCount === 0, "Ambiguous native SFX frame must not unlock first-door routing");

const guardedAfterUseSfxVisualOpenState = wasmState.createState({
  frameCount: 4052,
  autoplayPredictions: 3852,
  autoplayObjective: "open-first-door",
  autoplayAmbiguousDoorSfxGuardFrames: 48,
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3852,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        pendingUseResponseFrames: 8,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.49,
    firstDoorVision9x9Score: 0.45,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenCenter: 0.39,
    computerDarkPanelScore: 0.44,
    computerPanelScore: 0.20
  },
  audio: {},
  player: { health: 100 }
});

assert(guardedAfterUseSfxVisualOpenState.postDoorVisualOpenCue === false, "Door-open visual synthesis must stay blocked during the ambiguous SFX verification guard");
assert(guardedAfterUseSfxVisualOpenState.doorOpenedCount === 0, "Guarded post-SFX visual evidence must not unlock first-door routing");
assert(guardedAfterUseSfxVisualOpenState.ambiguousDoorSfxGuardFrames === 47, "Ambiguous SFX guard should decay one frame at a time");

const weakStickyDoorOpenBeforeComputerRoomState = wasmState.createState({
  frameCount: 866,
  autoplayPredictions: 58,
  autoplayObjective: "enter-computer-control-room",
  autoplayControlPipeline: "first-door-entry-forward-lock",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "enter-computer-control-room",
        predictions: 58,
        doorOpenedCount: 1,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: false,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: false
        },
        autoplayState: {
          routeMode: "post-door",
          currentRoute: "cross-bridge-route",
          doorOpenedCount: 1,
          milestones: {
            doorOpened: 1,
            doorOpenedCount: 1,
            computerRoomEntered: false
          }
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    contextDict: "open-space",
    spawnCorridorGapScore: 0.31,
    spawnLandmarkRouteEvidence: 0.43,
    firstDoorVision9x9Score: 0.39,
    firstDoorVision9x9RedScore: 0,
    firstDoorVision9x9Box: { column: 3, row: 5, columns: 2, rows: 2, score: 0.39, redScore: 0 },
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.01,
    bridgeGreenLeft: 0.05,
    bridgeGreenCenter: 0.21,
    bridgeGreenRight: 0.16,
    computerRoomScore: 0.07,
    computerPanelScore: 0.28,
    computerDarkPanelScore: 0.08,
    motionObstacleScore: 0.57,
    footObstacleScore: 0.57,
    motionForwardProgress: 0.70
  },
  audio: {},
  player: { health: 100 }
});

assert(weakStickyDoorOpenBeforeComputerRoomState.doorOpenedContradicted === true, "Weak sticky post-door milestone should be contradicted when FirstDoor is still visually present");
assert(weakStickyDoorOpenBeforeComputerRoomState.doorOpenedCount === 0, "Weak sticky post-door milestone must not keep first-door routing unlocked");
assert(weakStickyDoorOpenBeforeComputerRoomState.objective !== "enter-computer-room", "Weak sticky post-door milestone should not promote ComputerRoom before a confirmed open door");
assert(weakStickyDoorOpenBeforeComputerRoomState.semanticMemory?.phase === "OpeningHome", "Weak sticky post-door milestone should project OpeningHome until the door is confirmed open");

const roundedWeakStickyDoorOpenBeforeComputerRoomState = wasmState.createState({
  frameCount: 1094,
  autoplayPredictions: 70,
  autoplayObjective: "enter-computer-control-room",
  autoplayControlPipeline: "first-door-entry-forward-lock",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "enter-computer-control-room",
        predictions: 70,
        doorOpenedCount: 1,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: false,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: false
        },
        autoplayState: {
          routeMode: "post-door",
          currentRoute: "cross-bridge-route",
          doorOpenedCount: 1,
          milestones: {
            doorOpened: 1,
            doorOpenedCount: 1,
            computerRoomEntered: false
          }
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    contextDict: "open-space",
    spawnCorridorGapScore: 0.26,
    spawnLandmarkRouteEvidence: 0.42,
    firstDoorVision9x9Score: 0.34,
    firstDoorVision9x9RedScore: 0,
    firstDoorVision9x9Box: { column: 3, row: 5, columns: 2, rows: 2, score: 0.34, redScore: 0 },
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenLeft: 0.02,
    bridgeGreenCenter: 0.09,
    bridgeGreenRight: 0.22,
    computerRoomScore: 0.07,
    computerPanelScore: 0.25,
    computerDarkPanelScore: 0.09,
    motionObstacleScore: 0.57,
    footObstacleScore: 0.57,
    motionForwardProgress: 0.70
  },
  audio: {},
  player: { health: 100 }
});

assert(roundedWeakStickyDoorOpenBeforeComputerRoomState.doorOpenedContradicted === true, "Rounded weak sticky post-door milestone should be contradicted when FirstDoor is still visible");
assert(roundedWeakStickyDoorOpenBeforeComputerRoomState.doorOpenedCount === 0, "Rounded weak sticky post-door milestone must not keep ComputerRoom routing unlocked");
assert(roundedWeakStickyDoorOpenBeforeComputerRoomState.objective !== "enter-computer-room", "Rounded weak sticky post-door milestone should not promote ComputerRoom");
assert(roundedWeakStickyDoorOpenBeforeComputerRoomState.semanticMemory?.phase === "OpeningHome", "Rounded weak sticky post-door milestone should project OpeningHome");

const postUsePipelineVisualOpenState = wasmState.createState({
  frameCount: 4054,
  autoplayPredictions: 3854,
  autoplayObjective: "open-first-door",
  autoplayControlPipeline: "door-approach-post-use-visible-door-settle",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3854,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.37,
    firstDoorVision9x9Score: 0.43,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.26,
    bridgeGreenCenter: 0.23
  },
  audio: {},
  player: { health: 100 }
});

assert(postUsePipelineVisualOpenState.postDoorVisualOpenCue === true, "Post-use Control stage should preserve the bounded visual door-open window even when the Use latch has settled");
assert(postUsePipelineVisualOpenState.doorOpenedCount === 0, "Post-use weak visual evidence should stay diagnostic and must not unlock first-door routing");

const postUseFrameOnlyRouteVisualState = wasmState.createState({
  frameCount: 4058,
  autoplayPredictions: 3858,
  autoplayObjective: "open-first-door",
  autoplayControlPipeline: "door-approach-post-use-visible-door-settle",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3858,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: false,
        firstDoorUseAttempted: false,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: false
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.96,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.40,
    firstDoorVision9x9Score: 0.02,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.35,
    bridgeGreenCenter: 0.39,
    bridgeGreenRight: 0.41,
    darkAreaScore: 0.10
  },
  audio: {},
  player: { health: 100 }
});

assert(postUseFrameOnlyRouteVisualState.postDoorVisualOpenCue === true, "Frame-derived corridor/door confidence should be enough to preserve post-use visual open routing");
assert(postUseFrameOnlyRouteVisualState.doorOpenedCount === 0, "Frame-only weak post-use visual evidence should not unlock first-door routing");

const useCooldownVisualOpenState = wasmState.createState({
  frameCount: 4059,
  autoplayPredictions: 3859,
  autoplayObjective: "open-first-door",
  useCooldown: 31,
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3859,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: false,
        firstDoorUseAttempted: false,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: false
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.40,
    firstDoorVision9x9Score: 0.33,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.26,
    bridgeGreenLeft: 0.39,
    bridgeGreenCenter: 0.22,
    bridgeGreenRight: 0.08,
    computerDarkPanelScore: 0.43,
    darkAreaScore: 0.06
  },
  audio: {},
  player: { health: 100 }
});

assert(useCooldownVisualOpenState.postDoorVisualOpenCue === true, "Use cooldown should preserve the bounded visual door-open window when Control pipeline text is not yet available");
assert(useCooldownVisualOpenState.doorOpenedCount === 0, "Use-cooldown weak visual evidence should not unlock first-door routing");

const pipelineKinesisPostUseVisualOpenState = wasmState.createState({
  frameCount: 4061,
  autoplayPredictions: 3861,
  autoplayObjective: "open-first-door",
  autoplayAutoplayState: {
    pipelineState: {
      kinesis: {
        lastUsePulsePrediction: 3824,
        usePulseCooldownFrames: 31
      }
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3861,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: false,
        firstDoorUseAttempted: false,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: false
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.38,
    firstDoorVision9x9Score: 0.41,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenCenter: 0.31,
    darkAreaScore: 0.08
  },
  audio: {},
  player: { health: 100 }
});

assert(pipelineKinesisPostUseVisualOpenState.postDoorVisualOpenCue === true, "PipelineState Kinesis Use pulse should preserve the post-door visual open window");
assert(pipelineKinesisPostUseVisualOpenState.doorOpenedCount === 0, "PipelineState Kinesis weak post-door geometry should not unlock first-door routing");

const weakComputerPanelDoorFrontState = wasmState.createState({
  frameCount: 4060,
  autoplayPredictions: 3860,
  autoplayObjective: "open-first-door",
  useCooldown: 39,
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3860,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.38,
    firstDoorVision9x9Score: 0.37,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.17,
    bridgeGreenLeft: 0.05,
    bridgeGreenCenter: 0.08,
    bridgeGreenRight: 0.04,
    computerPanelScore: 0.16,
    computerDarkPanelScore: 0.05,
    darkAreaScore: 0.05
  },
  audio: {},
  player: { health: 100 }
});

assert(weakComputerPanelDoorFrontState.postDoorVisualOpenCue === false, "Weak computer-panel texture while still at the door must not synthesize bridge-green evidence");
assert(weakComputerPanelDoorFrontState.doorOpenedCount === 0, "Weak post-use texture evidence should not unlock first-door routing before real post-door geometry appears");

const staleStrongComputerRoomVisualState = wasmState.createState({
  frameCount: 4060,
  autoplayPredictions: 3860,
  autoplayObjective: "open-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3860,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: false,
        firstDoorUseAttempted: false,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: false
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.40,
    firstDoorVision9x9Score: 0.33,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.25,
    bridgeGreenRight: 0.54,
    computerRoomScore: 0.19,
    computerPanelScore: 0.70,
    darkAreaScore: 0.12
  },
  audio: {},
  player: { health: 97 }
});

assert(staleStrongComputerRoomVisualState.postDoorStrongComputerVisualCue === false, "Strong computer-room panel evidence without Use context must not synthesize a door-open milestone");
assert(staleStrongComputerRoomVisualState.doorOpenedCount === 0, "Stale strong visual evidence should not unlock first-door routing after a reset");

const staleRecordedUseComputerRoomVisualState = wasmState.createState({
  frameCount: 4060,
  autoplayPredictions: 3860,
  autoplayObjective: "open-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3860,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: false,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.40,
    firstDoorVision9x9Score: 0.33,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.25,
    bridgeGreenRight: 0.54,
    computerRoomScore: 0.19,
    computerPanelScore: 0.70,
    darkAreaScore: 0.12
  },
  audio: {},
  player: { health: 97 }
});

assert(staleRecordedUseComputerRoomVisualState.postDoorStrongComputerVisualCue === false, "Recorded Use history without a fresh Use window must not synthesize a second-loop door-open milestone");
assert(staleRecordedUseComputerRoomVisualState.doorOpenedCount === 0, "Stale recorded Use evidence should keep first-door routing locked after a retry reset");

const strongComputerRoomVisualAfterUseState = wasmState.createState({
  frameCount: 4060,
  autoplayPredictions: 3860,
  autoplayObjective: "open-first-door",
  autoplayAutoplayState: {
    kinesis: {
      lastUsePulsePrediction: 3820
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3860,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: false,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.40,
    firstDoorVision9x9Score: 0.33,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.25,
    bridgeGreenRight: 0.54,
    computerRoomScore: 0.19,
    computerPanelScore: 0.70,
    darkAreaScore: 0.12
  },
  audio: {},
  player: { health: 97 }
});

assert(strongComputerRoomVisualAfterUseState.postDoorStrongComputerVisualCue === true, "Strong computer-room panel and bridge-green evidence should confirm the first door after a recorded Use attempt");
assert(strongComputerRoomVisualAfterUseState.doorOpenedCount === 1, "Strong post-use visual evidence should unlock first-door routing");

const weakTerminalFalseEnemyState = wasmState.createState({
  frameCount: 4068,
  autoplayPredictions: 3868,
  autoplayObjective: "open-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3868,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    enemyConfidence: 0.28,
    enemyAllRegionPeak: 0.20,
    enemyLateralBias: 0.10,
    computerPanelScore: 0.60,
    computerDarkPanelScore: 0.13,
    computerRoomScore: 0.16,
    bridgeBrownScore: 0.46
  },
  audio: {
    eventDetected: false,
    eventType: "none",
    leftEnergy: 0,
    rightEnergy: 0
  },
  player: { health: 100 }
});

assert(weakTerminalFalseEnemyState.visualEnemySuppressed === true, "Weak terminal-surface brown blobs should be suppressed as visual enemy false positives");
assert(weakTerminalFalseEnemyState.enemyConfidence <= 0.10, "Suppressed terminal-surface false positives should not drive Pathos enemy confidence");
assert(weakTerminalFalseEnemyState.objective !== "avoid-enemy", "Weak terminal-surface false positives should not route to avoid-enemy after the first door");

const observedPostDoorTerminalSurfaceState = wasmState.createState({
  frameCount: 1437,
  autoplayPredictions: 1389,
  autoplayObjective: "reach-central-hall",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 1389,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.29,
    computerRoomScore: 0.10,
    computerPanelScore: 0.37,
    computerDarkPanelScore: 0.10,
    bridgeBrownScore: 0.14,
    bridgeGreenLeft: 0.26,
    bridgeGreenCenter: 0.22,
    bridgeGreenRight: 0.07,
    bridgeDoorScore: 0.03,
    darkAreaScore: 0.03
  },
  audio: {},
  player: { health: 100 }
});

assert(observedPostDoorTerminalSurfaceState.postDoorTerminalSurface >= 0.37, "Observed weak post-door computer terminal surface should be carried into Control state");
assert(observedPostDoorTerminalSurfaceState.computerRoomConfidence >= 0.37, "Post-door terminal surface should keep computer-room confidence high enough for route arbitration");
assert(observedPostDoorTerminalSurfaceState.objective !== "avoid-enemy", "Observed post-door terminal surface must not become a combat false positive");

const confirmedPostDoorComputerRoomVisualState = wasmState.createState({
  frameCount: 2883,
  autoplayPredictions: 1870,
  autoplayObjective: "reach-central-hall",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 1870,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    computerRoomScore: 0.15,
    computerPanelScore: 0.34,
    computerDarkPanelScore: 0.26,
    bridgeBrownScore: 0.59,
    bridgeDoorScore: 0.03,
    firstDoorUse3x3Score: 0,
    enemyConfidence: 0.20,
    enemyAllRegionPeak: 0.10
  },
  audio: {},
  player: { health: 100 }
});

assert(confirmedPostDoorComputerRoomVisualState.postDoorComputerRoomVisualEntry === true, "Strong post-door terminal and bridge evidence should confirm ComputerRoom entry after the first door is open");
assert(confirmedPostDoorComputerRoomVisualState.computerRoomEntered === true, "Confirmed post-door ComputerRoom visual entry should promote the route phase");
assert(confirmedPostDoorComputerRoomVisualState.semanticMemory?.phase === "ComputerRoom", "Post-door ComputerRoom visual entry should update semantic phase");

const terminalHeavyPostDoorComputerRoomVisualState = wasmState.createState({
  frameCount: 1796,
  autoplayPredictions: 700,
  autoplayObjective: "reach-central-hall",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 700,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    computerRoomScore: 0.17,
    computerPanelScore: 0.18,
    computerDarkPanelScore: 0.43,
    bridgeBrownScore: 0.34,
    bridgeDoorScore: 0.36,
    firstDoorUse3x3Score: 0,
    enemyConfidence: 0.39,
    enemyAllRegionPeak: 0.10
  },
  audio: {},
  player: { health: 100 }
});

assert(terminalHeavyPostDoorComputerRoomVisualState.postDoorComputerRoomVisualEntry === true, "Strong post-door terminal surface should confirm ComputerRoom entry even when bridge evidence is only moderate");
assert(terminalHeavyPostDoorComputerRoomVisualState.semanticMemory?.phase === "ComputerRoom", "Terminal-heavy post-door visual entry should not remain stuck in PostDoor");

const postDoorRouteConfirmedComputerRoomState = wasmState.createState({
  frameCount: 1892,
  autoplayPredictions: 910,
  autoplayObjective: "reach-central-hall",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 910,
        doorOpenedCount: 1,
        controlPipeline: "post-door-computer-room-bridge-reacquired-forward",
        autoplayState: {
          currentRoute: "cross-bridge-route",
          routeMode: "post-door",
          doorOpenedCount: 1
        },
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: false
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    firstDoorVision9x9Score: 0.02,
    firstDoorUse3x3Score: 0,
    computerRoomScore: 0.17,
    computerPanelScore: 0.22,
    computerDarkPanelScore: 0.16,
    bridgeBrownScore: 0.48,
    bridgeGreenCenter: 0.34,
    bridgeDoorScore: 0.27,
    motionForwardProgress: 0.70
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorRouteConfirmedComputerRoomState.postDoorComputerRoomRouteEntry === true, "Cross-bridge route evidence should confirm ComputerRoom entry after a verified first-door open");
assert(postDoorRouteConfirmedComputerRoomState.computerRoomEntered === true, "Route-confirmed ComputerRoom entry should stay latched for post-door planning");
assert(postDoorRouteConfirmedComputerRoomState.objective === "reach-central-hall", "Route-confirmed ComputerRoom entry should target Central Hall instead of re-entering the room");

const postDoorStickyComputerRoomState = wasmState.createState({
  frameCount: 2240,
  autoplayPredictions: 1180,
  autoplayObjective: "find-corridor-to-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "find-corridor-to-first-door",
        predictions: 1180,
        doorOpenedCount: 1,
        controlPipeline: "computer-room-post-door-route-hold",
        autoplayState: {
          currentRoute: "computer-room-post-door-route-hold",
          routeMode: "post-door",
          doorOpenedCount: 1
        },
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: false
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.94,
    left: 18,
    center: 18,
    right: 20,
    firstDoorVision9x9Score: 0.10,
    firstDoorUse3x3Score: 0,
    computerRoomScore: 0.10,
    computerPanelScore: 0.20,
    computerDarkPanelScore: 0.18,
    bridgeGreenCenter: 0.30,
    bridgeBrownScore: 0.26,
    bridgeDoorScore: 0.16,
    motionForwardProgress: 0.52
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorStickyComputerRoomState.postDoorComputerRoomStickyEntry === true, "Post-door ComputerRoom sticky evidence should survive stale FirstDoor objectives");
assert(postDoorStickyComputerRoomState.computerRoomEntered === true, "Sticky ComputerRoom evidence should keep the route in ComputerRoom after entry");
assert(postDoorStickyComputerRoomState.objective === "reach-central-hall", "Sticky ComputerRoom state should continue toward Central Hall");

const postDoorReturnedOpeningSideState = wasmState.createState({
  frameCount: 2290,
  autoplayPredictions: 1288,
  autoplayObjective: "reach-central-hall",
  autoplayControlPipeline: "post-door-computer-room-egress",
  autoplaySemanticMemory: {
    phase: "ComputerRoom",
    objective: "reach-central-hall",
    computerRoom: { confidence: 0.71 },
    safeZone: { confidence: 0.85 },
    symbols: {
      "computer-room": 0.71,
      "safe-zone": 0.85,
      bridge: 0.57,
      door: 0.72
    }
  },
  autoplayMilestones: {
    doorOpened: 1,
    doorOpenedCount: 1,
    computerRoomEntered: true,
    computerRoomScore: 0.71
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 1288,
        doorOpenedCount: 1,
        computerRoomEntered: true,
        controlPipeline: "post-door-computer-room-egress",
        autoplayState: {
          currentRoute: "cross-bridge-route",
          routeMode: "post-door",
          doorOpenedCount: 1,
          computerRoomEntered: true
        },
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: true,
          computerRoomScore: 0.71
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.96,
    left: 12,
    center: 12,
    right: 12,
    contextDict: "open-space",
    firstDoorVision9x9Score: 0.33,
    firstDoorVision9x9RedScore: 0.02,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeBrownScore: 0.57,
    bridgeGreenCenter: 0.06,
    computerRoomScore: 0.02,
    computerPanelScore: 0.09,
    computerDarkPanelScore: 0.03,
    darkAreaScore: 0.04,
    spawnSecretDoorScore: 0.73,
    courtyardScore: 0.28,
    motionForwardProgress: 0.48,
    footObstacleScore: 0.65
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorReturnedOpeningSideState.postDoorReturnedOpeningSideEvidence === true, "Opening-side visual evidence should be detected when stale ComputerRoom memory returns outdoors");
assert(postDoorReturnedOpeningSideState.computerRoomEntered === false, "Opening-side return should clear stale ComputerRoom entry while keeping the first door open");
assert(postDoorReturnedOpeningSideState.doorOpenedCount === 1, "Opening-side return should not erase the verified first-door-open milestone");
assert(postDoorReturnedOpeningSideState.semanticMemory?.phase === "PostDoor", "Opening-side return should project back to PostDoor instead of ComputerRoom");
assert(postDoorReturnedOpeningSideState.semanticMemory?.objective === "enter-computer-room", "Opening-side return should ask the route layer to re-enter ComputerRoom");
assert((postDoorReturnedOpeningSideState.semanticMemory?.computerRoom?.confidence || 0) === 0, "Opening-side return should drop stale ComputerRoom confidence");

const postDoorEnemyMemoryState = wasmState.createState({
  frameCount: 1418,
  autoplayPredictions: 1353,
  autoplayObjective: "reach-central-hall",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 1353,
        doorOpenedCount: 1,
        enemyConfidencePeak: 0.77,
        milestones: {
          doorOpened: 1,
          enemyConfidencePeak: 0.77
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    enemyConfidence: 0.11,
    enemyAllRegionPeak: 0.11,
    enemyStructuralDecoy: false,
    computerRoomScore: 0.16,
    computerPanelScore: 0.53,
    computerDarkPanelScore: 0.11,
    bridgeBrownScore: 0.35,
    bridgeGreenLeft: 0.26,
    bridgeGreenCenter: 0.39,
    bridgeGreenRight: 0.03
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorEnemyMemoryState.visualEnemySuppressed === true, "Post-door terminal surface should still suppress the current-frame weak visual enemy");
assert(postDoorEnemyMemoryState.visualEnemyVisible === false, "Enemy memory must not pretend the current frame has a centered visible enemy");
assert(postDoorEnemyMemoryState.terminalVisualCombatDecoy === true, "Weak post-door terminal surface should be labeled as a visual combat decoy");
assert(postDoorEnemyMemoryState.postDoorEnemyMemoryEvidence === false, "Terminal visual combat decoy should not resurrect stale enemy memory evidence");
assert(postDoorEnemyMemoryState.trustedCombatEvidence === false, "Terminal visual combat decoy should not feed trusted combat evidence");
assert(postDoorEnemyMemoryState.trustedEnemyThreat < 0.26, "Terminal visual combat decoy should keep trusted threat below the combat gate");
assert(postDoorEnemyMemoryState.objective !== "avoid-enemy", "Terminal visual combat decoy should preserve a post-door route instead of entering combat avoidance");

const postDoorStructuralDecoyMemoryState = wasmState.createState({
  frameCount: 1419,
  autoplayPredictions: 1354,
  autoplayObjective: "reach-central-hall",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 1354,
        doorOpenedCount: 1,
        enemyConfidencePeak: 0.77,
        milestones: {
          doorOpened: 1,
          enemyConfidencePeak: 0.77
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1,
    left: 12,
    center: 12,
    right: 12,
    enemyConfidence: 0.11,
    enemyAllRegionPeak: 0.11,
    enemyStructuralDecoy: true,
    computerRoomScore: 0.16,
    computerPanelScore: 0.53,
    computerDarkPanelScore: 0.11
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorStructuralDecoyMemoryState.postDoorEnemyMemoryEvidence === false, "Explicit structural decoys must not be promoted by enemy peak memory");
assert(postDoorStructuralDecoyMemoryState.trustedCombatEvidence === false, "Explicit structural decoys must keep trusted combat evidence off without audio or damage");

const staleDoorVisualState = wasmState.createState({
  frameCount: 4060,
  autoplayPredictions: 3860,
  autoplayObjective: "open-first-door",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "open-first-door",
        predictions: 3860,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0,
          firstDoorUseAttempted: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    spawnCorridorGapScore: 0.49,
    firstDoorVision9x9Score: 0.45,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0,
    bridgeGreenCenter: 0.39
  },
  audio: {},
  player: { health: 100 }
});

assert(staleDoorVisualState.postDoorVisualOpenCue === false, "Open-looking corridor evidence without a bounded Use pulse must not unlock the door");
assert(staleDoorVisualState.doorOpenedCount === 0, "Stale visual evidence should not bypass the first-door milestone");

const audioOnlyDoorState = wasmState.createState({
  frameCount: 4100,
  autoplayPredictions: 3900,
  autoplayObjective: "find-corridor-to-first-door",
  autoplayAutoplayState: {
    kinesis: {
      lastUsePulsePrediction: 3700
    }
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "find-corridor-to-first-door",
        predictions: 3900,
        doorOpenedCount: 0,
        firstDoorCorridorLocated: true,
        firstDoorUseAttempted: true,
        milestones: {
          doorOpened: 0
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.95,
    left: 12,
    center: 12,
    right: 12,
    computerRoomScore: 0,
    computerDarkPanelScore: 0,
    computerPanelScore: 0
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.008,
    rightEnergy: 0.006
  },
  player: { health: 100 }
});

assert(audioOnlyDoorState.postDoorAudioCue === false, "Native SFX without post-door visual evidence must not unlock the door");
assert(audioOnlyDoorState.doorOpenedCount === 0, "Audio alone should not bypass the first-door milestone");

const contradictedDoorOpenedState = wasmState.createState({
  frameCount: 4140,
  autoplayPredictions: 822,
  autoplayObjective: "reach-central-hall",
  autoplayControlPipeline: "post-door-computer-room-egress",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-central-hall",
        predictions: 822,
        controlPipeline: "post-door-computer-room-egress",
        doorOpenedCount: 1,
        computerRoomEntered: true,
        motionObstacleScore: 0.57,
        motionForwardProgress: 0.00,
        milestones: {
          doorOpened: 1,
          doorOpenedCount: 1,
          computerRoomEntered: true
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 1.00,
    left: 10,
    center: 10,
    right: 10,
    firstDoorVision9x9Score: 0.37,
    firstDoorVision9x9RedScore: 0.00,
    firstDoorUse3x3Score: 0.00,
    bridgeDoorScore: 0.00,
    bridgeBrownScore: 0.11,
    bridgeGreenLeft: 0.24,
    bridgeGreenCenter: 0.25,
    bridgeGreenRight: 0.25,
    computerRoomScore: 0.11,
    computerPanelScore: 0.31,
    computerDarkPanelScore: 0.20,
    motionObstacleScore: 0.57,
    footObstacleScore: 0.57,
    motionForwardProgress: 0.00
  },
  audio: {},
  player: { health: 100 }
});

assert(contradictedDoorOpenedState.doorOpenedContradicted === true, "Closed-door visual/contact evidence should contradict a stale first-door-open milestone");
assert(contradictedDoorOpenedState.doorOpenedCount === 0, "Contradicted first-door milestone should be cleared before routing");
assert(contradictedDoorOpenedState.computerRoomEntered === false, "Contradicted first-door milestone should not leave ComputerRoom latched");
assert(contradictedDoorOpenedState.objective !== "reach-central-hall", "Contradicted first-door milestone should restore the FirstDoor objective");

const sensorHealthState = wasmState.createState({
  frameCount: 4200,
  autoplayObjective: "cross-bridge",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "cross-bridge",
        predictions: 4200,
        healthSensor: {
          value: 42,
          health: 42,
          lowHealth: true,
          lowHealthThreshold: 50
        },
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.88,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.4
  },
  audio: {},
  player: { health: null }
});

assert(sensorHealthState.health === 42, "WASM state should prefer health sensor value when native player health is unavailable");
assert(sensorHealthState.objective === "reach-central-hall", "Post-door low health should favor goal-first routing toward central hall");

const audioEnemyState = wasmState.createState({
  frameCount: 4300,
  autoplayObjective: "cross-bridge",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "cross-bridge",
        predictions: 4300,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.88,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.3
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.06,
    rightEnergy: 0.22,
    midEnergy: 0.2,
    highEnergy: 0.08
  },
  player: { health: 100 }
});

assert(audioEnemyState.audioEnemyConfidence >= 0.24, "Combat-like audio should project enemy confidence into WASM state");
assert(audioEnemyState.audioEnemyDirection === "right", "WASM state should expose stereo enemy direction");
assert(audioEnemyState.enemyConfidence >= audioEnemyState.audioEnemyConfidence, "Enemy confidence should include auditory enemy confidence");
assert(audioEnemyState.activeDetections.includes("audio-enemy-right"), "Auditory enemy localization should be visible in active detections");

const doorUseAudioState = wasmState.createState({
  frameCount: 4310,
  autoplayObjective: "cross-bridge",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "cross-bridge",
        predictions: 4310,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.88,
    left: 10,
    center: 10,
    right: 10,
    bridgeBrownScore: 0.3
  },
  audio: {
    eventDetected: true,
    eventType: "use-success-gate",
    leftEnergy: 0.06,
    rightEnergy: 0.22,
    midEnergy: 0.2,
    highEnergy: 0.08
  },
  player: { health: 100 }
});

assert(doorUseAudioState.audioEnemyConfidence === 0, "Door Use audio should not become auditory enemy confidence");

const centralHallLowHealthState = wasmState.createState({
  frameCount: 4320,
  autoplayObjective: "engage-front-enemy",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "engage-front-enemy",
        predictions: 4320,
        doorOpenedCount: 1,
        centralHallEntered: true,
        enemyDefeatedCount: 0,
        ammoLikelyEmpty: false,
        milestones: {
          doorOpened: 1
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.9,
    left: 20,
    center: 20,
    right: 20
  },
  audio: {
    eventDetected: true,
    eventType: "native-sfx",
    leftEnergy: 0.08,
    rightEnergy: 0.1,
    midEnergy: 0.14
  },
  player: { health: 42 }
});

assert(centralHallLowHealthState.centralHallEntered === true, "WASM state should expose central-hall milestone projection");
assert(centralHallLowHealthState.objective === "reach-final-room", "Low health in central hall should bypass gatekeeper toward final room");

const finalRoomState = wasmState.createState({
  frameCount: 4330,
  autoplayObjective: "reach-final-room",
  bonsaiSupervisor: {
    status() {
      return {
        objective: "reach-final-room",
        predictions: 4330,
        doorOpenedCount: 2,
        finalRoomEntered: true,
        exitSwitchPressed: false,
        milestones: {
          doorOpened: 2
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.55,
    left: 18,
    center: 18,
    right: 18
  },
  audio: {},
  player: { health: 80 }
});

assert(finalRoomState.finalRoomEntered === true, "WASM state should expose final-room milestone projection");
assert(finalRoomState.objective === "press-exit-switch", "Final-room routing should arm the exit switch objective");

const terminalOnlyEnemyState = wasmState.createState({
  frameCount: 5200,
  autoplayPredictions: 5000,
  autoplayObjective: "enter-computer-control-room",
  autoplayMilestones: {
    doorOpened: 1
  },
  bonsaiSupervisor: {
    status() {
      return {
        objective: "enter-computer-control-room",
        predictions: 5000,
        doorOpenedCount: 1,
        milestones: {
          doorOpened: 1,
          computerRoomScore: 0.64
        }
      };
    }
  }
}, {
  framebuffer: {
    depthEstimate: 0.72,
    left: 20,
    center: 20,
    right: 20,
    enemyConfidence: 0.77,
    enemyAllRegionPeak: 1,
    enemyLateralBias: 0.50,
    computerRoomScore: 0.64,
    computerPanelScore: 0.70,
    computerDarkPanelScore: 0.35,
    firstDoorVision9x9Score: 0.34,
    firstDoorVision9x9RedScore: 0,
    firstDoorUse3x3Score: 0,
    bridgeDoorScore: 0.34
  },
  audio: {
    eventDetected: false,
    leftEnergy: 0.006,
    rightEnergy: 0.006,
    lowEnergy: 0.001,
    midEnergy: 0.001,
    highEnergy: 0.001
  },
  player: { health: 100 }
});

assert(terminalOnlyEnemyState.visualEnemySuppressed === true, "Computer terminal surfaces without audio/red evidence should suppress visual enemy false positives");
assert(terminalOnlyEnemyState.visualEnemyConfidence <= 0.10, "Suppressed terminal-only visual confidence should be capped for Control");
assert(terminalOnlyEnemyState.enemyConfidence <= 0.10, "Suppressed terminal-only enemy evidence should not drive Pathos combat");

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

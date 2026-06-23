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
assert(stickyOpenedDoorState.objective === "reach-bridge", "Sticky first-door opening should keep routing in the post-door phase");

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
assert(postDoorAudioState.doorOpenedCount === 1, "Post-door audio cue should unlock first-door routing for Control state");

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
    bridgeGreenCenter: 0.39
  },
  audio: {},
  player: { health: 100 }
});

assert(postDoorVisualOpenState.postDoorVisualOpenCue === true, "Use-adjacent open corridor and bridge-green evidence should create a visual post-door open cue");
assert(postDoorVisualOpenState.doorOpenedCount === 1, "Post-door visual open cue should unlock first-door routing without requiring audio");

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
assert(postUsePipelineVisualOpenState.doorOpenedCount === 1, "Post-use visual door-open evidence should unlock first-door routing");

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
assert(postUseFrameOnlyRouteVisualState.doorOpenedCount === 1, "Frame-only post-use visual open evidence should unlock first-door routing");

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
assert(useCooldownVisualOpenState.doorOpenedCount === 1, "Use-cooldown visual door-open evidence should unlock first-door routing");

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
assert(pipelineKinesisPostUseVisualOpenState.doorOpenedCount === 1, "PipelineState Kinesis Use pulse should unlock first-door routing when post-door geometry appears");

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

const strongComputerRoomVisualState = wasmState.createState({
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

assert(strongComputerRoomVisualState.postDoorStrongComputerVisualCue === true, "Strong computer-room panel and bridge-green evidence should confirm the first door even after the Use window has decayed");
assert(strongComputerRoomVisualState.doorOpenedCount === 1, "Strong post-door visual evidence should unlock first-door routing");

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
assert(postDoorEnemyMemoryState.postDoorEnemyMemoryEvidence === true, "Recent post-door enemy peak should remain as memory evidence through terminal masking");
assert(postDoorEnemyMemoryState.trustedCombatEvidence === true, "Post-door enemy memory should feed trusted combat evidence");
assert(postDoorEnemyMemoryState.trustedEnemyThreat >= 0.26, "Post-door enemy memory should provide a bounded trusted threat");
assert(postDoorEnemyMemoryState.objective !== "avoid-enemy", "Post-door enemy memory should not force an immediate avoid-enemy route while the visual is suppressed");

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

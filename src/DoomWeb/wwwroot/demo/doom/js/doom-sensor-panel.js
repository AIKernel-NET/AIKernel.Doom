(function () {
  "use strict";

  const version = "20260621-sensorpanel3";

  const sensorDescriptors = Object.freeze({
    visual: Object.freeze({ label: "Visual", signal: "9x9 frame", panel: "aisthesis", stage: "primary" }),
    audio: Object.freeze({ label: "Audio", signal: "stereo energy", panel: "aisthesis", stage: "primary" }),
    movement: Object.freeze({ label: "Movement", signal: "motion vector", panel: "aisthesis", stage: "primary" }),
    compass: Object.freeze({ label: "Compass", signal: "heading vector", panel: "aisthesis", stage: "primary" }),
    health: Object.freeze({ label: "Health", signal: "life state", panel: "aisthesis", stage: "primary" }),
    spatial: Object.freeze({ label: "Spatial", signal: "Topos state", panel: "krisis", stage: "topos" }),
    motor: Object.freeze({ label: "Motor", signal: "input vector", panel: "kinesis", stage: "motion" })
  });

  const detectionDescriptors = Object.freeze({
    motion: Object.freeze({ label: "Looming", signal: "flow / approach", panel: "noesis", stage: "phainesis" }),
    wall: Object.freeze({ label: "Stuck", signal: "wall / trap", panel: "noesis", stage: "phainesis" }),
    health: Object.freeze({ label: "HP Veto", signal: "life audit", panel: "kinesis", stage: "zoe" }),
    enemy: Object.freeze({ label: "Enemy", signal: "enemy seen", panel: "noesis", stage: "phainesis" }),
    hud: Object.freeze({ label: "Entropy", signal: "HUD / uncertainty", panel: "noesis", stage: "phainesis" }),
    computer: Object.freeze({ label: "Item", signal: "backtrack / room", panel: "noesis", stage: "phainesis" }),
    objective: Object.freeze({ label: "Objective", signal: "Telos route", panel: "krisis", stage: "topos" }),
    door: Object.freeze({ label: "Door", signal: "open target", panel: "krisis", stage: "topos" }),
    spatial: Object.freeze({ label: "Spatial", signal: "decision field", panel: "krisis", stage: "topos" }),
    foot: Object.freeze({ label: "Collision", signal: "foot contact", panel: "aisthesis", stage: "primary" })
  });

  const signalChip = (label, signal) => Object.freeze({ type: "signal", label, signal });
  const sensorChip = key => Object.freeze({ type: "sensor", key });
  const detectionChip = key => Object.freeze({ type: "detection", key });

  const panelLayout = Object.freeze([
    Object.freeze({
      key: "aisthesis",
      className: "is-aisthesis",
      title: "Aisthesis",
      subtitle: "Perception layer",
      stages: Object.freeze([
        Object.freeze({
          key: "primary",
          title: "Primary sensors",
          items: Object.freeze([
            sensorChip("visual"),
            sensorChip("audio"),
            sensorChip("movement"),
            sensorChip("compass"),
            detectionChip("foot"),
            sensorChip("health")
          ])
        })
      ])
    }),
    Object.freeze({
      key: "noesis",
      className: "is-noesis",
      title: "Noesis",
      subtitle: "Cognition layer",
      stages: Object.freeze([
        Object.freeze({
          key: "phainesis",
          title: "Phainesis",
          items: Object.freeze([
            detectionChip("motion"),
            detectionChip("wall"),
            signalChip("Damage", "localization"),
            detectionChip("enemy"),
            detectionChip("hud"),
            detectionChip("computer")
          ])
        }),
        Object.freeze({
          key: "nous",
          title: "Nous",
          items: Object.freeze([
            signalChip("LoomingVector", "approach"),
            signalChip("StuckVector", "trap"),
            signalChip("DamageVector", "damage"),
            signalChip("EnemyVector", "enemy"),
            signalChip("EntropyVector", "entropy"),
            signalChip("ItemVector", "item")
          ])
        })
      ])
    }),
    Object.freeze({
      key: "krisis",
      className: "is-krisis",
      title: "Krisis",
      subtitle: "Judgement layer",
      stages: Object.freeze([
        Object.freeze({
          key: "topos",
          title: "Topos",
          items: Object.freeze([
            sensorChip("spatial"),
            detectionChip("objective"),
            detectionChip("door"),
            detectionChip("spatial"),
            signalChip("LogosVector", "route"),
            signalChip("PathosVector", "risk"),
            signalChip("EthosVector", "veto"),
            signalChip("ToposDecision", "carrier")
          ])
        }),
        Object.freeze({
          key: "kairos",
          title: "Kairos",
          items: Object.freeze([
            signalChip("Pathos-priority", "danger first"),
            signalChip("Ethos-priority", "fail closed"),
            signalChip("Logos-priority", "route proof")
          ])
        })
      ])
    }),
    Object.freeze({
      key: "kinesis",
      className: "is-kinesis",
      title: "Kinesis",
      subtitle: "Action layer",
      stages: Object.freeze([
        Object.freeze({
          key: "motion",
          title: "Kinesis",
          items: Object.freeze([
            sensorChip("motor"),
            signalChip("Move", "forward / back"),
            signalChip("Turn", "left / right"),
            signalChip("Strafe", "lateral"),
            signalChip("Shoot", "fire")
          ])
        }),
        Object.freeze({
          key: "zoe",
          title: "Zoe",
          items: Object.freeze([
            detectionChip("health"),
            signalChip("HP veto", "life guard"),
            signalChip("Life audit", "action check"),
            signalChip("Fatal avoid", "forced stop")
          ])
        })
      ])
    })
  ]);

  function cloneDescriptorMap(map) {
    const clone = {};
    for (const key of Object.keys(map)) {
      clone[key] = Object.assign({}, map[key]);
    }

    return clone;
  }

  self.AIKernelDoomSensorPanel = Object.freeze({
    version,
    sensorDescriptors,
    detectionDescriptors,
    panelLayout,
    cloneSensorDescriptors: () => cloneDescriptorMap(sensorDescriptors),
    cloneDetectionDescriptors: () => cloneDescriptorMap(detectionDescriptors)
  });
})();

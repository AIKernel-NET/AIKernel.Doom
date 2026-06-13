# Autoplay Control Pipeline

The AutoPlay controller is a phase-routed decision system. It exists because a
single global rule set caused unstable behavior: combat logic fired before
enemies existed, door logic ran before the corridor was found, and wall recovery
overrode door Use attempts.

The implemented model is closer to an AIKernel ControlPipeline: finite phases,
phase-specific detectors, deterministic transitions, and bounded actions.

This document describes the Operator side of the demo. It follows the
development guideline principle that execution should be represented as an
explicit Skeleton/DAG instead of an implicit tangle of branches.

## Phase Model

Current phases:

```text
Idle
OpeningHome
FirstDoor
ComputerRoom
Bridge
SecondDoor
ExitRoom
```

Each phase owns:

- an objective,
- enabled detectors,
- permitted action families,
- transition evidence,
- debug overlay visibility.

This is the browser demo's practical equivalent of a phase-local pipeline. A
downstream detector or action is not allowed to run until the upstream phase is
confirmed.

## Objectives

Objectives are user-facing and appear in status/overlay:

```text
find-and-open-first-door
reach-central-hall
cross-bridge
reach-final-room
press-exit-switch
level-clear
```

The objective is not merely a label. It determines which detectors are active
and which command families can win the arbiter.

## Detector Routing

Examples:

`OpeningHome`

- objective, motion, wall, foot, HUD,
- combat disabled,
- Use disabled,
- goal is to locate the corridor entrance.

`FirstDoor`

- objective, motion, door, wall, foot, HUD,
- combat disabled,
- Use enabled only after door-facing evidence,
- wall avoidance is weakened near the door.

`ComputerRoom`

- objective, motion, computer, enemy, wall, foot, HUD,
- combat enabled,
- enemy alert memory enabled,
- central-hall transition enabled.

`Bridge`

- objective, motion, wall, foot, HUD,
- lane keeping is prioritized,
- green hazard detection is active,
- unnecessary turning is suppressed.

## Action Arbitration

Multiple modules may suggest actions in the same tick. The controller resolves
them by priority:

```text
Level 3: emergency / restart / hard stuck escape
Level 2: door probe, combat, bridge guard, exit switch
Level 1: mobility, wall detach, open advance
Level 0: neutral / idle
```

This avoids the most common failure mode from early versions: a low-priority
wall escape would overwrite a high-priority door Use action at the exact moment
the player was aligned with the door.

The arbiter is also a governance mechanism: it is where action conflicts become
reviewable instead of incidental.

## Door Use Discipline

DOOM doors require the player to be close enough, facing the line action, and
pressing Use on the correct tic. The controller separates door handling into
phases:

1. approach,
2. aim/settle,
3. pulse Use,
4. latch forward,
5. wait for transition evidence.

Use is not spammed. Repeated Use can cause a door to open and close again, so
the controller records `firstDoorUsePulsed`, `firstDoorUseLatchFrames`, and
`useCooldown`.

## Combat Discipline

Combat is disabled before the first door. After the computer room transition,
enemy detection is allowed.

Combat rules:

- enemy may be detected in any region,
- Fire is allowed only when centered,
- red/pink alerts can bypass unreliable depth in the dark room,
- brown/gray require close or centered confidence,
- green/gate colors are ignored,
- movement is held during centered fire,
- off-center targets cause turn and strafe rather than blind fire.

## Manual Debug Modes

`Manual Move`

- AI sensing stays active,
- Use and Fire can remain active,
- movement/turning are manual.

`Sense Only`

- sensing and phase routing stay active,
- all AI inputs are suppressed,
- useful for validating detector transitions while the user plays manually.

These modes are essential for human-in-the-loop tuning because they let the
developer isolate sensing errors from action errors.

## Status Fields

Key status fields:

```text
pipeline=ComputerRoom
objective=reach-central-hall
det=objective,motion,computer,enemy,wall,foot,hud
safety=dark-combat-alert
mobility=combat-alert-fire
milestones=door=1; dark=yes/...
regions9=...
motion9=...
enemy=...
useLatch=...
```

If the phase is wrong, fix phase evidence. If the phase is right but the action
is wrong, fix arbitration or the phase action policy.

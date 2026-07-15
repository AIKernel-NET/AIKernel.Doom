if (!globalThis.aiKernelDoomControl) {
    const configuration = process.env.DOOM_CONTROL_BROWSER_CONFIGURATION || "Debug";
    await import(`./bin/${configuration}/net10.0/browser-wasm/AppBundle/main.js`);
}

const evaluate = globalThis.aiKernelDoomControl?.evaluateBrowserFirstDoor;
if (typeof evaluate !== "function") {
    throw new Error("C# browser FirstDoor bridge was not exported.");
}
const evaluatePostComputerRoom = globalThis.aiKernelDoomControl?.evaluateBrowserPostComputerRoomRoute;
if (typeof evaluatePostComputerRoom !== "function") {
    throw new Error("C# browser post-COMPUTERROOM route bridge was not exported.");
}
const releaseSession = globalThis.aiKernelDoomControl?.releaseBrowserFirstDoorSession;
if (typeof releaseSession !== "function") {
    throw new Error("C# browser FirstDoor session release was not exported.");
}

const CONTRACT_VERSION = 4;
const CANONICAL_DOOM1_WAD_SHA256 = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";
const RAW_SCHEMA_VERSION = 1;
const RAW_LAYOUT = "pal8-center-20x13-v1";
const RAW_COLUMNS = 20;
const RAW_ROWS = 13;
const RAW_SAMPLE_LENGTH = RAW_COLUMNS * RAW_ROWS;
const RAW_PALETTE_LENGTH = 256 * 4;
const LOADING_CONTROL_TICKS = 2405;
const FIXED_UNIT = 65536;
const NATIVE_STATE_COUNT = 967;

let sessionId = "browser-smoke-session";
let runId = "browser-smoke-run-1";
let runGeneration = 1;
let nativeTick = 0;
let rawFrameSequence = 0;
let lastControlTick = 0;
let lastControlInput = null;

function assert(condition, message, value) {
    if (!condition) {
        throw new Error(`${message}: ${JSON.stringify(value)}`);
    }
}

function setPalette(palette, index, red, green, blue) {
    const offset = index * 4;
    palette[offset] = red;
    palette[offset + 1] = green;
    palette[offset + 2] = blue;
    palette[offset + 3] = 255;
}

function projectedFixture(valueForVisionCell) {
    const indices = new Uint8Array(RAW_SAMPLE_LENGTH);
    for (let row = 0; row < RAW_ROWS; row += 1) {
        for (let column = 0; column < RAW_COLUMNS; column += 1) {
            const visionRow = Math.floor(row * 9 / RAW_ROWS);
            const visionColumn = Math.floor(column * 9 / RAW_COLUMNS);
            indices[(row * RAW_COLUMNS) + column] = valueForVisionCell(visionRow, visionColumn);
        }
    }
    return indices;
}

const palette = new Uint8Array(RAW_PALETTE_LENGTH);
for (let index = 0; index < 256; index += 1) {
    palette[(index * 4) + 3] = 255;
}
setPalette(palette, 10, 96, 8, 8);
setPalette(palette, 200, 0, 0, 200);
setPalette(palette, 201, 120, 60, 10);

const doorIndices = projectedFixture((row, column) =>
    row >= 2 && row <= 3 && column >= 3 && column <= 4 ? 10 : 200);
const contactIndices = new Uint8Array(RAW_SAMPLE_LENGTH).fill(201);
const roomIndices = new Uint8Array(RAW_SAMPLE_LENGTH).fill(200);
const paletteRgbaBase64 = Buffer.from(palette).toString("base64");

function unavailableRawObservation() {
    return {
        schemaVersion: RAW_SCHEMA_VERSION,
        layout: RAW_LAYOUT,
        available: false,
        frameSequence: -1,
        nativeGameticObservedAtEvaluation: -1,
        sourceWidth: -1,
        sourceHeight: -1,
        gameplayHeight: -1,
        sampleColumns: 0,
        sampleRows: 0,
        paletteGeneration: 0,
        paletteIndicesBase64: "",
        paletteRgbaBase64: ""
    };
}

function rawObservation(kind, frameSequence, observedGametic) {
    const indices = kind === "contact"
        ? contactIndices
        : (kind === "room" ? roomIndices : doorIndices);
    return {
        schemaVersion: RAW_SCHEMA_VERSION,
        layout: RAW_LAYOUT,
        available: true,
        frameSequence,
        nativeGameticObservedAtEvaluation: observedGametic,
        sourceWidth: 320,
        sourceHeight: 200,
        gameplayHeight: 168,
        sampleColumns: RAW_COLUMNS,
        sampleRows: RAW_ROWS,
        paletteGeneration: 1,
        paletteIndicesBase64: Buffer.from(indices).toString("base64"),
        paletteRgbaBase64
    };
}

function controlInput(prediction, options = {}) {
    nativeTick += 1;
    const {
        rawKind = "door",
        rawFrame = null,
        ...overrides
    } = options;
    const nativeGametic = Number.isSafeInteger(overrides.nativeGametic)
        ? overrides.nativeGametic
        : nativeTick;
    const observation = rawKind === "unavailable"
        ? unavailableRawObservation()
        : rawObservation(
            rawKind,
            Number.isSafeInteger(rawFrame) ? rawFrame : ++rawFrameSequence,
            nativeGametic);
    return Object.assign({
        contractVersion: CONTRACT_VERSION,
        sessionId,
        runId,
        runGeneration,
        prediction,
        resetRequested: false,
        resetOperationId: "",
        lifecycleEvent: "none",
        lifecycleState: "running",
        modelState: "ready",
        wadContentSha256: CANONICAL_DOOM1_WAD_SHA256,
        nativeLevelFactsAvailable: true,
        nativeGametic,
        nativeLevelTime: nativeGametic,
        nativeLevelStartTic: 0,
        nativeGameState: 0,
        nativeGameEpisode: 1,
        nativeGameMap: 1,
        nativePlayerFactsAvailable: true,
        nativePlayerXFixed: 1500 * FIXED_UNIT,
        nativePlayerYFixed: -2496 * FIXED_UNIT,
        nativePlayerAngleBam: 0,
        nativePlayerMomentumXFixed: 0,
        nativePlayerMomentumYFixed: 0,
        nativePlayerSectorIndex: 1,
        nativePlayerVitalityFactsAvailable: true,
        nativePlayerHealth: 100,
        nativePlayerState: 0,
        nativePlayerKillCount: 0,
        nativeLevelLoadSequenceAvailable: true,
        nativeLevelLoadSequence: runGeneration,
        rawObservation: observation,
        manualUseSequence: 0,
        audio: {
            nativeEvents: 0,
            events: []
        }
    }, overrides);
}

function playerPose(x, y, angleBam, sectorIndex) {
    return {
        nativePlayerXFixed: x * FIXED_UNIT,
        nativePlayerYFixed: y * FIXED_UNIT,
        nativePlayerAngleBam: Math.round(angleBam),
        nativePlayerMomentumXFixed: 0,
        nativePlayerMomentumYFixed: 0,
        nativePlayerSectorIndex: sectorIndex
    };
}

function isNeutral(action) {
    return action
        && !action.moveForward
        && !action.moveBackward
        && !action.strafeLeft
        && !action.strafeRight
        && action.turnYaw === 0
        && !action.useKey
        && !action.attackKey;
}

function hasFiniteProximityNumbers(decision) {
    const proximity = decision?.proximity;
    return proximity
        && Number.isFinite(proximity.playerX)
        && Number.isFinite(proximity.playerY)
        && Number.isFinite(proximity.playerMomentumX)
        && Number.isFinite(proximity.playerMomentumY)
        && Number.isFinite(proximity.headingDegrees)
        && Number.isFinite(proximity.closestDoorPointX)
        && Number.isFinite(proximity.closestDoorPointY)
        && Number.isFinite(proximity.distanceToDoorSegment)
        && Number.isFinite(proximity.bearingToDoorDegrees)
        && Number.isFinite(proximity.bearingErrorDegrees);
}

function hasFiniteOpeningNavigationNumbers(decision) {
    const navigation = decision?.openingNavigation;
    return navigation
        && Number.isFinite(navigation.legStartX)
        && Number.isFinite(navigation.legStartY)
        && Number.isFinite(navigation.targetX)
        && Number.isFinite(navigation.targetY)
        && Number.isFinite(navigation.playerRadius)
        && Number.isFinite(navigation.barrelRadius)
        && Number.isFinite(navigation.portalInset)
        && Number.isFinite(navigation.waypointCompletionRadius)
        && Number.isFinite(navigation.playerX)
        && Number.isFinite(navigation.playerY)
        && Number.isFinite(navigation.headingDegrees)
        && Number.isFinite(navigation.targetDistance)
        && Number.isFinite(navigation.targetBearingDegrees)
        && Number.isFinite(navigation.bearingErrorDegrees)
        && Number.isFinite(navigation.doorDistanceToSegment)
        && Number.isFinite(navigation.doorBearingDegrees)
        && Number.isFinite(navigation.doorBearingErrorDegrees)
        && Number.isFinite(navigation.alongTrackDistance)
        && Number.isFinite(navigation.crossTrackDistance)
        && Number.isFinite(navigation.portal149SignedSide)
        && Number.isFinite(navigation.portal150IntersectionY)
        && Number.isFinite(navigation.playerMomentumX)
        && Number.isFinite(navigation.playerMomentumY)
        && Number.isFinite(navigation.stationaryMomentumMaximum)
        && Number.isFinite(navigation.progressWindowStartDistance)
        && Number.isFinite(navigation.minimumProgressDistance);
}

function appliedUseAck(decision) {
    return {
        sessionId: decision.sessionId,
        runId: decision.runId,
        runGeneration: decision.runGeneration,
        decisionControlTick: decision.controlTick,
        useAttemptId: decision.useAttemptId,
        actionMode: "csharp-exact",
        hostPath: "key-events",
        proposedUse: true,
        appliedUse: true,
        useResolved: true,
        eventQueued: true,
        pulseResolverCalled: false,
        manualBlocked: false,
        senseOnly: false,
        appliedMoveForward: false,
        appliedMoveBackward: false,
        appliedStrafeLeft: false,
        appliedStrafeRight: false,
        appliedTurnYaw: 0,
        appliedAttack: false,
        appliedRun: false,
        queuedUseInputEventSequence: decision.controlTick + 100,
        pumpedUseInputEventSequence: decision.controlTick + 100,
        usePumped: true,
        manualUseSequenceAtDecision: 0
    };
}

function evaluateChecked(prediction, options = {}) {
    const input = controlInput(prediction, options);
    lastControlInput = input;
    const decision = evaluate(input);
    assert(decision.contractVersion === CONTRACT_VERSION, "Unexpected browser contract version", decision);
    assert(decision.contractError === "", "Valid browser input was rejected", decision);
    assert(decision.sessionId === sessionId, "Decision session scope changed", decision);
    assert(decision.runId === runId, "Decision run scope changed", decision);
    assert(decision.runGeneration === runGeneration, "Decision generation changed", decision);
    assert(decision.controlTick > lastControlTick, "ControlTick was not monotonic", decision);
    assert(decision.vitalityTrace?.traceVersion === 1
        && decision.vitalityTrace.requiredDeathGametics === 3
        && decision.vitalityTrace.sessionId === decision.sessionId
        && decision.vitalityTrace.runId === decision.runId
        && decision.vitalityTrace.runGeneration === decision.runGeneration
        && decision.vitalityTrace.evaluatedAtControlTick === decision.controlTick,
    "Decision did not publish its deterministic native-vitality trace", decision);
    lastControlTick = decision.controlTick;
    return decision;
}

sessionId = "browser-smoke-far-spawn-session";
runId = "browser-smoke-far-spawn-run-1";
runGeneration = 1;
nativeTick = 0;
rawFrameSequence = 0;
lastControlTick = 0;
let farSpawn = null;
for (let index = 0; index < 4; index += 1) {
    farSpawn = evaluateChecked(index, {
        nativePlayerXFixed: 1056 * FIXED_UNIT,
        nativePlayerYFixed: -3616 * FIXED_UNIT,
        nativePlayerAngleBam: 2 ** 30
    });
}
assert(farSpawn?.state === "OpeningNavigate"
    && farSpawn.ownershipUnit === "OpeningTransit"
    && farSpawn.ownershipDisposition === "Exclusive"
    && farSpawn.ownerId === "first-door.opening-transit"
    && farSpawn.exclusive
    && !farSpawn.runRequested
    && farSpawn.action?.moveForward
    && !farSpawn.action.moveBackward
    && farSpawn.action.turnYaw === 0
    && farSpawn.acquisitionTrace?.blockCode === "OutsideAcquisitionHandoffRange"
    && farSpawn.proximity?.withinAcquisitionRange === false
    && farSpawn.proximity.distanceToDoorSegment > 1100,
"Far spawn did not enter C#-owned OpeningNavigate with an exact forward action", farSpawn);
assert(hasFiniteProximityNumbers(farSpawn),
    "Far-spawn proximity replay contained a non-finite JSON number", farSpawn);
assert(farSpawn.openingNavigation?.snapshotVersion === 1
    && farSpawn.openingNavigation.geometryVersion === "e1m1-first-door-opening-route-v1"
    && /^[0-9a-f]{64}$/.test(farSpawn.openingNavigation.geometryHash)
    && farSpawn.openingNavigation.wadContentSha256 === CANONICAL_DOOM1_WAD_SHA256
    && farSpawn.openingNavigation.active
    && farSpawn.openingNavigation.status === "Navigating"
    && farSpawn.openingNavigation.blockCode === "ProgressWindowPending"
    && farSpawn.openingNavigation.legIndex === 0
    && farSpawn.openingNavigation.legId === "spawn-north-lane"
    && farSpawn.openingNavigation.targetDistance === 608
    && farSpawn.openingNavigation.action?.moveForward
    && /^[0-9a-f]{64}$/.test(farSpawn.openingNavigation.observationHash)
    && hasFiniteOpeningNavigationNumbers(farSpawn),
"Far-spawn C# navigation snapshot was not replay-complete", farSpawn);
assert(releaseSession(sessionId) === true,
    "Far-spawn browser session was not explicitly released", null);

sessionId = "browser-smoke-session";
runId = "browser-smoke-run-1";
runGeneration = 1;
nativeTick = 0;
rawFrameSequence = 0;
lastControlTick = 0;

let prediction = 0;
let loading = null;
for (let index = 0; index < LOADING_CONTROL_TICKS; index += 1) {
    loading = evaluateChecked(prediction++, {
        lifecycleState: "loading",
        modelState: "loading",
        rawKind: "unavailable"
    });
}
assert(loading?.state === "OpeningTransit", "Model loading changed the initial state", loading);
assert(loading?.ownershipDisposition === "NotAcquired", "Model loading acquired ownership", loading);
assert(!loading?.exclusive && isNeutral(loading?.action), "Model loading did not remain neutral", loading);
assert(loading?.acquisitionTrace?.available
    && loading.acquisitionTrace.controlReady === false
    && loading.acquisitionTrace.blockCode === "ControlNotReady"
    && loading.acquisitionTrace.postReadinessFrames === 0
    && loading.acquisitionTrace.acquisitionRemainingFrames === loading.acquisitionTrace.acquisitionTimeoutFrames,
"Loading ticks consumed the post-readiness acquisition deadline", loading);
assert(loading.controlTick > loading.acquisitionTrace.acquisitionTimeoutFrames,
    "Loading fixture did not exceed the finite acquisition budget", loading);
assert(loading.proximity?.available === false
    && loading.proximity.fresh === false
    && hasFiniteProximityNumbers(loading),
"Control-not-ready proximity was not finite and serializable", loading);
assert(loading.openingNavigation?.snapshotVersion === 1
    && !loading.openingNavigation.active
    && loading.openingNavigation.status === "NotStarted"
    && loading.openingNavigation.blockCode === "ControlNotReady"
    && isNeutral(loading.openingNavigation.action)
    && hasFiniteOpeningNavigationNumbers(loading),
"Control-not-ready opening navigation snapshot was not finite and neutral", loading);

const spawnPose = playerPose(1056, -3616, 2 ** 30, 38);
const firstFresh = evaluateChecked(prediction++, spawnPose);
assert(firstFresh.state === "OpeningNavigate"
    && firstFresh.ownershipDisposition === "Exclusive"
    && firstFresh.openingNavigation?.active
    && firstFresh.openingNavigation.legIndex === 0
    && firstFresh.acquisitionTrace?.freshObservation
    && firstFresh.acquisitionTrace.identityYesCountInWindow === 1
    && firstFresh.acquisitionTrace.routeIntentStableFrames === 1
    && firstFresh.acquisitionTrace.blockCode === "RouteIntentNotYes",
"First fresh raw frame did not start finite acquisition", firstFresh);
const firstRawFrame = firstFresh.acquisitionTrace.rawFrameSequence;
const firstObservationHash = firstFresh.acquisitionTrace.observationHash;

const duplicate = evaluateChecked(prediction++, Object.assign({}, spawnPose, { rawFrame: firstRawFrame }));
assert(duplicate.state === "OpeningNavigate"
    && duplicate.acquisitionTrace?.rawObservationAvailable
    && duplicate.acquisitionTrace.rawObservationAccepted
    && !duplicate.acquisitionTrace.freshObservation
    && duplicate.acquisitionTrace.blockCode === "DuplicateRawFrame"
    && duplicate.acquisitionTrace.identityYesCountInWindow === 1
    && duplicate.acquisitionTrace.identityWindowSize === 1
    && duplicate.acquisitionTrace.observationHash === firstObservationHash,
"Duplicate raw frame was counted as new identity evidence", duplicate);

const canonicalOpeningRoute = [
    playerPose(1056, -3008, 0, 38),
    playerPose(1280, -3008, 2 ** 30, 38),
    playerPose(1280, -2848, 2 ** 30, 2),
    playerPose(1280, -2640, 0, 2),
    playerPose(1360, -2528, 0, 2)
];
let acquired = null;
for (const pose of canonicalOpeningRoute) {
    acquired = evaluateChecked(prediction++, pose);
}
const acquisitionTrace = acquired.acquisitionTrace;
assert(acquired.state === "Approach"
    && acquired.ownershipDisposition === "Exclusive"
    && acquired.exclusive
    && acquisitionTrace?.traceVersion === 4
    && acquisitionTrace.rawObserverVersion === "first-door-raw-palette-observer-v4"
    && acquisitionTrace?.ready
    && acquisitionTrace.status === "Ready"
    && acquisitionTrace.blockCode === "None"
    && acquisitionTrace.postReadinessFrames >= 3
    && acquisitionTrace.routeIntentStableFrames >= 3
    && acquisitionTrace.identityYesCountInWindow >= 2
    && acquisitionTrace.identityKind === "first-door-9x9-patch"
    && acquisitionTrace.doorIdentityConfidence === 1
    && acquisitionTrace.alignmentColumn === 3
    && acquisitionTrace.alignmentRow === 2
    && acquisitionTrace.acquiredAtControlTick === acquired.controlTick,
"Canonical C# opening navigation did not reach the acquisition handoff", acquired);
assert(acquired.proximity?.inputAccepted
    && acquired.proximity.available
    && acquired.proximity.fresh
    && acquired.proximity.wadVerified
    && acquired.proximity.withinAcquisitionRange
    && !acquired.proximity.withinUseRange
    && acquired.proximity.distanceToDoorSegment === 176
    && hasFiniteProximityNumbers(acquired),
"Sightline native pose was not published as replayable acquisition proof", acquired);
assert(acquired.openingNavigation?.status === "ReadyForAcquisition"
    && acquired.openingNavigation.readyForAcquisition
    && acquired.openingNavigation.doorSightlineCertified
    && acquired.openingNavigation.stationaryBearingAligned
    && isNeutral(acquired.openingNavigation.action)
    && hasFiniteOpeningNavigationNumbers(acquired),
"Acquisition handoff did not retain the terminal opening navigation snapshot", acquired);
const replay = acquisitionTrace.currentReplayObservation;
assert(replay?.available
    && replay.observerVersion === "first-door-raw-palette-observer-v4"
    && replay.schemaVersion === RAW_SCHEMA_VERSION
    && replay.layout === RAW_LAYOUT
    && replay.frameSequence === acquisitionTrace.rawFrameSequence
    && replay.paletteGeneration === 1
    && replay.observationHash === acquisitionTrace.observationHash
    && replay.paletteIndicesBase64 === Buffer.from(doorIndices).toString("base64")
    && replay.paletteRgbaBase64 === paletteRgbaBase64
    && /^[0-9a-f]{64}$/.test(replay.observationHash)
    && /^[0-9a-f]{64}$/.test(replay.visualContentHash),
"Acquisition trace did not preserve a replay-complete raw observation", acquisitionTrace);
assert(acquisitionTrace.lastAcceptedYesReplayObservation?.observationHash === replay.observationHash,
    "Acquisition trace did not preserve the accepted Yes replay separately", acquisitionTrace);
assert(Array.isArray(acquisitionTrace.acceptedYesReplayObservations)
    && acquisitionTrace.acceptedYesReplayObservations.length >= 2
    && new Set(acquisitionTrace.acceptedYesReplayObservations.map(item => item.frameSequence)).size
        === acquisitionTrace.acceptedYesReplayObservations.length
    && Array.isArray(acquisitionTrace.identityWindow)
    && acquisitionTrace.identityWindow.length === acquisitionTrace.identityWindowSize,
"Acquisition trace cannot replay the distinct temporal Yes window", acquisitionTrace);
const frozenTrace = JSON.stringify(acquisitionTrace);

const postAcquisition = evaluateChecked(prediction++);
assert(JSON.stringify(postAcquisition.acquisitionTrace) === frozenTrace,
    "Acquisition evidence changed after ownership takeover", postAcquisition);
assert(postAcquisition.computerRoomTrace?.currentReplayObservation?.available
    && postAcquisition.computerRoomTrace.currentReplayObservation.frameSequence
        > acquisitionTrace.currentReplayObservation.frameSequence
    && postAcquisition.computerRoomTrace.blockCode === "NotInConfirmationPhase",
"Post-acquisition decision omitted its current raw replay", postAcquisition);

let current = postAcquisition;
let stationaryUse = null;
for (let index = 0; index < 100; index += 1) {
    const rawKind = current.state === "Contact" ? "contact" : "door";
    current = evaluateChecked(prediction++, { rawKind });
    assert(JSON.stringify(current.acquisitionTrace) === frozenTrace,
        "Frozen acquisition trace changed while driving to StationaryUse", current);
    if (current.state === "StationaryUse") {
        stationaryUse = current;
        break;
    }
}
assert(stationaryUse !== null, "C# controller did not reach StationaryUse from raw observations", current);
assert(stationaryUse.ownershipDisposition === "Exclusive"
    && stationaryUse.action?.useKey
    && !stationaryUse.action.moveForward
    && !stationaryUse.action.moveBackward
    && !stationaryUse.action.strafeLeft
    && !stationaryUse.action.strafeRight
    && stationaryUse.action.turnYaw === 0
    && !stationaryUse.action.attackKey
    && !stationaryUse.runRequested,
"Stationary Use invariant failed", stationaryUse);
assert(stationaryUse.computerRoomTrace?.currentReplayObservation?.available
    && stationaryUse.computerRoomTrace.currentReplayObservation.frameSequence
        > acquisitionTrace.currentReplayObservation.frameSequence,
"Stationary Use cannot be replayed from the current observation trace", stationaryUse);

const opened = evaluateChecked(prediction++, {
    appliedActionAck: appliedUseAck(stationaryUse),
    audio: {
        nativeEvents: 1,
        events: [
            { sequence: 1, sfxId: 26, sfxName: "doropn" }
        ]
    }
});
assert(opened.state === "PostOpenShove" && opened.previousState === "StationaryUse",
    "Use-correlated doropn did not enter PostOpenShove", opened);
assert(opened.openConfirmed && opened.openConfirmationSource === "TrustedAudio",
    "Exact native doropn was not trusted", opened);
assert(opened.appliedActionAckValid
    && opened.appliedActionAckCode === "accepted"
    && opened.acknowledgedUseAttemptId === stationaryUse.useAttemptId
    && opened.acceptedUseAck?.available
    && opened.acceptedUseAck.decisionControlTick === stationaryUse.controlTick
    && opened.acceptedUseAck.useAttemptId === stationaryUse.useAttemptId
    && opened.acceptedUseAck.actionMode === "csharp-exact"
    && opened.acceptedUseAck.hostPath === "key-events"
    && opened.acceptedUseAck.queuedUseInputEventSequence === stationaryUse.controlTick + 100
    && opened.acceptedUseAck.pumpedUseInputEventSequence
        === opened.acceptedUseAck.queuedUseInputEventSequence
    && opened.acceptedUseAck.usePumped,
"Host-applied stationary Use acknowledgement was not correlated", opened);
assert(opened.semanticDelta?.hasChanges
    && opened.semanticDelta.firstDoorOpened
    && !opened.semanticDelta.computerRoomEntered
    && opened.semanticDelta.doorOpenedCount === 1,
"Trusted open semantic delta was not emitted", opened);
assert(JSON.stringify(opened.acquisitionTrace) === frozenTrace,
    "Trusted open changed the frozen acquisition evidence", opened);

let handoff = null;
for (let index = 0; index < 40; index += 1) {
    current = evaluateChecked(prediction++);
    assert(JSON.stringify(current.acquisitionTrace) === frozenTrace,
        "Frozen acquisition trace changed after FirstDoor open", current);
    assert(current.ownershipDisposition !== "Completed",
        "FirstDoor screen was misclassified as COMPUTERROOM", current);
    if (current.state === "AwaitComputerRoom") {
        handoff = current;
        break;
    }
}
assert(handoff?.ownershipDisposition === "HandOff",
    "Post-open shove did not reach explicit COMPUTERROOM handoff", handoff || current);
assert(handoff.semanticDelta?.computerRoomEntered === false,
    "HandOff projected COMPUTERROOM before C# confirmation", handoff);

let completed = null;
for (let index = 0; index < 3; index += 1) {
    current = evaluateChecked(prediction++, Object.assign(
        { rawKind: "room" },
        playerPose(1760, -2512, 0, 7)));
    if (current.ownershipDisposition === "Completed") {
        completed = current;
    }
}
assert(completed?.state === "Complete"
    && completed.completed
    && completed.handOffToPostDoor
    && !completed.exclusive
    && completed.openConfirmed
    && completed.semanticDelta?.hasChanges
    && completed.semanticDelta.computerRoomEntered
    && isNeutral(completed.action),
"Raw COMPUTERROOM evidence did not reach the Completed terminal", completed || current);
assert(completed.computerRoomTrace?.ready
    && completed.computerRoomTrace.blockCode === "None"
    && completed.computerRoomTrace.stableFrames === 3
    && completed.computerRoomTrace.requiredStableFrames === 3
    && Array.isArray(completed.computerRoomTrace.acceptedPositiveReplayObservations)
    && completed.computerRoomTrace.acceptedPositiveReplayObservations.length === 3
    && new Set(completed.computerRoomTrace.acceptedPositiveReplayObservations
        .map(item => item.observationHash)).size === 3,
"COMPUTERROOM terminal omitted its bounded three-frame replay proof", completed);
const replayRequiredTransitions = completed.transitionReplaySnapshots?.filter(item =>
    item.eventKind.includes("stationary-use-command")
    || item.eventKind.includes("trusted-open-accepted")
    || item.eventKind.includes("computer-room-window-update")
    || item.eventKind.includes("terminal")) || [];
assert(Array.isArray(completed.transitionReplaySnapshots)
    && completed.transitionReplaySnapshots.some(item => item.eventKind.includes("stationary-use-command"))
    && completed.transitionReplaySnapshots.filter(item =>
        item.eventKind.includes("trusted-open-accepted")).length === 1
    && completed.transitionReplaySnapshots.filter(item =>
        item.eventKind.includes("computer-room-window-update")).length === 3
    && completed.transitionReplaySnapshots.some(item => item.eventKind.includes("terminal")
        && item.state === "Complete"
        && !item.eventKind.includes("trusted-open-accepted"))
    && replayRequiredTransitions.every(item => item.replayObservation?.available)
    && completed.transitionReplaySnapshots.every(item =>
        item.snapshotVersion === 4
        && item.openingNavigation?.snapshotVersion === 1
        && /^[0-9a-f]{64}$/.test(item.openingNavigation.geometryHash)
        && /^[0-9a-f]{64}$/.test(item.openingNavigation.observationHash)
        && hasFiniteOpeningNavigationNumbers({ openingNavigation: item.openingNavigation })),
"Significant post-acquisition transitions are not replay-complete", completed);

function unavailableActorSnapshot() {
    return {
        available: false,
        gametic: -1,
        count: 0,
        capacity: 0,
        truncated: false,
        actors: []
    };
}

function nativeActor(identity, x, y, sectorIndex, overrides = {}) {
    return Object.assign({
        identity,
        xFixed: Math.round(x * FIXED_UNIT),
        yFixed: Math.round(y * FIXED_UNIT),
        sectorIndex,
        type: 1,
        health: 20,
        flags: 0x00400004,
        lineOfSight: true
    }, overrides);
}

function actorSnapshot(firstDoorDecision, actors = [], overrides = {}) {
    return Object.assign({
        available: true,
        gametic: firstDoorDecision.nativeGametic,
        count: actors.length,
        capacity: 64,
        truncated: false,
        actors
    }, overrides);
}

function weaponSnapshot(firstDoorDecision, overrides = {}) {
    return Object.assign({
        available: true,
        gametic: firstDoorDecision.nativeGametic,
        stateCount: NATIVE_STATE_COUNT,
        readyWeapon: 1,
        pendingWeapon: 10,
        weaponState: 100,
        weaponReadyState: 100,
        refire: 0
    }, overrides);
}

function evaluatePostChecked(
    firstDoorDecision,
    combatObservation = {},
    nativeActors = unavailableActorSnapshot(),
    nativeWeapon = weaponSnapshot(firstDoorDecision)) {
    const decision = evaluatePostComputerRoom({
        contractVersion: 2,
        sessionId: firstDoorDecision.sessionId,
        runId: firstDoorDecision.runId,
        runGeneration: firstDoorDecision.runGeneration,
        expectedFirstDoorControlTick: firstDoorDecision.controlTick,
        actorSnapshot: nativeActors,
        weaponSnapshot: nativeWeapon,
        combatObservation: Object.assign({
            visualEnemyVisible: false,
            visualEnemyCentered: false,
            visualEnemyFireReady: false,
            enemyStructuralDecoy: false,
            enemyConfidence: 0,
            visualEnemyYaw: 0
        }, combatObservation)
    });
    assert(decision.contractVersion === 2, "Unexpected post-COMPUTERROOM contract version", decision);
    assert(decision.sessionId === firstDoorDecision.sessionId
        && decision.runId === firstDoorDecision.runId
        && decision.runGeneration === firstDoorDecision.runGeneration
        && decision.expectedFirstDoorControlTick === firstDoorDecision.controlTick,
    "Post-COMPUTERROOM route scope did not match the current C# FirstDoor proof", decision);
    return decision;
}

function structuredCombatObservation(firstDoorDecision, sample, overrides = {}) {
    const raw = lastControlInput?.rawObservation;
    assert(raw?.available
        && lastControlInput.sessionId === firstDoorDecision?.sessionId
        && lastControlInput.runId === firstDoorDecision?.runId
        && lastControlInput.runGeneration === firstDoorDecision?.runGeneration
        && Number.isSafeInteger(raw.frameSequence)
        && Number.isSafeInteger(raw.nativeGameticObservedAtEvaluation),
    "Current FirstDoor raw identity is unavailable for structured combat", firstDoorDecision);
    return Object.assign({
        rawFrameSequence: raw.frameSequence,
        rawNativeGametic: raw.nativeGameticObservedAtEvaluation,
        enemyRegion9Sample: sample
    }, overrides);
}

const structuredEnemy47 = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
const structuredEnemy48 = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];
let postRoute = evaluatePostChecked(
    completed,
    structuredCombatObservation(completed, structuredEnemy47),
    actorSnapshot(completed, [nativeActor(7, 1856, -2512, 7)]));
assert(postRoute.state === "NavigateMainRoute"
    && postRoute.implementationVersion === "post-computer-room-route-v6"
    && postRoute.policyVersion === "post-computer-room-route-policy-v6"
    && postRoute.ownershipDisposition === "Exclusive"
    && postRoute.action?.moveForward
    && postRoute.navigation?.legId === "computer-room-east-lane"
    && postRoute.semanticProjection?.telos === "CentralHall"
    && postRoute.semanticProjection?.computerRoomEntered
    && postRoute.combatObservation?.rawFrameSequence === lastControlInput.rawObservation.frameSequence
    && postRoute.combatObservation?.enemyRegion9Sample?.length === 9
    && postRoute.navigation?.snapshotVersion === 5
    && postRoute.weaponSnapshot?.stateCount === NATIVE_STATE_COUNT
    && postRoute.navigation?.nativeWeaponStateCount === NATIVE_STATE_COUNT
    && postRoute.navigation.structuredCombatInputAccepted
    && postRoute.navigation.structuredCombatFresh
    && postRoute.navigation.structuredCombatCandidate
    && !postRoute.navigation.structuredCombatTrusted
    && postRoute.navigation.structuredCombatDistinctFrames === 1,
"Post-COMPUTERROOM C# route did not acquire at the sector-7 room proof", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(1760, -2512, 0, 7)));
postRoute = evaluatePostChecked(
    current,
    structuredCombatObservation(current, structuredEnemy48),
    actorSnapshot(current, [nativeActor(7, 1856, -2512, 7)]));
assert(postRoute.state === "FireReady"
    && postRoute.action?.attackKey
    && !postRoute.action.moveForward
    && postRoute.navigation?.snapshotVersion === 5
    && postRoute.navigation.structuredCombatTrusted
    && postRoute.navigation.structuredCombatCentered
    && postRoute.navigation.structuredCombatDistinctFrames === 2
    && postRoute.navigation.structuredCombatReason === "structured-combat-two-distinct-frames"
    && postRoute.navigation.nativeActorMatched
    && postRoute.navigation.nativeActorCombatTrusted,
"Two fresh structured enemy frames did not round-trip through C# into FireReady", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(1760, -2512, 0, 7)));
postRoute = evaluatePostChecked(
    current,
    {},
    actorSnapshot(current, [nativeActor(7, 1856, -2512, 7)]),
    weaponSnapshot(current, { weaponState: 101 }));
assert(postRoute.state === "NavigateMainRoute"
    && postRoute.reasonCode === "native-live-target-weapon-cycle-main-route-progress"
    && postRoute.navigation?.nativeActorTargetRetained
    && !postRoute.navigation?.nativeWeaponFireOpportunity
    && postRoute.navigation?.nativeWeaponReason === "native-weapon-cycle-busy"
    && postRoute.action?.moveForward
    && !postRoute.action?.attackKey,
"Non-fireable weapon cycle did not preserve the target while advancing only the canonical route", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room", nativePlayerKillCount: 1 },
    playerPose(1760, -2512, 0, 7)));
postRoute = evaluatePostChecked(
    current,
    {},
    actorSnapshot(current, [nativeActor(7, 1856, -2512, 7, {
        health: 0,
        flags: 0x00400000
    })]));
assert(postRoute.navigation?.nativeActorKillConfirmed
    && !postRoute.navigation?.nativeActorTargetRetained
    && !postRoute.action?.attackKey,
"Structured target did not release after actor death plus killcount confirmation", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room", nativePlayerKillCount: 1 },
    playerPose(2256, -2528, 2 ** 31, 52)));
postRoute = evaluatePostChecked(current, {
    visualEnemyVisible: true,
    visualEnemyCentered: true,
    visualEnemyFireReady: false,
    enemyConfidence: 0.76
}, actorSnapshot(current, [nativeActor(17, 2160, -2528, 51)]));
assert(postRoute.state === "FireReady"
    && postRoute.action?.attackKey
    && !postRoute.action.moveForward
    && !postRoute.runRequested
    && postRoute.navigation?.nativeActorTargetIdentity === 17,
"Live same-gametic native actor did not preempt the post-room route with stationary fire", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room", nativePlayerKillCount: 2 },
    playerPose(2256, -2528, 2 ** 31, 52)));
postRoute = evaluatePostChecked(current, {
    visualEnemyVisible: true,
    visualEnemyCentered: true,
    visualEnemyFireReady: true,
    enemyStructuralDecoy: true,
    enemyConfidence: 0.95
}, actorSnapshot(current, [nativeActor(17, 2160, -2528, 51, {
    health: 0,
    flags: 0x00400000
})]));
assert(postRoute.state === "RecoverEnemyAlcove"
    && !postRoute.action?.attackKey
    && postRoute.navigation?.legId === "enemy-alcove-52-west-exit"
    && postRoute.navigation?.nativeActorKillConfirmed
    && !postRoute.navigation?.nativeActorTargetRetained,
"Confirmed actor death plus killcount did not release the corpse into bounded alcove recovery", postRoute);

for (const pose of [
    [2192, -2528, 180, 51, "enemy-alcove-51-west-exit"],
    [2160, -2528, 180, 8, "enemy-alcove-8-west-exit"],
    [2112, -2528, 270, 7, "enemy-alcove-south-clearance"]
]) {
    current = evaluateChecked(prediction++, Object.assign(
        { rawKind: "room" },
        playerPose(pose[0], pose[1], pose[2] / 360 * (2 ** 32), pose[3])));
    postRoute = evaluatePostChecked(current);
    assert(postRoute.state === "RecoverEnemyAlcove"
        && postRoute.navigation?.legId === pose[4]
        && !postRoute.action?.attackKey,
    "Enemy alcove recovery left the canonical 52-51-8-7 chain", postRoute);
}

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(2112, -2640, 0, 7)));
postRoute = evaluatePostChecked(current);
assert(postRoute.ownershipDisposition === "Exclusive"
    && !postRoute.action?.attackKey,
"Post-COMPUTERROOM recovery did not return to the south dogleg", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(2544, -2640, 0, 7)));
postRoute = evaluatePostChecked(current);
assert(postRoute.navigation?.legIndex === 4
    && postRoute.navigation.legId === "main-route-portal-385-east",
"Portal waypoint advanced without sector-54 certification", postRoute);

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(2544, -2640, 347 / 360 * (2 ** 32), 54)));
postRoute = evaluatePostChecked(current);
assert(postRoute.navigation?.legIndex === 5
    && postRoute.navigation.legId === "sector-54-diagonal",
"Sector-54 portal certification did not advance to the diagonal", postRoute);
const entered54RouteFrames = postRoute.navigation.routeFrames;

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(
        Math.round(2454.704 * FIXED_UNIT) / FIXED_UNIT,
        Math.round(-2659.835 * FIXED_UNIT) / FIXED_UNIT,
        0,
        7)));
postRoute = evaluatePostChecked(current);
assert(postRoute.navigation?.legIndex === 4
    && postRoute.navigation.legId === "main-route-portal-385-east"
    && !postRoute.navigation.recoveringEnemyAlcove
    && postRoute.navigation.routeFrames > entered54RouteFrames,
"Dev1052 sector-7 regression retained an impossible downstream leg", postRoute);
const rebasedRouteFrames = postRoute.navigation.routeFrames;

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(2544, -2640, 347 / 360 * (2 ** 32), 54)));
postRoute = evaluatePostChecked(current);
assert(postRoute.navigation?.legIndex === 5
    && postRoute.navigation.legId === "sector-54-diagonal"
    && postRoute.navigation.routeFrames > rebasedRouteFrames,
"Rebased portal route did not recross sector 54 with a monotonic route budget", postRoute);

for (const pose of [
    [2688, -2672, 343, 54, 6, "sector-53-main-lane"],
    [2848, -2720, 279, 53, 7, "sector-71-south-lane"],
    [2880, -2928, 270, 71, 8, "central-hall-entry"]
]) {
    current = evaluateChecked(prediction++, Object.assign(
        { rawKind: "room" },
        playerPose(pose[0], pose[1], pose[2] / 360 * (2 ** 32), pose[3])));
    postRoute = evaluatePostChecked(current);
    assert(postRoute.ownershipDisposition === "Exclusive"
        && postRoute.navigation?.legIndex === pose[4]
        && postRoute.navigation.legId === pose[5]
        && !postRoute.action?.attackKey,
    "Post-COMPUTERROOM main-route ownership was lost before CentralHall", postRoute);
}

current = evaluateChecked(prediction++, Object.assign(
    { rawKind: "room" },
    playerPose(2944, -3024, 270 / 360 * (2 ** 32), 60)));
postRoute = evaluatePostChecked(current);
assert(postRoute.state === "Complete"
    && postRoute.ownershipDisposition === "Completed"
    && postRoute.completed
    && !postRoute.exclusive
    && postRoute.semanticProjection?.centralHallEntered,
"Post-COMPUTERROOM Gate G did not complete at the canonical sector-60 hall", postRoute);

runId = "browser-smoke-run-2";
runGeneration = 2;
rawFrameSequence = 0;
const reset = evaluateChecked(0, Object.assign({}, playerPose(1056, -3616, 2 ** 30, 38), {
    resetRequested: true,
    resetOperationId: "browser-smoke-reset-2",
    lifecycleEvent: "run-restarted",
    nativeGametic: 0
}));
assert(reset.state === "OpeningNavigate"
    && reset.previousState === "Complete"
    && reset.ownershipDisposition === "Exclusive"
    && reset.exclusive
    && reset.action?.moveForward
    && !reset.runRequested,
"Explicit new run did not reset into C#-owned OpeningNavigate", reset);
assert(reset.runBoundaryApplied
    && reset.resetOperationId === "browser-smoke-reset-2"
    && !reset.openConfirmed
    && !reset.acceptedUseAck?.available
    && !reset.semanticDelta.hasChanges
    && !reset.semanticDelta.firstDoorOpened
    && !reset.semanticDelta.computerRoomEntered,
"Explicit reset did not clear the prior run scope", reset);
assert(reset.openingNavigation?.active
    && reset.openingNavigation.status === "Navigating"
    && reset.openingNavigation.legIndex === 0
    && reset.openingNavigation.legId === "spawn-north-lane"
    && reset.openingNavigation.routeFrames === 0
    && reset.openingNavigation.recoveryCount === 0
    && reset.openingNavigation.action?.moveForward
    && hasFiniteOpeningNavigationNumbers(reset),
"Explicit reset did not restart opening navigation from canonical leg zero", reset);
assert(reset.acquisitionTrace?.available
    && reset.acquisitionTrace.acquiredAtControlTick === 0
    && reset.acquisitionTrace.postReadinessFrames === 0
    && reset.acquisitionTrace.routeIntentStableFrames === 0
    && reset.acquisitionTrace.identityYesCountInWindow === 0,
"Explicit reset did not clear acquisition and identity evidence", reset);

assert(releaseSession(sessionId) === true,
    "Primary browser session was not explicitly released", null);

sessionId = "browser-smoke-native-death-session";
runId = "browser-smoke-native-death-run-1";
runGeneration = 1;
nativeTick = 0;
rawFrameSequence = 0;
lastControlTick = 0;
const firstDead = evaluateChecked(0, {
    nativePlayerHealth: 0,
    nativePlayerState: 1
});
const secondDead = evaluateChecked(1, {
    nativePlayerHealth: 0,
    nativePlayerState: 1
});
const confirmedDead = evaluateChecked(2, {
    nativePlayerHealth: 0,
    nativePlayerState: 1
});
assert(firstDead.vitalityTrace.consecutiveDeathGametics === 1
    && secondDead.vitalityTrace.consecutiveDeathGametics === 2
    && confirmedDead.vitalityTrace.consecutiveDeathGametics === 3
    && confirmedDead.nativeDeathConfirmed
    && confirmedDead.restartRequested
    && confirmedDead.vitalityTrace.nativeEvidenceAuthoritative
    && confirmedDead.vitalityTrace.authority === "native-player-vitality"
    && confirmedDead.vitalityTrace.restartRequestIssuedThisTick
    && confirmedDead.vitalityTrace.restartRequestSequence === 1
    && confirmedDead.restartRequestId.startsWith("native-death:1:")
    && confirmedDead.restartReason === "native-player-death-confirmed",
"Three fresh native death gametics did not issue one authoritative restart request", confirmedDead);
const latchedDead = evaluateChecked(3);
assert(latchedDead.nativeDeathConfirmed
    && latchedDead.restartRequested
    && !latchedDead.vitalityTrace.restartRequestIssuedThisTick
    && latchedDead.restartRequestId === confirmedDead.restartRequestId,
"Confirmed native death restart request did not remain stable until a run boundary", latchedDead);
runId = "browser-smoke-native-death-run-2";
runGeneration = 2;
const deathReset = evaluateChecked(0, {
    resetRequested: true,
    resetOperationId: "browser-smoke-native-death-reset-2",
    lifecycleEvent: "run-restarted"
});
assert(deathReset.runBoundaryApplied
    && !deathReset.nativeDeathConfirmed
    && !deathReset.restartRequested
    && deathReset.restartRequestId === ""
    && deathReset.restartReason === "none"
    && deathReset.vitalityTrace.consecutiveDeathGametics === 0,
"Explicit run boundary did not clear native death and restart state", deathReset);
assert(releaseSession(sessionId) === true,
    "Native-death browser session was not explicitly released", null);

sessionId = "browser-smoke-missing-pose-session";
runId = "browser-smoke-missing-pose-run-1";
runGeneration = 1;
nativeTick = 0;
rawFrameSequence = 0;
lastControlTick = 0;
let missingPose = null;
for (let index = 0; index < 4; index += 1) {
    missingPose = evaluateChecked(index, { nativePlayerFactsAvailable: false });
}
assert(missingPose?.state === "OpeningNavigate"
    && missingPose.ownershipUnit === "OpeningTransit"
    && missingPose.ownershipDisposition === "Exclusive"
    && missingPose.ownerId === "first-door.opening-transit"
    && missingPose.exclusive
    && isNeutral(missingPose.action)
    && missingPose.openingNavigation?.active
    && missingPose.openingNavigation.status === "WaitingForPose"
    && missingPose.openingNavigation.blockCode === "ProximityUnavailable"
    && missingPose.openingNavigation.nativeGametic === -1
    && missingPose.openingNavigation.poseMissingFrames === 4
    && missingPose.openingNavigation.routeFrames === 3
    && isNeutral(missingPose.openingNavigation.action)
    && hasFiniteOpeningNavigationNumbers(missingPose)
    && missingPose.proximity?.available === false
    && missingPose.proximity.reason === "native-player-facts-unavailable"
    && missingPose.acquisitionTrace?.blockCode === "ProximityUnavailable"
    && missingPose.acquisitionTrace.consecutiveProximityMissingFrames === 3
    && hasFiniteProximityNumbers(missingPose),
"Missing native pose was not held neutral as typed finite evidence", missingPose);
assert(releaseSession(sessionId) === true,
    "Missing-pose browser session was not explicitly released", null);

sessionId = "browser-smoke-pose-order-session";
runId = "browser-smoke-pose-order-run-1";
runGeneration = 1;
nativeTick = 0;
rawFrameSequence = 0;
lastControlTick = 0;
evaluateChecked(0, { nativeGametic: 100 });
const duplicatePose = evaluateChecked(1, { nativeGametic: 100 });
assert(duplicatePose.state === "OpeningNavigate"
    && duplicatePose.ownershipUnit === "OpeningTransit"
    && duplicatePose.ownershipDisposition === "Exclusive"
    && duplicatePose.ownerId === "first-door.opening-transit"
    && duplicatePose.exclusive
    && isNeutral(duplicatePose.action)
    && duplicatePose.openingNavigation?.active
    && duplicatePose.openingNavigation.status === "WaitingForPose"
    && duplicatePose.openingNavigation.blockCode === "DuplicatePose"
    && isNeutral(duplicatePose.openingNavigation.action)
    && hasFiniteOpeningNavigationNumbers(duplicatePose)
    && duplicatePose.proximity?.available
    && !duplicatePose.proximity.fresh
    && duplicatePose.proximity.reason === "native-player-proximity-duplicate",
"Duplicate native gametic did not retain neutral C# opening-navigation ownership", duplicatePose);
const rewoundPose = evaluate(controlInput(2, { nativeGametic: 99 }));
assert(rewoundPose.state === "FailedSafeStop"
    && rewoundPose.ownershipDisposition === "FailedSafeStop"
    && rewoundPose.terminalFailureCode === "native-player-proximity-gametic-rewound"
    && isNeutral(rewoundPose.action)
    && rewoundPose.proximity?.available === false
    && rewoundPose.proximity.withinAcquisitionRange === false
    && rewoundPose.proximity.withinContactApproachRange === false
    && rewoundPose.proximity.withinUseRange === false
    && hasFiniteProximityNumbers(rewoundPose),
"Rewound native gametic did not fail closed with finite normalized proximity", rewoundPose);
assert(releaseSession(sessionId) === true,
    "Pose-order browser session was not explicitly released", null);

console.log(JSON.stringify({
    contractVersion: CONTRACT_VERSION,
    farSpawn: {
        state: farSpawn.state,
        distanceToDoorSegment: farSpawn.proximity.distanceToDoorSegment,
        blockCode: farSpawn.acquisitionTrace.blockCode,
        navigationStatus: farSpawn.openingNavigation.status,
        navigationLeg: farSpawn.openingNavigation.legId
    },
    loadingControlTicks: LOADING_CONTROL_TICKS,
    loadingDeadlineExcluded: true,
    firstFresh: {
        controlTick: firstFresh.controlTick,
        frameSequence: firstRawFrame,
        identityYesCount: firstFresh.acquisitionTrace.identityYesCountInWindow
    },
    duplicate: {
        controlTick: duplicate.controlTick,
        fresh: duplicate.acquisitionTrace.freshObservation,
        identityYesCount: duplicate.acquisitionTrace.identityYesCountInWindow
    },
    acquired: {
        controlTick: acquired.controlTick,
        postReadinessFrames: acquisitionTrace.postReadinessFrames,
        observationHash: acquisitionTrace.observationHash
    },
    stationaryUse: stationaryUse.state,
    opened: opened.state,
    completed: completed.state,
    postComputerRoom: {
        state: postRoute.state,
        disposition: postRoute.ownershipDisposition,
        centralHallEntered: postRoute.semanticProjection.centralHallEntered,
        structuredCombatSnapshotVersion: 5
    },
    reset: reset.state,
    missingPose: missingPose.acquisitionTrace.blockCode,
    duplicatePose: duplicatePose.proximity.reason,
    rewoundPose: rewoundPose.terminalFailureCode,
    replayAvailable: replay.available,
    frozen: true
}));

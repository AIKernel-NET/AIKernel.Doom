(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const VISION_GRID_COLUMNS = 9;
  const VISION_GRID_ROWS = 9;

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function countActiveColumns(sample, columns) {
    if (!sample?.length || columns <= 0) {
      return 0;
    }

    const active = new Set();
    for (let index = 0; index < sample.length; index += 1) {
      if (Number(sample[index] || 0) > 0) {
        active.add(index % columns);
      }
    }

    return active.size;
  }

  function hasMeaningfulFaceSignature(signature) {
    return /[1-9a-f]/i.test(String(signature || ""));
  }

  function resolveFaceSignatureValidity(source, signature) {
    const explicit = source?.faceSignatureValid
      ?? source?.healthFaceSignatureValid;
    return explicit === true
      || (explicit !== false && hasMeaningfulFaceSignature(signature));
  }

  function normalizeFaceLifePattern(value, fallback = "unknown") {
    const text = String(value || fallback || "unknown").toLowerCase();
    if (text === "alive-cycle"
      || text === "alive-damaged"
      || text === "single"
      || text === "fixed"
      || text === "dead-fixed"
      || text === "unknown") {
      return text;
    }

    return fallback;
  }

  function normalizeFaceLifePhase(value, fallback = "healthy") {
    const text = String(value || fallback || "healthy").toLowerCase();
    if (text === "healthy"
      || text === "wounded"
      || text === "damaged"
      || text === "critical"
      || text === "moribund"
      || text === "dead"
      || text === "invulnerable"
      || text === "unknown") {
      return text;
    }

    return fallback;
  }

  function faceLifePhaseLevel(value) {
    const phase = normalizeFaceLifePhase(value, "unknown");
    if (phase === "healthy" || phase === "invulnerable") {
      return 5;
    }

    if (phase === "wounded") {
      return 4;
    }

    if (phase === "damaged") {
      return 3;
    }

    if (phase === "critical") {
      return 2;
    }

    if (phase === "moribund") {
      return 1;
    }

    return 0;
  }

  function faceLifePhasePercent(value) {
    const phase = normalizeFaceLifePhase(value, "unknown");
    if (phase === "invulnerable" || phase === "healthy") {
      return 100;
    }

    if (phase === "wounded") {
      return 80;
    }

    if (phase === "damaged") {
      return 55;
    }

    if (phase === "critical") {
      return 30;
    }

    if (phase === "moribund") {
      return 12;
    }

    return 0;
  }

  function faceLifePhaseFromLevel(value, fallback = "unknown") {
    const text = String(value ?? "").trim().toLowerCase();
    if (text === "∞" || text === "inf" || text === "infinity" || text === "invulnerable" || text === "god" || text === "iddqd") {
      return "invulnerable";
    }

    if (text === "dead" || text === "death") {
      return "dead";
    }

    const level = Number(value);
    if (!Number.isFinite(level)) {
      return normalizeFaceLifePhase(value, fallback);
    }

    if (level <= 0) {
      return "dead";
    }

    if (level <= 1) {
      return "moribund";
    }

    if (level <= 2) {
      return "critical";
    }

    if (level <= 3) {
      return "damaged";
    }

    if (level <= 4) {
      return "wounded";
    }

    return "healthy";
  }

  function isDefinitiveFaceLifePhase(value) {
    const phase = normalizeFaceLifePhase(value, "unknown");
    return phase === "dead" || phase === "invulnerable";
  }

  function isLowFaceLifePhase(value) {
    const phase = normalizeFaceLifePhase(value, "unknown");
    return phase === "critical" || phase === "moribund";
  }

  function shouldTrustLowQuantizedFaceLife(options, phase, confidence) {
    if (!isLowFaceLifePhase(phase)) {
      return false;
    }

    const numericHealth = Number(options?.estimatedPercent ?? options?.value ?? options?.health ?? Number.NaN);
    const heartbeatAlive = options?.faceHeartbeatAlive === true || options?.healthFaceHeartbeatAlive === true;
    const noHeartbeatFrames = Number(options?.faceNoHeartbeatFrames ?? options?.healthFaceNoHeartbeatFrames ?? options?.noHeartbeatFrames ?? 0);
    const bloodEvidence = Math.max(
      Number(options?.faceBloodScore || 0),
      Number(options?.healthFaceBloodScore || 0),
      Number(options?.faceBloodRatio || 0) * 1.12,
      Number(options?.healthFaceBloodRatio || 0) * 1.12,
      Number(options?.faceDeathTintScore || 0) * 0.74,
      Number(options?.healthFaceDeathTintScore || 0) * 0.74);
    const lowQuantizedConfidence = Number(confidence || 0);

    if (heartbeatAlive && Number.isFinite(numericHealth) && numericHealth >= 70 && bloodEvidence < 0.42) {
      return false;
    }

    return lowQuantizedConfidence >= 0.82
      || bloodEvidence >= 0.50
      || noHeartbeatFrames >= 8;
  }

  const FACE_LIFE_SAMPLE_MAX_DISTANCE = 1.35;
  const FACE_LIFE_SAMPLE_DICTIONARY = Object.freeze([
    { id: "basic-5-left", phase: "healthy", level: 5, signature: "565259947ac6b89b", edgeSignature: "98999cb89bb98bb8", redSignature: "053019813cc30770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022004400220", redScore: 0.6377, bloodRatio: 0.3955, eyeWhiteScore: 0.0906, eyeYellowScore: 0.4633, eyeRedScore: 0.785, edgeScore: 0.6441, lumaScore: 0.3225, event: "idle", semanticRow: "life-phase" },
    { id: "basic-5-front", phase: "healthy", level: 5, signature: "565259947ad6b89b", edgeSignature: "98999bb89bb98bb8", redSignature: "053019913dd30770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022004500220", redScore: 0.6405, bloodRatio: 0.3984, eyeWhiteScore: 0.2022, eyeYellowScore: 0.4727, eyeRedScore: 0.7943, edgeScore: 0.638, lumaScore: 0.3252, event: "idle", semanticRow: "life-phase" },
    { id: "basic-5-right", phase: "healthy", level: 5, signature: "565259947ac6b89b", edgeSignature: "98998cb89bb98bb8", redSignature: "053018913cc30770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022004400220", redScore: 0.6376, bloodRatio: 0.3955, eyeWhiteScore: 0.0906, eyeYellowScore: 0.4633, eyeRedScore: 0.7846, edgeScore: 0.6444, lumaScore: 0.3217, event: "idle", semanticRow: "life-phase" },
    { id: "basic-4-left", phase: "wounded", level: 4, signature: "485287b38ab6b7ab", edgeSignature: "99899ba8acb98aa8", redSignature: "053028713dd20870", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000021004400210", redScore: 0.6343, bloodRatio: 0.3906, eyeWhiteScore: 0.3363, eyeYellowScore: 0.4558, eyeRedScore: 0.7732, edgeScore: 0.6364, lumaScore: 0.3182, event: "idle", semanticRow: "life-phase" },
    { id: "basic-4-front", phase: "wounded", level: 4, signature: "565259947ad6b89b", edgeSignature: "99999bb89bb98ab8", redSignature: "053018813cc20770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022004400220", redScore: 0.6343, bloodRatio: 0.3848, eyeWhiteScore: 0.202, eyeYellowScore: 0.4708, eyeRedScore: 0.7785, edgeScore: 0.6454, lumaScore: 0.32, event: "idle", semanticRow: "life-phase" },
    { id: "basic-4-right", phase: "wounded", level: 4, signature: "48535a957ca6b98b", edgeSignature: "9a999ac99aca79a7", redSignature: "044017812dd30780", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000012004410220", redScore: 0.6352, bloodRatio: 0.3877, eyeWhiteScore: 0.3363, eyeYellowScore: 0.457, eyeRedScore: 0.7751, edgeScore: 0.63, lumaScore: 0.3232, event: "idle", semanticRow: "life-phase" },
    { id: "basic-3-left", phase: "damaged", level: 3, signature: "59734574a8767c9b", edgeSignature: "99898a989cb99ba7", redSignature: "074018612a920a80", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100021003200320", redScore: 0.626, bloodRatio: 0.3711, eyeWhiteScore: 0.0, eyeYellowScore: 0.4454, eyeRedScore: 0.714, edgeScore: 0.6198, lumaScore: 0.3181, event: "idle", semanticRow: "life-phase" },
    { id: "basic-3-front", phase: "damaged", level: 3, signature: "4a725754a985489b", edgeSignature: "9a8989a89bc98ba8", redSignature: "0750188129920990", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022003300220", redScore: 0.6342, bloodRatio: 0.3887, eyeWhiteScore: 0.0, eyeYellowScore: 0.45, eyeRedScore: 0.7293, edgeScore: 0.626, lumaScore: 0.3229, event: "idle", semanticRow: "life-phase" },
    { id: "basic-3-right", phase: "damaged", level: 3, signature: "488246948896b8ab", edgeSignature: "999979a99bc97ba8", redSignature: "0550168129a208a0", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000012002300230", redScore: 0.6248, bloodRatio: 0.3711, eyeWhiteScore: 0.0, eyeYellowScore: 0.4453, eyeRedScore: 0.7107, edgeScore: 0.6195, lumaScore: 0.3159, event: "idle", semanticRow: "life-phase" },
    { id: "basic-2-left", phase: "critical", level: 2, signature: "487436737546464b", edgeSignature: "977879a88cda7cc8", redSignature: "0791146129a20570", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0110011002400010", redScore: 0.6193, bloodRatio: 0.3779, eyeWhiteScore: 0.0, eyeYellowScore: 0.4349, eyeRedScore: 0.6966, edgeScore: 0.6196, lumaScore: 0.3151, event: "idle", semanticRow: "life-phase" },
    { id: "basic-2-front", phase: "critical", level: 2, signature: "487336448456b26b", edgeSignature: "976988a89cc97cc7", redSignature: "087015612aa20770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0110011003300110", redScore: 0.6219, bloodRatio: 0.3779, eyeWhiteScore: 0.0003, eyeYellowScore: 0.3029, eyeRedScore: 0.7023, edgeScore: 0.6141, lumaScore: 0.3171, event: "idle", semanticRow: "life-phase" },
    { id: "basic-2-right", phase: "critical", level: 2, signature: "595236637566616b", edgeSignature: "98688897add88cc7", redSignature: "1960155129a20760", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0210001004200110", redScore: 0.6186, bloodRatio: 0.374, eyeWhiteScore: 0.0, eyeYellowScore: 0.3017, eyeRedScore: 0.6974, edgeScore: 0.6102, lumaScore: 0.317, event: "idle", semanticRow: "life-phase" },
    { id: "basic-1-left", phase: "moribund", level: 1, signature: "487436737546464b", edgeSignature: "976889878bda7cb7", redSignature: "0791144129a20680", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0110000002300000", redScore: 0.6164, bloodRatio: 0.3711, eyeWhiteScore: 0.0, eyeYellowScore: 0.2155, eyeRedScore: 0.6788, edgeScore: 0.5885, lumaScore: 0.3005, event: "idle", semanticRow: "life-phase" },
    { id: "basic-1-front", phase: "moribund", level: 1, signature: "487336448456b26b", edgeSignature: "976988979bc97bb7", redSignature: "0880144129920670", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0110000002200000", redScore: 0.6134, bloodRatio: 0.3652, eyeWhiteScore: 0.0, eyeYellowScore: 0.1773, eyeRedScore: 0.675, edgeScore: 0.5979, lumaScore: 0.3003, event: "idle", semanticRow: "life-phase" },
    { id: "basic-1-right", phase: "moribund", level: 1, signature: "595236637526616b", edgeSignature: "986889879cc88cb7", redSignature: "1960145129920760", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0210000003100000", redScore: 0.6157, bloodRatio: 0.3701, eyeWhiteScore: 0.0, eyeYellowScore: 0.2957, eyeRedScore: 0.6827, edgeScore: 0.5961, lumaScore: 0.2995, event: "idle", semanticRow: "life-phase" },
    { id: "front-hit-5", phase: "healthy", level: 5, signature: "47724474aac6ba9b", edgeSignature: "96699aa89cc97cc7", redSignature: "0540198129920770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000022003300220", redScore: 0.6228, bloodRatio: 0.3867, eyeWhiteScore: 0.0, eyeYellowScore: 0.4522, eyeRedScore: 0.7335, edgeScore: 0.6181, lumaScore: 0.3218, event: "pain-front", semanticRow: "pain-face" },
    { id: "front-hit-4", phase: "wounded", level: 4, signature: "48724754aac6ba9b", edgeSignature: "99998aa99cc97cc7", redSignature: "0650188129920770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022003300220", redScore: 0.6231, bloodRatio: 0.3711, eyeWhiteScore: 0.0, eyeYellowScore: 0.4507, eyeRedScore: 0.7185, edgeScore: 0.6434, lumaScore: 0.3209, event: "pain-front", semanticRow: "pain-face" },
    { id: "front-hit-3", phase: "damaged", level: 3, signature: "48724754a986ba9b", edgeSignature: "99998aa99cc97cb7", redSignature: "0650188129920870", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022002200220", redScore: 0.6222, bloodRatio: 0.3721, eyeWhiteScore: 0.0, eyeYellowScore: 0.4505, eyeRedScore: 0.7243, edgeScore: 0.6408, lumaScore: 0.3173, event: "pain-front", semanticRow: "pain-face" },
    { id: "front-hit-2", phase: "critical", level: 2, signature: "48724354aac6b76b", edgeSignature: "99898ba99cc97bb7", redSignature: "065017712aa20880", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022003300110", redScore: 0.6241, bloodRatio: 0.3789, eyeWhiteScore: 0.0, eyeYellowScore: 0.4497, eyeRedScore: 0.7179, edgeScore: 0.6464, lumaScore: 0.3124, event: "pain-front", semanticRow: "pain-face" },
    { id: "front-hit-1", phase: "moribund", level: 1, signature: "48724454aac6b33b", edgeSignature: "99898aa99cd97cb8", redSignature: "065017712aa20880", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100011002200110", redScore: 0.6277, bloodRatio: 0.3877, eyeWhiteScore: 0.0204, eyeYellowScore: 0.4416, eyeRedScore: 0.7254, edgeScore: 0.6412, lumaScore: 0.2966, event: "pain-front", semanticRow: "pain-face" },
    { id: "left-hit-5", phase: "healthy", level: 5, signature: "8b63a9749997677b", edgeSignature: "bd8abb86cb8bbb86", redSignature: "17304a506a914830", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0200131023102200", redScore: 0.6343, bloodRatio: 0.4014, eyeWhiteScore: 0.4479, eyeYellowScore: 0.4647, eyeRedScore: 0.7437, edgeScore: 0.6518, lumaScore: 0.3573, event: "pain-left", semanticRow: "pain-face" },
    { id: "left-hit-4", phase: "wounded", level: 4, signature: "8b63a9749997677b", edgeSignature: "bc8abb86cb8bbb96", redSignature: "27304a506a914830", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0200131023102200", redScore: 0.6358, bloodRatio: 0.4053, eyeWhiteScore: 0.4479, eyeYellowScore: 0.4648, eyeRedScore: 0.7459, edgeScore: 0.6484, lumaScore: 0.3571, event: "pain-left", semanticRow: "pain-face" },
    { id: "left-hit-3", phase: "damaged", level: 3, signature: "4853a973c9c8bb9b", edgeSignature: "da7acb65ed8aab96", redSignature: "1610594049a12950", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100241013200310", redScore: 0.6257, bloodRatio: 0.3594, eyeWhiteScore: 0.1081, eyeYellowScore: 0.4773, eyeRedScore: 0.7343, edgeScore: 0.6487, lumaScore: 0.3656, event: "pain-left", semanticRow: "pain-face" },
    { id: "left-hit-2", phase: "critical", level: 2, signature: "b5745754b656b676", edgeSignature: "975aba769d8b7a98", redSignature: "1520484139a20960", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000130012200110", redScore: 0.6203, bloodRatio: 0.3691, eyeWhiteScore: 0.0531, eyeYellowScore: 0.46, eyeRedScore: 0.7308, edgeScore: 0.5923, lumaScore: 0.3934, event: "pain-left", semanticRow: "pain-face" },
    { id: "left-hit-1", phase: "moribund", level: 1, signature: "b5742254b656b656", edgeSignature: "9758ca759d897aa7", redSignature: "1520384139a20960", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000020012200100", redScore: 0.6185, bloodRatio: 0.3643, eyeWhiteScore: 0.0531, eyeYellowScore: 0.4547, eyeRedScore: 0.735, edgeScore: 0.5763, lumaScore: 0.3864, event: "pain-left", semanticRow: "pain-face" },
    { id: "right-hit-5", phase: "healthy", level: 5, signature: "269434a857c5b668", edgeSignature: "a7ab67bcb8bc68bb", redSignature: "037005a519a60384", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0010013201320022", redScore: 0.6343, bloodRatio: 0.4062, eyeWhiteScore: 0.4483, eyeYellowScore: 0.4686, eyeRedScore: 0.7619, edgeScore: 0.6242, lumaScore: 0.3558, event: "pain-right", semanticRow: "pain-face" },
    { id: "right-hit-4", phase: "wounded", level: 4, signature: "26a6349957c5b668", edgeSignature: "a7ba68bcb7bc79bb", redSignature: "0371059419a60384", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0010013101320022", redScore: 0.6335, bloodRatio: 0.4053, eyeWhiteScore: 0.4483, eyeYellowScore: 0.4659, eyeRedScore: 0.748, edgeScore: 0.643, lumaScore: 0.3521, event: "pain-right", semanticRow: "pain-face" },
    { id: "right-hit-3", phase: "damaged", level: 3, signature: "3476348437acb77a", edgeSignature: "b7bb68cbc9dc79b9", redSignature: "026105941b930690", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0010014103210130", redScore: 0.6245, bloodRatio: 0.3555, eyeWhiteScore: 0.1084, eyeYellowScore: 0.4851, eyeRedScore: 0.7516, edgeScore: 0.6576, lumaScore: 0.3638, event: "pain-right", semanticRow: "pain-face" },
    { id: "right-hit-2", phase: "critical", level: 2, signature: "347534a83649b777", edgeSignature: "b68b67adb8db89a9", redSignature: "026115a42a930690", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000014102210110", redScore: 0.6259, bloodRatio: 0.3809, eyeWhiteScore: 0.0531, eyeYellowScore: 0.473, eyeRedScore: 0.7602, edgeScore: 0.6389, lumaScore: 0.3717, event: "pain-right", semanticRow: "pain-face" },
    { id: "right-hit-1", phase: "moribund", level: 1, signature: "3484345a4947b865", edgeSignature: "b68b67bdb9db8aa9", redSignature: "025115a32a930690", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000003003210110", redScore: 0.6241, bloodRatio: 0.3711, eyeWhiteScore: 0.0531, eyeYellowScore: 0.4624, eyeRedScore: 0.7607, edgeScore: 0.6408, lumaScore: 0.3604, event: "pain-right", semanticRow: "pain-face" },
    { id: "variant-a-5", phase: "healthy", level: 5, signature: "565259749cc7507b", edgeSignature: "98988b989bb97bb7", redSignature: "06401aa12aa20550", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000033003300110", redScore: 0.6293, bloodRatio: 0.4141, eyeWhiteScore: 0.1371, eyeYellowScore: 0.4927, eyeRedScore: 0.8134, edgeScore: 0.6201, lumaScore: 0.3319, event: "pickup", semanticRow: "pickup-face" },
    { id: "variant-a-4", phase: "wounded", level: 4, signature: "5652599498c7507b", edgeSignature: "99888aa89bb97bb7", redSignature: "053019912aa20550", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022003300110", redScore: 0.623, bloodRatio: 0.3955, eyeWhiteScore: 0.1362, eyeYellowScore: 0.4808, eyeRedScore: 0.795, edgeScore: 0.6254, lumaScore: 0.3247, event: "pickup", semanticRow: "pickup-face" },
    { id: "variant-a-3", phase: "damaged", level: 3, signature: "487247549cc7507b", edgeSignature: "98788a989bb97cb7", redSignature: "065017712bb20550", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100011003300110", redScore: 0.6212, bloodRatio: 0.3975, eyeWhiteScore: 0.0029, eyeYellowScore: 0.4635, eyeRedScore: 0.759, edgeScore: 0.6134, lumaScore: 0.3168, event: "pickup", semanticRow: "pickup-face" },
    { id: "variant-a-2", phase: "critical", level: 2, signature: "487243549cc7507b", edgeSignature: "98788aa89cc97bb7", redSignature: "065016712bb20660", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100011003300000", redScore: 0.6194, bloodRatio: 0.3984, eyeWhiteScore: 0.0029, eyeYellowScore: 0.4624, eyeRedScore: 0.7493, edgeScore: 0.6192, lumaScore: 0.3113, event: "pickup", semanticRow: "pickup-face" },
    { id: "variant-a-1", phase: "moribund", level: 1, signature: "487244549cc7526b", edgeSignature: "98788a989bb97cc7", redSignature: "075017712ba20770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100011002200000", redScore: 0.6282, bloodRatio: 0.4131, eyeWhiteScore: 0.0029, eyeYellowScore: 0.46, eyeRedScore: 0.7549, edgeScore: 0.6166, lumaScore: 0.2988, event: "pickup", semanticRow: "pickup-face" },
    { id: "variant-b-5", phase: "healthy", level: 5, signature: "47724873cac9b87b", edgeSignature: "a6799aa89cc97aa7", redSignature: "0540199148840770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000022012210220", redScore: 0.6207, bloodRatio: 0.3682, eyeWhiteScore: 0.0, eyeYellowScore: 0.4549, eyeRedScore: 0.7461, edgeScore: 0.605, lumaScore: 0.325, event: "enemy-defeated", semanticRow: "smirk-face" },
    { id: "variant-b-4", phase: "wounded", level: 4, signature: "48724754cac9b87b", edgeSignature: "99998aa99cc97aa7", redSignature: "0650188148840770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022012210220", redScore: 0.6208, bloodRatio: 0.3516, eyeWhiteScore: 0.0, eyeYellowScore: 0.4529, eyeRedScore: 0.7281, edgeScore: 0.6249, lumaScore: 0.3241, event: "enemy-defeated", semanticRow: "smirk-face" },
    { id: "variant-b-3", phase: "damaged", level: 3, signature: "48724754cac9b87b", edgeSignature: "99998aa99cc97aa7", redSignature: "0650188148840770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022012210220", redScore: 0.6235, bloodRatio: 0.3584, eyeWhiteScore: 0.0204, eyeYellowScore: 0.4541, eyeRedScore: 0.7374, edgeScore: 0.6219, lumaScore: 0.3252, event: "enemy-defeated", semanticRow: "smirk-face" },
    { id: "variant-b-2", phase: "critical", level: 2, signature: "48724354cac9b57b", edgeSignature: "99898ba99cc97ba7", redSignature: "0650178148840770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100022012210110", redScore: 0.6223, bloodRatio: 0.3584, eyeWhiteScore: 0.0204, eyeYellowScore: 0.4527, eyeRedScore: 0.7272, edgeScore: 0.6322, lumaScore: 0.317, event: "enemy-defeated", semanticRow: "smirk-face" },
    { id: "variant-b-1", phase: "moribund", level: 1, signature: "48724454cac9b45b", edgeSignature: "99898ab99dc97cb7", redSignature: "0650187148840770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100011011110110", redScore: 0.6235, bloodRatio: 0.373, eyeWhiteScore: 0.0203, eyeYellowScore: 0.4445, eyeRedScore: 0.7363, edgeScore: 0.6442, lumaScore: 0.2908, event: "enemy-defeated", semanticRow: "smirk-face" },
    { id: "terminal-dead", phase: "dead", level: 0, signature: "487223447466b53b", edgeSignature: "966878779cc87ba7", redSignature: "086015512aa20770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0100000002200000", redScore: 0.6193, bloodRatio: 0.3838, eyeWhiteScore: 0.0, eyeYellowScore: 0.2129, eyeRedScore: 0.6985, edgeScore: 0.5628, lumaScore: 0.2886, event: "dead", semanticRow: "dead-phase" },
    { id: "terminal-invulnerable", phase: "invulnerable", level: 5, signature: "56525bb47ad6b9ab", edgeSignature: "98999bb89bb98bb8", redSignature: "05301aa13dd30770", eyeWhiteSignature: "0000000000000000", eyeYellowSignature: "0000033005500220", redScore: 0.6464, bloodRatio: 0.4189, eyeWhiteScore: 0.552, eyeYellowScore: 0.5446, eyeRedScore: 0.8222, edgeScore: 0.6345, lumaScore: 0.3324, event: "invulnerable", semanticRow: "invulnerable-phase" },
  ]);

  function normalizeFaceLifeSignature(value) {
    const text = String(value || "").toLowerCase().replace(/[^0-9a-f]/g, "");
    return text.length >= 8 ? text : "";
  }

  function faceLifeSignatureDistance(left, right) {
    const a = normalizeFaceLifeSignature(left);
    const b = normalizeFaceLifeSignature(right);
    if (!a || !b) {
      return Number.POSITIVE_INFINITY;
    }

    const count = Math.min(a.length, b.length);
    let total = Math.abs(a.length - b.length) * 4;
    for (let index = 0; index < count; index += 1) {
      total += Math.abs(parseInt(a[index], 16) - parseInt(b[index], 16));
    }

    return total / Math.max(a.length, b.length);
  }

  function optionString(options, keys, fallback = "") {
    for (let index = 0; index < keys.length; index += 1) {
      const value = options?.[keys[index]];
      if (value != null && String(value).length > 0) {
        return String(value);
      }
    }

    return fallback;
  }

  function optionNumber(options, keys, fallback = Number.NaN) {
    for (let index = 0; index < keys.length; index += 1) {
      const value = Number(options?.[keys[index]]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    return fallback;
  }

  function normalizeFaceLifeFeatureOptions(options = {}) {
    const features = {
      edgeSignature: normalizeFaceLifeSignature(optionString(options, ["faceEdgeSignature", "healthFaceEdgeSignature", "faceLifeEdgeSignature"])),
      redSignature: normalizeFaceLifeSignature(optionString(options, ["faceRedSignature", "healthFaceRedSignature", "faceLifeRedSignature"])),
      eyeWhiteSignature: normalizeFaceLifeSignature(optionString(options, ["faceEyeWhiteSignature", "healthFaceEyeWhiteSignature", "faceLifeEyeWhiteSignature"])),
      eyeYellowSignature: normalizeFaceLifeSignature(optionString(options, ["faceEyeYellowSignature", "healthFaceEyeYellowSignature", "faceLifeEyeYellowSignature"])),
      redScore: optionNumber(options, ["faceRedScore", "healthFaceRedScore"]),
      bloodRatio: optionNumber(options, ["faceBloodRatio", "healthFaceBloodRatio"]),
      eyeWhiteScore: optionNumber(options, ["faceEyeWhiteScore", "healthFaceEyeWhiteScore"]),
      eyeYellowScore: optionNumber(options, ["faceEyeYellowScore", "healthFaceEyeYellowScore"]),
      eyeRedScore: optionNumber(options, ["faceEyeRedScore", "healthFaceEyeRedScore"]),
      edgeScore: optionNumber(options, ["faceEdgeScore", "healthFaceEdgeScore"]),
      lumaScore: optionNumber(options, ["faceLumaScore", "healthFaceLumaScore"])
    };

    features.active = Boolean(
      features.edgeSignature
        || features.redSignature
        || features.eyeWhiteSignature
        || features.eyeYellowSignature
        || (Number.isFinite(features.redScore) && features.redScore > 0.015)
        || (Number.isFinite(features.bloodRatio) && features.bloodRatio > 0.015)
        || (Number.isFinite(features.eyeWhiteScore) && features.eyeWhiteScore > 0.015)
        || (Number.isFinite(features.eyeYellowScore) && features.eyeYellowScore > 0.015)
        || (Number.isFinite(features.eyeRedScore) && features.eyeRedScore > 0.015)
        || (Number.isFinite(features.edgeScore) && features.edgeScore > 0.015)
        || (Number.isFinite(features.lumaScore) && features.lumaScore > 0.015));
    return features;
  }

  function featureDelta(left, right, weight) {
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return 0;
    }

    return Math.abs(left - right) * weight;
  }

  function featureSignatureDelta(left, right, weight) {
    const leftSignature = normalizeFaceLifeSignature(left);
    const rightSignature = normalizeFaceLifeSignature(right);
    if (!leftSignature || !rightSignature) {
      return 0;
    }

    const distance = faceLifeSignatureDistance(leftSignature, rightSignature);
    return Number.isFinite(distance) ? distance * weight : 0;
  }

  function faceLifeFeatureDistance(features, sample) {
    if (!features?.active || !sample) {
      return 0;
    }

    let score = 0;
    score += featureSignatureDelta(features.edgeSignature, sample.edgeSignature, 0.10);
    score += featureSignatureDelta(features.redSignature, sample.redSignature, 0.08);
    score += featureSignatureDelta(features.eyeWhiteSignature, sample.eyeWhiteSignature, 0.06);
    score += featureSignatureDelta(features.eyeYellowSignature, sample.eyeYellowSignature, 0.04);
    score += featureDelta(features.redScore, Number(sample.redScore), 1.20);
    score += featureDelta(features.bloodRatio, Number(sample.bloodRatio), 1.10);
    score += featureDelta(features.eyeWhiteScore, Number(sample.eyeWhiteScore), sample.phase === "invulnerable" ? 2.35 : 1.35);
    score += featureDelta(features.eyeYellowScore, Number(sample.eyeYellowScore), 0.46);
    score += featureDelta(features.eyeRedScore, Number(sample.eyeRedScore), 0.54);
    score += featureDelta(features.edgeScore, Number(sample.edgeScore), 0.46);
    score += featureDelta(features.lumaScore, Number(sample.lumaScore), 0.36);

    if (sample.phase === "invulnerable" && Number.isFinite(features.eyeWhiteScore) && features.eyeWhiteScore < 0.38) {
      score += 0.46;
    }

    return score;
  }

  function compareFaceLifeCandidate(left, right) {
    if (left.phase === "dead" && right.phase !== "dead") {
      return -1;
    }

    if (right.phase === "dead" && left.phase !== "dead") {
      return 1;
    }

    if (left.phase === "invulnerable" && right.phase !== "invulnerable") {
      return 1;
    }

    if (right.phase === "invulnerable" && left.phase !== "invulnerable") {
      return -1;
    }

    return Number(left.level || 0) - Number(right.level || 0);
  }

  function classifyFaceLifeSignature(signature, options = {}) {
    const normalized = normalizeFaceLifeSignature(signature);
    if (!hasMeaningfulFaceSignature(normalized)) {
      return {
        phase: "unknown",
        level: 0,
        percent: 0,
        confidence: 0,
        authoritative: false,
        source: "none",
        sampleId: "none",
        distance: Number.POSITIVE_INFINITY,
        ambiguous: false,
        candidates: []
      };
    }

    const features = normalizeFaceLifeFeatureOptions(options);
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestShapeDistance = Number.POSITIVE_INFINITY;
    const candidates = [];
    for (let index = 0; index < FACE_LIFE_SAMPLE_DICTIONARY.length; index += 1) {
      const sample = FACE_LIFE_SAMPLE_DICTIONARY[index];
      const shapeDistance = faceLifeSignatureDistance(normalized, sample.signature);
      const distance = shapeDistance + faceLifeFeatureDistance(features, sample);
      if (distance < bestDistance - 0.0001) {
        bestDistance = distance;
        bestShapeDistance = shapeDistance;
        candidates.length = 0;
      }

      if (Math.abs(distance - bestDistance) <= 0.0001) {
        candidates.push(sample);
        bestShapeDistance = Math.min(bestShapeDistance, shapeDistance);
      }
    }

    if (!candidates.length || bestShapeDistance > Number(options.maxDistance ?? FACE_LIFE_SAMPLE_MAX_DISTANCE)) {
      return {
        phase: "unknown",
        level: 0,
        percent: 0,
        confidence: 0,
        authoritative: false,
        source: "sample-miss",
        sampleId: "none",
        distance: round2(bestDistance),
        shapeDistance: round2(bestShapeDistance),
        ambiguous: false,
        candidates: []
      };
    }

    const phases = new Set(candidates.map(candidate => candidate.phase));
    const ambiguous = phases.size > 1;
    const selected = candidates.slice().sort(compareFaceLifeCandidate)[0];
    const distanceConfidence = bestDistance <= 0
      ? 0.92
      : Math.max(0, 1 - (bestDistance / (features.active ? 3.65 : 3.2)));
    const confidence = clamp01(Number(options.confidence ?? (ambiguous ? Math.min(0.78, distanceConfidence) : distanceConfidence)));
    const phase = normalizeFaceLifePhase(selected.phase, "unknown");
    return {
      phase,
      level: faceLifePhaseLevel(phase),
      percent: faceLifePhasePercent(phase),
      confidence: round2(confidence),
      authoritative: phase !== "unknown" && confidence >= Number(options.minConfidence ?? 0.72),
      source: ambiguous ? "sample-dictionary-ambiguous" : "sample-dictionary",
      sampleId: selected.id,
      distance: round2(bestDistance),
      shapeDistance: round2(bestShapeDistance),
      ambiguous,
      event: selected.event || "unknown",
      semanticRow: selected.semanticRow || "unknown",
      candidates: candidates.map(candidate => candidate.id)
    };
  }

  function listFaceLifeSampleDictionary() {
    return FACE_LIFE_SAMPLE_DICTIONARY.map(sample => Object.assign({}, sample));
  }

  function resolveFaceLifeTemplate(options = {}) {
    const invulnerableHint = options.invulnerable === true
      || options.godMode === true
      || options.healthInvulnerable === true;
    const temporalPhaseValue = options.faceLifePhase
      ?? options.healthFaceLifePhase;
    const temporalLevelValue = options.faceLifeLevel
      ?? options.healthFaceLifeLevel;
    const templatePhaseValue = options.faceLifeTemplatePhase
      ?? options.healthFaceLifeTemplatePhase;
    const templateLevelValue = options.faceLifeTemplateLevel
      ?? options.healthFaceLifeTemplateLevel;
    const quantizedPhaseValue = options.faceLifeQuantizedPhase
      ?? options.healthFaceLifeQuantizedPhase;
    const quantizedLevelValue = options.faceLifeQuantizedLevel
      ?? options.healthFaceLifeQuantizedLevel;
    const hasTemporalPhase = temporalPhaseValue != null && normalizeFaceLifePhase(temporalPhaseValue, "unknown") !== "unknown";
    const temporalPhaseExplicitlyUnknown = temporalPhaseValue != null
      && normalizeFaceLifePhase(temporalPhaseValue, "unknown") === "unknown";
    const hasTemporalLevel = !temporalPhaseExplicitlyUnknown
      && temporalLevelValue != null
      && faceLifePhaseFromLevel(temporalLevelValue, "unknown") !== "unknown";
    const hasTemplatePhase = templatePhaseValue != null && normalizeFaceLifePhase(templatePhaseValue, "unknown") !== "unknown";
    const templatePhaseExplicitlyUnknown = templatePhaseValue != null
      && normalizeFaceLifePhase(templatePhaseValue, "unknown") === "unknown";
    const quantizedPhaseExplicitlyUnknown = quantizedPhaseValue != null
      && normalizeFaceLifePhase(quantizedPhaseValue, "unknown") === "unknown";
    const hasTemplateLevel = !templatePhaseExplicitlyUnknown
      && templateLevelValue != null
      && faceLifePhaseFromLevel(templateLevelValue, "unknown") !== "unknown";
    const hasQuantizedPhase = quantizedPhaseValue != null && normalizeFaceLifePhase(quantizedPhaseValue, "unknown") !== "unknown";
    const hasQuantizedLevel = !quantizedPhaseExplicitlyUnknown
      && quantizedLevelValue != null
      && faceLifePhaseFromLevel(quantizedLevelValue, "unknown") !== "unknown";
    const explicitConfidence = options.faceTemplateConfidence
      ?? options.healthFaceTemplateConfidence
      ?? options.faceLifeConfidence
      ?? options.healthFaceLifeConfidence;
    const temporalCandidatePhase = hasTemporalPhase
      ? normalizeFaceLifePhase(temporalPhaseValue, "unknown")
      : (hasTemporalLevel ? faceLifePhaseFromLevel(temporalLevelValue, "unknown") : "unknown");
    const temporalFloorApplied = options.faceLifeTemporalFloorApplied === true
      || options.healthFaceLifeTemporalFloorApplied === true;
    const temporalFloorLevelValue = options.faceLifeTemporalFloorLevel
      ?? options.healthFaceLifeTemporalFloorLevel
      ?? temporalLevelValue;
    const temporalFloorPhase = temporalFloorApplied
      ? faceLifePhaseFromLevel(temporalFloorLevelValue, temporalCandidatePhase)
      : "unknown";
    const temporalFloorPriority = temporalFloorApplied
      && (temporalFloorPhase === "dead" || isLowFaceLifePhase(temporalFloorPhase));
    const quantizedCandidatePhase = hasQuantizedPhase
      ? normalizeFaceLifePhase(quantizedPhaseValue, "unknown")
      : (hasQuantizedLevel ? faceLifePhaseFromLevel(quantizedLevelValue, "unknown") : "unknown");
    const quantizedCandidateConfidence = Number(explicitConfidence ?? 0.72);
    const quantizedPriority = quantizedCandidatePhase !== "unknown"
      && (isDefinitiveFaceLifePhase(quantizedCandidatePhase)
        || shouldTrustLowQuantizedFaceLife(
          options,
          quantizedCandidatePhase,
          quantizedCandidateConfidence));
    const temporalLowPriority = temporalCandidatePhase === "dead"
      || isLowFaceLifePhase(temporalCandidatePhase);
    const candidateSampleSignature = options.faceLifeTemplateSignature
      ?? options.healthFaceLifeTemplateSignature
      ?? options.faceSignature
      ?? options.healthFaceSignature;
    const faceSignatureValid = resolveFaceSignatureValidity(options, candidateSampleSignature);
    const sampleSignatureValue = faceSignatureValid ? candidateSampleSignature : "";
    const sampleMatch = classifyFaceLifeSignature(sampleSignatureValue, {
      confidence: explicitConfidence,
      maxDistance: options.faceLifeSampleMaxDistance,
      minConfidence: options.faceLifeSampleMinConfidence,
      faceEdgeSignature: options.faceEdgeSignature ?? options.healthFaceEdgeSignature,
      faceRedSignature: options.faceRedSignature ?? options.healthFaceRedSignature,
      faceEyeWhiteSignature: options.faceEyeWhiteSignature ?? options.healthFaceEyeWhiteSignature,
      faceEyeYellowSignature: options.faceEyeYellowSignature ?? options.healthFaceEyeYellowSignature,
      faceRedScore: options.faceRedScore ?? options.healthFaceRedScore,
      faceBloodScore: options.faceBloodScore ?? options.healthFaceBloodScore,
      faceBloodRatio: options.faceBloodRatio ?? options.healthFaceBloodRatio,
      faceEyeWhiteScore: options.faceEyeWhiteScore ?? options.healthFaceEyeWhiteScore,
      faceEyeYellowScore: options.faceEyeYellowScore ?? options.healthFaceEyeYellowScore,
      faceEyeRedScore: options.faceEyeRedScore ?? options.healthFaceEyeRedScore,
      faceEdgeScore: options.faceEdgeScore ?? options.healthFaceEdgeScore,
      faceLumaScore: options.faceLumaScore ?? options.healthFaceLumaScore
    });

    let phase = "unknown";
    let source = "none";
    let sampleId = "none";
    let sampleDistance = Number.POSITIVE_INFINITY;
    let sampleAmbiguous = false;
    if (invulnerableHint) {
      phase = "invulnerable";
      source = "invulnerable-hint";
    } else if (temporalFloorPriority) {
      phase = temporalFloorPhase;
      source = "temporal-floor";
    } else if (hasTemplatePhase) {
      phase = normalizeFaceLifePhase(templatePhaseValue, "unknown");
      source = "template-phase";
    } else if (hasTemplateLevel) {
      phase = faceLifePhaseFromLevel(templateLevelValue, "unknown");
      source = "template-level";
    } else if (quantizedPriority) {
      phase = quantizedCandidatePhase;
      source = hasQuantizedPhase ? "quantized-phase" : "quantized-level";
    } else if (temporalLowPriority) {
      phase = temporalCandidatePhase;
      source = hasTemporalPhase ? "explicit-phase" : "explicit-level";
    } else if (sampleMatch.authoritative) {
      phase = sampleMatch.phase;
      source = sampleMatch.source;
      sampleId = sampleMatch.sampleId;
      sampleDistance = sampleMatch.distance;
      sampleAmbiguous = sampleMatch.ambiguous;
    } else if (hasQuantizedPhase) {
      phase = normalizeFaceLifePhase(quantizedPhaseValue, "unknown");
      source = "quantized-phase";
    } else if (hasQuantizedLevel) {
      phase = faceLifePhaseFromLevel(quantizedLevelValue, "unknown");
      source = "quantized-level";
    } else if (hasTemporalPhase) {
      phase = normalizeFaceLifePhase(temporalPhaseValue, "unknown");
      source = "explicit-phase";
    } else if (hasTemporalLevel) {
      phase = faceLifePhaseFromLevel(temporalLevelValue, "unknown");
      source = "explicit-level";
    } else {
      const faceBloodScore = clamp01(Number(options.faceBloodScore ?? options.healthFaceBloodScore ?? 0));
      const faceBloodRatio = clamp01(Number(options.faceBloodRatio ?? options.healthFaceBloodRatio ?? 0));
      const faceDeathTintScore = clamp01(Number(options.faceDeathTintScore ?? options.healthFaceDeathTintScore ?? 0));
      const noHeartbeatFrames = Math.max(0, Math.floor(Number(
        options.faceNoHeartbeatFrames
          ?? options.healthFaceNoHeartbeatFrames
          ?? options.noHeartbeatFrames
          ?? 0)));
      const blood = clamp01(Math.max(
        faceBloodScore,
        faceBloodRatio * 1.18,
        faceDeathTintScore * 0.72,
        Number(options.bloodDangerScore || 0)));
      const bloodBandTrusted = options.likelyDead === true
        || blood >= 0.78
        || (faceDeathTintScore >= 0.62 && faceBloodRatio >= 0.55)
        || noHeartbeatFrames >= 24;
      if (options.likelyDead === true) {
        phase = "dead";
        source = "death-gate";
      } else if (bloodBandTrusted && blood >= 0.72) {
        phase = "moribund";
        source = "blood-band";
      } else if (bloodBandTrusted && blood >= 0.54) {
        phase = "critical";
        source = "blood-band";
      } else if (bloodBandTrusted && blood >= 0.34) {
        phase = "damaged";
        source = "blood-band";
      } else if (bloodBandTrusted && blood >= 0.16) {
        phase = "wounded";
        source = "blood-band";
      }
    }

    const bloodCoverageConfidence = clamp01(Math.max(
      Number(options.faceBloodRatio || 0) * 1.32,
      Number(options.faceDeathTintScore || 0) * 0.72,
      (Number(options.faceBloodRatio || 0) >= 0.24 ? Number(options.faceBloodScore || 0) : 0)));
    const defaultConfidence = source === "none"
      ? 0
      : (source === "sample-dictionary" || source === "sample-dictionary-ambiguous"
        ? sampleMatch.confidence
        : (source === "blood-band"
          ? bloodCoverageConfidence
          : 0.72));
    const confidence = clamp01(Number(explicitConfidence ?? defaultConfidence));
    const explicit = source === "explicit-phase"
      || source === "explicit-level"
      || source === "template-phase"
      || source === "template-level"
      || source === "temporal-floor"
      || source === "invulnerable-hint";
    const template = source === "template-phase" || source === "template-level";
    const quantized = source === "quantized-phase" || source === "quantized-level";
    const sample = source === "sample-dictionary" || source === "sample-dictionary-ambiguous";
    const lowQuantizedTrusted = quantized && shouldTrustLowQuantizedFaceLife(options, phase, confidence);
    const explicitTemplateAuthorityValue = options.faceLifeTemplateAuthoritative
      ?? options.healthFaceLifeTemplateAuthoritative;
    const explicitTemplateAuthority = explicitTemplateAuthorityValue === true;
    const fullLifeEvidence = invulnerableHint
      || faceSignatureValid
      || options.faceHeartbeatAlive === true
      || options.healthFaceHeartbeatAlive === true
      || sampleMatch.authoritative
      || explicitTemplateAuthority;
    const authoritative = phase !== "unknown"
      && (source === "invulnerable-hint"
        || (explicit && confidence >= 0.35)
        || (sample && confidence >= Number(options.faceLifeSampleMinConfidence ?? 0.72))
        || (quantized && (isDefinitiveFaceLifePhase(phase) || confidence >= 0.92 || lowQuantizedTrusted))
        || (!explicit && !quantized && confidence >= 0.62))
      && !(template && explicitTemplateAuthorityValue === false)
      && (faceLifePhaseLevel(phase) < 5 || fullLifeEvidence);
    const level = phase === "unknown" ? 0 : faceLifePhaseLevel(phase);
    return {
      phase,
      level,
      percent: faceLifePhasePercent(phase),
      confidence: round2(confidence),
      authoritative,
      explicit,
      source,
      sampleId,
      sampleDistance,
      sampleAmbiguous,
      sampleEvent: sampleMatch.event || "unknown",
      sampleSemanticRow: sampleMatch.semanticRow || "unknown"
    };
  }

  function estimateFaceHeartbeatOpacity(options = {}) {
    const phase = normalizeFaceLifePhase(options.faceLifePhase, options.likelyDead ? "dead" : "unknown");
    if (phase === "dead" || options.likelyDead === true) {
      return 0;
    }

    if (phase === "invulnerable" || options.faceHeartbeatAlive === true) {
      return 1;
    }

    if (phase === "unknown") {
      return 0;
    }

    const threshold = Math.max(1, Number(options.noHeartbeatDeathFrames ?? 90) || 90);
    const frames = Math.max(0, Number(options.faceNoHeartbeatFrames ?? 0) || 0);
    if (frames <= 0) {
      return 0;
    }

    return clamp01(1 - frames / threshold);
  }

  function estimateFaceLifePhase(options = {}) {
    if (options.invulnerable === true || options.godMode === true) {
      return "invulnerable";
    }

    if (options.likelyDead === true) {
      return "dead";
    }

    const health = Number(options.health ?? options.value ?? options.estimatedPercent ?? 100);
    const blood = clamp01(Math.max(
      Number(options.faceBloodScore || 0),
      Number(options.faceBloodRatio || 0) * 1.18,
      Number(options.bloodDangerScore || 0)));
    if (blood >= 0.72 || health <= 15) {
      return "moribund";
    }

    if (blood >= 0.54 || health <= 30) {
      return "critical";
    }

    if (blood >= 0.34 || health <= 55) {
      return "damaged";
    }

    if (blood >= 0.16 || health <= 80) {
      return "wounded";
    }

    return "healthy";
  }

  function normalizeAuditoryEventType(value) {
    const text = String(value || "spatial-event").toLowerCase();
    if (text === "motion"
      || text === "contact"
      || text === "attention"
      || text === "spatial-event"
      || text === "native-sfx"
      || text === "doom-native-sfx"
      || text === "use-response"
      || text === "use-success-gate"
      || text === "use-failed-voice") {
      return text;
    }

    return text === "none" ? "none" : "spatial-event";
  }

  function createAuditorySnapshot(overrides = {}) {
    const leftEnergy = clamp01(Number(overrides.leftEnergy ?? 0));
    const rightEnergy = clamp01(Number(overrides.rightEnergy ?? 0));
    const balance = Math.max(-1, Math.min(1, Number(overrides.balance ?? 0) || 0));
    const lowEnergy = clamp01(Number(overrides.lowEnergy ?? 0));
    const midEnergy = clamp01(Number(overrides.midEnergy ?? 0));
    const highEnergy = clamp01(Number(overrides.highEnergy ?? 0));
    return {
      leftEnergy: round2(leftEnergy),
      rightEnergy: round2(rightEnergy),
      balance: round2(balance),
      dominantFreq: round2(Number(overrides.dominantFreq ?? 0)),
      lowEnergy: round2(lowEnergy),
      midEnergy: round2(midEnergy),
      highEnergy: round2(highEnergy),
      dominantBand: overrides.dominantBand || "none",
      eventDetected: Boolean(overrides.eventDetected),
      eventType: normalizeAuditoryEventType(overrides.eventType),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function buildAuditorySnapshot(state) {
    const source = state?.auditorySnapshot || state?.audio || {};
    const leftEnergy = clamp01(Number(source.leftEnergy ?? source.leftLevel ?? source.left ?? 0));
    const rightEnergy = clamp01(Number(source.rightEnergy ?? source.rightLevel ?? source.right ?? 0));
    const balance = Math.max(-1, Math.min(1, Number(source.balance ?? 0) || 0));
    const dominantFreq = Number(source.dominantFreq ?? source.frequency ?? source.dominantFrequency ?? 0);
    const eventDetected = Boolean(source.eventDetected ?? source.active);
    const bandEnergy = buildAudioBandEnergy(source, dominantFreq, Math.max(leftEnergy, rightEnergy));
    return createAuditorySnapshot({
      leftEnergy,
      rightEnergy,
      balance,
      dominantFreq,
      lowEnergy: bandEnergy.lowEnergy,
      midEnergy: bandEnergy.midEnergy,
      highEnergy: bandEnergy.highEnergy,
      dominantBand: bandEnergy.dominantBand,
      eventDetected,
      eventType: eventDetected ? normalizeAuditoryEventType(source.eventType) : "none",
      timestamp: source.timestamp || state?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    });
  }

  function buildAudioBandEnergy(source, dominantFreq, totalEnergy) {
    const low = source?.lowEnergy ?? source?.lowBandEnergy ?? source?.bands?.low;
    const mid = source?.midEnergy ?? source?.middleEnergy ?? source?.midBandEnergy ?? source?.bands?.mid;
    const high = source?.highEnergy ?? source?.highBandEnergy ?? source?.bands?.high;
    if (Number.isFinite(Number(low)) || Number.isFinite(Number(mid)) || Number.isFinite(Number(high))) {
      const lowEnergy = clamp01(Number(low || 0));
      const midEnergy = clamp01(Number(mid || 0));
      const highEnergy = clamp01(Number(high || 0));
      return {
        lowEnergy,
        midEnergy,
        highEnergy,
        dominantBand: chooseDominantAudioBand(lowEnergy, midEnergy, highEnergy)
      };
    }

    const energy = clamp01(Number(totalEnergy || 0));
    const frequency = Number(dominantFreq || 0);
    if (energy <= 0) {
      return { lowEnergy: 0, midEnergy: 0, highEnergy: 0, dominantBand: "none" };
    }

    if (frequency <= 0) {
      return {
        lowEnergy: round2(energy * 0.38),
        midEnergy: round2(energy * 0.72),
        highEnergy: round2(energy * 0.28),
        dominantBand: "mid"
      };
    }

    if (frequency < 280) {
      return { lowEnergy: energy, midEnergy: round2(energy * 0.32), highEnergy: 0, dominantBand: "low" };
    }

    if (frequency < 2100) {
      return { lowEnergy: round2(energy * 0.24), midEnergy: energy, highEnergy: round2(energy * 0.18), dominantBand: "mid" };
    }

    return { lowEnergy: 0, midEnergy: round2(energy * 0.28), highEnergy: energy, dominantBand: "high" };
  }

  function chooseDominantAudioBand(lowEnergy, midEnergy, highEnergy) {
    const low = Number(lowEnergy || 0);
    const mid = Number(midEnergy || 0);
    const high = Number(highEnergy || 0);
    const peak = Math.max(low, mid, high);
    if (peak <= 0.02) {
      return "none";
    }

    if (high >= mid && high >= low) {
      return "high";
    }

    return mid >= low ? "mid" : "low";
  }

  function normalizeVision9x9(values) {
    const length = VISION_GRID_COLUMNS * VISION_GRID_ROWS;
    const output = new Array(length);
    for (let index = 0; index < length; index += 1) {
      output[index] = Math.max(0, Math.min(15, Math.round(Number(values?.[index] || 0))));
    }

    return output;
  }

  function visionSignature(values) {
    return (values || [])
      .map(value => Math.max(0, Math.min(15, Math.round(Number(value || 0)))).toString(16))
      .join("");
  }

  function createVisionSensorSnapshot(overrides = {}) {
    const quantized = normalizeVision9x9(overrides.quantized);
    const signature = overrides.signature || visionSignature(quantized).padEnd(VISION_GRID_COLUMNS * VISION_GRID_ROWS, "0").slice(0, VISION_GRID_COLUMNS * VISION_GRID_ROWS);
    const confidence = clamp01(Number(overrides.confidence ?? 0));
    return {
      active: Boolean(overrides.active),
      gridColumns: VISION_GRID_COLUMNS,
      gridRows: VISION_GRID_ROWS,
      quantized,
      signature,
      left: Number(overrides.left || 0),
      center: Number(overrides.center || 0),
      right: Number(overrides.right || 0),
      confidence: round2(confidence),
      eventDetected: Boolean(overrides.eventDetected ?? confidence >= 0.62),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createHealthSensorSnapshot(overrides = {}) {
    const hudReady = Boolean(overrides.hudReady ?? overrides.healthHudReady ?? true);
    const zeroScore = clamp01(Number(overrides.zeroScore ?? 0));
    const faceDeathScore = clamp01(Number(overrides.faceDeathScore ?? 0));
    const deathTintScore = clamp01(Number(overrides.deathTintScore ?? overrides.healthDeathTintScore ?? 0));
    const statusDeathTintScore = clamp01(Number(overrides.statusDeathTintScore ?? overrides.healthStatusDeathTintScore ?? 0));
    const faceDeathTintScore = clamp01(Number(overrides.faceDeathTintScore ?? overrides.healthFaceDeathTintScore ?? 0));
    const faceBloodScore = clamp01(Number(overrides.faceBloodScore ?? overrides.healthFaceBloodScore ?? 0));
    const faceBloodRatio = clamp01(Number(overrides.faceBloodRatio ?? overrides.healthFaceBloodRatio ?? 0));
    const faceRedScore = clamp01(Number(overrides.faceRedScore ?? overrides.healthFaceRedScore ?? faceBloodScore));
    const faceEyeWhiteScore = clamp01(Number(overrides.faceEyeWhiteScore ?? overrides.healthFaceEyeWhiteScore ?? 0));
    const faceEyeYellowScore = clamp01(Number(overrides.faceEyeYellowScore ?? overrides.healthFaceEyeYellowScore ?? 0));
    const faceEyeRedScore = clamp01(Number(overrides.faceEyeRedScore ?? overrides.healthFaceEyeRedScore ?? 0));
    const faceEdgeScore = clamp01(Number(overrides.faceEdgeScore ?? overrides.healthFaceEdgeScore ?? 0));
    const faceLumaScore = clamp01(Number(overrides.faceLumaScore ?? overrides.healthFaceLumaScore ?? 0));
    const faceRedSignature = normalizeFaceLifeSignature(overrides.faceRedSignature ?? overrides.healthFaceRedSignature);
    const faceEdgeSignature = normalizeFaceLifeSignature(overrides.faceEdgeSignature ?? overrides.healthFaceEdgeSignature);
    const faceEyeWhiteSignature = normalizeFaceLifeSignature(overrides.faceEyeWhiteSignature ?? overrides.healthFaceEyeWhiteSignature);
    const faceEyeYellowSignature = normalizeFaceLifeSignature(overrides.faceEyeYellowSignature ?? overrides.healthFaceEyeYellowSignature);
    const freezeScore = clamp01(Number(overrides.freezeScore ?? 0));
    const faceSignature = String(overrides.faceSignature ?? overrides.healthFaceSignature ?? "0000000000000000");
    const faceSignatureValid = resolveFaceSignatureValidity(overrides, faceSignature);
    const faceQuantizedFrameChange = Number(overrides.faceQuantizedFrameChange ?? 255);
    const facePoseDiversity = Math.max(0, Math.min(3, Math.floor(Number(overrides.facePoseDiversity ?? overrides.healthFacePoseDiversity ?? 0))));
    const faceFixedFrames = Math.max(0, Math.floor(Number(overrides.faceFixedFrames ?? overrides.healthFaceFixedFrames ?? overrides.faceNoHeartbeatFrames ?? overrides.healthFaceNoHeartbeatFrames ?? overrides.noHeartbeatFrames ?? 0)));
    const explicitFaceHeartbeatScore = overrides.faceHeartbeatScore ?? overrides.healthFaceHeartbeatScore;
    const faceHeartbeatScore = clamp01(Number(explicitFaceHeartbeatScore
      ?? (faceSignatureValid && Number.isFinite(faceQuantizedFrameChange) ? faceQuantizedFrameChange / 8 : 0)));
    const faceMotionHeartbeat = Number.isFinite(faceQuantizedFrameChange)
      && faceQuantizedFrameChange >= 1.0
      && faceQuantizedFrameChange <= 24;
    const rawFaceHeartbeatAlive = faceSignatureValid
      && faceMotionHeartbeat
      && faceHeartbeatScore >= 0.08;
    const faceNoHeartbeatFrames = Math.max(0, Math.floor(Number(overrides.faceNoHeartbeatFrames ?? overrides.healthFaceNoHeartbeatFrames ?? overrides.noHeartbeatFrames ?? faceFixedFrames)));
    const noHeartbeatDeathFrames = Math.max(1, Math.floor(Number(overrides.noHeartbeatDeathFrames ?? overrides.healthNoHeartbeatDeathFrames ?? 90)));
    const fixedFaceDeathFrames = Math.max(1, Math.floor(Number(overrides.fixedFaceDeathFrames ?? overrides.healthFixedFaceDeathFrames ?? noHeartbeatDeathFrames)));
    const faceBloodDeathFrames = Math.min(noHeartbeatDeathFrames, Math.max(8, Math.floor(Number(overrides.faceBloodDeathFrames ?? overrides.healthFaceBloodDeathFrames ?? 18))));
    const baseFaceLifeTemplate = resolveFaceLifeTemplate({
      faceLifePhase: overrides.faceLifePhase,
      healthFaceLifePhase: overrides.healthFaceLifePhase,
      faceLifeTemplatePhase: overrides.faceLifeTemplatePhase,
      healthFaceLifeTemplatePhase: overrides.healthFaceLifeTemplatePhase,
      faceLifeQuantizedPhase: overrides.faceLifeQuantizedPhase,
      healthFaceLifeQuantizedPhase: overrides.healthFaceLifeQuantizedPhase,
      faceLifeLevel: overrides.faceLifeLevel,
      healthFaceLifeLevel: overrides.healthFaceLifeLevel,
      faceLifeTemplateLevel: overrides.faceLifeTemplateLevel,
      healthFaceLifeTemplateLevel: overrides.healthFaceLifeTemplateLevel,
      faceLifeQuantizedLevel: overrides.faceLifeQuantizedLevel,
      healthFaceLifeQuantizedLevel: overrides.healthFaceLifeQuantizedLevel,
      faceTemplateConfidence: overrides.faceTemplateConfidence,
      healthFaceTemplateConfidence: overrides.healthFaceTemplateConfidence,
      faceLifeConfidence: overrides.faceLifeConfidence,
      healthFaceLifeConfidence: overrides.healthFaceLifeConfidence,
      faceLifeTemplateSignature: overrides.faceLifeTemplateSignature,
      healthFaceLifeTemplateSignature: overrides.healthFaceLifeTemplateSignature,
      faceSignature,
      faceSignatureValid,
      faceLifeTemplateAuthoritative: overrides.faceLifeTemplateAuthoritative,
      healthFaceLifeTemplateAuthoritative: overrides.healthFaceLifeTemplateAuthoritative,
      faceLifeTemporalFloorApplied: overrides.faceLifeTemporalFloorApplied,
      healthFaceLifeTemporalFloorApplied: overrides.healthFaceLifeTemporalFloorApplied,
      faceLifeTemporalFloorLevel: overrides.faceLifeTemporalFloorLevel,
      healthFaceLifeTemporalFloorLevel: overrides.healthFaceLifeTemporalFloorLevel,
      invulnerable: overrides.invulnerable,
      godMode: overrides.godMode,
      healthInvulnerable: overrides.healthInvulnerable,
      faceBloodScore,
      faceBloodRatio,
      faceDeathTintScore,
      faceHeartbeatAlive: overrides.faceHeartbeatAlive === true
        || overrides.healthFaceHeartbeatAlive === true
        || rawFaceHeartbeatAlive,
      faceNoHeartbeatFrames,
      estimatedPercent: overrides.estimatedPercent,
      value: overrides.value,
      health: overrides.health,
      faceEdgeSignature: overrides.faceEdgeSignature,
      healthFaceEdgeSignature: overrides.healthFaceEdgeSignature,
      faceRedSignature: overrides.faceRedSignature,
      healthFaceRedSignature: overrides.healthFaceRedSignature,
      faceEyeWhiteSignature: overrides.faceEyeWhiteSignature,
      healthFaceEyeWhiteSignature: overrides.healthFaceEyeWhiteSignature,
      faceEyeYellowSignature: overrides.faceEyeYellowSignature,
      healthFaceEyeYellowSignature: overrides.healthFaceEyeYellowSignature,
      faceRedScore: overrides.faceRedScore,
      healthFaceRedScore: overrides.healthFaceRedScore,
      faceEyeWhiteScore: overrides.faceEyeWhiteScore,
      healthFaceEyeWhiteScore: overrides.healthFaceEyeWhiteScore,
      faceEyeYellowScore: overrides.faceEyeYellowScore,
      healthFaceEyeYellowScore: overrides.healthFaceEyeYellowScore,
      faceEyeRedScore: overrides.faceEyeRedScore,
      healthFaceEyeRedScore: overrides.healthFaceEyeRedScore,
      faceEdgeScore: overrides.faceEdgeScore,
      healthFaceEdgeScore: overrides.healthFaceEdgeScore,
      faceLumaScore: overrides.faceLumaScore,
      healthFaceLumaScore: overrides.healthFaceLumaScore
    });
    const faceLifeQuantizedPhase = normalizeFaceLifePhase(
      overrides.faceLifeQuantizedPhase
        ?? overrides.healthFaceLifeQuantizedPhase
        ?? (String(baseFaceLifeTemplate.source || "").startsWith("quantized-") ? baseFaceLifeTemplate.phase : "unknown"),
      "unknown");
    const faceLifeQuantizedLevel = faceLifeQuantizedPhase !== "unknown"
      ? faceLifePhaseLevel(faceLifeQuantizedPhase)
      : 0;
    const explicitFaceHeartbeatAlive = overrides.faceHeartbeatAlive ?? overrides.healthFaceHeartbeatAlive;
    const explicitFaceHeartbeatOpacity = overrides.faceHeartbeatOpacity ?? overrides.healthFaceHeartbeatOpacity;
    const explicitFaceHeartbeatVisualOpacity = overrides.faceHeartbeatVisualOpacity
      ?? overrides.healthFaceHeartbeatVisualOpacity
      ?? explicitFaceHeartbeatOpacity;
    const faceHeartbeatCurrentPulse = Boolean(overrides.faceHeartbeatCurrentPulse ?? overrides.healthFaceHeartbeatCurrentPulse);
    const faceHeartbeatPulseAccepted = Boolean(overrides.faceHeartbeatPulseAccepted ?? overrides.healthFaceHeartbeatPulseAccepted);
    const faceHeartbeatPulseKind = String(overrides.faceHeartbeatPulseKind ?? overrides.healthFaceHeartbeatPulseKind ?? "none");
    const hasExplicitFaceHeartbeatAlive = explicitFaceHeartbeatAlive === true
      || explicitFaceHeartbeatAlive === false;
    const physiologicalAcceptedPulse = faceHeartbeatPulseAccepted
      && faceHeartbeatPulseKind !== "observed"
      && faceHeartbeatPulseKind !== "cooldown"
      && faceHeartbeatPulseKind !== "decay"
      && faceHeartbeatPulseKind !== "none";
    const trustedHeartbeatPulse = faceHeartbeatCurrentPulse
      || physiologicalAcceptedPulse;
    const faceHeartbeatAlive = (hasExplicitFaceHeartbeatAlive
      ? explicitFaceHeartbeatAlive === true
      : (rawFaceHeartbeatAlive || trustedHeartbeatPulse))
      && baseFaceLifeTemplate.phase !== "dead";
    const faceTemplateDeath = baseFaceLifeTemplate.authoritative
      && baseFaceLifeTemplate.phase === "dead"
      && baseFaceLifeTemplate.source !== "invulnerable-hint";
    const activeCells = Number(overrides.activeCells || 0);
    const activeColumns = Number(overrides.activeColumns || 0);
    const sampleColumns = Math.max(1, Number(overrides.sampleColumns || 8));
    const sampleCells = Math.max(1, Number(overrides.sampleCells || 24));
    const estimatedPercent = Math.max(0, Math.min(100, Math.round(Number(
      overrides.estimatedPercent
        ?? overrides.value
        ?? overrides.health
        ?? (Boolean(overrides.likelyDead) ? 0 : 100)))));
    const lowHealthThreshold = Math.max(1, Math.min(100, Math.round(Number(overrides.lowHealthThreshold ?? 50))));
    if (!hudReady) {
      return {
        active: Boolean(overrides.active),
        healthSensorEnabled: Boolean(overrides.healthSensorEnabled),
        faceVitalEnabled: Boolean(overrides.faceVitalEnabled ?? overrides.active),
        hudReady: false,
        signature: overrides.signature || "000000000000000000000000",
        faceSignature,
        faceSignatureValid,
        faceQuantizedFrameChange: round2(faceQuantizedFrameChange),
        facePoseDiversity,
        faceLifePattern: "unknown",
        faceLifePhase: "unknown",
        faceLifeLevel: 0,
        faceLifeTemplatePhase: "unknown",
        faceLifeTemplateLevel: 0,
        faceLifeQuantizedPhase,
        faceLifeQuantizedLevel,
        faceLifeTemplateConfidence: 0,
        faceLifeTemplateAuthoritative: false,
        faceLifeTemplateSource: "none",
        faceLifeTemplateSampleId: "none",
        faceLifeTemplateSampleAmbiguous: false,
        faceLifeTemporalRawLevel: 0,
        faceLifeTemporalFloorLevel: 0,
        faceLifeTemporalFloorApplied: false,
        faceLifeRecoveryFrames: 0,
        faceLifeRecoveryRequiredFrames: 0,
        faceHeartbeatOpacity: 0,
        healthFaceHeartbeatOpacity: 0,
        faceHeartbeatVisualOpacity: 0,
        healthFaceHeartbeatVisualOpacity: 0,
        faceFixedFrames,
        healthFaceFixedFrames: faceFixedFrames,
        faceHeartbeatScore: round2(faceHeartbeatScore),
        healthFaceHeartbeatScore: round2(faceHeartbeatScore),
        faceHeartbeatAlive,
        healthFaceHeartbeatAlive: faceHeartbeatAlive,
        faceNoHeartbeatFrames,
        healthFaceNoHeartbeatFrames: faceNoHeartbeatFrames,
        noHeartbeatDeath: false,
        healthNoHeartbeatDeath: false,
        healthFaceLifeNoHeartbeatDeath: false,
        lowLifeNoHeartbeatEvidence: false,
        noHeartbeatDeathFrames,
        healthNoHeartbeatDeathFrames: noHeartbeatDeathFrames,
        faceDeathScore: 0,
        deathTintScore: round2(deathTintScore),
        statusDeathTintScore: round2(statusDeathTintScore),
        faceDeathTintScore: round2(faceDeathTintScore),
        faceBloodScore: round2(faceBloodScore),
        faceBloodRatio: round2(faceBloodRatio),
        faceRedScore: round2(faceRedScore),
        faceEyeWhiteScore: round2(faceEyeWhiteScore),
        faceEyeYellowScore: round2(faceEyeYellowScore),
        faceEyeRedScore: round2(faceEyeRedScore),
        faceEdgeScore: round2(faceEdgeScore),
        faceLumaScore: round2(faceLumaScore),
        faceRedSignature,
        faceEdgeSignature,
        faceEyeWhiteSignature,
        faceEyeYellowSignature,
        freezeScore: 0,
        zeroScore: 0,
        activeColumns,
        activeCells,
        sampleColumns,
        sampleCells,
        estimatedPercent: 100,
        value: 100,
        health: 100,
        lowHealth: false,
        lowHealthThreshold,
        likelyDead: false,
        criticalBloodAlive: false,
        bloodDangerScore: 0,
        healthDangerReason: "none",
        confidence: 0,
        retryRequested: false,
        retryReason: "hud-not-ready",
        retryPipeline: "none",
        retryPriority: 0,
        source: overrides.source || "status-hud-not-ready",
        timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
      };
    }

    const sparseHealthDigits = activeCells > 0
      && activeCells <= Math.ceil(sampleCells * 0.32)
      && activeColumns <= Math.ceil(sampleColumns * 0.48);
    const severeHealthDigits = zeroScore >= 0.62 && activeCells <= Math.ceil(sampleCells * 0.38);
    const noHealthDigits = activeCells <= 1 && zeroScore <= 0.36;
    const tintDeath = noHealthDigits
      && deathTintScore >= 0.5
      && (statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.18
        || faceDeathScore >= 0.12
        || freezeScore >= 0.5);
    const faceBloodDeath = faceBloodScore >= 0.72
      && faceBloodRatio >= 0.28
      && !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= faceBloodDeathFrames
      && freezeScore >= 0.5
      && (statusDeathTintScore >= 0.42
        || deathTintScore >= 0.48
        || faceDeathTintScore >= 0.44
        || faceDeathScore >= 0.24);
    const noHeartbeatDeath = !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= noHeartbeatDeathFrames
      && freezeScore >= 0.5
      && (faceDeathScore >= 0.16
        || deathTintScore >= 0.42
        || statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.22
        || zeroScore >= 0.52
        || faceBloodScore >= 0.30);
    const faceLifeNoHeartbeatDeath = !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= Math.max(18, Math.floor(noHeartbeatDeathFrames * 0.55))
      && freezeScore >= 0.5
      && (baseFaceLifeTemplate.phase === "dead"
        || (baseFaceLifeTemplate.phase === "moribund" && baseFaceLifeTemplate.confidence >= 0.68)
        || (baseFaceLifeTemplate.phase === "critical"
          && baseFaceLifeTemplate.confidence >= 0.82
          && faceNoHeartbeatFrames >= noHeartbeatDeathFrames));
    const fixedFaceDeath = faceSignatureValid
      && !faceHeartbeatAlive
      && facePoseDiversity <= 1
      && faceFixedFrames >= fixedFaceDeathFrames
      && faceNoHeartbeatFrames >= Math.floor(fixedFaceDeathFrames * 0.5)
      && freezeScore >= 0.5
      && (
        zeroScore >= 0.36
        || faceDeathScore >= 0.10
        || faceDeathTintScore >= 0.08
        || faceBloodScore >= 0.12
        || faceBloodRatio >= 0.06
        || baseFaceLifeTemplate.phase === "dead"
        || (baseFaceLifeTemplate.level <= 1 && baseFaceLifeTemplate.confidence >= 0.64)
        || faceNoHeartbeatFrames >= Math.max(fixedFaceDeathFrames, noHeartbeatDeathFrames)
      );
    const confidence = clamp01(Number(overrides.confidence ?? Math.max(zeroScore, faceDeathScore, faceBloodScore, deathTintScore * 0.78, freezeScore * 0.55)));
    const likelyDead = Boolean(overrides.likelyDead)
      || (sparseHealthDigits && zeroScore >= 0.44 && faceDeathScore >= 0.24)
      || (severeHealthDigits && faceDeathScore >= 0.22)
      || (sparseHealthDigits && zeroScore >= 0.52 && faceDeathScore >= 0.14 && freezeScore >= 0.75)
      || faceTemplateDeath
      || faceBloodDeath
      || noHeartbeatDeath
      || faceLifeNoHeartbeatDeath
      || fixedFaceDeath
      || tintDeath;
    const faceLifeTemplate = baseFaceLifeTemplate.phase === "unknown" && likelyDead
      ? resolveFaceLifeTemplate({
        likelyDead,
        faceTemplateConfidence: Math.max(0.72, baseFaceLifeTemplate.confidence),
        faceBloodScore,
        faceBloodRatio,
        faceDeathTintScore
      })
      : baseFaceLifeTemplate;
    const faceLifePattern = normalizeFaceLifePattern(overrides.faceLifePattern ?? overrides.healthFaceLifePattern,
      likelyDead
        ? "dead-fixed"
        : (faceHeartbeatAlive && faceBloodScore >= 0.58
          ? "alive-damaged"
          : (faceHeartbeatAlive || facePoseDiversity >= 2
            ? "alive-cycle"
            : (faceSignatureValid ? (faceFixedFrames > 0 ? "fixed" : "single") : "unknown"))));
    const explicitRetryReason = String(overrides.retryReason || "").toLowerCase() === "none"
      ? ""
      : String(overrides.retryReason || "");
    const retryReason = explicitRetryReason || (likelyDead ? (tintDeath ? "health-red-tint-death" : (faceTemplateDeath ? "health-face-template-death" : (faceBloodDeath ? "health-face-blood-death" : (noHeartbeatDeath || faceLifeNoHeartbeatDeath ? "health-no-heartbeat-death" : (fixedFaceDeath ? "health-fixed-face-death" : "health-death"))))) : "none");
    const hasFaceLifeEvidence = likelyDead
      || faceHeartbeatAlive
      || faceSignatureValid
      || faceLifeTemplate.authoritative
      || Boolean(overrides.invulnerable ?? overrides.godMode ?? overrides.healthInvulnerable);
    const numericHealthReliable = hasFaceLifeEvidence
      || (activeCells > 0
        && activeCells < Math.ceil(sampleCells * 0.90)
        && activeColumns < Math.ceil(sampleColumns * 0.90));
    const stablePercent = (tintDeath || faceTemplateDeath || faceBloodDeath || noHeartbeatDeath || faceLifeNoHeartbeatDeath || fixedFaceDeath)
      ? 0
      : (faceLifeTemplate.authoritative
        ? faceLifeTemplate.percent
        : (numericHealthReliable && estimatedPercent > 0 ? estimatedPercent : 100));
    const bloodDangerScore = clamp01(Math.max(faceBloodScore * 0.75, faceBloodRatio * 1.1, faceDeathTintScore * 0.5));
    const criticalBloodAlive = !likelyDead
      && stablePercent > 0
      && faceHeartbeatAlive
      && faceBloodScore >= 0.68
      && faceBloodRatio >= 0.24;
    const templateCriticalAlive = !likelyDead
      && faceLifeTemplate.authoritative
      && faceLifeTemplate.percent > 0
      && faceLifeTemplate.percent < lowHealthThreshold;
    const numericLowHealth = numericHealthReliable
      && stablePercent > 0
      && stablePercent < lowHealthThreshold;
    const healthDangerReason = criticalBloodAlive
      ? "face-heartbeat-blood"
      : (templateCriticalAlive
        ? (faceLifeTemplate.level <= 2 ? "face-template-critical" : "face-template-low")
        : (numericLowHealth ? "low-health" : "none"));
    const faceLifeFallbackPhase = hasFaceLifeEvidence
      ? estimateFaceLifePhase({
        likelyDead,
        invulnerable: overrides.invulnerable ?? overrides.godMode ?? overrides.healthInvulnerable,
        health: stablePercent,
        faceBloodScore,
        faceBloodRatio,
        bloodDangerScore
      })
      : "unknown";
    const trustedFaceLifeFallbackPhase = hasFaceLifeEvidence
      && !likelyDead
      && !criticalBloodAlive
      && !templateCriticalAlive
      && !numericLowHealth
      && stablePercent >= lowHealthThreshold
      ? "healthy"
      : faceLifeFallbackPhase;
    const temporalFaceLifePhase = normalizeFaceLifePhase(
      overrides.faceLifePhase ?? overrides.healthFaceLifePhase,
      "unknown");
    const trustedTemporalFaceLifePhase = faceLifePhaseLevel(temporalFaceLifePhase) >= 5
      && !hasFaceLifeEvidence
      ? "unknown"
      : temporalFaceLifePhase;
    const faceLifePhase = normalizeFaceLifePhase(
      faceLifeTemplate.authoritative
        ? faceLifeTemplate.phase
        : (trustedTemporalFaceLifePhase !== "unknown" ? trustedTemporalFaceLifePhase : null),
      trustedFaceLifeFallbackPhase);
    const faceLifeLevel = faceLifePhaseLevel(faceLifePhase);
    const explicitFaceHeartbeatOpacityNumber = Number(explicitFaceHeartbeatOpacity);
    const faceHeartbeatOpacity = Number.isFinite(explicitFaceHeartbeatOpacityNumber)
      ? clamp01(explicitFaceHeartbeatOpacityNumber)
      : estimateFaceHeartbeatOpacity({
        faceLifePhase,
        likelyDead,
        faceHeartbeatAlive,
        faceNoHeartbeatFrames,
        noHeartbeatDeathFrames
      });
    const explicitFaceHeartbeatVisualOpacityNumber = Number(explicitFaceHeartbeatVisualOpacity);
    const faceHeartbeatVisualOpacity = Number.isFinite(explicitFaceHeartbeatVisualOpacityNumber)
      ? clamp01(explicitFaceHeartbeatVisualOpacityNumber)
      : faceHeartbeatOpacity;
    const retryRequested = Boolean(overrides.retryRequested ?? (Boolean(overrides.active) && (likelyDead || (zeroScore >= 0.78 && !faceHeartbeatAlive))));
    return {
      active: Boolean(overrides.active),
      healthSensorEnabled: Boolean(overrides.healthSensorEnabled),
      faceVitalEnabled: Boolean(overrides.faceVitalEnabled ?? overrides.active),
      hudReady: true,
      signature: overrides.signature || "000000000000000000000000",
      faceSignature,
      faceSignatureValid,
      faceQuantizedFrameChange: round2(faceQuantizedFrameChange),
      facePoseDiversity,
      faceLifePattern,
      faceLifePhase,
      faceLifeLevel,
      faceLifeTemplatePhase: faceLifeTemplate.phase,
      faceLifeTemplateLevel: faceLifeTemplate.level,
      faceLifeQuantizedPhase,
      faceLifeQuantizedLevel,
      faceLifeTemplateConfidence: faceLifeTemplate.confidence,
      healthFaceTemplateConfidence: faceLifeTemplate.confidence,
      faceLifeTemplateAuthoritative: faceLifeTemplate.authoritative,
      faceLifeTemplateSource: faceLifeTemplate.source,
      faceLifeTemplateSampleId: faceLifeTemplate.sampleId || "none",
      faceLifeTemplateSampleAmbiguous: Boolean(faceLifeTemplate.sampleAmbiguous),
      faceLifeTemporalRawLevel: Math.max(0, Math.min(5, Math.round(Number(overrides.faceLifeTemporalRawLevel ?? faceLifeLevel) || 0))),
      faceLifeTemporalFloorLevel: Math.max(0, Math.min(5, Math.round(Number(overrides.faceLifeTemporalFloorLevel ?? faceLifeLevel) || 0))),
      faceLifeTemporalFloorApplied: Boolean(overrides.faceLifeTemporalFloorApplied),
      faceLifeRecoveryFrames: Math.max(0, Math.floor(Number(overrides.faceLifeRecoveryFrames ?? 0) || 0)),
      faceLifeRecoveryRequiredFrames: Math.max(0, Math.floor(Number(overrides.faceLifeRecoveryRequiredFrames ?? 0) || 0)),
      faceHeartbeatOpacity: round2(faceHeartbeatOpacity),
      healthFaceHeartbeatOpacity: round2(faceHeartbeatOpacity),
      faceHeartbeatVisualOpacity: round2(faceHeartbeatVisualOpacity),
      healthFaceHeartbeatVisualOpacity: round2(faceHeartbeatVisualOpacity),
      faceFixedFrames,
      healthFaceFixedFrames: faceFixedFrames,
      faceHeartbeatScore: round2(faceHeartbeatScore),
      healthFaceHeartbeatScore: round2(faceHeartbeatScore),
      faceHeartbeatAlive,
      healthFaceHeartbeatAlive: faceHeartbeatAlive,
      faceHeartbeatCurrentPulse,
      healthFaceHeartbeatCurrentPulse: faceHeartbeatCurrentPulse,
      faceHeartbeatPulseAccepted,
      healthFaceHeartbeatPulseAccepted: faceHeartbeatPulseAccepted,
      faceHeartbeatPulseKind,
      healthFaceHeartbeatPulseKind: faceHeartbeatPulseKind,
      faceNoHeartbeatFrames,
      healthFaceNoHeartbeatFrames: faceNoHeartbeatFrames,
      noHeartbeatDeath,
      healthNoHeartbeatDeath: noHeartbeatDeath,
      faceLifeNoHeartbeatDeath,
      healthFaceLifeNoHeartbeatDeath: faceLifeNoHeartbeatDeath,
      lowLifeNoHeartbeatEvidence: Boolean(overrides.lowLifeNoHeartbeatEvidence),
      noHeartbeatDeathFrames,
      healthNoHeartbeatDeathFrames: noHeartbeatDeathFrames,
      fixedFaceDeath,
      healthFixedFaceDeath: fixedFaceDeath,
      fixedFaceDeathFrames,
      healthFixedFaceDeathFrames: fixedFaceDeathFrames,
      faceBloodDeathFrames,
      healthFaceBloodDeathFrames: faceBloodDeathFrames,
      faceDeathScore: round2(faceDeathScore),
      deathTintScore: round2(deathTintScore),
      statusDeathTintScore: round2(statusDeathTintScore),
      faceDeathTintScore: round2(faceDeathTintScore),
      faceBloodScore: round2(faceBloodScore),
      faceBloodRatio: round2(faceBloodRatio),
      faceRedScore: round2(faceRedScore),
      faceEyeWhiteScore: round2(faceEyeWhiteScore),
      faceEyeYellowScore: round2(faceEyeYellowScore),
      faceEyeRedScore: round2(faceEyeRedScore),
      faceEdgeScore: round2(faceEdgeScore),
      faceLumaScore: round2(faceLumaScore),
      faceRedSignature,
      faceEdgeSignature,
      faceEyeWhiteSignature,
      faceEyeYellowSignature,
      freezeScore: round2(freezeScore),
      zeroScore: round2(zeroScore),
      activeColumns,
      activeCells,
      sampleColumns,
      sampleCells,
      estimatedPercent: stablePercent,
      value: stablePercent,
      health: stablePercent,
      lowHealth: criticalBloodAlive || templateCriticalAlive || numericLowHealth,
      lowHealthThreshold,
      likelyDead,
      criticalBloodAlive,
      bloodDangerScore: round2(bloodDangerScore),
      healthDangerReason,
      confidence: round2(confidence),
      retryRequested,
      retryReason,
      retryPipeline: retryRequested ? "Retry" : "none",
      retryPriority: retryRequested ? Number(overrides.retryPriority ?? 100) : 0,
      source: overrides.source || "status-health-face-quantized",
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createDisabledHealthState(signature) {
    return {
      signature: signature || "000000000000000000000000",
      likelyDead: false,
      zeroScore: 0,
      activeColumns: 0,
      activeCells: 0,
      estimatedPercent: 100,
      value: 100,
      health: 100,
      hudReady: false,
      lowHealth: false,
      lowHealthThreshold: 50,
      faceDeathScore: 0,
      faceBloodScore: 0,
      faceBloodRatio: 0,
      facePoseDiversity: 0,
      faceLifePattern: "unknown",
      faceLifePhase: "unknown",
      faceLifeLevel: 0,
      faceLifeTemplatePhase: "unknown",
      faceLifeTemplateLevel: 0,
      faceLifeTemplateConfidence: 0,
      faceLifeTemplateAuthoritative: false,
      faceLifeTemplateSource: "none",
      faceLifeTemplateSampleId: "none",
      faceLifeTemplateSampleAmbiguous: false,
      faceHeartbeatOpacity: 0,
      healthFaceHeartbeatOpacity: 0,
      faceFixedFrames: 0,
      healthFaceFixedFrames: 0,
      faceHeartbeatScore: 0,
      healthFaceHeartbeatScore: 0,
      faceHeartbeatAlive: false,
      healthFaceHeartbeatAlive: false,
      faceNoHeartbeatFrames: 0,
      healthFaceNoHeartbeatFrames: 0,
      noHeartbeatDeath: false,
      healthNoHeartbeatDeath: false,
      healthFaceLifeNoHeartbeatDeath: false,
      noHeartbeatDeathFrames: 90,
      healthNoHeartbeatDeathFrames: 90,
      criticalBloodAlive: false,
      bloodDangerScore: 0,
      healthDangerReason: "none",
      freezeScore: 0,
      retryReason: "sensor-cutoff"
    };
  }

  function estimateFaceDeathScore(quantizedFace) {
    if (!Array.isArray(quantizedFace) || quantizedFace.length === 0) {
      return 0;
    }

    let danger = 0;
    let critical = 0;
    const length = quantizedFace.length;
    for (let index = 0; index < length; index += 1) {
      const value = Number(quantizedFace[index] || 0);
      if (value >= 5) {
        danger += 1;
      }

      if (value >= 7) {
        critical += 1;
      }
    }

    return clamp01((danger / length) * 2.4 + (critical / length) * 1.2);
  }

  function refineHealthState(healthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta) {
    if (healthState?.hudReady === false || healthState?.healthHudReady === false) {
      return Object.assign({}, healthState || {}, {
        hudReady: false,
        likelyDead: false,
        retryRequested: false,
        retryReason: "hud-not-ready",
        estimatedPercent: 100,
        value: 100,
        health: 100,
        lowHealth: false
      });
    }

    const zeroScore = clamp01(Number(healthState?.zeroScore || 0));
    const faceScore = clamp01(Number(faceDeathScore || 0));
    const deathTintScore = clamp01(Number(healthState?.deathTintScore ?? healthState?.healthDeathTintScore ?? 0));
    const statusDeathTintScore = clamp01(Number(healthState?.statusDeathTintScore ?? healthState?.healthStatusDeathTintScore ?? 0));
    const faceDeathTintScore = clamp01(Number(healthState?.faceDeathTintScore ?? healthState?.healthFaceDeathTintScore ?? 0));
    const faceBloodScore = clamp01(Number(healthState?.faceBloodScore ?? healthState?.healthFaceBloodScore ?? 0));
    const faceBloodRatio = clamp01(Number(healthState?.faceBloodRatio ?? healthState?.healthFaceBloodRatio ?? 0));
    const activeCells = Number(healthState?.activeCells || 0);
    const activeColumns = Number(healthState?.activeColumns || 0);
    const sampleColumns = Math.max(1, Number(healthState?.sampleColumns || 8));
    const sampleCells = Math.max(1, Number(healthState?.sampleCells || 24));
    const faceSignature = String(healthState?.faceSignature ?? healthState?.healthFaceSignature ?? "0000000000000000");
    const faceSignatureValid = resolveFaceSignatureValidity(healthState, faceSignature);
    const faceChange = Number(faceQuantizedFrameChange ?? healthState?.faceQuantizedFrameChange ?? 255);
    const facePoseDiversity = Math.max(0, Math.min(3, Math.floor(Number(healthState?.facePoseDiversity ?? healthState?.healthFacePoseDiversity ?? 0))));
    const faceFixedFrames = Math.max(0, Math.floor(Number(healthState?.faceFixedFrames ?? healthState?.healthFaceFixedFrames ?? healthState?.faceNoHeartbeatFrames ?? healthState?.healthFaceNoHeartbeatFrames ?? healthState?.noHeartbeatFrames ?? 0)));
    const explicitFaceHeartbeatScore = healthState?.faceHeartbeatScore ?? healthState?.healthFaceHeartbeatScore;
    const faceHeartbeatScore = clamp01(Number(explicitFaceHeartbeatScore ?? (faceSignatureValid && Number.isFinite(faceChange) ? faceChange / 8 : 0)));
    const faceMotionHeartbeat = Number.isFinite(faceChange)
      && faceChange >= 1.0
      && faceChange <= 24;
    const rawFaceHeartbeatAlive = faceSignatureValid
      && faceMotionHeartbeat
      && faceHeartbeatScore >= 0.08;
    const explicitFaceHeartbeatAlive = healthState?.faceHeartbeatAlive
      ?? healthState?.healthFaceHeartbeatAlive;
    const hasExplicitFaceHeartbeatAlive = explicitFaceHeartbeatAlive === true
      || explicitFaceHeartbeatAlive === false;
    const faceHeartbeatPulseKind = String(
      healthState?.faceHeartbeatPulseKind
        ?? healthState?.healthFaceHeartbeatPulseKind
        ?? "none").toLowerCase();
    const faceHeartbeatCurrentPulse = healthState?.faceHeartbeatCurrentPulse === true
      || healthState?.healthFaceHeartbeatCurrentPulse === true;
    const faceHeartbeatPulseAccepted = healthState?.faceHeartbeatPulseAccepted === true
      || healthState?.healthFaceHeartbeatPulseAccepted === true;
    const physiologicalAcceptedPulse = faceHeartbeatPulseAccepted
      && faceHeartbeatPulseKind !== "observed"
      && faceHeartbeatPulseKind !== "cooldown"
      && faceHeartbeatPulseKind !== "decay"
      && faceHeartbeatPulseKind !== "none";
    const trustedHeartbeatPulse = faceHeartbeatCurrentPulse
      || physiologicalAcceptedPulse;
    const resolvedFaceHeartbeatAlive = hasExplicitFaceHeartbeatAlive
      ? explicitFaceHeartbeatAlive === true
      : (rawFaceHeartbeatAlive || trustedHeartbeatPulse);
    const faceNoHeartbeatFrames = Math.max(0, Math.floor(Number(healthState?.faceNoHeartbeatFrames ?? healthState?.healthFaceNoHeartbeatFrames ?? healthState?.noHeartbeatFrames ?? faceFixedFrames)));
    const noHeartbeatDeathFrames = Math.max(1, Math.floor(Number(healthState?.noHeartbeatDeathFrames ?? healthState?.healthNoHeartbeatDeathFrames ?? 90)));
    const faceBloodDeathFrames = Math.min(noHeartbeatDeathFrames, Math.max(8, Math.floor(Number(healthState?.faceBloodDeathFrames ?? healthState?.healthFaceBloodDeathFrames ?? 18))));
    const baseFaceLifeTemplate = resolveFaceLifeTemplate({
      faceLifePhase: healthState?.faceLifePhase,
      healthFaceLifePhase: healthState?.healthFaceLifePhase,
      faceLifeTemplatePhase: healthState?.faceLifeTemplatePhase,
      healthFaceLifeTemplatePhase: healthState?.healthFaceLifeTemplatePhase,
      faceLifeQuantizedPhase: healthState?.faceLifeQuantizedPhase,
      healthFaceLifeQuantizedPhase: healthState?.healthFaceLifeQuantizedPhase,
      faceLifeLevel: healthState?.faceLifeLevel,
      healthFaceLifeLevel: healthState?.healthFaceLifeLevel,
      faceLifeTemplateLevel: healthState?.faceLifeTemplateLevel,
      healthFaceLifeTemplateLevel: healthState?.healthFaceLifeTemplateLevel,
      faceLifeQuantizedLevel: healthState?.faceLifeQuantizedLevel,
      healthFaceLifeQuantizedLevel: healthState?.healthFaceLifeQuantizedLevel,
      faceTemplateConfidence: healthState?.faceTemplateConfidence,
      healthFaceTemplateConfidence: healthState?.healthFaceTemplateConfidence,
      faceLifeConfidence: healthState?.faceLifeConfidence,
      healthFaceLifeConfidence: healthState?.healthFaceLifeConfidence,
      faceLifeTemplateSignature: healthState?.faceLifeTemplateSignature,
      healthFaceLifeTemplateSignature: healthState?.healthFaceLifeTemplateSignature,
      faceSignature,
      faceSignatureValid,
      faceLifeTemplateAuthoritative: healthState?.faceLifeTemplateAuthoritative,
      healthFaceLifeTemplateAuthoritative: healthState?.healthFaceLifeTemplateAuthoritative,
      faceLifeTemporalFloorApplied: healthState?.faceLifeTemporalFloorApplied,
      healthFaceLifeTemporalFloorApplied: healthState?.healthFaceLifeTemporalFloorApplied,
      faceLifeTemporalFloorLevel: healthState?.faceLifeTemporalFloorLevel,
      healthFaceLifeTemporalFloorLevel: healthState?.healthFaceLifeTemporalFloorLevel,
      invulnerable: healthState?.invulnerable,
      godMode: healthState?.godMode,
      healthInvulnerable: healthState?.healthInvulnerable,
      faceBloodScore,
      faceBloodRatio,
      faceDeathTintScore,
      faceHeartbeatAlive: resolvedFaceHeartbeatAlive,
      faceNoHeartbeatFrames,
      estimatedPercent: healthState?.estimatedPercent,
      value: healthState?.value,
      health: healthState?.health,
      faceEdgeSignature: healthState?.faceEdgeSignature,
      healthFaceEdgeSignature: healthState?.healthFaceEdgeSignature,
      faceRedSignature: healthState?.faceRedSignature,
      healthFaceRedSignature: healthState?.healthFaceRedSignature,
      faceEyeWhiteSignature: healthState?.faceEyeWhiteSignature,
      healthFaceEyeWhiteSignature: healthState?.healthFaceEyeWhiteSignature,
      faceEyeYellowSignature: healthState?.faceEyeYellowSignature,
      healthFaceEyeYellowSignature: healthState?.healthFaceEyeYellowSignature,
      faceRedScore: healthState?.faceRedScore,
      healthFaceRedScore: healthState?.healthFaceRedScore,
      faceEyeWhiteScore: healthState?.faceEyeWhiteScore,
      healthFaceEyeWhiteScore: healthState?.healthFaceEyeWhiteScore,
      faceEyeYellowScore: healthState?.faceEyeYellowScore,
      healthFaceEyeYellowScore: healthState?.healthFaceEyeYellowScore,
      faceEyeRedScore: healthState?.faceEyeRedScore,
      healthFaceEyeRedScore: healthState?.healthFaceEyeRedScore,
      faceEdgeScore: healthState?.faceEdgeScore,
      healthFaceEdgeScore: healthState?.healthFaceEdgeScore,
      faceLumaScore: healthState?.faceLumaScore,
      healthFaceLumaScore: healthState?.healthFaceLumaScore
    });
    const faceLifeQuantizedPhase = normalizeFaceLifePhase(
      healthState?.faceLifeQuantizedPhase
        ?? healthState?.healthFaceLifeQuantizedPhase
        ?? (String(baseFaceLifeTemplate.source || "").startsWith("quantized-") ? baseFaceLifeTemplate.phase : "unknown"),
      "unknown");
    const faceLifeQuantizedLevel = faceLifeQuantizedPhase !== "unknown"
      ? faceLifePhaseLevel(faceLifeQuantizedPhase)
      : 0;
    const faceHeartbeatAlive = resolvedFaceHeartbeatAlive
      && baseFaceLifeTemplate.phase !== "dead";
    const faceTemplateDeath = baseFaceLifeTemplate.authoritative
      && baseFaceLifeTemplate.phase === "dead"
      && baseFaceLifeTemplate.source !== "invulnerable-hint";
    const faceStable = !faceHeartbeatAlive
      && (!faceSignatureValid || faceChange <= 2.4 || facePoseDiversity <= 1);
    const visualStable = Number(visualStallDelta ?? 255) <= 0.08;
    const freezeScore = clamp01((faceStable ? 0.5 : 0) + (visualStable ? 0.5 : 0));
    const sparseHealthDigits = activeCells > 0
      && activeCells <= Math.ceil(sampleCells * 0.32)
      && activeColumns <= Math.ceil(sampleColumns * 0.48);
    const severeHealthDigits = zeroScore >= 0.62 && activeCells <= Math.ceil(sampleCells * 0.38);
    const faceDeath = (sparseHealthDigits && zeroScore >= 0.44 && faceScore >= 0.24)
      || (severeHealthDigits && faceScore >= 0.22);
    const frozenDeath = sparseHealthDigits && zeroScore >= 0.52 && faceScore >= 0.14 && freezeScore >= 0.75;
    const noHealthDigits = activeCells <= 1 && zeroScore <= 0.36;
    const tintDeath = noHealthDigits
      && deathTintScore >= 0.5
      && (statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.18
        || faceScore >= 0.12
        || freezeScore >= 0.5);
    const faceBloodDeath = faceBloodScore >= 0.72
      && faceBloodRatio >= 0.28
      && !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= faceBloodDeathFrames
      && freezeScore >= 0.5
      && (statusDeathTintScore >= 0.42
        || deathTintScore >= 0.48
        || faceDeathTintScore >= 0.44
        || faceScore >= 0.24);
    const noHeartbeatDeath = !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= noHeartbeatDeathFrames
      && freezeScore >= 0.5
      && (faceScore >= 0.16
        || deathTintScore >= 0.42
        || statusDeathTintScore >= 0.36
        || faceDeathTintScore >= 0.22
        || zeroScore >= 0.52
        || faceBloodScore >= 0.30);
    const faceLifeNoHeartbeatDeath = !faceHeartbeatAlive
      && faceNoHeartbeatFrames >= Math.max(18, Math.floor(noHeartbeatDeathFrames * 0.55))
      && freezeScore >= 0.5
      && (baseFaceLifeTemplate.phase === "dead"
        || (baseFaceLifeTemplate.phase === "moribund" && baseFaceLifeTemplate.confidence >= 0.68)
        || (baseFaceLifeTemplate.phase === "critical"
          && baseFaceLifeTemplate.confidence >= 0.82
          && faceNoHeartbeatFrames >= noHeartbeatDeathFrames));
    const fixedFaceDeathFrames = Math.max(1, Math.floor(Number(healthState?.fixedFaceDeathFrames ?? healthState?.healthFixedFaceDeathFrames ?? noHeartbeatDeathFrames)));
    const fixedFaceDeath = faceSignatureValid
      && !faceHeartbeatAlive
      && facePoseDiversity <= 1
      && faceFixedFrames >= fixedFaceDeathFrames
      && faceNoHeartbeatFrames >= Math.floor(fixedFaceDeathFrames * 0.5)
      && freezeScore >= 0.5
      && (
        zeroScore >= 0.36
        || faceScore >= 0.10
        || faceDeathTintScore >= 0.08
        || faceBloodScore >= 0.12
        || faceBloodRatio >= 0.06
        || baseFaceLifeTemplate.phase === "dead"
        || (baseFaceLifeTemplate.level <= 1 && baseFaceLifeTemplate.confidence >= 0.64)
        || faceNoHeartbeatFrames >= Math.max(fixedFaceDeathFrames, noHeartbeatDeathFrames)
      );
    const likelyDead = Boolean(healthState?.likelyDead) || faceDeath || frozenDeath || tintDeath || faceTemplateDeath || faceBloodDeath || noHeartbeatDeath || faceLifeNoHeartbeatDeath || fixedFaceDeath;
    const faceLifeTemplate = baseFaceLifeTemplate.phase === "unknown" && likelyDead
      ? resolveFaceLifeTemplate({
        likelyDead,
        faceTemplateConfidence: Math.max(0.72, baseFaceLifeTemplate.confidence),
        faceBloodScore,
        faceBloodRatio,
        faceDeathTintScore
      })
      : baseFaceLifeTemplate;
    const faceLifePattern = normalizeFaceLifePattern(healthState?.faceLifePattern ?? healthState?.healthFaceLifePattern,
      likelyDead
        ? "dead-fixed"
        : (faceHeartbeatAlive && faceBloodScore >= 0.58
          ? "alive-damaged"
          : (faceHeartbeatAlive || facePoseDiversity >= 2
            ? "alive-cycle"
            : (faceSignatureValid ? (faceFixedFrames > 0 ? "fixed" : "single") : "unknown"))));
    const collapseToZero = tintDeath || faceTemplateDeath || faceBloodDeath || noHeartbeatDeath || faceLifeNoHeartbeatDeath || fixedFaceDeath;
    const rawHealth = Number(healthState?.health ?? healthState?.value ?? healthState?.estimatedPercent ?? 100);
    const hasFaceLifeEvidence = likelyDead
      || faceHeartbeatAlive
      || faceSignatureValid
      || faceLifeTemplate.authoritative
      || Boolean(healthState?.invulnerable ?? healthState?.godMode ?? healthState?.healthInvulnerable);
    const numericHealthReliable = hasFaceLifeEvidence
      || (activeCells > 0
        && activeCells < Math.ceil(sampleCells * 0.90)
        && activeColumns < Math.ceil(sampleColumns * 0.90));
    const nextHealth = collapseToZero
      ? 0
      : (faceLifeTemplate.authoritative
        ? faceLifeTemplate.percent
        : (numericHealthReliable && rawHealth > 0 ? rawHealth : 100));
    const bloodDangerScore = clamp01(Math.max(faceBloodScore * 0.75, faceBloodRatio * 1.1, faceDeathTintScore * 0.5));
    const criticalBloodAlive = !likelyDead
      && nextHealth > 0
      && faceHeartbeatAlive
      && faceBloodScore >= 0.68
      && faceBloodRatio >= 0.24;
    const templateCriticalAlive = !likelyDead
      && faceLifeTemplate.authoritative
      && faceLifeTemplate.percent > 0
      && faceLifeTemplate.percent < Number(healthState?.lowHealthThreshold ?? 50);
    const lowHealthThreshold = Number(healthState?.lowHealthThreshold ?? 50);
    const numericLowHealth = numericHealthReliable
      && nextHealth > 0
      && (healthState?.lowHealth || nextHealth < lowHealthThreshold);
    const healthDangerReason = criticalBloodAlive
      ? "face-heartbeat-blood"
      : (templateCriticalAlive
        ? (faceLifeTemplate.level <= 2 ? "face-template-critical" : "face-template-low")
        : (numericLowHealth ? "low-health" : "none"));
    const faceLifeFallbackPhase = hasFaceLifeEvidence
      ? estimateFaceLifePhase({
        likelyDead,
        invulnerable: healthState?.invulnerable ?? healthState?.godMode ?? healthState?.healthInvulnerable,
        health: nextHealth,
        faceBloodScore,
        faceBloodRatio,
        bloodDangerScore
      })
      : "unknown";
    const trustedFaceLifeFallbackPhase = hasFaceLifeEvidence
      && !likelyDead
      && !criticalBloodAlive
      && !templateCriticalAlive
      && !numericLowHealth
      && nextHealth >= lowHealthThreshold
      ? "healthy"
      : faceLifeFallbackPhase;
    const temporalFaceLifePhase = normalizeFaceLifePhase(
      healthState?.faceLifePhase ?? healthState?.healthFaceLifePhase,
      "unknown");
    const trustedTemporalFaceLifePhase = faceLifePhaseLevel(temporalFaceLifePhase) >= 5
      && !hasFaceLifeEvidence
      ? "unknown"
      : temporalFaceLifePhase;
    const faceLifePhase = normalizeFaceLifePhase(
      faceLifeTemplate.authoritative
        ? faceLifeTemplate.phase
        : (trustedTemporalFaceLifePhase !== "unknown" ? trustedTemporalFaceLifePhase : null),
      trustedFaceLifeFallbackPhase);
    const faceLifeLevel = faceLifePhaseLevel(faceLifePhase);
    const faceHeartbeatOpacity = estimateFaceHeartbeatOpacity({
      faceLifePhase,
      likelyDead,
      faceHeartbeatAlive,
      faceNoHeartbeatFrames,
      noHeartbeatDeathFrames
    });
    return Object.assign({}, healthState || {}, {
      likelyDead,
      faceDeathScore: faceScore,
      deathTintScore: round2(deathTintScore),
      statusDeathTintScore: round2(statusDeathTintScore),
      faceDeathTintScore: round2(faceDeathTintScore),
      faceBloodScore: round2(faceBloodScore),
      faceBloodRatio: round2(faceBloodRatio),
      faceSignature,
      faceSignatureValid,
      facePoseDiversity,
      faceLifePattern,
      faceLifePhase,
      faceLifeLevel,
      faceLifeTemplatePhase: faceLifeTemplate.phase,
      faceLifeTemplateLevel: faceLifeTemplate.level,
      faceLifeQuantizedPhase,
      faceLifeQuantizedLevel,
      faceLifeTemplateConfidence: faceLifeTemplate.confidence,
      faceLifeTemplateAuthoritative: faceLifeTemplate.authoritative,
      faceLifeTemplateSource: faceLifeTemplate.source,
      faceLifeTemplateSampleId: faceLifeTemplate.sampleId || "none",
      faceLifeTemplateSampleAmbiguous: Boolean(faceLifeTemplate.sampleAmbiguous),
      faceHeartbeatOpacity: round2(faceHeartbeatOpacity),
      healthFaceHeartbeatOpacity: round2(faceHeartbeatOpacity),
      faceFixedFrames,
      healthFaceFixedFrames: faceFixedFrames,
      faceHeartbeatScore: round2(faceHeartbeatScore),
      healthFaceHeartbeatScore: round2(faceHeartbeatScore),
      faceHeartbeatAlive,
      healthFaceHeartbeatAlive: faceHeartbeatAlive,
      faceNoHeartbeatFrames,
      healthFaceNoHeartbeatFrames: faceNoHeartbeatFrames,
      noHeartbeatDeath,
      healthNoHeartbeatDeath: noHeartbeatDeath,
      faceLifeNoHeartbeatDeath,
      healthFaceLifeNoHeartbeatDeath: faceLifeNoHeartbeatDeath,
      noHeartbeatDeathFrames,
      healthNoHeartbeatDeathFrames: noHeartbeatDeathFrames,
      fixedFaceDeath,
      healthFixedFaceDeath: fixedFaceDeath,
      fixedFaceDeathFrames,
      healthFixedFaceDeathFrames: fixedFaceDeathFrames,
      faceBloodDeathFrames,
      healthFaceBloodDeathFrames: faceBloodDeathFrames,
      criticalBloodAlive,
      bloodDangerScore: round2(bloodDangerScore),
      healthDangerReason,
      freezeScore,
      estimatedPercent: nextHealth,
      value: nextHealth,
      health: nextHealth,
      lowHealth: criticalBloodAlive || templateCriticalAlive || numericLowHealth,
      lowHealthThreshold,
      retryRequested: Boolean(healthState?.retryRequested || likelyDead),
      retryPipeline: likelyDead ? "Retry" : (healthState?.retryPipeline || "none"),
      retryPriority: likelyDead ? Number(healthState?.retryPriority ?? 100) : Number(healthState?.retryPriority ?? 0),
      retryReason: likelyDead
        ? (tintDeath ? "health-red-tint-death" : (faceTemplateDeath ? "health-face-template-death" : (faceBloodDeath ? "health-face-blood-death" : (noHeartbeatDeath || faceLifeNoHeartbeatDeath ? "health-no-heartbeat-death" : (fixedFaceDeath ? "health-fixed-face-death" : (faceDeath ? "health-face-death" : (frozenDeath ? "health-freeze-death" : healthState?.retryReason || "health-zero-score")))))))
        : "none"
    });
  }

  function createSpatialSnapshot(overrides = {}) {
    const visualDirection = Number(overrides.visualDirection ?? 0);
    const auditoryCorrection = Number(overrides.auditoryCorrection ?? 0);
    const fusedDirection = Number(overrides.fusedDirection ?? 0);
    return {
      visualDirection: round2(visualDirection),
      auditoryCorrection: round2(auditoryCorrection),
      fusedDirection: round2(fusedDirection),
      hudX: round2(clamp01(Number(overrides.hudX ?? 0.5))),
      hudY: round2(clamp01(Number(overrides.hudY ?? 0.45))),
      confidence: round2(clamp01(Number(overrides.confidence ?? 0))),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP,
      eventDetected: Boolean(overrides.eventDetected),
      eventType: normalizeAuditoryEventType(overrides.eventType),
      gain: Number(overrides.gain ?? 0)
    };
  }

  self.AIKernelDoomSensory = Object.freeze({
    buildAudioBandEnergy,
    buildAuditorySnapshot,
    chooseDominantAudioBand,
    classifyFaceLifeSignature,
    countActiveColumns,
    createAuditorySnapshot,
    createDisabledHealthState,
    createHealthSensorSnapshot,
    createVisionSensorSnapshot,
    createSpatialSnapshot,
    estimateFaceDeathScore,
    estimateFaceLifePhase,
    estimateFaceHeartbeatOpacity,
    faceLifePhasePercent,
    faceLifePhaseFromLevel,
    faceLifePhaseLevel,
    faceLifeSignatureDistance,
    listFaceLifeSampleDictionary,
    normalizeVision9x9,
    normalizeAuditoryEventType,
    normalizeFaceLifePhase,
    resolveFaceLifeTemplate,
    refineHealthState
  });
})();

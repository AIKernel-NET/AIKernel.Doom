(function () {
  "use strict";

  function number(value, fallback = 0) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, number(value, min)));
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function normalizeContext(value) {
    const text = String(value || "corridor").trim().toLowerCase();
    return text || "corridor";
  }

  function direction(value, fallback = "none") {
    return value === "left" || value === "right" ? value : fallback;
  }

  function turnYaw(turn, degrees) {
    return turn === "right" ? Math.abs(degrees) : (turn === "left" ? -Math.abs(degrees) : 0);
  }

  function chooseRoute(input, flags) {
    if (flags.routeOpenSpaceLowGapEscape) {
      return "open-space-low-gap-escape";
    }
    if (flags.routeOpenSpaceLowGapScan) {
      return "open-space-low-gap-scan";
    }
    if (flags.routeWallObstacle && !flags.routeWallObstaclePriorityAllowed) {
      return "wall-follow-fallback";
    }
    if (flags.firstDoorRouteEvidenceReady) {
      return "first-door-route";
    }
    if (input.spawnSecretDoorScore >= 0.42 && input.spawnCorridorGapScore < 0.30) {
      return "spawn-secret-route-reset";
    }
    if (input.spawnWestStairScore >= 0.30) {
      return "spawn-west-stair-route-recover";
    }
    if (input.spawnLandmarkRouteEvidence >= 0.28) {
      return "spawn-landmark-route";
    }
    return "open-space-cruise";
  }

  function chooseAction(flags) {
    if (flags.routeFootClearRequired) {
      return "clear-foot";
    }
    if (flags.routeOpenSpaceLowGapEscape) {
      return "escape-low-gap";
    }
    if (flags.routeWallObstacle) {
      return "wall-follow";
    }
    if (flags.firstDoorRouteEvidenceReady) {
      return "advance-first-door";
    }
    return "cruise";
  }

  function chooseLandmark(input, flags) {
    if (flags.firstDoorRouteEvidenceReady) {
      return "first-door-route-evidence";
    }
    if (input.spawnSecretDoorScore >= 0.42 && input.spawnCorridorGapScore < 0.30) {
      return "rear-secret-reset";
    }
    if (input.spawnWestStairScore >= 0.30) {
      return "west-stair-anchor";
    }
    if (input.spawnLandmarkRouteEvidence >= 0.28) {
      return "landmark-route";
    }
    if (input.spawnCorridorGapScore >= 0.20) {
      return "spawn-corridor-gap";
    }
    return flags.routeWallObstacle ? "wall-pressure" : "none";
  }

  function evaluateTopology(input, flags, recommendedYaw, routeConfidence) {
    const wallPressure = clamp01(Math.max(
      input.footObstacleScore,
      input.motionObstacleScore,
      flags.routeWallObstacle ? 0.82 : 0,
      flags.routeFootObstacle ? 0.62 : 0,
      flags.routeBarrelLaneRisk ? 0.78 : 0,
      flags.routeBarrelLaneDetourRequired ? 0.86 : 0));
    const ambiguousLandmark = input.spawnLandmarkRouteEvidence >= 0.34
      && input.spawnLandmarkRouteEvidence <= 0.48
      && input.spawnCorridorGapScore < 0.30;
    const barrelZoneEvidence = clamp01(
      (flags.routeBarrelLaneRisk ? 0.52 : 0)
      + (flags.routeBarrelLaneDetourRequired ? 0.62 : 0)
      + input.footObstacleScore * 0.34
      + input.motionObstacleScore * 0.22
      + (1 - input.spawnCorridorGapScore) * 0.16
      + (ambiguousLandmark ? 0.18 : 0));
    const yawSign = recommendedYaw > 0 ? 1 : (recommendedYaw < 0 ? -1 : 0);
    const corridorStrength = clamp01(Math.max(
      input.spawnCorridorGapScore,
      input.spawnLandmarkRouteEvidence,
      flags.firstDoorRouteEvidence,
      routeConfidence));
    const centerlineDirectionX = yawSign === 0
      ? 0
      : clamp(-yawSign * Math.max(barrelZoneEvidence, wallPressure) * 0.8, -1, 1);
    const centerlineDirectionY = clamp01(1 - barrelZoneEvidence);
    const corridorDirectionHintX = yawSign === 0
      ? 0
      : clamp(yawSign * corridorStrength, -1, 1);
    const corridorDirectionHintY = corridorStrength;
    const centerCorridorAlignment = clamp(
      centerlineDirectionX * corridorDirectionHintX + centerlineDirectionY * corridorDirectionHintY,
      -1,
      1);
    return {
      routeTopologyWallDistanceNormalized: clamp01(1 - wallPressure * 0.78),
      routeTopologyBarrelZoneEvidence: barrelZoneEvidence,
      routeTopologyCenterCorridorAlignment: centerCorridorAlignment,
      routeDeadEndRisk: barrelZoneEvidence > 0.90 && centerCorridorAlignment < -0.30
    };
  }

  function evaluateRoutePlan(rawInput = {}) {
    const input = {
      depthSig: clamp(rawInput.depthSig, 0, 1.5),
      context: normalizeContext(rawInput.context),
      footObstacleScore: clamp01(rawInput.footObstacleScore),
      footObstacleFlickerScore: clamp01(rawInput.footObstacleFlickerScore),
      footObstacleBounceFrames: Math.max(0, Math.floor(number(rawInput.footObstacleBounceFrames, 0))),
      motionObstacleScore: clamp01(rawInput.motionObstacleScore),
      motionForwardProgress: clamp01(rawInput.motionForwardProgress),
      spawnCorridorGapScore: clamp01(rawInput.spawnCorridorGapScore),
      spawnLandmarkRouteEvidence: clamp01(rawInput.spawnLandmarkRouteEvidence),
      spawnSecretDoorScore: clamp01(rawInput.spawnSecretDoorScore),
      spawnWestStairScore: clamp01(rawInput.spawnWestStairScore),
      bridgeDoorScore: clamp01(rawInput.bridgeDoorScore),
      firstDoorVisionScore: clamp01(rawInput.firstDoorVisionScore),
      firstDoorVisionRedScore: clamp01(rawInput.firstDoorVisionRedScore),
      wallVector: clamp(number(rawInput.wallVector, 0), -1, 1),
      gapVector: clamp(number(rawInput.gapVector, 0), -1, 1),
      corridorVector: clamp(number(rawInput.corridorVector, 0), -1, 1),
      wallFlowVector: clamp(number(rawInput.wallFlowVector, 0), -1, 1),
      useProbeScore: clamp01(rawInput.useProbeScore),
      useProbeAlignment: clamp01(rawInput.useProbeAlignment)
    };
    const openSpaceFootNoise = input.context === "open-space"
      && input.depthSig >= 0.85
      && input.footObstacleFlickerScore < 0.18
      && input.footObstacleBounceFrames < 2
      && input.motionForwardProgress > 0.08;
    const routeFootConfirmed = input.footObstacleFlickerScore >= 0.18 || input.footObstacleBounceFrames >= 2;
    const routeFootOcclusionAllowed = input.context === "wall" || input.depthSig < 0.72 || routeFootConfirmed;
    const routeFootSoftClear = input.footObstacleScore < 0.55 || openSpaceFootNoise;
    const routeHighFootOcclusion = input.footObstacleScore >= 0.55
      && input.motionObstacleScore >= 0.55
      && input.spawnCorridorGapScore < 0.46
      && input.spawnLandmarkRouteEvidence >= 0.28
      && routeFootOcclusionAllowed
      && !openSpaceFootNoise;
    const routeTextureWallOcclusion = input.footObstacleScore >= 0.55
      && input.motionObstacleScore >= 0.55
      && input.motionForwardProgress >= 0.45
      && input.spawnCorridorGapScore < 0.42
      && input.spawnLandmarkRouteEvidence >= 0.28
      && routeFootOcclusionAllowed
      && !openSpaceFootNoise;
    const routeFootDepthBlocked = input.depthSig < 0.50 || (input.context === "wall" && input.depthSig < 0.72);
    const routeFootObstacle = input.footObstacleScore >= 0.08
      && (routeFootDepthBlocked || routeFootConfirmed || routeTextureWallOcclusion || routeHighFootOcclusion);
    const routeFootClearRequired = routeFootObstacle
      && (input.depthSig < 0.72 || input.context === "wall" || input.footObstacleFlickerScore >= 0.18 || input.footObstacleBounceFrames >= 2);
    const routeDepthClose = input.depthSig > 0.04
      && input.depthSig < 0.50
      && (input.context === "wall" || Math.abs(input.wallVector) >= 0.35 || input.footObstacleScore >= 0.04);
    const routeCloseObstacle = routeFootObstacle || routeDepthClose;
    const routeWallObstacle = input.motionObstacleScore >= 0.32
      && routeCloseObstacle
      && (routeFootObstacle || input.depthSig > 0.04);
    const routeWallObstaclePriorityAllowed = input.spawnLandmarkRouteEvidence < 0.40
      || input.spawnCorridorGapScore >= 0.30
      || input.motionForwardProgress < 0.08;
    const routeOpenSpaceLowGapScan = input.context === "open-space"
      && input.depthSig >= 0.72
      && input.spawnCorridorGapScore < 0.20
      && input.footObstacleScore >= 0.55
      && input.motionObstacleScore >= 0.50
      && input.spawnSecretDoorScore < 0.62
      && input.spawnWestStairScore < 0.30
      && input.spawnLandmarkRouteEvidence >= 0.20;
    const routeOpenSpaceLowGapEscape = routeOpenSpaceLowGapScan
      && routeFootClearRequired;
    const routeBarrelLaneRisk = openSpaceFootNoise
      && input.depthSig >= 0.80
      && input.footObstacleScore >= 0.55
      && input.motionObstacleScore >= 0.55
      && input.motionForwardProgress >= 0.45
      && input.spawnCorridorGapScore >= 0.30
      && input.spawnCorridorGapScore < 0.40
      && input.spawnLandmarkRouteEvidence >= 0.35
      && input.spawnSecretDoorScore < 0.72
      && input.useProbeScore < 0.22;
    const routeBarrelLaneDetourRequired = openSpaceFootNoise
      && input.depthSig >= 0.80
      && input.footObstacleScore >= 0.55
      && input.motionObstacleScore >= 0.55
      && input.motionForwardProgress >= 0.45
      && input.spawnCorridorGapScore >= 0.14
      && input.spawnCorridorGapScore < 0.30
      && input.spawnLandmarkRouteEvidence >= 0.38
      && input.spawnSecretDoorScore < 0.72
      && input.useProbeScore < 0.22;
    const firstDoorVisualRouteEvidence = input.firstDoorVisionScore >= 0.38
      && input.firstDoorVisionRedScore >= 0.05
      && input.bridgeDoorScore >= 0.12
      && input.spawnSecretDoorScore < 0.42
      ? clamp01(input.firstDoorVisionScore * 0.72 + input.bridgeDoorScore * 0.28)
      : 0;
    const firstDoorRouteEvidence = Math.max(input.bridgeDoorScore, input.spawnCorridorGapScore, firstDoorVisualRouteEvidence);
    const firstDoorRouteEvidenceReady = input.bridgeDoorScore >= 0.18
      || input.spawnCorridorGapScore >= 0.30
      || firstDoorVisualRouteEvidence >= 0.34;
    const eastWindowRouteEvidenceReady = input.spawnSecretDoorScore < 0.42 || input.spawnCorridorGapScore >= 0.30;
    const routeConfidence = clamp01(Math.max(
      firstDoorRouteEvidence,
      input.spawnLandmarkRouteEvidence,
      input.spawnSecretDoorScore * 0.8,
      input.spawnWestStairScore,
      Math.abs(input.gapVector) * 0.55,
      Math.abs(input.corridorVector) * 0.45,
      Math.abs(input.wallFlowVector) * 0.20
    ));
    const recommendedYaw = selectRecommendedYaw(input, routeWallObstacle, firstDoorRouteEvidenceReady);
    const useProbeConfidence = input.useProbeScore < 0.05
      ? 0
      : clamp01(input.useProbeScore * 0.70 + input.useProbeAlignment * 0.30);
    const flags = {
      routeFootSoftClear,
      routeTextureWallOcclusion,
      routeFootObstacle,
      routeFootClearRequired,
      routeDepthClose,
      routeCloseObstacle,
      routeWallObstacle,
      routeWallObstaclePriorityAllowed,
      routeOpenSpaceLowGapScan,
      routeOpenSpaceLowGapEscape,
      routeBarrelLaneRisk,
      routeBarrelLaneDetourRequired,
      firstDoorRouteEvidence,
      firstDoorRouteEvidenceReady,
      eastWindowRouteEvidenceReady,
      openSpaceFootNoise,
      routeConfidence,
      recommendedYaw,
      useProbeConfidence
    };
    const topology = evaluateTopology(input, flags, recommendedYaw, routeConfidence);
    const routeDeadEndTrimRequired = Boolean(topology.routeDeadEndRisk)
      && !routeTextureWallOcclusion
      && input.useProbeScore < 0.22;
    const routeCorridorBridgeEvidence = clamp01(input.bridgeDoorScore * 0.45
      + input.spawnCorridorGapScore * 0.25
      + input.spawnLandmarkRouteEvidence * 0.30);
    const routeCorridorBridgeLock = input.context === "corridor"
      && input.depthSig > 0.28
      && input.depthSig <= 0.86
      && input.bridgeDoorScore >= 0.28
      && input.spawnCorridorGapScore >= 0.34
      && input.spawnLandmarkRouteEvidence >= 0.46
      && input.spawnSecretDoorScore < 0.80
      && input.useProbeScore < 0.22
      && !routeTextureWallOcclusion;
    const currentRoute = chooseRoute(input, flags);
    const currentLandmark = chooseLandmark(input, flags);
    return Object.assign(flags, topology, {
      routeDeadEndTrimRequired,
      routeCorridorBridgeEvidence,
      routeCorridorBridgeLock,
      currentRoute,
      currentLandmark,
      routeActionHint: chooseAction(flags),
      routeConfidence,
      recommendedYaw,
      useProbeConfidence
    });
  }

  function selectRecommendedYaw(input, routeWallObstacle, firstDoorRouteEvidenceReady) {
    let yaw = 0;
    const gapStrength = Math.abs(input.gapVector);
    const corridorStrength = Math.abs(input.corridorVector);
    if (corridorStrength >= 0.05 && corridorStrength > gapStrength + 0.04) {
      yaw = Math.round(input.corridorVector * 14);
    } else if (gapStrength >= 0.05) {
      yaw = Math.round(input.gapVector * 18);
    } else if (corridorStrength >= 0.05) {
      yaw = Math.round(input.corridorVector * 14);
    } else if (!firstDoorRouteEvidenceReady && Math.abs(input.wallFlowVector) >= 0.05) {
      yaw = Math.round(-input.wallFlowVector * 8);
    } else if (routeWallObstacle) {
      yaw = input.wallVector > 0 ? -6 : 6;
    }

    return clamp(yaw, -28, 28);
  }

  function evaluateLandmarkNavigator(rawInput = {}) {
    const routePlan = rawInput.routePlan || rawInput.RoutePlan || {};
    const spawnGapTurn = direction(rawInput.spawnCorridorGapTurn);
    const landmarkTurn = direction(rawInput.spawnLandmarkRouteTurn);
    const spawnGapYawDegrees = Math.abs(number(rawInput.spawnGapYawDegrees, 12));
    const wallAwayYawDegrees = Math.abs(number(rawInput.wallAwayYawDegrees, 6));
    const wallVector = clamp(rawInput.wallVector, -1, 1);
    const spawnCorridorGapYaw = routePlan.firstDoorRouteEvidenceReady
      || routePlan.currentLandmark === "spawn-corridor-gap"
      ? turnYaw(spawnGapTurn, spawnGapYawDegrees)
      : 0;
    const landmarkRouteYaw = number(routePlan.firstDoorRouteEvidence, 0) >= 0.28
      || routePlan.currentLandmark === "landmark-route"
      ? turnYaw(landmarkTurn, spawnGapYawDegrees)
      : 0;
    const wallAwayYaw = wallVector > 0 ? -wallAwayYawDegrees : wallAwayYawDegrees;
    return {
      routeFallbackYaw: landmarkRouteYaw || spawnCorridorGapYaw || wallAwayYaw,
      spawnCorridorGapYaw,
      landmarkRouteYaw,
      wallAwayYaw,
      recommendedYaw: number(routePlan.recommendedYaw, 0) || landmarkRouteYaw || spawnCorridorGapYaw || wallAwayYaw,
      currentLandmark: routePlan.currentLandmark || (landmarkRouteYaw ? "landmark-route" : (spawnCorridorGapYaw ? "spawn-corridor-gap" : "wall-pressure"))
    };
  }

  self.AIKernelDoomRoutePlanner = Object.freeze({
    evaluateLandmarkNavigator,
    evaluateRoutePlan
  });
})();

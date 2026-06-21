namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineContextValueResolver
{
    public static AutoplayDslValue Resolve(DynamicPipelineContext context, string token)
    {
        var normalized = AutoplayDslExpressionSyntax.Normalize(token);
        if (normalized.StartsWith("-", StringComparison.Ordinal) && normalized.Length > 1)
        {
            return AutoplayDslValue.Number(-Resolve(context, normalized[1..]).AsNumber());
        }

        if (float.TryParse(normalized, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number))
        {
            return AutoplayDslValue.Number(number);
        }

        return normalized.ToLowerInvariant() switch
        {
            "true" => AutoplayDslValue.Boolean(true),
            "false" => AutoplayDslValue.Boolean(false),
            "health" or "hp" => AutoplayDslValue.Number(context.Health),
            "lethalrisk" => AutoplayDslValue.Number(context.LethalRisk),
            "lowhealth" => AutoplayDslValue.Boolean(context.LowHealth),
            "criticalhealth" => AutoplayDslValue.Boolean(context.CriticalHealth),
            "lowhealthgoalfirst" => AutoplayDslValue.Boolean(context.LowHealthGoalFirst),
            "lowhealththreshold" => AutoplayDslValue.Number(context.LowHealthThreshold),
            "criticalhealththreshold" => AutoplayDslValue.Number(context.CriticalHealthThreshold),
            "context" or "contextdict" => AutoplayDslValue.Text(context.Sensor.ContextDict),
            "selectedaxis" => AutoplayDslValue.Text(context.SelectedAxis),
            "actionrepeatframes" or "kinesisactionrepeatframes" or "repeatactionframes" =>
                AutoplayDslValue.Number(context.ActionRepeatFrames),
            "moverepeatframes" or "kinesismoverepeatframes" =>
                AutoplayDslValue.Number(context.MoveRepeatFrames),
            "turnrepeatframes" or "kinesisturnrepeatframes" or "repeatturnframes" =>
                AutoplayDslValue.Number(context.TurnRepeatFrames),
            "usepulsecooldown" or "usepulsecooldownframes" =>
                AutoplayDslValue.Number(context.UsePulseCooldownFrames),
            "usepulsesuppressedframes" =>
                AutoplayDslValue.Number(context.UsePulseSuppressedFrames),
            "lastusepulseprediction" =>
                AutoplayDslValue.Number(context.LastUsePulsePrediction),
            "usepulseage" or "usepulseageframes" =>
                AutoplayDslValue.Number(context.UsePulseAgeFrames),
            "dooropenedcount" =>
                AutoplayDslValue.Number(context.DoorOpenedCount),
            "centralhallentered" =>
                AutoplayDslValue.Boolean(context.CentralHallEntered),
            "stairsentered" =>
                AutoplayDslValue.Boolean(context.StairsEntered),
            "enemydefeatedcount" =>
                AutoplayDslValue.Number(context.EnemyDefeatedCount),
            "ammolikelyempty" =>
                AutoplayDslValue.Boolean(context.AmmoLikelyEmpty),
            "finalroomentered" =>
                AutoplayDslValue.Boolean(context.FinalRoomEntered),
            "exitswitchpressed" =>
                AutoplayDslValue.Boolean(context.ExitSwitchPressed),
            "centralhallconfidence" =>
                AutoplayDslValue.Number(context.CentralHallConfidence),
            "finalroomconfidence" =>
                AutoplayDslValue.Number(context.FinalRoomConfidence),
            "centralhallbypassallowed" =>
                AutoplayDslValue.Boolean(context.CentralHallBypassAllowed),
            "finalroomroutecandidate" =>
                AutoplayDslValue.Boolean(context.FinalRoomRouteCandidate),
            "routemode" =>
                AutoplayDslValue.Text(context.RoutePlan.RouteMode),
            "currentroute" =>
                AutoplayDslValue.Text(context.RoutePlan.CurrentRoute),
            "currentlandmark" =>
                AutoplayDslValue.Text(context.RoutePlan.CurrentLandmark),
            "routeactionhint" =>
                AutoplayDslValue.Text(context.RoutePlan.RouteActionHint),
            "routeloopkind" =>
                AutoplayDslValue.Text(context.RoutePlan.RouteLoopKind),
            "routeaborthint" =>
                AutoplayDslValue.Text(context.RoutePlan.RouteAbortHint),
            "routetexturewallocclusion" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteTextureWallOcclusion),
            "routefootsoftclear" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteFootSoftClear),
            "routefootobstacle" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteFootObstacle),
            "routefootclearrequired" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteFootClearRequired),
            "routedepthclose" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteDepthClose),
            "routecloseobstacle" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteCloseObstacle),
            "routewallobstacle" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteWallObstacle),
            "routewallobstaclepriorityallowed" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteWallObstaclePriorityAllowed),
            "routeopenspacelowgapscan" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteOpenSpaceLowGapScan),
            "routeopenspacelowgapescape" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteOpenSpaceLowGapEscape),
            "firstdoorrouteevidence" =>
                AutoplayDslValue.Number(context.RoutePlan.FirstDoorRouteEvidence),
            "firstdoorrouteevidenceready" =>
                AutoplayDslValue.Boolean(context.RoutePlan.FirstDoorRouteEvidenceReady),
            "eastwindowrouteevidenceready" =>
                AutoplayDslValue.Boolean(context.RoutePlan.EastWindowRouteEvidenceReady),
            "openspacefootnoise" =>
                AutoplayDslValue.Boolean(context.RoutePlan.OpenSpaceFootNoise),
            "routebarrellanerisk" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteBarrelLaneRisk),
            "routebarrellanedetourrequired" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteBarrelLaneDetourRequired),
            "routetopologywalldistancenormalized" =>
                AutoplayDslValue.Number(context.RoutePlan.RouteTopologyWallDistanceNormalized),
            "routetopologybarrelzoneevidence" =>
                AutoplayDslValue.Number(context.RoutePlan.RouteTopologyBarrelZoneEvidence),
            "routetopologycentercorridoralignment" =>
                AutoplayDslValue.Number(context.RoutePlan.RouteTopologyCenterCorridorAlignment),
            "routedeadendrisk" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteDeadEndRisk),
            "routedeadendtrimrequired" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteDeadEndTrimRequired),
            "routecorridorbridgeevidence" =>
                AutoplayDslValue.Number(context.RoutePlan.RouteCorridorBridgeEvidence),
            "routecorridorbridgelock" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteCorridorBridgeLock),
            "routeconfidence" =>
                AutoplayDslValue.Number(context.RoutePlan.RouteConfidence),
            "recommendedyaw" =>
                AutoplayDslValue.Number(context.RoutePlan.RecommendedYaw),
            "useprobeconfidence" =>
                AutoplayDslValue.Number(context.RoutePlan.UseProbeConfidence),
            "routeplanneradvanceready" =>
                AutoplayDslValue.Boolean(context.RoutePlan.FirstDoorRouteEvidenceReady || context.RoutePlan.RouteConfidence >= 0.30f),
            "routepivotexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RoutePivotExceeded),
            "routeslideexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteSlideExceeded),
            "routebackoffexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteBackoffExceeded),
            "routeadvanceexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteAdvanceExceeded),
            "routeingressexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteIngressExceeded),
            "routerecoverexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteRecoverExceeded),
            "routeloopbudgetexceeded" =>
                AutoplayDslValue.Boolean(context.RoutePlan.RouteLoopBudgetExceeded),
            _ => ResolveDynamicValue(context, normalized)
        };
    }

    private static AutoplayDslValue ResolveDynamicValue(DynamicPipelineContext context, string token)
    {
        if (TryResolveText(context, token, out var text))
        {
            return AutoplayDslValue.Text(text);
        }

        if (TryResolveMap(context.SensorReadings, token, "sensor.", out var sensor)
            || TryResolveMap(context.Events, token, "event.", out sensor)
            || TryResolveMap(context.MeaningVectors, token, "vector.", out sensor)
            || TryResolveMap(context.ToposVectors, token, "topos.", out sensor)
            || TryResolveMap(context.Priorities, token, "priority.", out sensor)
            || TryResolveMap(context.SemanticScores, token, "semantic.", out sensor)
            || TryResolveUnprefixedScore(context, token, out sensor))
        {
            return AutoplayDslValue.Number(sensor);
        }

        return AutoplayDslValue.Text(AutoplayDslExpressionSyntax.Unquote(token));
    }

    private static bool TryResolveText(DynamicPipelineContext context, string token, out string value)
    {
        value = string.Empty;
        var key = token.StartsWith("text.", StringComparison.OrdinalIgnoreCase)
            ? token["text.".Length..]
            : token;
        if (!TryGet(context.TextValues, key, out value))
        {
            return false;
        }

        value = AutoplayDslExpressionSyntax.Unquote(value);
        return true;
    }

    private static bool TryResolveUnprefixedScore(DynamicPipelineContext context, string token, out float value)
        => TryGet(context.SensorReadings, token, out value)
            || TryGet(context.Events, token, out value)
            || TryGet(context.MeaningVectors, token, out value)
            || TryGet(context.ToposVectors, token, out value)
            || TryGet(context.Priorities, token, out value)
            || TryGet(context.SemanticScores, token, out value);

    private static bool TryResolveMap(
        IReadOnlyDictionary<string, float> values,
        string token,
        string prefix,
        out float value)
    {
        value = 0;
        if (!token.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var key = token[prefix.Length..];
        return TryGet(values, key, out value);
    }

    private static bool TryGet(IReadOnlyDictionary<string, float> values, string key, out float value)
    {
        if (values.TryGetValue(key, out value))
        {
            return true;
        }

        foreach (var item in values)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = item.Value;
                return true;
            }
        }

        value = 0;
        return false;
    }

    private static bool TryGet(IReadOnlyDictionary<string, string> values, string key, out string value)
    {
        if (values.TryGetValue(key, out var directValue))
        {
            value = directValue;
            return true;
        }

        foreach (var item in values)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = item.Value;
                return true;
            }
        }

        value = string.Empty;
        return false;
    }
}

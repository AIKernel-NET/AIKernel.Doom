namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineContextValueResolver
{
    public static AutoplayDslValue Resolve(AutoplayPipelineContext context, string token)
    {
        var normalized = AutoplayDslExpressionSyntax.Normalize(token);
        if (normalized.StartsWith("-", StringComparison.Ordinal) && normalized.Length > 1)
        {
            return AutoplayDslValue.Number(-Resolve(context, normalized[1..]).AsNumber());
        }

        if (normalized.StartsWith("$", StringComparison.Ordinal))
        {
            return AutoplayProfileParameterResolver.Resolve(context.Profile, normalized[1..]);
        }

        if (float.TryParse(normalized, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number))
        {
            return AutoplayDslValue.Number(number);
        }

        return normalized.ToLowerInvariant() switch
        {
            "true" => AutoplayDslValue.Boolean(true),
            "false" => AutoplayDslValue.Boolean(false),
            "health" => AutoplayDslValue.Number(context.Sensor.Health),
            "depthsig" => AutoplayDslValue.Number(context.DepthSig),
            "facesig" => AutoplayDslValue.Number(context.Sensor.FaceSig),
            "absfacesig" => AutoplayDslValue.Number(Math.Abs(context.Sensor.FaceSig)),
            "soundevent" => AutoplayDslValue.Boolean(context.Sensor.SoundEvent),
            "stuckticks" => AutoplayDslValue.Number(context.Sensor.StuckTicks),
            "qdelta" => AutoplayDslValue.Number(context.QDelta),
            "absqdelta" => AutoplayDslValue.Number(Math.Abs(context.QDelta)),
            "recoveryframes" => AutoplayDslValue.Number(context.RecoveryFrames),
            "wallvector" => AutoplayDslValue.Number(context.WallVector),
            "abswallvector" => AutoplayDslValue.Number(Math.Abs(context.WallVector)),
            "context" => AutoplayDslValue.Text(context.Context),
            "escapeyaw" => AutoplayDslValue.Number(context.EscapeYaw),
            "combtyaw" => AutoplayDslValue.Number(context.CombatYaw),
            "combatyaw" => AutoplayDslValue.Number(context.CombatYaw),
            "wallawayyaw" => AutoplayDslValue.Number(context.WallAwayYaw),
            "opencruiseyaw" => AutoplayDslValue.Number(context.OpenCruiseYaw),
            "aimyaw" => AutoplayDslValue.Number(context.AimYaw),
            "doorprobeyaw" => AutoplayDslValue.Number(context.DoorProbeYaw),
            _ => AutoplayDslValue.Text(AutoplayDslExpressionSyntax.Unquote(normalized))
        };
    }
}

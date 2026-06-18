namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgGateOptionsNormalizer
{
    public static CtgGateOptions Normalize(CtgGateOptions? options)
    {
        var value = options ?? new();
        return value with
        {
            Quorum = Math.Clamp(value.Quorum, 1, 3),
            LogosApprovalThreshold = Math.Clamp(value.LogosApprovalThreshold, 0, 1),
            EthosRejectDangerThreshold = Math.Clamp(value.EthosRejectDangerThreshold, 0, 1),
            PathosRejectDangerThreshold = Math.Clamp(value.PathosRejectDangerThreshold, 0, 1)
        };
    }
}

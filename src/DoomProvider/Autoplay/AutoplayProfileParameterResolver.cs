namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayProfileParameterResolver
{
    public static AutoplayDslValue Resolve(AutoplayOptimizationProfile profile, string name)
    {
        if (!AutoplayOptimizationProfileParameters.TryGetValue(profile, name, out var value))
        {
            return AutoplayDslValue.Number(0);
        }

        return value switch
        {
            bool boolean => AutoplayDslValue.Boolean(boolean),
            int number => AutoplayDslValue.Number(number),
            float number => AutoplayDslValue.Number(number),
            double number => AutoplayDslValue.Number((float)number),
            _ => AutoplayDslValue.Number(0)
        };
    }
}

namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;

internal static class AutoplayOptimizationProfileJson
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static AutoplayOptimizationProfile Load(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return AutoplayOptimizationProfile.Default;
        }

        return FromJson(File.ReadAllText(path));
    }

    public static AutoplayOptimizationProfile FromJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return AutoplayOptimizationProfile.Default;
        }

        using var document = JsonDocument.Parse(json);
        return FromJsonElement(document.RootElement);
    }

    public static AutoplayOptimizationProfile FromJsonElement(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return AutoplayOptimizationProfile.Default;
        }

        var defaults = AutoplayOptimizationProfile.Default;
        var parameters = root.TryGetProperty("parameters", out var parameterElement)
            && parameterElement.ValueKind == JsonValueKind.Object
                ? parameterElement
                : root;

        var pipeline = defaults.Pipeline;
        if (root.TryGetProperty("pipeline", out var pipelineElement)
            && pipelineElement.ValueKind == JsonValueKind.Object)
        {
            pipeline = pipelineElement.Deserialize<AutoplayPipelineDefinition>(JsonOptions) ?? pipeline;
        }

        return AutoplayOptimizationProfileJsonParameters.Apply(root, parameters, defaults, pipeline);
    }
}

namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;

internal static class AutoplayOptimizationProfileJson
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// [EN] Executes the <c>Load</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Load</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="path">
    /// [EN] Supplies the <c>path</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>path</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayOptimizationProfile Load(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return AutoplayOptimizationProfile.Default;
        }

        return FromJson(File.ReadAllText(path));
    }

    /// <summary>
    /// [EN] Executes the <c>FromJson</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>FromJson</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="json">
    /// [EN] Supplies the <c>json</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>json</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayOptimizationProfile FromJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return AutoplayOptimizationProfile.Default;
        }

        using var document = JsonDocument.Parse(json);
        return FromJsonElement(document.RootElement);
    }

    /// <summary>
    /// [EN] Executes the <c>FromJsonElement</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>FromJsonElement</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="root">
    /// [EN] Supplies the <c>root</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>root</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

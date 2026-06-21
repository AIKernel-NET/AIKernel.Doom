namespace AIKernel.Doom.Provider;

using AIKernel.Abstractions.Models;
using AIKernel.Abstractions.Providers;
using AIKernel.Dtos.Core;
using AIKernel.Dtos.Routing;

internal sealed class DoomProviderCapabilities : IProviderCapabilities
{
    private static readonly string[] Operations = ["doom.start", "doom.stop", "doom.status"];
    private static readonly string[] DataTypes = ["wasm", "process", "game-state"];
    /// <summary>
    /// EN: Gets SupportedOperations.
    /// EN: Documentation for public API. JA: SupportedOperations を取得します。
    /// </summary>

    public IReadOnlyList<string> SupportedOperations => Operations;
    /// <summary>
    /// EN: Gets SupportedDataTypes.
    /// EN: Documentation for public API. JA: SupportedDataTypes を取得します。
    /// </summary>

    public IReadOnlyList<string> SupportedDataTypes => DataTypes;
    /// <summary>
    /// EN: Gets MaxConcurrentConnections.
    /// EN: Documentation for public API. JA: MaxConcurrentConnections を取得します。
    /// </summary>

    public int MaxConcurrentConnections => 1;
    /// <summary>
    /// EN: Gets RateLimit.
    /// EN: Documentation for public API. JA: RateLimit を取得します。
    /// </summary>

    public RateLimitInfo? RateLimit => null;
    /// <summary>
    /// EN: Executes Vector.
    /// EN: Documentation for public API. JA: Vector を実行します。
    /// </summary>

    public ModelCapacityVector Vector => new();
    /// <summary>
    /// EN: Executes GetDynamicCapacities.
    /// EN: Documentation for public API. JA: GetDynamicCapacities を実行します。
    /// </summary>

    public IDictionary<string, float>? GetDynamicCapacities(IExecutionConstraints constraints) => null;
    /// <summary>
    /// EN: Executes GetCapabilityProfile.
    /// EN: Documentation for public API. JA: GetCapabilityProfile を実行します。
    /// </summary>

    public ICapabilityProfile? GetCapabilityProfile() => null;
    /// <summary>
    /// EN: Executes SupportsOperation.
    /// EN: Documentation for public API. JA: SupportsOperation を実行します。
    /// </summary>

    public bool SupportsOperation(string operation)
        => Operations.Contains(operation, StringComparer.Ordinal);
    /// <summary>
    /// EN: Executes SupportsDataType.
    /// EN: Documentation for public API. JA: SupportsDataType を実行します。
    /// </summary>

    public bool SupportsDataType(string dataType)
        => DataTypes.Contains(dataType, StringComparer.Ordinal);
    /// <summary>
    /// EN: Executes SupportsQuantization.
    /// EN: Documentation for public API. JA: SupportsQuantization を実行します。
    /// </summary>

    public bool SupportsQuantization(string quantizationLevel) => false;
    /// <summary>
    /// EN: Gets SupportsQueryAugmentation.
    /// EN: Documentation for public API. JA: SupportsQueryAugmentation を取得します。
    /// </summary>

    public bool SupportsQueryAugmentation => false;
    /// <summary>
    /// EN: Gets SupportsQueryDecomposition.
    /// EN: Documentation for public API. JA: SupportsQueryDecomposition を取得します。
    /// </summary>

    public bool SupportsQueryDecomposition => false;
    /// <summary>
    /// EN: Gets SupportsQueryRouting.
    /// EN: Documentation for public API. JA: SupportsQueryRouting を取得します。
    /// </summary>

    public bool SupportsQueryRouting => false;
    /// <summary>
    /// EN: Gets MaxQueryParts.
    /// EN: Documentation for public API. JA: MaxQueryParts を取得します。
    /// </summary>

    public int MaxQueryParts => 0;
    /// <summary>
    /// EN: Gets SupportedQueryProcessingOperations.
    /// EN: Documentation for public API. JA: SupportedQueryProcessingOperations を取得します。
    /// </summary>

    public IReadOnlyList<string> SupportedQueryProcessingOperations => [];
    /// <summary>
    /// EN: Executes SupportsQueryProcessingOperation.
    /// EN: Documentation for public API. JA: SupportsQueryProcessingOperation を実行します。
    /// </summary>

    public bool SupportsQueryProcessingOperation(string operation) => false;
    /// <summary>
    /// EN: Gets SupportsEmbedding.
    /// EN: Documentation for public API. JA: SupportsEmbedding を取得します。
    /// </summary>

    public bool SupportsEmbedding => false;
    /// <summary>
    /// EN: Gets EmbeddingDimensions.
    /// EN: Documentation for public API. JA: EmbeddingDimensions を取得します。
    /// </summary>

    public int? EmbeddingDimensions => null;
    /// <summary>
    /// EN: Gets SupportedEmbeddingModels.
    /// EN: Documentation for public API. JA: SupportedEmbeddingModels を取得します。
    /// </summary>

    public IReadOnlyList<string> SupportedEmbeddingModels => [];
}

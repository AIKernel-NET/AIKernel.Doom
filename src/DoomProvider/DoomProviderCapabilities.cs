namespace AIKernel.Doom.Provider;

using AIKernel.Abstractions.Models;
using AIKernel.Abstractions.Providers;
using AIKernel.Dtos.Core;
using AIKernel.Dtos.Routing;

internal sealed class DoomProviderCapabilities : IProviderCapabilities
{
    private static readonly string[] Operations = ["doom.start", "doom.stop", "doom.status"];
    private static readonly string[] DataTypes = ["wasm", "process", "game-state"];

    public IReadOnlyList<string> SupportedOperations => Operations;

    public IReadOnlyList<string> SupportedDataTypes => DataTypes;

    public int MaxConcurrentConnections => 1;

    public RateLimitInfo? RateLimit => null;

    public ModelCapacityVector Vector => new();

    public IDictionary<string, float>? GetDynamicCapacities(IExecutionConstraints constraints) => null;

    public ICapabilityProfile? GetCapabilityProfile() => null;

    public bool SupportsOperation(string operation)
        => Operations.Contains(operation, StringComparer.Ordinal);

    public bool SupportsDataType(string dataType)
        => DataTypes.Contains(dataType, StringComparer.Ordinal);

    public bool SupportsQuantization(string quantizationLevel) => false;

    public bool SupportsQueryAugmentation => false;

    public bool SupportsQueryDecomposition => false;

    public bool SupportsQueryRouting => false;

    public int MaxQueryParts => 0;

    public IReadOnlyList<string> SupportedQueryProcessingOperations => [];

    public bool SupportsQueryProcessingOperation(string operation) => false;

    public bool SupportsEmbedding => false;

    public int? EmbeddingDimensions => null;

    public IReadOnlyList<string> SupportedEmbeddingModels => [];
}

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
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportedOperations を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>Operations</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Operations</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IReadOnlyList<string> SupportedOperations => Operations;
    /// <summary>
    /// EN: Gets SupportedDataTypes.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportedDataTypes を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>DataTypes</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>DataTypes</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IReadOnlyList<string> SupportedDataTypes => DataTypes;
    /// <summary>
    /// EN: Gets MaxConcurrentConnections.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] MaxConcurrentConnections を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>MaxConcurrentConnections</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>MaxConcurrentConnections</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public int MaxConcurrentConnections => 1;
    /// <summary>
    /// EN: Gets RateLimit.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RateLimit を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>null</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>null</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public RateLimitInfo? RateLimit => null;
    /// <summary>
    /// EN: Executes Vector.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Vector を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>new</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>new</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public ModelCapacityVector Vector => new();
    /// <summary>
    /// EN: Executes GetDynamicCapacities.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetDynamicCapacities を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>null</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>null</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="constraints">
    /// [EN] Supplies the <c>constraints</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>constraints</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IDictionary<string, float>? GetDynamicCapacities(IExecutionConstraints constraints) => null;
    /// <summary>
    /// EN: Executes GetCapabilityProfile.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] GetCapabilityProfile を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>null</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>null</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public ICapabilityProfile? GetCapabilityProfile() => null;
    /// <summary>
    /// EN: Executes SupportsOperation.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsOperation を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>SupportsOperation</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SupportsOperation</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="operation">
    /// [EN] Supplies the <c>operation</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>operation</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsOperation(string operation)
        => Operations.Contains(operation, StringComparer.Ordinal);
    /// <summary>
    /// EN: Executes SupportsDataType.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsDataType を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>SupportsDataType</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SupportsDataType</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="dataType">
    /// [EN] Supplies the <c>dataType</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>dataType</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsDataType(string dataType)
        => DataTypes.Contains(dataType, StringComparer.Ordinal);
    /// <summary>
    /// EN: Executes SupportsQuantization.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsQuantization を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>false</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>false</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="quantizationLevel">
    /// [EN] Supplies the <c>quantizationLevel</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>quantizationLevel</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsQuantization(string quantizationLevel) => false;
    /// <summary>
    /// EN: Gets SupportsQueryAugmentation.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsQueryAugmentation を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>false</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>false</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsQueryAugmentation => false;
    /// <summary>
    /// EN: Gets SupportsQueryDecomposition.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsQueryDecomposition を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>false</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>false</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsQueryDecomposition => false;
    /// <summary>
    /// EN: Gets SupportsQueryRouting.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsQueryRouting を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>false</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>false</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsQueryRouting => false;
    /// <summary>
    /// EN: Gets MaxQueryParts.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] MaxQueryParts を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>MaxQueryParts</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>MaxQueryParts</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public int MaxQueryParts => 0;
    /// <summary>
    /// EN: Gets SupportedQueryProcessingOperations.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportedQueryProcessingOperations を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>SupportedQueryProcessingOperations</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SupportedQueryProcessingOperations</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IReadOnlyList<string> SupportedQueryProcessingOperations => [];
    /// <summary>
    /// EN: Executes SupportsQueryProcessingOperation.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsQueryProcessingOperation を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>false</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>false</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="operation">
    /// [EN] Supplies the <c>operation</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>operation</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsQueryProcessingOperation(string operation) => false;
    /// <summary>
    /// EN: Gets SupportsEmbedding.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportsEmbedding を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>false</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>false</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool SupportsEmbedding => false;
    /// <summary>
    /// EN: Gets EmbeddingDimensions.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] EmbeddingDimensions を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>null</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>null</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public int? EmbeddingDimensions => null;
    /// <summary>
    /// EN: Gets SupportedEmbeddingModels.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SupportedEmbeddingModels を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>SupportedEmbeddingModels</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SupportedEmbeddingModels</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IReadOnlyList<string> SupportedEmbeddingModels => [];
}

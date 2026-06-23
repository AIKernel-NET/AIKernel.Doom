namespace AIKernel.Doom.Provider.Autoplay;

internal sealed class DynamicPipelineDslParseState
{
    private readonly List<string> _blockPath = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<string> Sensors { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<AutoplayPhainesisEventDefinition> Events { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<AutoplayNousVectorDefinition> Vectors { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<string> ToposVectors { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<string> Priorities { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<string> Actions { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<AutoplayZoeVetoDefinition> VetoRules { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<string> Diagnostics { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public List<string> SeenTopLevel { get; } = [];

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public HashSet<string> SeenStageBlocks { get; } = new(StringComparer.Ordinal);

    /// <summary>
    /// [EN] Executes the <c>CurrentBlock</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CurrentBlock</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public string CurrentBlock => _blockPath.Count > 0 ? _blockPath[^1] : string.Empty;

    /// <summary>
    /// [EN] Executes the <c>OpenBlock</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>OpenBlock</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="block">
    /// [EN] Supplies the <c>block</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>block</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public void OpenBlock(string block)
    {
        _blockPath.Add(block);
        if (_blockPath.Count == 1)
        {
            SeenTopLevel.Add(block);
        }

        SeenStageBlocks.Add(string.Join(".", _blockPath));
    }

    /// <summary>
    /// [EN] Executes the <c>CloseBlock</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CloseBlock</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public void CloseBlock()
    {
        if (_blockPath.Count == 0)
        {
            Diagnostics.Add("Unexpected closing brace.");
            return;
        }

        _blockPath.RemoveAt(_blockPath.Count - 1);
    }

    /// <summary>
    /// [EN] Executes the <c>AddUnclosedBlockDiagnostic</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>AddUnclosedBlockDiagnostic</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public void AddUnclosedBlockDiagnostic()
    {
        if (_blockPath.Count > 0)
        {
            Diagnostics.Add($"Unclosed DSL block '{string.Join(".", _blockPath)}'.");
        }
    }

    /// <summary>
    /// [EN] Executes the <c>ToDefinition</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ToDefinition</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public AutoplayPipelineDefinition ToDefinition()
        => new()
        {
            Aisthesis = new AutoplayAisthesisDefinition { Sensors = Sensors },
            Noesis = new AutoplayNoesisDefinition
            {
                Phainesis = new AutoplayPhainesisDefinition { Events = Events },
                Nous = new AutoplayNousDefinition { Vectors = Vectors }
            },
            Krisis = new AutoplayKrisisDefinition
            {
                Topos = new AutoplayToposDefinition { Vectors = ToposVectors },
                Kairos = new AutoplayKairosDefinition { Priorities = Priorities }
            },
            Kinesis = new AutoplayKinesisLayerDefinition
            {
                Kinesis = new AutoplayKinesisDefinition { Actions = Actions },
                Zoe = new AutoplayZoeDefinition { VetoRules = VetoRules }
            }
        };
}

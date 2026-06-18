namespace AIKernel.Doom.Provider.Autoplay;

internal sealed class DynamicPipelineDslParseState
{
    private readonly List<string> _blockPath = [];

    public List<string> Sensors { get; } = [];

    public List<AutoplayPhainesisEventDefinition> Events { get; } = [];

    public List<AutoplayNousVectorDefinition> Vectors { get; } = [];

    public List<string> ToposVectors { get; } = [];

    public List<string> Priorities { get; } = [];

    public List<string> Actions { get; } = [];

    public List<AutoplayZoeVetoDefinition> VetoRules { get; } = [];

    public List<string> Diagnostics { get; } = [];

    public List<string> SeenTopLevel { get; } = [];

    public HashSet<string> SeenStageBlocks { get; } = new(StringComparer.Ordinal);

    public string CurrentBlock => _blockPath.Count > 0 ? _blockPath[^1] : string.Empty;

    public void OpenBlock(string block)
    {
        _blockPath.Add(block);
        if (_blockPath.Count == 1)
        {
            SeenTopLevel.Add(block);
        }

        SeenStageBlocks.Add(string.Join(".", _blockPath));
    }

    public void CloseBlock()
    {
        if (_blockPath.Count == 0)
        {
            Diagnostics.Add("Unexpected closing brace.");
            return;
        }

        _blockPath.RemoveAt(_blockPath.Count - 1);
    }

    public void AddUnclosedBlockDiagnostic()
    {
        if (_blockPath.Count > 0)
        {
            Diagnostics.Add($"Unclosed DSL block '{string.Join(".", _blockPath)}'.");
        }
    }

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

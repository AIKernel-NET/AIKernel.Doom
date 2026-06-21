namespace AIKernel.Doom.Provider.Autoplay;

public sealed record AutoplayAisthesisDefinition
{
    public List<string> Sensors { get; init; } = [];
}

public sealed record AutoplayNoesisDefinition
{
    public AutoplayPhainesisDefinition Phainesis { get; init; } = new();

    public AutoplayNousDefinition Nous { get; init; } = new();
}

public sealed record AutoplayPhainesisDefinition
{
    public List<AutoplayPhainesisEventDefinition> Events { get; init; } = [];
}

public sealed record AutoplayPhainesisEventDefinition
{
    public string Event { get; init; } = string.Empty;

    public string From { get; init; } = string.Empty;
}

public sealed record AutoplayNousDefinition
{
    public List<AutoplayNousVectorDefinition> Vectors { get; init; } = [];
}

public sealed record AutoplayNousVectorDefinition
{
    public string Vector { get; init; } = string.Empty;

    public string From { get; init; } = string.Empty;
}

public sealed record AutoplayKrisisDefinition
{
    public AutoplayToposDefinition Topos { get; init; } = new();

    public AutoplayKairosDefinition Kairos { get; init; } = new();
}

public sealed record AutoplayToposDefinition
{
    public List<string> Vectors { get; init; } = [];
}

public sealed record AutoplayKairosDefinition
{
    public List<string> Priorities { get; init; } = [];
}

public sealed record AutoplayKinesisLayerDefinition
{
    public AutoplayKinesisDefinition Kinesis { get; init; } = new();

    public AutoplayKinesisDefinition Motion { get; init; } = new();

    public AutoplayZoeDefinition Zoe { get; init; } = new();
}

public sealed record AutoplayKinesisDefinition
{
    public List<string> Actions { get; init; } = [];
}

public sealed record AutoplayZoeDefinition
{
    public List<AutoplayZoeVetoDefinition> VetoRules { get; init; } = [];
}

public sealed record AutoplayZoeVetoDefinition
{
    public string When { get; init; } = string.Empty;
}

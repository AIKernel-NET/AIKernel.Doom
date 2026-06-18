namespace AIKernel.Doom.Provider.Autoplay;

public sealed partial record AutoplayPipelineDefinition
{
    public static AutoplayPipelineDefinition Default { get; } = new()
    {
        Stages = AutoplayPipelineDefaultStages.Create()
    };
}

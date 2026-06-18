namespace AIKernel.Doom.Provider.Autoplay;

public sealed record DynamicPipelineEvaluationResult(
    ActionCommand Action,
    bool ZoeVetoed,
    string SvcEvent);

public sealed class DynamicPipelineEvaluator
{
    private readonly DynamicPipelineGraph graph;
    private readonly Func<string, Func<DynamicPipelineContext, bool>> compilePredicate;

    public DynamicPipelineEvaluator(
        DynamicPipelineGraph graph,
        Func<string, Func<DynamicPipelineContext, bool>> compilePredicate)
    {
        this.graph = graph ?? throw new ArgumentNullException(nameof(graph));
        this.compilePredicate = compilePredicate ?? throw new ArgumentNullException(nameof(compilePredicate));
    }

    public DynamicPipelineEvaluationResult Evaluate(
        DynamicPipelineContext context,
        ActionCommand proposedAction,
        IReadOnlyList<ZoeVetoRule> vetoRules)
    {
        ArgumentNullException.ThrowIfNull(context);
        EnsureCanonicalGraph();

        var sensorPacket = RunAisthesis(context);
        var phainomenon = RunPhainesis(sensorPacket);
        var meaning = RunNous(phainomenon);
        var decision = RunTopos(meaning);
        var priority = RunKairos(decision);
        var generated = RunKinesis(priority, proposedAction);
        return RunZoe(context, generated, vetoRules);
    }

    public DynamicPipelineContext RunAisthesis(DynamicPipelineContext context)
        => context;

    public DynamicPipelineContext RunPhainesis(DynamicPipelineContext context)
        => context;

    public DynamicPipelineContext RunNous(DynamicPipelineContext context)
        => context;

    public DynamicPipelineContext RunTopos(DynamicPipelineContext context)
        => context;

    public DynamicPipelineContext RunKairos(DynamicPipelineContext context)
        => context;

    public ActionCommand RunKinesis(DynamicPipelineContext context, ActionCommand proposedAction)
        => proposedAction;

    public DynamicPipelineEvaluationResult RunZoe(
        DynamicPipelineContext context,
        ActionCommand proposedAction,
        IReadOnlyList<ZoeVetoRule> vetoRules)
    {
        foreach (var veto in vetoRules)
        {
            if (compilePredicate(veto.Expression)(context))
            {
                return new DynamicPipelineEvaluationResult(
                    SafeAction(),
                    ZoeVetoed: true,
                    SvcEvent: $"zoe-veto:{veto.Expression}");
            }
        }

        return new DynamicPipelineEvaluationResult(proposedAction, ZoeVetoed: false, SvcEvent: "none");
    }

    private void EnsureCanonicalGraph()
    {
        if (!graph.IsCanonical)
        {
            throw new InvalidOperationException("Dynamic pipeline graph must execute Aisthesis -> Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe.");
        }
    }

    private static ActionCommand SafeAction()
        => new(false, false, false, false, 0, false, false);
}

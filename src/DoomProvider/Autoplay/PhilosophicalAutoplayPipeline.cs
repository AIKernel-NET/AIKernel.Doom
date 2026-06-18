namespace AIKernel.Doom.Provider.Autoplay;

public sealed class PhilosophicalAutoplayPipeline : IPhilosophicalAutoplayPipeline
{
    private readonly IPhainesis phainesis;
    private readonly INous nous;
    private readonly ITopos topos;
    private readonly IKairos kairos;
    private readonly IKinesis kinesis;
    private readonly IZoe zoe;

    public PhilosophicalAutoplayPipeline(
        IPhainesis phainesis,
        INous nous,
        ITopos topos,
        IKairos kairos,
        IKinesis kinesis,
        IZoe zoe)
    {
        this.phainesis = phainesis ?? throw new ArgumentNullException(nameof(phainesis));
        this.nous = nous ?? throw new ArgumentNullException(nameof(nous));
        this.topos = topos ?? throw new ArgumentNullException(nameof(topos));
        this.kairos = kairos ?? throw new ArgumentNullException(nameof(kairos));
        this.kinesis = kinesis ?? throw new ArgumentNullException(nameof(kinesis));
        this.zoe = zoe ?? throw new ArgumentNullException(nameof(zoe));
    }

    public ZoeAuditResult Execute(SensorFrame frame)
    {
        ArgumentNullException.ThrowIfNull(frame);

        var phainomenon = phainesis.Extract(frame);
        var meaning = nous.Vectorize(phainomenon);
        var decision = topos.Deliberate(meaning);
        var priority = kairos.Prioritize(decision);
        var action = kinesis.Generate(priority);

        return zoe.Audit(action, frame.Health);
    }
}

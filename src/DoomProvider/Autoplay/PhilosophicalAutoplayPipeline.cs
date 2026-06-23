namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>PhilosophicalAutoplayPipeline</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>PhilosophicalAutoplayPipeline</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class PhilosophicalAutoplayPipeline : IPhilosophicalAutoplayPipeline
{
    private readonly IPhainesis phainesis;
    private readonly INous nous;
    private readonly ITopos topos;
    private readonly IKairos kairos;
    private readonly IKinesis kinesis;
    private readonly IZoe zoe;

    /// <summary>
    /// [EN] Creates the philosophical autoplay pipeline by wiring each AIKernel.Doom cognition layer.
    /// [JA] AIKernel.Doom の各 cognition layer を接続して philosophical autoplay pipeline を作成します。
    /// </summary>
    /// <param name="phainesis">
    /// [EN] The layer that extracts phainomena from raw sensor frames.
    /// [JA] raw sensor frame から phainomenon を抽出する layer です。
    /// </param>
    /// <param name="nous">
    /// [EN] The layer that converts phainomena into meaning vectors.
    /// [JA] phainomenon を meaning vector に変換する layer です。
    /// </param>
    /// <param name="topos">
    /// [EN] The spatial judgement layer that deliberates over meaning vectors.
    /// [JA] meaning vector をもとに deliberation を行う spatial judgement layer です。
    /// </param>
    /// <param name="kairos">
    /// [EN] The priority axis layer that selects the momentary decision emphasis.
    /// [JA] momentary decision emphasis を選択する priority axis layer です。
    /// </param>
    /// <param name="kinesis">
    /// [EN] The action layer that turns priority axes into Doom movement commands.
    /// [JA] priority axis を Doom movement command へ変換する action layer です。
    /// </param>
    /// <param name="zoe">
    /// [EN] The safety layer that audits generated actions against life and risk signals.
    /// [JA] generated action を life と risk signal に照らして audit する safety layer です。
    /// </param>
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

    /// <summary>
    /// [EN] Executes the <c>Execute</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Execute</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="frame">
    /// [EN] Supplies the <c>frame</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>frame</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

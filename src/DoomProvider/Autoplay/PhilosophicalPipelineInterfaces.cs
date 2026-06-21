namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Extracts Phainesis phenomena from raw Doom-local sensor frames.
/// JA: Doom ローカルの raw sensor frame から Phainesis phenomenon を抽出します。
/// </summary>
public interface IPhainesis
{
    /// <summary>
    /// EN: Extracts event scores from a raw sensor frame.
    /// JA: raw sensor frame から event score を抽出します。
    /// </summary>
    Phainomenon Extract(SensorFrame frame);
}

/// <summary>
/// EN: Converts extracted phenomena into meaning vectors for cognition.
/// JA: 抽出された phenomenon を cognition 用の meaning vector に変換します。
/// </summary>
public interface INous
{
    /// <summary>
    /// EN: Vectorizes a Phainesis packet without choosing an action.
    /// JA: action を選択せずに Phainesis packet を vectorize します。
    /// </summary>
    MeaningVectorPacket Vectorize(Phainomenon phainomenon);
}

/// <summary>
/// EN: Groups meaning vectors into triadic Topos carriers.
/// JA: meaning vector を三項 Topos carrier に分類します。
/// </summary>
public interface ITopos
{
    /// <summary>
    /// EN: Builds a Topos decision vector from Nous output.
    /// JA: Nous 出力から Topos decision vector を構築します。
    /// </summary>
    ToposDecisionVector Deliberate(MeaningVectorPacket nous);
}

/// <summary>
/// EN: Converts Topos carriers into timing and priority axes.
/// JA: Topos carrier を timing / priority axis に変換します。
/// </summary>
public interface IKairos
{
    /// <summary>
    /// EN: Computes priority axes from a Topos decision vector.
    /// JA: Topos decision vector から priority axis を計算します。
    /// </summary>
    PriorityAxes Prioritize(ToposDecisionVector decision);
}

/// <summary>
/// EN: Maps priority axes to bounded movement intent.
/// JA: priority axis を bounded movement intent に写像します。
/// </summary>
public interface IKinesis
{
    /// <summary>
    /// EN: Generates an action vector from Kairos priorities.
    /// JA: Kairos priority から action vector を生成します。
    /// </summary>
    ActionVector Generate(PriorityAxes kairos);
}

/// <summary>
/// EN: Audits generated action vectors against life-state veto rules.
/// JA: 生成された action vector を life-state veto rule で監査します。
/// </summary>
public interface IZoe
{
    /// <summary>
    /// EN: Audits an action against the current health signal.
    /// JA: 現在の health signal に対して action を監査します。
    /// </summary>
    ZoeAuditResult Audit(ActionVector action, HealthSignal health);
}

/// <summary>
/// EN: Executes the Doom-local philosophical autoplay pipeline.
/// JA: Doom ローカルの philosophical autoplay pipeline を実行します。
/// </summary>
public interface IPhilosophicalAutoplayPipeline
{
    /// <summary>
    /// EN: Executes Aisthesis through Zoe for a single sensor frame.
    /// JA: 単一の sensor frame に対して Aisthesis から Zoe までを実行します。
    /// </summary>
    ZoeAuditResult Execute(SensorFrame frame);
}

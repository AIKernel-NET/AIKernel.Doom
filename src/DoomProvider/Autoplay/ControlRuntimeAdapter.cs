namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Temporary product-neutral Control runtime adapter contract staged in Doom before library extraction.
/// JA: library 抽出前に Doom 側へ仮配置する product-neutral Control runtime adapter contract です。
/// </summary>
public interface IControlRuntimeAdapter
{
    /// <summary>
    /// [EN] Predicts the next control action from the canonical Doom state tensor packet.
    /// [JA] canonical Doom state tensor packet から次の control action を予測します。
    /// </summary>
    /// <param name="state">
    /// [EN] The state tensor and semantic memory packet supplied to the Control runtime.
    /// [JA] Control runtime に渡す state tensor と semantic memory packet です。
    /// </param>
    /// <returns>
    /// [EN] The action packet selected by the Control runtime adapter.
    /// [JA] Control runtime adapter が選択した action packet です。
    /// </returns>
    ControlActionPacket Predict(ControlStateTensorPacket state);

    /// <summary>
    /// [EN] Returns the latest decision trace emitted by the Control runtime adapter.
    /// [JA] Control runtime adapter が出力した最新の decision trace を返します。
    /// </summary>
    /// <returns>
    /// [EN] A packet that describes stage evaluation, decision confidence, and runtime diagnostics.
    /// [JA] stage evaluation、decision confidence、runtime diagnostics を説明する packet です。
    /// </returns>
    ControlDecisionTracePacket Status();
}

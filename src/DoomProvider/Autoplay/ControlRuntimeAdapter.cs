namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Temporary product-neutral Control runtime adapter contract staged in Doom before library extraction.
/// JA: library 抽出前に Doom 側へ仮配置する product-neutral Control runtime adapter contract です。
/// </summary>
public interface IControlRuntimeAdapter
{
    ControlActionPacket Predict(ControlStateTensorPacket state);

    ControlDecisionTracePacket Status();
}

namespace AIKernel.Doom.Provider.Autoplay;

public interface IPhainesis
{
    Phainomenon Extract(SensorFrame frame);
}

public interface INous
{
    MeaningVectorPacket Vectorize(Phainomenon phainomenon);
}

public interface ITopos
{
    ToposDecisionVector Deliberate(MeaningVectorPacket nous);
}

public interface IKairos
{
    PriorityAxes Prioritize(ToposDecisionVector decision);
}

public interface IKinesis
{
    ActionVector Generate(PriorityAxes kairos);
}

public interface IZoe
{
    ZoeAuditResult Audit(ActionVector action, HealthSignal health);
}

public interface IPhilosophicalAutoplayPipeline
{
    ZoeAuditResult Execute(SensorFrame frame);
}

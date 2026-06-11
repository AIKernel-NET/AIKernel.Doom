namespace AIKernel.Doom.Provider;

using AIKernel.Abstractions.Processes;

internal sealed class DoomFailedProcess : IProcess
{
    public DoomFailedProcess(string name, string reason)
    {
        Name = string.IsNullOrWhiteSpace(name) ? "doom" : name;
        Reason = reason;
    }

    public string Name { get; }

    public string Reason { get; }

    public ProcessId Id { get; } = new(Guid.NewGuid());

    public ProcessState State => ProcessState.Error;

    public Task StartAsync() => Task.CompletedTask;

    public Task StopAsync() => Task.CompletedTask;
}

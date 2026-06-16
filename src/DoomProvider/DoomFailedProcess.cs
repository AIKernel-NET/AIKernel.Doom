namespace AIKernel.Doom.Provider;

using AIKernel.Abstractions.Processes;

internal sealed class DoomFailedProcess : IProcess
{
    /// <summary>
    /// EN: Executes DoomFailedProcess.
    /// EN: Documentation for public API. JA: DoomFailedProcess を実行します。
    /// </summary>
    public DoomFailedProcess(string name, string reason)
    {
        Name = string.IsNullOrWhiteSpace(name) ? "doom" : name;
        Reason = reason;
    }
    /// <summary>
    /// EN: Gets Name.
    /// EN: Documentation for public API. JA: Name を取得します。
    /// </summary>

    public string Name { get; }
    /// <summary>
    /// EN: Gets Reason.
    /// EN: Documentation for public API. JA: Reason を取得します。
    /// </summary>

    public string Reason { get; }
    /// <summary>
    /// EN: Executes Id.
    /// EN: Documentation for public API. JA: Id を実行します。
    /// </summary>

    public ProcessId Id { get; } = new(Guid.NewGuid());
    /// <summary>
    /// EN: Gets State.
    /// EN: Documentation for public API. JA: State を取得します。
    /// </summary>

    public ProcessState State => ProcessState.Error;
    /// <summary>
    /// EN: Executes StartAsync.
    /// EN: Documentation for public API. JA: StartAsync を実行します。
    /// </summary>

    public Task StartAsync() => Task.CompletedTask;
    /// <summary>
    /// EN: Executes StopAsync.
    /// EN: Documentation for public API. JA: StopAsync を実行します。
    /// </summary>

    public Task StopAsync() => Task.CompletedTask;
}

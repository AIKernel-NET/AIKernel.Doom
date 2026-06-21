namespace AIKernel.Doom.Provider;

using AIKernel.Common.Results;
/// <summary>
/// EN: Represents DoomGameState.
/// EN: Documentation for public API. JA: DoomGameState を表します。
/// </summary>

public sealed record DoomGameState(int Health, int Ammo, bool IsRunning);
/// <summary>
/// EN: Represents DoomCheatCommand.
/// EN: Documentation for public API. JA: DoomCheatCommand を表します。
/// </summary>

public sealed record DoomCheatCommand(string Name, string Reason);
/// <summary>
/// EN: Represents BonsaiSupervisorStatus.
/// EN: Documentation for public API. JA: BonsaiSupervisorStatus を表します。
/// </summary>

public sealed record BonsaiSupervisorStatus(
    bool ModelReady,
    string Mode,
    string Backend,
    IReadOnlyList<DoomCheatCommand> IssuedCommands);
/// <summary>
/// EN: Defines the IDoomStateReader contract.
/// EN: Documentation for public API. JA: IDoomStateReader contract を定義します。
/// </summary>

public interface IDoomStateReader
{
    Result<DoomGameState> Read();
}
/// <summary>
/// EN: Defines the IDoomCheatCommandPort contract.
/// EN: Documentation for public API. JA: IDoomCheatCommandPort contract を定義します。
/// </summary>

public interface IDoomCheatCommandPort
{
    Result<bool> Issue(DoomCheatCommand command);

    IReadOnlyList<DoomCheatCommand> IssuedCommands { get; }
}
/// <summary>
/// EN: Defines the IBonsaiDoomSupervisor contract.
/// EN: Documentation for public API. JA: IBonsaiDoomSupervisor contract を定義します。
/// </summary>

public interface IBonsaiDoomSupervisor
{
    Task<Result<BonsaiSupervisorStatus>> SuperviseAsync(CancellationToken cancellationToken = default);
}
/// <summary>
/// EN: Represents DeterministicBonsaiPolicy.
/// EN: Documentation for public API. JA: DeterministicBonsaiPolicy を表します。
/// </summary>

public sealed class DeterministicBonsaiPolicy
{
    /// <summary>
    /// EN: Executes Evaluate.
    /// EN: Documentation for public API. JA: Evaluate を実行します。
    /// </summary>
    public IReadOnlyList<DoomCheatCommand> Evaluate(DoomGameState state)
    {
        if (!state.IsRunning)
        {
            return [];
        }

        var commands = new List<DoomCheatCommand>();
        if (state.Health < 25)
        {
            commands.Add(new DoomCheatCommand("idbeholdv", "health below threshold"));
            commands.Add(new DoomCheatCommand("iddqd", "demo fail-closed protection"));
        }

        if (state.Ammo < 5)
        {
            commands.Add(new DoomCheatCommand("idkfa", "ammo below threshold"));
        }

        return commands;
    }
}
/// <summary>
/// EN: Represents BonsaiDoomSupervisor.
/// EN: Documentation for public API. JA: BonsaiDoomSupervisor を表します。
/// </summary>

public sealed class BonsaiDoomSupervisor : IBonsaiDoomSupervisor
{
    private readonly IDoomStateReader _stateReader;
    private readonly IDoomCheatCommandPort _commandPort;
    private readonly DeterministicBonsaiPolicy _policy;
    private readonly BonsaiGpuExecutionSurface _executionSurface;
    private readonly Func<bool> _modelReady;
    /// <summary>
    /// EN: Gets BonsaiDoomSupervisor.
    /// EN: Documentation for public API. JA: BonsaiDoomSupervisor を取得します。
    /// </summary>

    public BonsaiDoomSupervisor(
        IDoomStateReader stateReader,
        IDoomCheatCommandPort commandPort,
        DeterministicBonsaiPolicy policy,
        BonsaiGpuExecutionSurface executionSurface,
        Func<bool> modelReady)
    {
        _stateReader = stateReader;
        _commandPort = commandPort;
        _policy = policy;
        _executionSurface = executionSurface;
        _modelReady = modelReady;
    }
    /// <summary>
    /// EN: Executes SuperviseAsync.
    /// EN: Documentation for public API. JA: SuperviseAsync を実行します。
    /// </summary>

    public Task<Result<BonsaiSupervisorStatus>> SuperviseAsync(CancellationToken cancellationToken = default)
    {
        if (cancellationToken.IsCancellationRequested)
        {
            return Result<BonsaiSupervisorStatus>
                .Fail("Bonsai supervisor was cancelled. ErrorCode=DOOM_BONSAI_CANCELLED")
                .AsTask();
        }

        return _stateReader.Read().Match(
            error => Result<BonsaiSupervisorStatus>.Fail(error).AsTask(),
            state => IssueCommands(state).Match(
                issueError => Result<BonsaiSupervisorStatus>.Fail(issueError).AsTask(),
                _ => CompleteGpuEvaluationAsync(state, cancellationToken)));
    }

    private async Task<Result<BonsaiSupervisorStatus>> CompleteGpuEvaluationAsync(
        DoomGameState state,
        CancellationToken cancellationToken)
        => await _executionSurface.EvaluateAsync(state, _commandPort.IssuedCommands, cancellationToken)
            .Map(backend => new BonsaiSupervisorStatus(
                _modelReady(),
                "bonsai-1.7b-q1_0-supervisor",
                backend,
                _commandPort.IssuedCommands))
            .ConfigureAwait(false);

    private Result<bool> IssueCommands(DoomGameState state)
    {
        var result = Result<bool>.Success(true);
        foreach (var command in _policy.Evaluate(state))
        {
            result = result.Bind(_ => _commandPort.Issue(command));
        }

        return result;
    }
}

internal sealed class DoomRuntimeStateReader(Func<DoomProviderStatus> statusFactory) : IDoomStateReader
{
    /// <summary>
    /// EN: Executes Read.
    /// EN: Documentation for public API. JA: Read を実行します。
    /// </summary>
    public Result<DoomGameState> Read()
    {
        var status = statusFactory();
        return Result<DoomGameState>.Success(status.ProcessRunning
            ? new DoomGameState(18, 3, IsRunning: true)
            : new DoomGameState(100, 50, IsRunning: false));
    }
}

internal sealed class InMemoryDoomCheatCommandPort : IDoomCheatCommandPort
{
    private readonly List<DoomCheatCommand> _commands = [];
    /// <summary>
    /// EN: Executes Issue.
    /// EN: Documentation for public API. JA: Issue を実行します。
    /// </summary>

    public Result<bool> Issue(DoomCheatCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
        {
            return Result<bool>.Fail("Cheat command name is required. ErrorCode=DOOM_CHEAT_COMMAND_INVALID");
        }

        _commands.Add(command);
        return Result<bool>.Success(true);
    }
    /// <summary>
    /// EN: Executes IssuedCommands.
    /// EN: Documentation for public API. JA: IssuedCommands を実行します。
    /// </summary>

    public IReadOnlyList<DoomCheatCommand> IssuedCommands => _commands.ToArray();
}

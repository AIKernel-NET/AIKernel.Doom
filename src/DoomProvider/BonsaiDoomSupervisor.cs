namespace AIKernel.Doom.Provider;

using AIKernel.Common.Results;

public sealed record DoomGameState(int Health, int Ammo, bool IsRunning);

public sealed record DoomCheatCommand(string Name, string Reason);

public sealed record BonsaiSupervisorStatus(
    bool ModelReady,
    string Mode,
    string Backend,
    IReadOnlyList<DoomCheatCommand> IssuedCommands);

public interface IDoomStateReader
{
    Result<DoomGameState> Read();
}

public interface IDoomCheatCommandPort
{
    Result<bool> Issue(DoomCheatCommand command);

    IReadOnlyList<DoomCheatCommand> IssuedCommands { get; }
}

public interface IBonsaiDoomSupervisor
{
    Task<Result<BonsaiSupervisorStatus>> SuperviseAsync(CancellationToken cancellationToken = default);
}

public sealed class DeterministicBonsaiPolicy
{
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

public sealed class BonsaiDoomSupervisor : IBonsaiDoomSupervisor
{
    private readonly IDoomStateReader _stateReader;
    private readonly IDoomCheatCommandPort _commandPort;
    private readonly DeterministicBonsaiPolicy _policy;
    private readonly BonsaiGpuExecutionSurface _executionSurface;
    private readonly Func<bool> _modelReady;

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

    public Result<bool> Issue(DoomCheatCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
        {
            return Result<bool>.Fail("Cheat command name is required. ErrorCode=DOOM_CHEAT_COMMAND_INVALID");
        }

        _commands.Add(command);
        return Result<bool>.Success(true);
    }

    public IReadOnlyList<DoomCheatCommand> IssuedCommands => _commands.ToArray();
}

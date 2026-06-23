namespace AIKernel.Doom.Provider;

using AIKernel.Common.Results;

/// <summary>
/// [EN] Defines the <c>DoomGameState</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomGameState</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="Health">
/// [EN] Supplies the <c>Health</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Health</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Ammo">
/// [EN] Supplies the <c>Ammo</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Ammo</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="IsRunning">
/// [EN] Supplies the <c>IsRunning</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>IsRunning</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record DoomGameState(int Health, int Ammo, bool IsRunning);

/// <summary>
/// [EN] Defines the <c>DoomCheatCommand</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomCheatCommand</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="Name">
/// [EN] Supplies the <c>Name</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Name</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Reason">
/// [EN] Supplies the <c>Reason</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Reason</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record DoomCheatCommand(string Name, string Reason);

/// <summary>
/// [EN] Defines the <c>BonsaiSupervisorStatus</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>BonsaiSupervisorStatus</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="ModelReady">
/// [EN] Supplies the <c>ModelReady</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>ModelReady</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Mode">
/// [EN] Supplies the <c>Mode</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Mode</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Backend">
/// [EN] Supplies the <c>Backend</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Backend</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="IssuedCommands">
/// [EN] Supplies the <c>IssuedCommands</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>IssuedCommands</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record BonsaiSupervisorStatus(
    bool ModelReady,
    string Mode,
    string Backend,
    IReadOnlyList<DoomCheatCommand> IssuedCommands);

/// <summary>
/// [EN] Defines the <c>IDoomStateReader</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>IDoomStateReader</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public interface IDoomStateReader
{
    /// <summary>
    /// [EN] Reads the latest Doom game state used by the Bonsai supervisor.
    /// [JA] Bonsai supervisor が使用する最新の Doom game state を読み取ります。
    /// </summary>
    /// <returns>
    /// [EN] The current game state or a failure result if the runtime state cannot be read.
    /// [JA] 現在の game state、または runtime state を読み取れない場合の failure result です。
    /// </returns>
    Result<DoomGameState> Read();
}

/// <summary>
/// [EN] Defines the <c>IDoomCheatCommandPort</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>IDoomCheatCommandPort</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public interface IDoomCheatCommandPort
{
    /// <summary>
    /// [EN] Issues a deterministic Doom command for supervised debug or recovery behavior.
    /// [JA] supervised debug または recovery behavior のために決定論的な Doom command を発行します。
    /// </summary>
    /// <param name="command">
    /// [EN] The command name and reason to record in the command log.
    /// [JA] command log に記録する command name と reason です。
    /// </param>
    /// <returns>
    /// [EN] A result that indicates whether the command was accepted by the port.
    /// [JA] command が port に受け付けられたかどうかを示す result です。
    /// </returns>
    Result<bool> Issue(DoomCheatCommand command);

    /// <summary>
    /// [EN] Gets the sequence of commands issued through this port.
    /// [JA] この port 経由で発行された command sequence を取得します。
    /// </summary>
    IReadOnlyList<DoomCheatCommand> IssuedCommands { get; }
}

/// <summary>
/// [EN] Defines the <c>IBonsaiDoomSupervisor</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>IBonsaiDoomSupervisor</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public interface IBonsaiDoomSupervisor
{
    /// <summary>
    /// [EN] Runs one supervised Bonsai control pass and returns its observable status.
    /// [JA] supervised Bonsai control pass を一度実行し、観測可能な status を返します。
    /// </summary>
    /// <param name="cancellationToken">
    /// [EN] The cancellation token used to stop supervision during shutdown.
    /// [JA] shutdown 中に supervision を停止するための cancellation token です。
    /// </param>
    /// <returns>
    /// [EN] A status packet describing model readiness, backend, and issued commands.
    /// [JA] model readiness、backend、issued command を説明する status packet です。
    /// </returns>
    Task<Result<BonsaiSupervisorStatus>> SuperviseAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// [EN] Defines the <c>DeterministicBonsaiPolicy</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DeterministicBonsaiPolicy</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class DeterministicBonsaiPolicy
{
    /// <summary>
    /// EN: Executes Evaluate.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Evaluate を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
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
/// [EN] Defines the <c>BonsaiDoomSupervisor</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>BonsaiDoomSupervisor</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class BonsaiDoomSupervisor : IBonsaiDoomSupervisor
{
    private readonly IDoomStateReader _stateReader;
    private readonly IDoomCheatCommandPort _commandPort;
    private readonly DeterministicBonsaiPolicy _policy;
    private readonly BonsaiGpuExecutionSurface _executionSurface;
    private readonly Func<bool> _modelReady;
    /// <summary>
    /// EN: Gets BonsaiDoomSupervisor.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] BonsaiDoomSupervisor を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
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
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SuperviseAsync を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>SuperviseAsync</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SuperviseAsync</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="cancellationToken">
    /// [EN] Supplies the <c>cancellationToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>cancellationToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Read を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
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
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Issue を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>Issue</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Issue</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="command">
    /// [EN] Supplies the <c>command</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>command</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] IssuedCommands を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>IssuedCommands</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>IssuedCommands</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public IReadOnlyList<DoomCheatCommand> IssuedCommands => _commands.ToArray();
}

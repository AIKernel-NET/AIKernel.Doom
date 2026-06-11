namespace AIKernel.Doom.Demo;

using AIKernel.Doom.Capabilities;
using AIKernel.Doom.Provider;
using AIKernel.Doom.Wasm;
using AIKernel.Dtos.Capabilities;

internal static class Program
{
    private static async Task<int> Main(string[] args)
    {
        try
        {
            var baseDirectory = AppContext.BaseDirectory;
            var romPath = Path.Combine(baseDirectory, "samples", "doom.rom");
            var provider = new DoomProvider(new DoomProviderOptions
            {
                PreferWebGpu = true,
                BonsaiModelPath = null,
                Wasm = new DoomWasmOptions
                {
                    RomPath = romPath,
                    CacheRoot = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "AIKernel",
                        "Doom"),
                    AllowSimulatedWasm = true
                }
            });

            var invoker = new DoomCapabilityInvoker(provider);
            await provider.InitializeAsync().ConfigureAwait(false);

            PrintBootSequence();
            var approval = DoomCliApprovalRequest.ForRuntimeData();
            PrintSuspendedApproval(approval);
            Console.WriteLine();
            Console.WriteLine("AIKernel.Doom CLI ready. Type 'yes' to approve, or 'help' for commands.");

            await RunCliAsync(invoker, provider, approval).ConfigureAwait(false);
            await provider.ShutdownAsync().ConfigureAwait(false);
            return 0;
        }
        catch (Exception ex)
        {
            WriteFailure($"Unhandled boundary failure was converted at CLI edge: {ex.Message}");
            return 1;
        }
    }

    private static void PrintBootSequence()
    {
        Console.WriteLine("AIKernel Semantic OS :: DOOM WASM Demo");
        Console.WriteLine("boot> provider.scan aikernel.doom.provider");
        Console.WriteLine("boot> wasm.runtime.bind");
        Console.WriteLine("boot> vfs.mount samples/doom.rom");
        Console.WriteLine("boot> capability.registry doom.start doom.stop doom.status");
        Console.WriteLine("boot> bonsai1b.supervisor arm");
        Console.WriteLine();
    }

    private static void PrintSuspendedApproval(DoomCliApprovalRequest approval)
    {
        Console.WriteLine("[suspend] user_approval required");
        Console.WriteLine($"reason> {approval.Reason}");
        Console.WriteLine($"terms> {approval.Terms}");
        Console.WriteLine($"download> {approval.DownloadDescription}");
        Console.WriteLine($"legal> {approval.LegalUrl}");
        Console.WriteLine($"hintWord> {approval.HintWord}");
        Console.WriteLine("approve> type 'yes' to accept and continue, or 'no' to keep the runtime suspended.");
    }

    private static async Task RunCliAsync(
        DoomCapabilityInvoker invoker,
        DoomProvider provider,
        DoomCliApprovalRequest approval)
    {
        while (true)
        {
            Console.Write("aik> ");
            var line = Console.ReadLine();
            if (line is null)
            {
                return;
            }

            var command = line.Trim();
            if (command.Length == 0)
            {
                continue;
            }

            if (command is "exit" or "quit")
            {
                return;
            }

            if (approval.TryParse(command, out var approved))
            {
                if (!approved)
                {
                    Console.WriteLine("suspended: approval not granted. Type 'yes' when you accept hosted WAD/model/WASM download and load.");
                    continue;
                }

                await ApproveAndPrepareAsync(provider, approval).ConfigureAwait(false);
                continue;
            }

            if (TryRunStandardCommand(command, provider, approval))
            {
                continue;
            }

            if (approval.IsPending && IsRuntimeCommand(command))
            {
                Console.WriteLine($"suspended: {approval.Reason}. hintWord={approval.HintWord}");
                continue;
            }

            var result = await InvokeCommandAsync(invoker, command).ConfigureAwait(false);
            Console.WriteLine(result.Succeeded
                ? result.Metadata.GetValueOrDefault("status.text", "ok")
                : $"fail-closed: {result.ErrorMessage}");
        }
    }

    private static async Task ApproveAndPrepareAsync(DoomProvider provider, DoomCliApprovalRequest approval)
    {
        if (!approval.IsPending)
        {
            Console.WriteLine("[ok] approval already recorded");
            return;
        }

        var prepared = await provider.TryPrepareAsync(approval.ToConsentGrant()).ConfigureAwait(false);
        prepared.Match(
            error =>
            {
                approval.Reject(error.Message);
                WriteFailure(error.Message);
                return false;
            },
            _ =>
            {
                approval.Approve();
                Console.WriteLine("[ok] approval recorded");
                Console.WriteLine("[ok] Bonsai-1.7B supervisor ready");
                Console.WriteLine("[ok] DOOM WASM loader ready");
                Console.WriteLine("ready> aik exec run doom");
                return true;
            });
    }

    private static bool IsRuntimeCommand(string command)
        => command is "aik exec run doom"
            or "aik capabilities invoke doom.start"
            or "doom.start"
            or "aik run doom"
            or "run doom";

    private static bool TryRunStandardCommand(
        string command,
        DoomProvider provider,
        DoomCliApprovalRequest approval)
    {
        switch (command)
        {
            case "help":
            case "aik help":
            case "aik --help":
            case "--help":
            case "-h":
                PrintHelp(approval);
                return true;

            case "aik help commands":
            case "aik commands":
                PrintCommandHelp(approval);
                return true;

            case "aik help approval":
            case "aik help approve":
                PrintApprovalHelp(approval);
                return true;

            case "aik help doom":
            case "aik help run":
                PrintDoomHelp();
                return true;

            case "aik help capabilities":
            case "aik help capability":
                PrintCapabilityHelp();
                return true;

            case "aik help providers":
            case "aik help provider":
                PrintProviderHelp();
                return true;

            case "version":
            case "aik version":
            case "--version":
                Console.WriteLine("AIKernel.Doom CLI 0.1.0");
                Console.WriteLine(".NET 10 target; AIKernel semantic WASM demo");
                return true;

            case "clear":
            case "cls":
                Console.Clear();
                return true;

            case "status":
            case "aik status":
                PrintProviderStatus(provider, verbose: false);
                return true;

            case "status --verbose":
            case "aik status --verbose":
                PrintProviderStatus(provider, verbose: true);
                return true;

            case "providers":
            case "aik providers":
            case "aik providers list":
                Console.WriteLine($"{provider.ProviderId}\t{provider.Name}\t{provider.Version}");
                return true;

            case "capabilities":
            case "aik capabilities":
            case "aik capabilities list":
                Console.WriteLine("doom.start");
                Console.WriteLine("doom.stop");
                Console.WriteLine("doom.status");
                return true;

            case "approval":
            case "aik approval":
            case "aik approval status":
                PrintApprovalStatus(approval);
                return true;

            default:
                return false;
        }
    }

    private static void PrintProviderStatus(DoomProvider provider, bool verbose)
    {
        provider.TryStatus(verbose).Match(
            error =>
            {
                WriteFailure(error.Message);
                return false;
            },
            status =>
            {
                Console.WriteLine(status.DisplayText);
                if (verbose)
                {
                    Console.WriteLine($"state={status.State}");
                    Console.WriteLine($"wasmLoaded={status.WasmLoaded}");
                    Console.WriteLine($"processRunning={status.ProcessRunning}");
                    Console.WriteLine($"backend={status.Backend}");
                    Console.WriteLine($"modelReady={status.ModelReady}");
                    Console.WriteLine($"simulatedWasm={status.IsSimulatedWasm}");
                    Console.WriteLine($"processState={status.ProcessState}");
                    Console.WriteLine($"supervisor={status.SupervisorState}");
                }

                return true;
            });
    }

    private static void PrintApprovalStatus(DoomCliApprovalRequest approval)
    {
        Console.WriteLine(approval.IsPending
            ? $"suspended: {approval.Reason}. hintWord={approval.HintWord}"
            : $"approval: {approval.Decision}");
        if (!string.IsNullOrWhiteSpace(approval.Failure))
        {
            Console.WriteLine($"lastFailure={approval.Failure}");
        }
    }

    private static Task<CapabilityInvocationResult> InvokeCommandAsync(
        DoomCapabilityInvoker invoker,
        string command)
    {
        var capability = command switch
        {
            "aik exec run doom" => "doom.start",
            "aik run doom" => "doom.start",
            "run doom" => "doom.start",
            "doom.start" => "doom.start",
            "aik capabilities invoke doom.start" => "doom.start",
            "doom.stop" => "doom.stop",
            "aik capabilities invoke doom.stop" => "doom.stop",
            "doom.status" => "doom.status",
            "aik capabilities invoke doom.status" => "doom.status",
            "aik capabilities invoke doom.status --verbose" => "doom.status",
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(capability))
        {
            return Task.FromResult(new CapabilityInvocationResult(
                Guid.NewGuid().ToString("N"),
                "doom.unknown",
                Succeeded: false,
                OutputHash: null,
                ErrorCode: "DOOM_CLI_COMMAND_INVALID",
                ErrorMessage: "Unknown command. Try: aik exec run doom, aik capabilities invoke doom.start, doom.stop, doom.status",
                ReplayLogHash: null,
                Metadata: new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["command"] = command
                }));
        }

        var request = new CapabilityInvocationRequest(
            Guid.NewGuid().ToString("N"),
            capability,
            capability,
            command.Contains("--verbose", StringComparison.Ordinal)
                ? new Dictionary<string, string>(StringComparer.Ordinal) { ["verbose"] = "true" }
                : new Dictionary<string, string>(StringComparer.Ordinal),
            InputHash: null,
            ReplayLogHash: null,
            Metadata: new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["cli.command"] = command
            });

        return invoker.InvokeAsync(request).AsTask();
    }

    private static void PrintHelp(DoomCliApprovalRequest approval)
    {
        Console.WriteLine("AIKernel.Doom CLI help");
        Console.WriteLine("aik help commands");
        Console.WriteLine("aik help approval");
        Console.WriteLine("aik help doom");
        Console.WriteLine("aik help capabilities");
        Console.WriteLine("aik help providers");
        Console.WriteLine();
        PrintCommandHelp(approval);
    }

    private static void PrintCommandHelp(DoomCliApprovalRequest approval)
    {
        if (approval.IsPending)
        {
            Console.WriteLine("yes");
            Console.WriteLine("approve");
            Console.WriteLine("aik approve doom.runtime-download");
            Console.WriteLine("approval | aik approval status");
        }

        Console.WriteLine("help | aik help");
        Console.WriteLine("version | aik version");
        Console.WriteLine("status | aik status");
        Console.WriteLine("providers | aik providers list");
        Console.WriteLine("capabilities | aik capabilities list");
        Console.WriteLine("aik exec run doom");
        Console.WriteLine("aik capabilities invoke doom.start");
        Console.WriteLine("aik capabilities invoke doom.stop");
        Console.WriteLine("aik capabilities invoke doom.status");
        Console.WriteLine("clear | cls");
        Console.WriteLine("exit | quit");
    }

    private static void PrintApprovalHelp(DoomCliApprovalRequest approval)
    {
        Console.WriteLine("Approval is required before runtime data acquisition or doom.start.");
        Console.WriteLine($"reason: {approval.Reason}");
        Console.WriteLine($"terms: {approval.Terms}");
        Console.WriteLine($"download: {approval.DownloadDescription}");
        Console.WriteLine($"legal: {approval.LegalUrl}");
        Console.WriteLine($"hintWord: {approval.HintWord}");
        Console.WriteLine("approve commands: yes | y | approve | aik approve doom.runtime-download");
        Console.WriteLine("reject commands: no | n | reject | aik reject doom.runtime-download");
    }

    private static void PrintDoomHelp()
    {
        Console.WriteLine("aik exec run doom");
        Console.WriteLine("aik capabilities invoke doom.start");
        Console.WriteLine("aik capabilities invoke doom.stop");
        Console.WriteLine("aik capabilities invoke doom.status");
        Console.WriteLine("aik capabilities invoke doom.status --verbose");
    }

    private static void PrintCapabilityHelp()
    {
        Console.WriteLine("aik capabilities list");
        Console.WriteLine("aik capabilities invoke doom.start");
        Console.WriteLine("aik capabilities invoke doom.stop");
        Console.WriteLine("aik capabilities invoke doom.status");
    }

    private static void PrintProviderHelp()
    {
        Console.WriteLine("aik providers list");
        Console.WriteLine("aik status");
        Console.WriteLine("aik status --verbose");
    }

    private static void WriteFailure(string message)
    {
        Console.Error.WriteLine($"fail-closed: {message}");
    }
}

internal sealed class DoomCliApprovalRequest
{
    private static readonly string[] PositiveWords = ["yes", "y", "approve", "accept", "同意", "承認"];
    private static readonly string[] NegativeWords = ["no", "n", "reject", "deny", "拒否"];

    private DoomCliApprovalRequest(
        string reason,
        string terms,
        string downloadDescription,
        string legalUrl,
        string hintWord)
    {
        Reason = reason;
        Terms = terms;
        DownloadDescription = downloadDescription;
        LegalUrl = legalUrl;
        HintWord = hintWord;
    }

    public string Reason { get; }

    public string Terms { get; }

    public string DownloadDescription { get; }

    public string LegalUrl { get; }

    public string HintWord { get; }

    public bool IsPending { get; private set; } = true;

    public string? Decision { get; private set; }

    public string? Failure { get; private set; }

    public static DoomCliApprovalRequest ForRuntimeData()
        => new(
            "terms_and_runtime_data_download",
            "Accept the AIKernel.Doom demo terms and third-party asset/license responsibility.",
            "Allow this deployment to download, cache, load, and use hosted DOOM1.WAD, Bonsai-1.7B-Q1_0.gguf, doom.wasm, manifests, and demo metadata after consent. Current estimate is about 270MB and under 300MB.",
            "/demo/doom/terms-and-licenses.html",
            "yes");

    public bool TryParse(string command, out bool approved)
    {
        var normalized = Normalize(command);
        approved = false;

        if (PositiveWords.Contains(normalized, StringComparer.Ordinal)
            || normalized is "aik approve doom.runtime-download"
            or "aik approve doom.download"
            or "aik approve doom")
        {
            approved = true;
            return true;
        }

        if (NegativeWords.Contains(normalized, StringComparer.Ordinal)
            || normalized is "aik reject doom.runtime-download"
            or "aik reject doom.download"
            or "aik reject doom")
        {
            return true;
        }

        return false;
    }

    public DoomConsentGrant ToConsentGrant()
        => new(
            AcceptedTerms: true,
            AllowDataDownload: true,
            AllowBonsaiModelDownload: true,
            AllowDoomWasmLoad: true);

    public void Approve()
    {
        IsPending = false;
        Decision = "approved";
        Failure = null;
    }

    public void Reject(string reason)
    {
        IsPending = true;
        Decision = "rejected";
        Failure = reason;
    }

    private static string Normalize(string command)
        => command.Trim().ToLowerInvariant();
}

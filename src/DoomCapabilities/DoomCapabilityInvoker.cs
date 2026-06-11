namespace AIKernel.Doom.Capabilities;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AIKernel.Abstractions.Capabilities;
using AIKernel.Common.Results;
using AIKernel.Doom.Provider;
using AIKernel.Dtos.Capabilities;

public sealed class DoomCapabilityInvoker : ICapabilityModuleInvoker
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly DoomProvider _provider;

    public DoomCapabilityInvoker(DoomProvider provider)
    {
        _provider = provider;
    }

    public async ValueTask<CapabilityInvocationResult> InvokeAsync(
        CapabilityInvocationRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var metadata = new Dictionary<string, string>(request.Metadata, StringComparer.Ordinal)
        {
            ["provider"] = _provider.ProviderId,
            ["operation"] = request.Operation
        };

        return request.CapabilityId switch
        {
            "doom.start" => await InvokeStartAsync(request, metadata, cancellationToken).ConfigureAwait(false),
            "doom.stop" => await InvokeStopAsync(request, metadata, cancellationToken).ConfigureAwait(false),
            "doom.status" => InvokeStatus(request, metadata),
            _ => Fail(request, metadata, "DOOM_CAPABILITY_NOT_REGISTERED", "Unsupported DOOM capability.")
        };
    }

    private async Task<CapabilityInvocationResult> InvokeStartAsync(
        CapabilityInvocationRequest request,
        Dictionary<string, string> metadata,
        CancellationToken cancellationToken)
    {
        var result = await _provider.TryStartDoomAsync(cancellationToken).ConfigureAwait(false);
        return result.Match(
            error => Fail(request, metadata, "DOOM_START_FAILED", error.Message),
            _ => StatusResult(request, metadata, ReadVerbose(request)));
    }

    private async Task<CapabilityInvocationResult> InvokeStopAsync(
        CapabilityInvocationRequest request,
        Dictionary<string, string> metadata,
        CancellationToken cancellationToken)
    {
        var result = await _provider.TryStopDoomAsync(cancellationToken).ConfigureAwait(false);
        return result.Match(
            error => Fail(request, metadata, "DOOM_STOP_FAILED", error.Message),
            _ => StatusResult(request, metadata, ReadVerbose(request)));
    }

    private CapabilityInvocationResult InvokeStatus(
        CapabilityInvocationRequest request,
        Dictionary<string, string> metadata)
    {
        return StatusResult(request, metadata, ReadVerbose(request));
    }

    private CapabilityInvocationResult StatusResult(
        CapabilityInvocationRequest request,
        Dictionary<string, string> metadata,
        bool verbose)
        => _provider.TryStatus(verbose).Match(
            error => Fail(request, metadata, "DOOM_STATUS_FAILED", error.Message),
            status => Success(request, metadata, status));

    private static CapabilityInvocationResult Success(
        CapabilityInvocationRequest request,
        Dictionary<string, string> metadata,
        DoomProviderStatus status)
    {
        var json = JsonSerializer.Serialize(status, JsonOptions);
        metadata["status.json"] = json;
        metadata["status.text"] = status.DisplayText;
        metadata["state"] = status.State.ToString();
        metadata["backend"] = status.Backend.ToString();
        metadata["wasm.loaded"] = status.WasmLoaded.ToString().ToLowerInvariant();
        metadata["process.running"] = status.ProcessRunning.ToString().ToLowerInvariant();

        return new CapabilityInvocationResult(
            request.InvocationId,
            request.CapabilityId,
            Succeeded: true,
            OutputHash: Hash(json),
            ErrorCode: null,
            ErrorMessage: null,
            ReplayLogHash: request.ReplayLogHash,
            Metadata: metadata.OrderBy(x => x.Key, StringComparer.Ordinal)
                .ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal));
    }

    private static CapabilityInvocationResult Fail(
        CapabilityInvocationRequest request,
        Dictionary<string, string> metadata,
        string code,
        string message)
    {
        metadata["error"] = message;
        return new CapabilityInvocationResult(
            request.InvocationId,
            request.CapabilityId,
            Succeeded: false,
            OutputHash: null,
            ErrorCode: code,
            ErrorMessage: message,
            ReplayLogHash: request.ReplayLogHash,
            Metadata: metadata);
    }

    private static bool ReadVerbose(CapabilityInvocationRequest request)
        => request.Arguments.TryGetValue("verbose", out var verbose)
           && bool.TryParse(verbose, out var enabled)
           && enabled;

    private static string Hash(string text)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))).ToLowerInvariant();
}

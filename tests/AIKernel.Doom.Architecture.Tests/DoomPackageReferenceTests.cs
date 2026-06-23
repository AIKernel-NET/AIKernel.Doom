namespace AIKernel.Doom.Architecture.Tests;

public sealed class DoomPackageReferenceTests
{
    [Fact]
    public void DoomReferencesOfficialAIKernelCanon013Packages()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var props = File.ReadAllText(Path.Combine(root, "Directory.Build.props"));
        var nugetConfig = File.ReadAllText(Path.Combine(root, "NuGet.config"));

        Assert.Contains("<StablePackageVersion>0.1.3</StablePackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<LocalPackageVersionPrefix>0.1.3</LocalPackageVersionPrefix>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelPackageVersion Condition=\"'$(UseLocalPackageVersion)' == 'true'\">[$(LocalPackageVersionPrefix)-dev$(LocalPackageBuildNumber)]</AIKernelPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelPackageVersion Condition=\"'$(UseLocalPackageVersion)' != 'true'\">[$(StablePackageVersion)]</AIKernelPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelCorePackageVersion Condition=\"'$(UseLocalPackageVersion)' == 'true'\">$(LocalPackageVersionPrefix)-dev$(LocalPackageBuildNumber)</AIKernelCorePackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelProvidersPackageVersion Condition=\"'$(UseLocalPackageVersion)' == 'true'\">$(LocalPackageVersionPrefix)-dev$(LocalPackageBuildNumber)</AIKernelProvidersPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelWasmRuntimePackageVersion Condition=\"'$(UseLocalPackageVersion)' == 'true'\">$(LocalPackageVersionPrefix)-dev$(LocalPackageBuildNumber)</AIKernelWasmRuntimePackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelWasmWebGpuComputeProviderPackageVersion Condition=\"'$(UseLocalPackageVersion)' == 'true'\">$(LocalPackageVersionPrefix)-dev$(LocalPackageBuildNumber)</AIKernelWasmWebGpuComputeProviderPackageVersion>", props, StringComparison.Ordinal);
        Assert.DoesNotContain(OldVersion(2), props, StringComparison.Ordinal);
        Assert.DoesNotContain($"{OldVersion(1)}.1-dev", props, StringComparison.Ordinal);
        Assert.DoesNotContain($"<AIKernelPackageVersion>[{OldVersion(1)}.1]</AIKernelPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("https://api.nuget.org/v3/index.json", nugetConfig, StringComparison.Ordinal);
        Assert.DoesNotContain("artifacts", nugetConfig, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("local-packages", nugetConfig, StringComparison.OrdinalIgnoreCase);
    }

    private static string OldVersion(int patch) => $"0.1.{patch}";

    private static string FindRepoRoot(string start)
    {
        var directory = new DirectoryInfo(start);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AIKernel.Doom.slnx")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate AIKernel.Doom repository root.");
    }
}

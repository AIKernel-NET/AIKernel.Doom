namespace AIKernel.Doom.Architecture.Tests;

public sealed class DoomPackageReferenceTests
{
    [Fact]
    public void DoomReferencesOfficialAIKernelCanon012Packages()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var props = File.ReadAllText(Path.Combine(root, "Directory.Build.props"));
        var nugetConfig = File.ReadAllText(Path.Combine(root, "NuGet.config"));

        Assert.Contains("<StablePackageVersion>0.1.2</StablePackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelPackageVersion>[0.1.2]</AIKernelPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelCorePackageVersion>0.1.2</AIKernelCorePackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelProvidersPackageVersion>0.1.2</AIKernelProvidersPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelWasmRuntimePackageVersion>0.1.2</AIKernelWasmRuntimePackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("<AIKernelWasmWebGpuComputeProviderPackageVersion>0.1.2</AIKernelWasmWebGpuComputeProviderPackageVersion>", props, StringComparison.Ordinal);
        Assert.DoesNotContain("0.1.1.1-dev", props, StringComparison.Ordinal);
        Assert.DoesNotContain("<AIKernelPackageVersion>[0.1.1.1]</AIKernelPackageVersion>", props, StringComparison.Ordinal);
        Assert.Contains("https://api.nuget.org/v3/index.json", nugetConfig, StringComparison.Ordinal);
        Assert.DoesNotContain("artifacts", nugetConfig, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("local-packages", nugetConfig, StringComparison.OrdinalIgnoreCase);
    }

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

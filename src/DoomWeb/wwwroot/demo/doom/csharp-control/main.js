import { dotnet } from "./_framework/dotnet.js";

const runtime = await dotnet
    .withDiagnosticTracing(false)
    .create();
const config = runtime.getConfig();
const exports = await runtime.getAssemblyExports(config.mainAssemblyName);
const bridge = exports.AIKernel.Doom.ControlBrowser.FirstDoorControlBrowserBridge;

globalThis.aiKernelDoomControl = Object.freeze({
    evaluateBrowserFirstDoor(input) {
        const returnsJson = typeof input === "string";
        const inputJson = returnsJson ? input : JSON.stringify(input);
        const decisionJson = bridge.EvaluateBrowser(inputJson);
        return returnsJson ? decisionJson : JSON.parse(decisionJson);
    },
    evaluateBrowserPostComputerRoomRoute(input) {
        const returnsJson = typeof input === "string";
        const inputJson = returnsJson ? input : JSON.stringify(input);
        const decisionJson = bridge.EvaluateBrowserPostComputerRoomRoute(inputJson);
        return returnsJson ? decisionJson : JSON.parse(decisionJson);
    },
    evaluateBrowserE1M1Continuation(input) {
        const returnsJson = typeof input === "string";
        const inputJson = returnsJson ? input : JSON.stringify(input);
        const decisionJson = bridge.EvaluateBrowserE1M1Continuation(inputJson);
        return returnsJson ? decisionJson : JSON.parse(decisionJson);
    },
    releaseBrowserFirstDoorSession(sessionId) {
        return bridge.ReleaseBrowserSession(String(sessionId || ""));
    }
});

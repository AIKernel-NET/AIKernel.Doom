using System.Text.Json.Serialization;
using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.ControlBrowser;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
    UseStringEnumConverter = true,
    GenerationMode = JsonSourceGenerationMode.Metadata)]
[JsonSerializable(typeof(FirstDoorControlDecision))]
[JsonSerializable(typeof(FirstDoorAcquisitionTrace))]
[JsonSerializable(typeof(FirstDoorProximityObservation))]
[JsonSerializable(typeof(FirstDoorPlayerVitalityTrace))]
[JsonSerializable(typeof(FirstDoorOpeningNavigationSnapshot))]
[JsonSerializable(typeof(FirstDoorOpeningNavigationStatus))]
[JsonSerializable(typeof(FirstDoorOpeningNavigationBlockCode))]
[JsonSerializable(typeof(FirstDoorAppliedUseAckSnapshot))]
[JsonSerializable(typeof(FirstDoorTransitionReplaySnapshot))]
[JsonSerializable(typeof(FirstDoorSemanticDelta))]
[JsonSerializable(typeof(BrowserFirstDoorControlInput))]
[JsonSerializable(typeof(BrowserFirstDoorRawObservation))]
[JsonSerializable(typeof(FirstDoorRawReplayObservation))]
[JsonSerializable(typeof(FirstDoorIdentityWindowTraceEntry))]
[JsonSerializable(typeof(BrowserFirstDoorAudioInput))]
[JsonSerializable(typeof(BrowserNativeAudioEventInput))]
[JsonSerializable(typeof(BrowserAppliedActionAck))]
[JsonSerializable(typeof(BrowserPostComputerRoomRouteInput))]
[JsonSerializable(typeof(PostComputerRoomNativeWeaponSnapshot))]
[JsonSerializable(typeof(PostComputerRoomNativeActorSnapshot))]
[JsonSerializable(typeof(PostComputerRoomNativeActorFact))]
[JsonSerializable(typeof(PostComputerRoomRouteDecision))]
[JsonSerializable(typeof(PostComputerRoomCombatObservation))]
[JsonSerializable(typeof(PostComputerRoomRouteNavigationSnapshot))]
[JsonSerializable(typeof(PostComputerRoomRouteSemanticProjection))]
[JsonSerializable(typeof(PostComputerRoomFailureTrace))]
[JsonSerializable(typeof(PostComputerRoomRouteReplayEntry))]
[JsonSerializable(typeof(PostComputerRoomRouteState))]
[JsonSerializable(typeof(PostComputerRoomOwnershipDisposition))]
[JsonSerializable(typeof(FirstDoorControlState))]
[JsonSerializable(typeof(FirstDoorOwnershipUnit))]
[JsonSerializable(typeof(FirstDoorOwnershipDisposition))]
[JsonSerializable(typeof(FirstDoorOpenConfirmationSource))]
[JsonSerializable(typeof(FirstDoorEvidenceProvenance))]
[JsonSerializable(typeof(FirstDoorEvidenceTruth))]
[JsonSerializable(typeof(FirstDoorAcquisitionStatus))]
[JsonSerializable(typeof(FirstDoorAcquisitionBlockCode))]
[JsonSerializable(typeof(ActionCommand))]
internal sealed partial class FirstDoorControlJsonContext : JsonSerializerContext;

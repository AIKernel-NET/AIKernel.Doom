namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPhasePipelineDefaults
{
    public static List<AutoplayPhasePipelineDefinition> Create()
        =>
        [
            new()
            {
                Id = "retry-settle",
                When = "recoveryFrames > 0",
                Priority = 100,
                Exclusive = true,
                AllowedStageIds =
                [
                    "recovery-escape",
                    "stuck-escape",
                    "low-health-escape",
                    "low-health-goal-first"
                ],
                AllowedStagePrefixes =
                [
                    "recovery-",
                    "stuck-",
                    "low-health-"
                ]
            },
            new()
            {
                Id = "first-door-approach",
                When = "doorOpenedCount == 0 && routeMode == door-approach && firstDoorPhaseReady",
                Priority = 80,
                Exclusive = true,
                AllowedStageIds =
                [
                    "recovery-escape",
                    "stuck-escape",
                    "first-door-route-vision-approach",
                    "first-door-route-vision-hold",
                    "first-door-pattern-contact-use",
                    "first-door-gap-wall-probe-use",
                    "spawn-landmark-loop-ingress-trim",
                    "door-corner-probe",
                    "door-wall-probe",
                    "door-corridor-probe"
                ],
                AllowedStagePrefixes =
                [
                    "first-door-",
                    "door-approach-",
                    "door-corner-",
                    "door-wall-",
                    "door-corridor-",
                    "route-dead-end-",
                    "route-escape-",
                    "route-ingress-",
                    "route-planner-",
                    "closed-door-first-door-",
                    "closed-door-",
                    "spawn-barrel-",
                    "spawn-corner-",
                    "spawn-gap-",
                    "spawn-landmark-",
                    "stuck-",
                    "recovery-"
                ],
                ActionSequences =
                [
                    FirstDoorCornerUseSequence()
                ]
            },
            new()
            {
                Id = "opening-home",
                When = "doorOpenedCount == 0 && routeMode == spawn-approach",
                Priority = 60,
                Exclusive = true,
                AllowedStageIds =
                [
                    "recovery-escape",
                    "stuck-escape",
                    "wall-follow-fallback",
                    "open-space-cruise",
                    "demo-spawn-sense-settle-left",
                    "demo-spawn-sense-settle-right",
                    "demo-spawn-initial-foot-clear",
                    "route-planner-structural-advance"
                ],
                AllowedStagePrefixes =
                [
                    "demo-spawn-",
                    "spawn-",
                    "route-planner-",
                    "route-dead-end-",
                    "stuck-",
                    "recovery-"
                ]
            },
            new()
            {
                Id = "post-door-route",
                When = "doorOpenedCount > 0 && centralHallEntered == false",
                Priority = 50,
                Exclusive = true,
                AllowedStageIds =
                [
                    "low-health-escape",
                    "low-health-goal-first",
                    "recovery-escape",
                    "stuck-escape",
                    "combat-visual",
                    "combat-auditory",
                    "combat-visual-center-fire",
                    "computer-room-audio-enemy-orient",
                    "bridge-poison-straight-lock",
                    "bridge-poison-threat-bypass-lock",
                    "bridge-route-cruise",
                    "computer-room-route-cruise"
                ],
                AllowedStagePrefixes =
                [
                    "post-door-",
                    "computer-room-",
                    "bridge-",
                    "central-hall-",
                    "combat-",
                    "low-health-",
                    "recovery-",
                    "stuck-"
                ]
            },
            new()
            {
                Id = "central-hall-route",
                When = "centralHallEntered",
                Priority = 40,
                Exclusive = true,
                AllowedStagePrefixes =
                [
                    "central-hall-",
                    "final-room-",
                    "exit-switch-",
                    "combat-",
                    "low-health-",
                    "recovery-",
                    "stuck-"
                ]
            },
            new()
            {
                Id = "fallback-all",
                When = "true",
                Priority = 0,
                Exclusive = false
            }
        ];

    private static AutoplayActionSequenceDefinition FirstDoorCornerUseSequence()
        => new()
        {
            Id = "first-door-corner-use",
            Exclusive = true,
            MaxFrames = 180,
            TriggerStagePrefixes =
            [
                "closed-door-first-door-corner-sequence",
                "closed-door-first-door-corner-",
                "door-approach-wall-corner-backoff-before-use",
                "door-approach-right-corner-backoff",
                "door-approach-ingress-corner-backoff",
                "first-door-pattern-contact-use",
                "door-approach-weak-vision-contact-probe",
                "door-corner-probe",
                "door-wall-probe",
                "door-corridor-probe"
            ],
            Steps =
            [
                new()
                {
                    Id = "backoff",
                    Frames = 8,
                    Action = new()
                    {
                        ["moveBackward"] = "true",
                        ["moveForward"] = "false",
                        ["turnYaw"] = "0",
                        ["useKey"] = "false"
                    }
                },
                new()
                {
                    Id = "align-turn",
                    Frames = 18,
                    Action = new()
                    {
                        ["moveBackward"] = "false",
                        ["moveForward"] = "false",
                        ["turnYaw"] = "doorProbeYaw",
                        ["useKey"] = "false"
                    }
                },
                new()
                {
                    Id = "contact-forward",
                    Frames = 36,
                    Action = new()
                    {
                        ["moveForward"] = "true",
                        ["moveBackward"] = "false",
                        ["turnYaw"] = "0",
                        ["useKey"] = "false"
                    }
                },
                new()
                {
                    Id = "pre-use-stop",
                    Frames = 8,
                    Action = new()
                    {
                        ["moveForward"] = "false",
                        ["moveBackward"] = "false",
                        ["turnYaw"] = "0",
                        ["useKey"] = "false"
                    }
                },
                new()
                {
                    Id = "stop-use",
                    Frames = 8,
                    Action = new()
                    {
                        ["moveForward"] = "false",
                        ["moveBackward"] = "false",
                        ["turnYaw"] = "0",
                        ["useKey"] = "true"
                    }
                },
                new()
                {
                    Id = "post-use-settle",
                    Frames = 18,
                    Action = new()
                    {
                        ["moveForward"] = "false",
                        ["moveBackward"] = "false",
                        ["turnYaw"] = "0",
                        ["useKey"] = "false"
                    }
                }
            ]
        };
}

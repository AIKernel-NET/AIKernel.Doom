# Concept Elevation Notes / 概念昇格ノート

## Canonical Reference / 正典参照

Common naming rules are maintained in AIKernel.NET:

- `AIKernel.NET/docs/canonical-language/index.md`
- `AIKernel.NET/docs/design/concept-elevation-refactoring-design.md`
- `AIKernel.NET/docs/guidelines/concept-elevation-guidelines.md`
- `AIKernel.NET/docs/migration/concept-elevation-v0.1.1.1.md`
- `AIKernel.NET/docs/todo/concept-elevation-refactoring-todo.md`

## Doom Scope / Doom の対象範囲

AIKernel.Doom is a scenario repository. Concept facades are allowed only where
they describe scenario-level visual semantics, autoplay timing, and replay
windows. DOOM-specific mapping stays in this repository.

AIKernel.Doom は scenario repository です。concept facade は scenario-level の
visual semantics、autoplay timing、replay window を説明する範囲に限定します。
DOOM-specific mapping はこの repository に閉じます。

Added concept surfaces:

- `AIKernel.Doom.Provider.Concepts.PhantasiaDoomScene`
- `AIKernel.Doom.Provider.Concepts.KairosAutoPlayTrigger`
- `AIKernel.Doom.Provider.Concepts.ChronosReplayWindow`

## Guardrails / 境界ルール

- Doom providers do not move into AIKernel.Providers.
- Doom DTOs keep technical names and do not gain philosophical prefixes.
- Gate logic is not implemented in AIKernel.Doom.
- WASM runtime and input provider names remain technical names.

## Tests / テスト

`tests/AIKernel.Doom.Architecture.Tests/ConceptElevationArchitectureTests.cs`
guards the naming boundary and verifies scenario-level concept helpers.

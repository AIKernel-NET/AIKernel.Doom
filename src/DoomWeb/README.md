# DoomWeb

[日本語](README-ja.md)

`DoomWeb` contains the public Web runtime layer for the AIKernel.Doom browser demo.
It is intentionally source-only:

- JavaScript runtime bridge for `doom.wasm`
- Bonsai AutoPlay supervisor logic
- Browser `WebGpuComputeProvider` bridge and WebGPU texture path
- Public prompt bootstrap script
- Terms and license notice HTML

The project does **not** include third-party binary artifacts:

- `DOOM1.WAD` is not stored in this repository.
- Bonsai GGUF model files are not stored in this repository.
- Generated `doom.wasm` binaries are not stored here by default.

Deployment operators must host WAD, model, manifests, and generated WASM artifacts
outside this source package and only load them after explicit runtime consent.

## Deployment Layout

Copy `wwwroot` into a web host so the following source assets are available:

```text
/js/webgpu-provider.js
/js/bonsai.js
/js/doom.js
/js/doom-worker-proxy.js
/js/doom-worker.js
/demo/doom/js/doom-prompt.js
/demo/doom/terms-and-licenses.html
```

The public host must provide these external runtime files separately:

```text
/demo/doom/module.json
/demo/doom/doom.rom
/demo/doom/doom.wasm
/demo/doom/DOOM1.WAD
/models/bonsai1.7b/manifest.json
/models/bonsai1.7b/Bonsai-1.7B-Q1_0.gguf
/models/bonsai1.7b/LICENSE
/models/bonsai1.7b/NOTICE.txt
```

Do not commit those hosted binary/runtime artifacts to this project unless their
license and repository policy explicitly allow it.

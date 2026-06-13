# DoomWeb

[English](README.md)

`DoomWeb` は AIKernel.Doom ブラウザデモの公開 Web runtime layer です。意図的に source-only として管理しています。

- `doom.wasm` 用 JavaScript runtime bridge
- Bonsai AutoPlay supervisor logic
- Browser `WebGpuComputeProvider` bridge と WebGPU texture path
- Public prompt bootstrap script
- Terms and license notice HTML

このプロジェクトには第三者のバイナリアセットを含めません。

- `DOOM1.WAD` はこのリポジトリに保存しません。
- Bonsai GGUF model files はこのリポジトリに保存しません。
- 生成済み `doom.wasm` binary は既定では保存しません。

デプロイ運用者は、WAD、model、manifest、生成済み WASM artifact をこの source package の外でホストし、明示的な runtime consent 後にのみロードしてください。

## Deployment Layout

`wwwroot` を Web host へコピーすると、次の source asset が公開されます。

```text
/js/webgpu-provider.js
/js/bonsai.js
/js/doom.js
/js/doom-worker-proxy.js
/js/doom-worker.js
/demo/doom/js/doom-prompt.js
/demo/doom/terms-and-licenses.html
```

公開 host は、次の外部 runtime file を別途提供する必要があります。

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

これらの hosted binary / runtime artifact は、ライセンスとリポジトリポリシーで明示的に許可されている場合を除き、このプロジェクトにコミットしないでください。

## Web Runtime

Web runtime は次を担当します。

- consent prompt
- asset manifest validation
- `doom.wasm` instantiation
- memory-backed WAD mount
- WebGPU framebuffer path
- Canvas fallback
- Bonsai supervisor
- AutoPlay control pipeline
- debug overlay

詳細は `docs/web-runtime-ja.md` と `docs/vision-perception-engine-ja.md` を参照してください。

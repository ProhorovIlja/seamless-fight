# Seamless Fight — browser-native PlayCanvas WebGPU/WebGL2 renderer evaluation

**Separate graphical experiment, not production game or AAA art.**

The same original 1600×900 painterly Gothic cathedral used by `/fight/side/` and the Godot scene is rendered as an unlit original textured 3D plane in PlayCanvas. The camera is orthographic and locked. Two invisible 3D rig sockets precisely mirror authoritative 960×540 fight positions; intentionally no low-poly replacement character mesh, fake outfits, attack animations or separate physics exist.

The actual browser GPU backend is chosen with **WebGPU first, WebGL2 fallback**. The experiment records backend and startup time, and tests the same world mapping as the Godot 4.7.2 spike. Its JavaScript module can eventually reuse the existing event-driven page and WebSocket transport. It does not modify the deployed website or game route.

Source/provenance: same project's originally generated `public/art/reliquary-painted.webp`. The PlayCanvas Engine is [MIT-licensed](https://github.com/playcanvas/engine/blob/main/LICENSE); no CDN assets are required after bundling the engine and texture. An independently licensable real glTF rig and full animation set are still a production requirement.

```sh
npm install --no-save playcanvas@2.23.3 esbuild@0.25.12
npx esbuild experiments/playcanvas-webgpu/main.mjs --bundle --format=esm --target=es2022 --minify --outfile=artifacts/playcanvas-webgpu/main.js
cp experiments/playcanvas-webgpu/index.html artifacts/playcanvas-webgpu/
mkdir -p artifacts/playcanvas-webgpu/art
cp public/art/reliquary-painted.webp artifacts/playcanvas-webgpu/art/
python3 -m http.server 19765 --directory artifacts/playcanvas-webgpu
```

**Acceptance:** Compare actual browser screenshots, WebGL2 fallback, bundle and first-interaction bytes/time, GPU frametime and source character glTF material fidelity. A smaller/quickly loaded GPU proof is NOT evidence of faster online input-to-photon or better production art. Never migrate gameplay/netcode blindly.

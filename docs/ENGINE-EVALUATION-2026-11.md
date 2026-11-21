# Rendering engine evaluation — Godot vs browser-native GPU (21 November 2026)

## Decision: do not mistake the original game art problem for an engine problem

**The released prototype still runs on Node + browser Canvas** and is publicly undeployed as a separate draft PR. Earlier Unity `.png.meta` files came from a third-party CC0 asset archive, not from Seamless Fight's engine. Nothing about those files means Unity was selected. The user rejected the flat procedural fighter art and asked for visual quality benchmarked against **Guilty Gear Strive, Umbral Core, Street Fighter 6, Tekken 8, Dead Cells**. That changes our animation-production requirements, but does not magically provide production-grade character rigs, voice actors, music or netcode.

The strongest source for the visual direction is the actual developer [Guilty Gear Strive interview](https://www.unrealengine.com/developer-interviews/how-guilty-gear--strive--hits-an-ultra-combo-with-groundbreaking-visuals-and-gameplay), which describes manually controlled character-specific shading, face animation, dynamic pose design and manual rollback optimizations. The artists used Unreal Engine 4, but the quality comes from authored artwork, production-specific rendering and expert animation—not automatic engine defaults.

## The browser constraint is decisive

| Candidate | Browser execution | Native PC | Graphics considerations | Current position |
| --- | --- | --- | --- | --- |
| **Godot 4.7.2, GDScript** | Yes, WebAssembly + **WebGL2 Compatibility renderer** only | Yes, advanced Forward+ available, but the same shaders may need different fallback implementations | MIT license; 2D/3D scene editor, animation tools, fixed camera, mesh/rig/glTF support; no Forward+ volumetric fog, SSIL, screen-space reflections or compute in web exports | **Real engine spike committed; editor and scene tests passed. Web export validation in CI.** |
| **PlayCanvas Engine** | **WebGPU** on capable browsers, **WebGL2 fallback**, no WASM-based full editor runtime required | Browser-contained application on desktop; not a direct native PC binary | Browser-first advanced animation/glTF/PBR/shaders, extensive optimization and source control; Javascript integration with existing same-origin UI and authoritative Node state | Strong candidate for final web renderer; requires honest image quality and input latency A/B trial |
| **Babylon.js** | WebGPU with WebGL2 fallback | Primarily browser runtime | Rich high-level 3D materials, node shader/render graph, animation tooling, GPU profiling. License and dependencies can be recorded before deployment | Alternate browser GPU renderer |
| **Unity 6** | WebGL2 exports on supported browsers, with platform feature limits | Yes | Mature Timeline/Animator/URP, commercial licensing terms and potentially heavier web build; a high-resolution model still needs to be authored | Not selected |
| **Unreal Engine 5** | No comparable officially maintained native WASM/WebGL export; Pixel Streaming renders remotely on a GPU and sends video | Yes, excellent desktop cinematic pipeline | Strong tools for high-end 3D, animation, cloth and custom shaders. A GPU server per stream, encode/decode delay and network overhead are poor fits for low-cost browser PvP | Investigate if user later chooses an installable Windows client as main deliverable |

Official documentation:
- Godot WebGL2/Compatibility: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- Godot renderer matrix: https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html — Web ✔ only in Compatibility, advanced 3D Forward+ only native.
- Godot C# web exports unavailable: https://docs.godotengine.org/en/stable/about/list_of_features.html
- Godot license (MIT): https://godotengine.org/license/
- PlayCanvas Engine WebGPU/WebGL2: https://developer.playcanvas.com/user-manual/engine/
- Babylon WebGPU/WebGL: https://www.babylonjs.com/specifications/
- Unreal Pixel Streaming architecture and associated latency: https://dev.epicgames.com/documentation/en-us/unreal-engine/stream-tuning-guide
- Unity 6 browser support: https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/webgl/intro/browsercompatibility

## Actual experiment status

`experiments/godot-4.7/` is a real, independent Godot 4.7.2 project (not a reference image). It loads the **same original high-resolution painted Reliquary asset** into a QuadMesh within an orthographic, fixed 3D scene. A read-only scene script maps the authoritative simulation's world (960×540 pixels) to 16×9 camera space at 60 pixels per world unit, keeping Z fixed. It rejects malformed, stale and wrong-ruleset snapshots. An explicit future `*.glb` rig gateway is provided but **no placeholder mannequin** and no finalized character mesh are included.

A separate GitHub Actions job downloads the official MIT Godot editor, imports the asset, parses the scene and runs assertions using the *real* Godot runtime. A follow-on export test compiles the WebGL2 build from the matching 4.7.2 template. **Do not label this Godot version a feature-complete client, faster than Canvas, or visually equal to the high-end game references**.

The existing server-authoritative, deterministic `seamless-side/1` rules, recording/replay, input remapping and multiplayer keep working in the independent Node/Canvas client. The model transform code is purely presentational; attack detection remains in the authoritative engine.

## How to choose an engine, empirically

Two phases on **identical legally owned source assets** with identical animation and pose set:

1. **Character/arena quality A/B.** Import one fully authored original character glTF rig (NOT a low-poly cube stand-in) with idle, walk/run, jump, crouch, guard/parry, light/heavy/special, shot, feint, hitstun, hurt and victory clips. Compare normal/roughness/cloth, emissive and color-grade controls, facial expressions, outline consistency, dark stage contrast, shadow fidelity, PBR vs hand-painted cel/toon look. Use the same original background and same fixed camera.
2. **Browser load and performance.** Capture real byte counts (HTML, JS, WASM, PCK, glTF/KTX2), first-interactive time, 1% lows/p95 and p99 render intervals for 60/120 Hz monitors at 1080p/1440p, JavaScript/GC spikes, VRAM and texture budget, Chrome/Firefox/Safari and representative mobile devices. Distinguish gameplay tick (60Hz server), render FPS and true hardware-measured input-to-photon latency. Test disconnect/jitter/loss cross-region and verify rollback is not accidentally claimed.

**Required competitive invariants:** fixed side view, no 3D combat lane; stable camera floor and fighter scale; exact server-replay parity; no hidden opponent data in debugging; animation timing corresponds to confirmed `SIDE_MOVES` values; a one-frame visual hit stop must never pause server or input queues; configurable gamepads/KBM/touch; safe accessibility fallback; download small enough for browser adoption. Keep socket compatibility `/fight/side/socket` and the live website's design palette.

## Asset sourcing and production

Godot/Unreal/Unity are tools; they do not supply unlimited free professional models/music. Our art pipeline must be **engine-neutral Blender authoring → validated original glTF rigs, clip tables, camera, materials/texture atlases, optimized KTX2/WebP, audio banks** with per-file provenance. Use authored character designs, not copyrighted Bloodborne/Tekken/Guilty Gear meshes, sounds, animation, HUD or soundtrack. A public CC0 source still requires visual QA, pose consistency and license verification. Private Bloodborne sources in Drive are research-only.

### Current recommendation

For an **install-free browser-first Seamless Hunt game**, evaluate **PlayCanvas WebGPU/WebGL2** against the **new actual Godot 4.7.2 WebGL2 spike** before choosing. Neither guarantees AAAA artwork. If the requirement shifts to a mandatory **native Windows installer with high-end GPU targets**, Unreal 5 is a strong candidate and Godot Forward+ another, but a native engine switch would be a separate user-approved project decision, not an unreviewed rewrite of the existing browser game.

**Shipping status:** NONE of the engine spikes are merged or deployed. The draft PR and its existing green client tests remain the correctness baseline.

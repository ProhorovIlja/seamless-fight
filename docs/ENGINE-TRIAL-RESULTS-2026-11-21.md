# Actual engine trials — Godot 4.7.2 vs PlayCanvas 2.23.3
**21 November 2026 | Draft, original art only; no fighter models, no release**

## Decision for this browser-first project

**Prefer PlayCanvas (WebGPU preferred, WebGL2 fallback) as the next rendering layer for the *existing* browser fighting game.** Keep Godot 4.7.2 as a separate playable browser/native feasibility experiment, not a second physics engine. Make final migration conditional on real original 3D fighter rigs and fair head-to-head tests. Blender is the source-of-truth art/animation authoring tool; game engines do not magically create proprietary-quality models or movement.

Why: PlayCanvas has a verified **1.15 MB uncompressed bundled JavaScript engine + 271 KB original WebP painting**, speaks JavaScript directly to the existing Node/browser client and versioned `seamless-side/1` server authority, and uses WebGPU where supported with WebGL2 fallback. Godot's actual browser experiment required **39.51 MB uncompressed WebAssembly** plus a **1.52 MB pack** to draw the same image; its web renderer uses Compatibility/WebGL2 only, not native Forward+. This is evidence about this *minimal isolated stage test* and download footprint—not general proof that PlayCanvas is faster, or that Godot cannot ship premium art.

## Actual tested evidence — same original asset

| | Godot 4.7.2 | PlayCanvas 2.23.3 |
| --- | --- | --- |
| Test scene | Orthographic 3D stage, real WebGL2 browser export | Orthographic 3D stage, actual WebGL2 browser runtime |
| Actual original background | `reliquary-painted.webp`, 1600×900 | Exactly same `reliquary-painted.webp`, 1600×900 |
| Verified Chromium run | [Actions 44843291566](https://github.com/ProhorovIlja/seamless-fight/actions/runs/44843291566) | [Actions 44843854985](https://github.com/ProhorovIlja/seamless-fight/actions/runs/44843854985) |
| Visual screenshot | 1280×720 real Canvas screenshot, **1,488,045 bytes**, manually inspected | 1254×705 actual Canvas screenshot, **1,348,836 bytes**, manually inspected |
| Client runtime (not wire-compressed) | **39,514,754-byte WASM**, **1,515,820-byte .pck** plus HTML/data | **1,150,609-byte JS bundle** plus **270,992-byte painting**, **1,885-byte HTML** |
| Startup metric | **1,086 ms** in CI to Godot web ready (including browser load; can vary) | **140 ms** PlayCanvas JS+asset initialization; **4,294 ms** automated test from navigation to measured readiness including separate browser automation and 1.6 s post-render delay |
| GPU backend actually seen | **WebGL2 / Compatibility** | **WebGL2** software Chromium fallback |
| Rendering code | `experiments/godot-4.7/` | `experiments/playcanvas-webgpu/` |
| Position validation | rejects wrong ruleset / stale ticks / impossible x/y | same read-only mirror with strict x/y validation |
| Original character rig quality | **NONE INCLUDED** | **NONE INCLUDED** |
| Actual live PvP gameplay integrated | No, separate tech spike | No, separate tech spike |
| Network latency / rollback | Not benchmarked | Not benchmarked |

Both screenshots were produced by **real exported/runtime Chromium renders**, not AI concept images. Both show *nearly the same painting*—neither provides new shaders, authored characters, professional music or special effects by itself. The common painting is the reason they look good; engine quality needs a later identical textured/animated 3D rig test.

### Failure findings that shaped the results

- First PlayCanvas attempt used `new pc.Application(canvas,{graphicsDevice:device})` while creating the GPU device separately. Chromium selected WebGL2 and loaded the WebP, but **rendered a solid black 9,081-byte frame**. The test correctly failed rather than reporting the scene as complete. Using the [official standalone AppBase + AppOptions graphics-device initialization](https://developer.playcanvas.com/user-manual/engine/standalone/) and registering `RenderComponentSystem`, `CameraComponentSystem`, `LightComponentSystem`, `TextureHandler`, `ContainerHandler` made the same texture render correctly. The fixed version passed at exact commit `4e73391e1e10cd4c8bb293eaa7434026d2273eb7`.
- The real Godot editor and WebGL2 package parse/pass with tested pose floor mapping, **but native Forward+ volumetric fog, SSIL, SSR and compute do not become available just because the same game opened in a browser**. The [official Godot renderer comparison](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html) is the reason the web build is built against Compatibility.
- WebGPU was **not** tested on actual discrete/integrated GPUs in this CI. The software headless Chromium environment fell back to WebGL2; source lists WebGPU as an attempted/preferred backend only.
- The PlayCanvas and Godot startup figures have **different timestamp semantics and environment work**; no mathematically valid ranking for first-frame, FPS or input-to-photon follows from comparing 140 ms and 1,086 ms. A same-hardware and same-sample protocol is still needed.
- No fake low-poly mannequin was used in the trial; existing 2D fighter placeholder art remains in the original game. An empty 3D rig socket is a placeholder **for engineering**, not a final visual.
- A browser game **cannot promise zero latency**. Keep real RTT jitter/fairness measures separated from CPU/GPU frame pacing and measured hardware input-to-photon.

### Evidence and near-term production gates

1. **Original hero and opponent glTF rigs**: authored and licensed side-on orthographic meshes, convincing face/eyes/hair/coats/armor, foot and weapon pivots, PBR and/or custom anime-toon style shader, authored animation clips to real move startup/active/recovery frames. Enforce readability under shadow, fog and rapid red flash. No copyrighted Bloodborne/Capcom/ArcSys/Bandai Namco rigs or assets.
2. **Two personally authored stage depth stacks**, plus the current painterly Reliquary broken into genuine background, midground and foreground layers with lighting masks/animation (not just a single flat textured plane). Scene refactor is not "2.5D premium" until real depth geometry, GI, volumetrics and parallax can be inspected.
3. **Professional audio**: original or permissively licensed foley, firearms, weapons, authentic grunts, voices and mastered layered score, with sound latency/compressor, hearing-safe default, and optional voice-chat privacy controls.
4. **Comparable 60/120/144 Hz benchmarks** on Chrome/Firefox/Safari across integrated/discrete GPUs, mobile, high-DPI and actual WAN RTT/loss; record load-bytes compressed, total VRAM, p95/p99 frame interval, crashes and consistent latency instrumentation. Never call a fixed-function painting draw a game-engine speed benchmark.
5. **Migration gate**: only replace the vector client renderer when an end-to-end WebGPU/WebGL2 proof with real animated character rigs passes, using the *same* deterministic `SIDE_RULESET='seamless-side/1'` physics, replay, server-side damage, opponent neutral interpolation, remappable gamepad and touch, and training exact hitbox transforms.

### Browser vs native client

If a **downloadable Windows-first** client becomes the dominant goal and the player has a capable GPU, Unreal 5 (or native Godot Forward+) is a serious alternative for AAA-looking 3D; but UE5 Pixel Streaming has remote GPU compute costs and adds video encode/transmit/decode delay, so it is not an automatic browser PvP replacement. Unity does offer a web export, but the old source-pack `.png.meta` files were not a recommendation to adopt Unity.

The architecture currently stays: **Blender authoring → engine-neutral validated glTF/texture/animation/audio source → browser-friendly PlayCanvas rendering experiment → unchanged server-authoritative deterministic gameplay.** Preserve the independently verified Godot project as a fallback / native feasibility proof. Nothing merged into production or deployed on `seamlesshunt.com`.

**Sources:** [Guilty Gear Strive real character art/animation production](https://www.unrealengine.com/developer-interviews/how-guilty-gear--strive--hits-an-ultra-combo-with-groundbreaking-visuals-and-gameplay), [PlayCanvas AppBase official standalone guide](https://developer.playcanvas.com/user-manual/engine/standalone/), [Godot renderer limitations](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html), [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html). These sources support design/compatibility constraints; the above byte counts and test results come from the project's exact CI logs/artifacts, not from published engine marketing.

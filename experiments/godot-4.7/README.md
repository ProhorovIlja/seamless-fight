# Godot 4.7.2 — separate render-engine evaluation

**Not a game port, not a AAA visual deliverable, and not a replacement for `/fight/side/`.**

This parallel Godot prototype uses the original high-resolution 1600×900 Reliquary painting and a real orthographic 3D camera. It receives read-only authoritative player positions and has empty rig sockets for future *properly authored, licensed* glTF character meshes. It intentionally displays **no primitive mannequin** and does not claim to have production animations.

- Godot version: 4.7.2 stable, **GDScript + Compatibility** (the only Godot 4 renderer supported by web exports)
- Scene: `scenes/stage.tscn`; source image: `assets/reliquary-painted.webp` (same original Git blob as `public/art/reliquary-painted.webp`)
- `scripts/stage.gd` maps 960×540 world positions exactly to 16×9 orthographic presentation and rejects old, wrong-version or malformed snapshots; Z is permanently zero
- `scripts/rig_socket.gd` can load reviewed `res://assets/characters/*.glb` authored character scenes and seek committed animation clips by server tick; there are **no** bundled 3D character models yet
- `tests/verify_stage.gd` exercises an actual Godot engine scene parse, camera, image import and state mapping through headless CI

**Why trial rather than migrate immediately:** a Godot web build is currently WebGL 2 / Compatibility only; native Forward+ shaders, GPU compute and all native 3D features aren't available in that export. Compare this with PlayCanvas or Babylon.js WebGPU/WebGL2 to determine browser quality/performance, load time and input response *before* changing the existing server-authoritative production architecture.

To inspect with Godot 4.7.2, open `project.godot`. This uses only the original painting already in the game and no proprietary Bloodborne/Unity/Unreal assets. The USD/GLTF artist pipeline and source/redistribution review must be finished before rig sockets are filled.

**Green CI means that the Godot project and scene parsed correctly—not that any browser export, native frame rate or latency benchmark has passed.**

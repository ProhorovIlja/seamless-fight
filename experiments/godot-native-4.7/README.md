# Native Windows Forward+ renderer candidate — Godot 4.7.2

**Experimental Windows PC executable, not a complete AAA fighting game.**

An independent 3D Forward+ native Godot project. The orthographic 2.5D scene loads the original 1600×900 cathedral painting, maps existing side-view server coordinates into one physical plane, and contains a strict Godot WebSocket bridge for current private UNRATED 1v1 rooms. Character rigging and authored meshes still require real production assets.

Native Godot settings built here: native resolution, display/window mode, VSync, FPS caps, actual 3D resolution scale, built-in FSR1 / FSR2.2 where supported. No DLSS, FSR4.1.2, XeSS3, Reflex, Anti-Lag2 or frame generation is implemented. Unverified vendor features cannot be selected. The renderer defaults to Forward+ and D3D12 on Windows with engine fallback capabilities; Vulkan is a relevant alternative for future PC profiling.

The GitHub native build workflow imports real art, tests settings/coordinate isolation in headless Godot, cross-compiles the actual x86-64 Windows PE exe + PCK and archives both. Cross-exporting on Linux does not prove performance, GPU driver behavior or controller latency on Windows 10/11.

The browser game /fight/side/ remains the playable reference. No merge/deploy.

# Native Windows Forward+ renderer candidate — Godot 4.7.2

**Experimental Windows PC executable, not a complete AAA fighting game.**

An independent 3D Forward+ native Godot project. The orthographic 2.5D scene loads the original 1600×900 cathedral painting, maps existing side-view server coordinates into one physical plane, and contains a strict Godot WebSocket bridge for current private UNRATED 1v1 rooms. Character rigging and authored meshes still require real production assets.

Native Godot settings built here: native resolution, display/window mode, VSync, FPS caps, actual 3D resolution scale, built-in FSR1 / FSR2.2 where supported. No DLSS, FSR4.1.2, XeSS3, Reflex, Anti-Lag2 or frame generation is implemented. Unverified vendor features cannot be selected. The renderer defaults to Forward+ and D3D12 on Windows with engine fallback capabilities; Vulkan is a relevant alternative for future PC profiling.

The GitHub native build workflow imports real art, tests settings/coordinate isolation in headless Godot, cross-compiles the actual x86-64 Windows PE exe + PCK and archives both. Cross-exporting on Linux does not prove performance, GPU driver behavior or controller latency on Windows 10/11.

The browser game /fight/side/ remains the playable reference. No merge/deploy.


## November 21 native combat and controls integration — research branch

This project now has an opt-in original C++ \`SFCombat\` GDExtension in \`extension/side_native.cpp\`, using the existing deterministic \`native/combat/side_core.cpp\` source with the command-line \`main\` disabled. The bridge exposes 60 Hz \`step_encoded\`, a complete side-game state dictionary, \`get_tick\` and \`reset\`. A CLI parity suite remains intact, and the new \`verify_native_combat.gd\` consumes 1,350-frame \`scripts/native-godot-vectors.mjs\` JS golden vectors. The native C++ Windows and Linux compile, exact parity, Windows PE export and local training execution must be verified in \`.github/workflows/native-combat-godot.yml\`; source presence alone does not constitute a passing build.

To preserve the independent, previously verified Godot renderer baseline, **the \`.gdextension\` descriptor lives under \`native/godot/\`** and is copied into the renderer's \`bin/\` directory only inside the isolated extension build workflow after both native libraries exist. Without the native extension, the original scene, site backdrops, graphics settings and input menus can still load; starting local practice intentionally fails closed rather than faking a C++ fighter.

The local training harness \`scripts/native_practice.gd\` invokes \`SFCombat.step_encoded\` from the 60 Hz physics clock and applies its resulting read-only fighter positions to the orthographic 2.5D camera. Includes passive/easy/normal/hard scripted decision profiles and a deterministic restart test; these bots do **not** learn, access real player ghosts or adapt from private match data. This is not online rollback, verified ranked, or competitive balance certification.

The native control profile is in \`scripts/native_controls.gd\`. It supports remappable physical keyboard inputs, mouse buttons, gamepad buttons, analog axes and conflict checks; profiles save locally to \`user://sf_native_controls_v1.json\`. \`scripts/native_input_settings.gd\` provides a game-visible Escape-toggle Gothic palette settings screen. \`verify_native_controls.gd\` checks actual InputMap binding and settings overlay behavior in engine CI. Training is a developer harness and deliberately **does not ship original final 3D rigged fighters yet**; corresponding \`Veil\` and \`Cinder\` visual nodes remain empty pending professionally authored compatible GLB and animations.

User-owned Seamless Hunt website WebPs have been restored as actual versioned assets under \`public/art/\` and, for the moonlit city view, \`assets/site/\`. The \`scripts/site_scenery.gd\` module adds a second atmospheric stage with moon, far/near skyline, and decorative fog using GPU quads with extremely limited drift; the painted Reliquary remains selectable. These render layers must never change collision, animation age, input timing or network state. **Rights review required before distributing these private-site art files publicly**; being uploaded by the user is not an independently verified sublicensing grant.

Production direction remains professionally authored original full-featured fighting characters and weapon rig/animation, coherent stage construction, high-quality licensed recorded audio and UI polish, then physically measured latency/graphics on real Windows hardware. UE5.8 is a separate future high-end engine benchmark; no UE build, DLSS, XeSS, Reflex or FSR4 SDK installation is implied by these Godot changes.

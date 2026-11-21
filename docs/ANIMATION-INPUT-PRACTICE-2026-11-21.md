# Seamless Fight — original 3D animation, universal controls and premium practice production charter
21 November 2026 | Draft PR #1 | Current fighting grammar: `sf-hunt-lab/3`

## The release bar

The final Windows 2.5D Gothic PvP game must not merely display a handful of common action poses. It needs a substantial, genuinely authored and polished animation repertoire across each original trick weapon/form, body silhouette, combat state, character personality, and match presentation. The objective is to **match or exceed the breadth of Bloodborne's meaningful animation categories where appropriate**, not falsely claim an unverified number or simply rename copied Bloodborne clips. DMC and competitive fighters may inform cinematic transitions, cancels, clarity, practice, control feel and training presentation, **only when consistent with the Bloodborne-first no-block/no-grab/no-double-jump/no-air-step core**.

Shipping-only original or appropriately licensed assets. Private game research files may inform analysis but **must not be redistributed**. Two real separately authored high-quality 3D hunter models and source rigs, unique original 3D transforming weapon geometry, cloth/hair/face rigs, and professional camera/audio/impact composition are required. Existing graybox, static painted stages and metadata requests are **not** finished art.

## Measured scope of the new art catalog

`tools/art/build-hunt-production-catalog.mjs` derives an inspectable JSON register of **546 distinct authoring requests**:

| Coverage | Requests |
| --- | ---: |
| Shared hunter actions (locomotion, jumping, impact reactions, rituals, cinematics, taunts, world, facial/vocal performance) | 178 |
| Current action-table clips directly synchronized to the 60 Hz rules: 25 actions × 2 unique weapons | 50 |
| Additional weapon/form-specific poses, handling, transitions, feints, cancels, critical and firearm variants | 318 |
| **Total production requests** | **546** |
| **Verified, authored animation clips from this register** | **0** |
| **Current count audited from Bloodborne's complete animation files** | **Unknown** |

These are **requirements, not generated animations**. Retargeting a base clip across hairstyles/body shapes does not count as another unique captured motion. No generated pose-only placeholder should be described as a commercial-grade performance. `test/hunt-production-catalog.test.mjs` checks unique IDs, exact current combat move timing, all form-specific requirements, intro/outro/taunt/voice categories, and honest zero-finished counts.

Run:
```sh
mkdir -p artifacts
node tools/art/build-hunt-production-catalog.mjs > artifacts/hunt-production-catalog.json
node tools/art/export-hunt-animation-brief.mjs > artifacts/hunt-animations-v3.json
```

### What every final animation must carry

Source blend/rig, 3D body/face/weapon mesh with legal provenance, contact keys and actual animated skeleton, reusable retarget data, root/body motion curve, 60 Hz gameplay event markers, full-body and additive pose layers, left/right transitions, facial and cloth dynamics, hit/readability silhouette at side-view camera, linked original Foley/weapon/grunts/air, and stable render quality at >60 FPS. Verify ground contact, believable hand/weapon grip before/during transform, non-teleporting weapons, convincing facial expressions, hair/cloth no-clip, performance under rollback corrective display blending and full camera/lighting/color grading. Visceral is a **paired** victim/attacker choreography with independently verified frames and anti-desync presentation; not a universal command grab.

Sign-off by individual clip: correct inputs and timeline; side-on silhouette; authored body and face changes; unique original sound; valid physics timing; no determinism or netcode dependence on render interpolation; Windows real-GPU video QA. Maintain separate approved status after source/license and visual signoff. The catalog must not claim completion until actual GLBs and editor source pass these checks.

## Physical controller requirements

A single **action-space** abstraction should make keyboard/mouse, Xbox/XInput-like pads, PlayStation/SDL-mapped gamepads, arcade sticks, all-button leverless ("Hitbox-style"), fightpads, and adaptive switch-controller inputs generate the same `{x,y,act,guard:false}` Hunt v3 command at exactly 60 authoritative ticks/s. It must not depend on untrusted fake hotplug drivers or virtual macros. The newly added `public/hunt-input-device.mjs` offers six layout templates, local remapping, reserved-key checks, hold/edge filtering, deterministic SOCD **neutral** (left+right=neutral, up+down=neutral) and safe disconnect neutralization. Other SOCD hardware behaviors are not assumed to be reconfigurable from the game; any future tournament policy must be documented and proven compliant. No universal block, air step, grab, turbo or autoplay input exists in the Hunt adapter.

**Important distinction:** This JavaScript module is a tested reference/input normalization component, **not yet the live Godot/Hunt v3 input runtime**. The existing Godot 4.7.2 `NativeControls` uses Godot/SDL joypad mapping plus true keyboard/mouse rebinding for the **older** C++ `seamless-side/1` prototype. `connected_devices()` and `controller_diagnostics()` now expose only actually connected and mapped devices and update their names/ID in the keybinding UI. We cannot guarantee every USB arcade PCB, adapter or switch-accessibility product without actual hardware IDs and tests. Device-to-player locking, dynamic glyph switching, HID remapping quirks, audio haptics, local versus online port assignment and latency per controller still need Windows validation.

References:
- [Godot controllers, gamepads and joysticks](https://docs.godotengine.org/en/stable/tutorials/inputs/controllers_gamepads_joysticks.html) — SDL mapping, controller differences, hotplug concerns
- [Evo official controller rules](https://evo.gg/rules/) — devices and simultaneous-opposite-cardinal-directions rules
- [Capcom Street Fighter 6 official Training Mode recording](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) — recording/playback slots and training workflow

## Premium practice / frame-data system

The new **isolated** `public/hunt-practice-suite.mjs` integrates actual Hunt v3 deterministic inputs to provide:

- 8 independently recorded dummy tapes, each at most 600 60 Hz frames, loop/random deterministic playback; neutral/passive dummy and provisional reversal mode
- Frame meter and frame-table readout for every two-form weapon move, startup/active/recovery, phase, remaining frames, action age and exact vertical/horizontal constraints
- 120-tick input history; up to 400 recent hit/gun parry/visceral/rally/whiff events
- Frame advance, pause/resume, bounded 720-frame rewind, deterministic alternate timeline takeover, replay export/load under exact versioned Hunt v3 rules
- Fixed known random seed, mirrored dummy inputs and state verification; cannot invent actual online wins or human-trained machine-learning ghosts

The old *actual C++/Godot* training harness already supports passive/easy/normal/hard scripted bots, exact C++ checkpoints, dummy loop, pause/rewind/frame stepping. It now additionally exposes a bounded 120-input log and source-labelled **legacy C++** frame-table viewer in the native menu. It is explicitly *not* Hunt v3; it still has older `sf_guard` bindings and move names. Do not confuse this with a complete production practice suite.

Release-grade Practice needs more than these foundations: 8 dummy slots *in native C++*, configurable reversal on hit/block-equivalent recovery, manual and random wake-up, guard absent so firearm-parry/dodge rehearsals instead, frame advantage and true hitstun escape window proofs, throwless spacing challenges, punish counter, whiff punish, safe/unsafe frame timing, data-driven advanced drills, combo route tree and damage/stamina/resources metrics, input display with precise 60Hz button timeline, HUD frame bar overlays, state bookmarks and restorable replay snapshots, frame-advance takeover, programmable deterministic bot with fair reaction delay, side-view hitbox overlays, pressure interval plots, round reset and dummy side/position, onboarding and guide/tutorial systems.

Validation targets: exact golden replays, random network jitter/rollback snapshots, no simulation divergence across Win/Linux, measured p95/p99 input-to-render frametimes, training clips for each weapon, predictable menu-only inputs, no cosmetic interference with hits, meaningful UX/keyboard navigation, accessible input glyphs and font scalability.

## Visual and sound production quality

Real cinematic two-stage 3D arena with deep layered matte/geometry, detailed architecture, original PBR surfaces, moonlight/torch shadows/volumetric weather, distant inhabitants, wind/cloth, camera impact reactions, optional low-motion mode, multiple 3D camera angles in intro/outro only, readable locked side-view during competitive fight. Accurate character creator with body/face/eye/hair/skin/costume/cloak/accessory variants, skeleton weighting and retarget tests, outfit physics and weapon grip QA. Fully authored grunts/voice by hit strength and vocal mood, gun cracks/reload, steel/stone/cloth Foley, visceral impacts, footsteps by surface, arena spatial reverb and original soundtrack layers. Proper licensing, normalization and accessibility (independent voice/music/SFX sliders, reduced VFX).

Graphics: real high-end render paths only where proven to work. Continue evaluating Godot RTX fork, DLSS 5, DLSS 4 and previous, NVIDIA Reflex/Streamline, AMD FSR 3.1/4, Intel XeSS 3/XeLL, spatial/temporal AA, ray/path tracing and vendor FG against real original 3D hunters on Windows hardware. `Engine.max_fps=0` means uncapped renderer, while the authoritative 60 Hz combat stays independent; interpolation and rollback presentation must not falsify contacts or double-play audio. See [Hunt combat/rendering contract](HUNT-COMBAT-AND-RENDERING-2026-11-21.md).

## Release acceptance gates

1. Integrate the authoritative Hunt v3 rules into native C++ and Windows Godot, with bitwise or explicitly bounded numeric parity, honest frame/timing readouts and replay hash parity, **without** contaminating the live Bloodborne server.
2. Produce legally usable original high-quality 3D hunter rigs and two independent trick-weapon form rigs, finish and approve core tier-0 clips first, then the broader catalog in auditable stages.
3. Integrate truly usable keyboard/mouse, controller, arcade/leverless mapping/hotplug, per-player device focus, input delay measurement and physical Windows device tests.
4. Deliver in-game native training UI and 8-slot reproducible dummy recorder/reversal, real frame data, state bookmarks and rich hitboxes, followed by robust ranked/offline/online modes and deterministic rollback.
5. Measure actual performance, responsiveness, graphical stability and hardware-specific upscaling/latency capabilities. Release only when all relevant components are playable and verified, not merely because JSON manifests or CI smoke scripts pass.

Nothing has been deployed. This charter and its implementation references are **research and development**, not claims of finished AAA production assets, hardware-certified arcade sticks, or a complete Windows release.

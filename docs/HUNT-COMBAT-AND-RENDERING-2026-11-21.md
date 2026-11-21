# Seamless Fight — Bloodborne-first Hunt combat and high-end rendering research
Updated 2026-11-21. Source branch: `feat/lantern-court`, draft PR #1. **No production merge, no live VPS deployment.**

## Creative correction: Bloodborne combat is the grammar, not a fighting-game guard template

The desired standalone game is a fixed side-on 2.5D original Gothic fighter **built around Bloodborne's systemic rhythm**. Importing every feature from Tekken, Street Fighter or Guilty Gear without changing its purpose would produce the wrong game. There is no conventional high/mid/low guard triangle, standing block pressure or guaranteed corner pressure copied from those games. Those titles contribute responsive controls, animation clarity, spatial/counterplay discipline, training, netcode, replay, character presentation, and competitive UX—not mandatory move-category rules.

Core identity:
- Quickstep with real but bounded i-frames, directional spacing, side-view facing, stamina pressure and deliberate recovery. Gunfire used to interrupt committed attacks or vulnerable healing, opening a short **visceral attack** conversion in range.
- Distinct light, normal heavy, **charged heavy** with longer commitment and potential **rear stagger** into visceral; side-on backstab depends on **which way the victim is facing**, not an invisible 'low/overhead' layer.
- Two-form **trick weapons**, neutral form changes and transformation attacks inside the combo; weapon forms change reach/timing, stamina and attack profiles. No automatic cancellation of every whiff without risk.
- Blood vials, finite Quicksilver bullets, blood-bullet conversion costing current HP, rally/regain from landed melee after taking damage. Heals are vulnerable and can be punished.
- DMC-inspired aerial mobility, momentum, dash-chase/cancel expression **only if balanced for Bloodborne-style duels**. Higher tiers of air juggling, guard flying, endless jump cancels and instant universal invulnerability are neither imported automatically nor declared as baseline mechanics.
- Items (Molotov-like projectiles, knives, pebbles), firearm types, optional weapon enchantments/consumables, Caryll-like original modifiers and character stat allocation require explicit **competitive loadout rules**. Consider curated, budgeted item kits or separate casual variants before putting them in ranked.
- Intros, outros, outfit styles, weapon handoff performances, ambient reactions and spectators enrich presentation without affecting frame-accurate outcomes.

Game mechanisms should be original, with no redistribution of Bloodborne PS4 binaries, weapon rigs/textures, ripped voice lines or third-party game audio. Existing private research files may be studied to understand animation semantics, but the shipping game must use original or cleared material.

## Newly implemented isolated research ruleset

`public/side-hunt-lab.mjs` contains `sf-hunt-lab/1`, a **separate** fixed-60-tick deterministic rules layer. It preserves two original Mournweave/Thornwake forms, attack-to-transformation and movement, but replaces conventional block-parry with firearm counterplay. Added: authored charged-heavy actions, timed gun-induced stagger/visceral openings, charged rear stagger, short-range visceral conversion, limited punishable vials, blood-bullet +5 batch at a 20 HP cost, rally pool/window from damage and melee-only recovery. No high/low/mid stance or block. `public/side-hunt-replay.mjs` isolates seek/rewind/takeover and capture validation under its own explicit schema.

**Important limitations:** These are original research frame numbers/costs, not exact Bloodborne frame replicas or balanced live release values. At present 'charge' is a **separate committed charged-action input**, not a polished analog hold/release system. Firearm types, projectiles, weapon-specific visceral animations, blood-bullet feedback, items, intro/outro presentation and authentic side-view combat camera are future production work. The older `sf-trick-lab/3` experiment and deployed `seamless-side/1` socket protocol remain untouched. New rules are **not** wired into Godot's C++ combat DLL, Windows client, ranked, GGPO, or authoritative online play. Tests cover new mechanics, deterministic checkpoint resimulation and independent replay takeover; test results must be verified against exact branch head.

## Native rendering with stable 60 Hz simulation and arbitrary presentation FPS

Use a fixed deterministic **60 ticks per second** combat state and optional **uncapped 3D display rendering**. Native renderer chooses 60/80/90/120/144/165/240/uncapped (cap as config, not game-speed change), VSync/display mode controls and accurate FPS-cap behavior. Only the authoritative simulation advances 60 ticks per second. Weapon colliders, hit timing, invulnerability, bullets, health, stamina, parry, replay, matchmaking and server checks never consume interpolated graphics state.

Render independent 3D hunter skeletons, material animation, face/eye/cloth/hair, camera, debris, lights, fog and UI at every actual rendered frame; sample/retime poses using the two most recent **authoritative** fixed snapshots with interpolation or rollback-aware presentation correction. Animations may be authored/synchronized to 60 Hz attacks but skeletal interpolation should not look like 60-FPS stepped sprite animation on a 240 Hz monitor. Keep rollback event deduplication so correcting a predicted hit never double-plays a firearm or impact sound.

Godot's built-in physics interpolation [official docs](https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/physics_interpolation_introduction.html) can decouple display from simulation; [latency docs](https://docs.godotengine.org/en/latest/tutorials/rendering/jitter_stutter.html) warn interpolation can increase visual/input latency. Measure both raw and interpolated paths before choosing defaults for ranked. Capture input-to-photon delay and p95/p99 frametimes, not just average FPS. Frame generation improves presented cadence, **not network/prediction correctness** and not necessarily control latency.

## GitHub technology shortlist: actual sources, not a fake settings menu

| Project / official source | Concrete capability | Risk and required experiment |
|---|---|---|
| [NVIDIA RTX Godot fork](https://github.com/bailaiOWO/rtx-godot) | NVIDIA RTX engine fork tracking Godot 4.8 dev5; describes DLSS SR, Ray Reconstruction, Frame Generation, Reflex, NIS and path tracing | **Research branch first**; native project currently uses Godot 4.7.2. Build its Windows editor/export template and native combat extension against fork API, compare identical art/scene and shader variants; verify asset/SDK licensing and Windows 10 graphics support |
| [NVIDIA Streamline](https://github.com/NVIDIA-RTX/Streamline) and [sample](https://github.com/NVIDIA-RTX/Streamline_Sample) | Official DLSS super resolution, FG, Reflex integration references; Vulkan low-latency extension in newer releases | Requires engine-level motion/depth/color/viewport/swapchain data and approved redistributable runtimes. Do not confuse Streamline's open source with rights to all DLSS proprietary binaries |
| [DLSS 5 official launch](https://www.nvidia.com/en-us/geforce/news/dlss-5-3d-guided-neural-rendering/) | 3D-guided neural rendering available in NBA 2K27 as of September 2026 | Ship only with authorized runtime and GPU support; use semantic/HUD/character masks and art QA because neural rendering must not deform hit-readability, facial identity or Gothic visual direction |
| [UniversalDLSS5](https://github.com/MotionflowOffical/UniversalDLSS5) | Experimental D3D11/D3D12 injector with temporal input adaptation | Source study only. An external DLL hook/mod cannot be represented as native, anti-cheat-compatible Godot support without engine integration, clean packaging and verified provenance |
| [AMD FidelityFX SDK](https://github.com/GPUOpen-LibrariesAndSDKs/FidelityFX-SDK), [FSR SDK](https://gpuopen.com/amd-fsr-sdk/) | FSR 3.1.x, FSR 4.x, frame generation, cross-API samples and SDKs | Real Vulkan/D3D12 integration, hardware capability gating, visual flicker/ghosting/alpha/HUD masking tests; do not simply rename Godot FSR2 to FSR4 |
| [Intel XeSS 3 SDK](https://github.com/intel/xess) | XeSS SR + XeSS FG + Xe Low Latency (XeLL) and D3D12 samples | Test actual adapter support, vendor fallbacks, backend port, shader model and telemetry; no checkbox without initialized SDK |
| [OptiScaler](https://github.com/jlamprou/Optiscaler) | Mod-side swapping between vendor upscalers where an existing compatible integration can be intercepted | Useful for compatibility research, not a replacement for the application's own depth/motion vectors, SDK licensing or production integration |
| [GGPO](https://github.com/pond3r/ggpo) | MIT-licensed rollback netcode SDK and C API | Integrate with deterministic **native** Hunt combat after parity, save/restore, packet transport and WAN profiling; standalone JS rewind test is not online rollback |
| [Godot rollback fighter demo](https://github.com/blast-harbour/Godot-Rollback-Fighter-Demo) | Fighting-game sample with deterministic simulation and C++ GDExtension-oriented rollback | Borrow design/testing patterns with license review, not game assets or unverified current API compatibility |

### GPU technology acceptance matrix

Stage one: retain stock Godot 4.7.2 Windows + Vulkan, ensure genuine FSR support only where engine exposes it. Stage two: side-by-side test custom RTX fork built from source with **same complete animated 3D stage and hunter meshes**; compile/test native combat DLL and confirm end-to-end animation, shader effects and gamepad input. Stage three: evaluate native vendor integration and APIs independently, including DLSS 4.x/5, FSR 3.1/4, XeSS3, Reflex/XeLL and any competing quality/performance strategies. Maintain fallback for GPU/OS combinations; missing vendor SDKs should disable options honestly, not force startup failures.

Acceptance: architecture and backend compatibility; binary redistribution/license and trust; Windows 10/11 x64; memory/VRAM budgets, renderer engine merges/upgrades, capture-based image stability and temporal quality; frame pacing, response and measured input-to-photon; HUD/character motion vectors and mask integrity; rollback stability and anti-cheat coexistence. Quality modes should include native AA/TAA/FSR/DLAA where actually supported and clear controls for reconstruction, sharpening, ray tracing, frame generation, VSync, uncapped cap, HDR and latency.

## Production animation & art criteria

Work from real original high-detail 3D characters with customizable body, skin, face, eyes, hair, costumes, and equipped weapon geometry. Use the approved free MakeHuman/Blender/CC0 environment and motion sources as **inputs**, never as a falsely advertised complete actor. Author both weapon forms and a coherent grip/IK handoff. Every unique weapon needs full idle, locomotion, dodge, landing, light, normal heavy, charged heavy, air attacks, neutral trick shift, attack-linked trick strike, firearm cock/fire/recoil/reload, parry stagger, visceral attacker and victim, vial heal, blood-bullet creation, impact/stun, injured state, win/lose/intros/outros, with distinct cloth and face behavior. Couple animation time to confirmed combat action age, not to wall clock.

Stage design: lived-in high-poly architecture, consistent materials, animated fog/mist, torch and moon shafts, ash, moving banners, distant NPC activity, rain and wet cobblestones, stone/metal/cloth Foleys, reactive hit VFX and 3D audio. Premium art must remain visually readable and stable when reduced-motion, high contrast, low FX or ranked visibility preset is enabled.

The art deliverable cannot be claimed complete until at least two original rigged fighters pass side-angle silhouette/pose, hair/cloth, animation and weapon-handoff review **in a real Windows GPU capture**, with frame-pacing and source licensing checked. Production site/VPS, BBSC services and private Bloodborne assets remain isolated.

## Exact next native gates

1. Complete authoritative Hunt rule design and attack/cancel tests; decide which special-action rules are allowed in ranked versus custom rooms. Implement real heavy-button hold/release and firearms/items separately.
2. Port Hunt rules to native C++ with JS parity and serialize full resource/visceral states as canonical checkpoints; reject cross-version replays.
3. Integrate licensed/author-built professional hunter rigs, transforming mesh/weapon sockets and animation timeline event binding; capture genuine Windows GPU gameplay, not screenshots of placeholder art.
4. Validate rollback versus WAN latency/jitter/loss, same-tick firearm interruptions, stagger availability, input fairness; enforce secure server-authenticated results.
5. Benchmark candidate upscaler/latency engine branches with actual same-scene art, optional features and honest in-game capabilities.
6. Only later release alpha services with verified identity, 1v1 then 2v2, anti-cheat, moderation, cosmetics and training/replays. No automatic deployment to `seamlesshunt.com`.

References for Bloodborne's original system semantics: [controls and blood bullets](https://www.bloodborne-wiki.com/p/controls.html), [visceral attacks](https://www.bloodborne-wiki.com/2015/03/visceral-attacks.html), [rally](https://www.bloodborne-wiki.com/2015/03/regain-system.html). These references inform **original design**, not imported copyrighted content.

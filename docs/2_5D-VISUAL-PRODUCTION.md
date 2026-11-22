# Seamless Fight — 2.5D art direction, pipeline and QA

**Status, 21 November 2026:** Newer implementation now includes `public/art/reliquary-painted.webp` (real original illustrated environment at 1600×900), `public/side-painted.mjs` async stage decode/fallback, `public/side-resolution.mjs` high-DPI backing store bounded to 2.7×, and `public/side-sprite-rig.mjs` a real artist atlas/Pivot/11-clip renderer with a local preview studio. The playable characters are STILL placeholders until approved full authored atlases are available; see [Art direction reset](ART-DIRECTION-RESET.md). Earlier procedural 2.5D details remain available as fallback. **Status, 21 November 2026:** `/fight/side/` uses a true fixed side-on competitive combat plane, plus a new independent **2.5D presentation**. `public/side-depth.mjs` adds original multilayer stage architecture, baked stained glass and stone, moving hanging lights, perspective floor, environmental rain/embers/refraction, volumetric-looking rays, mist, and subtle reflective foreground. `public/side-cinema.mjs` adds a bounded optical world lens, event-driven ≤4 px impact camera and a procedural adaptive soundtrack policy. None of these is a literal 3D GPU mesh renderer. There is no claim of AAA artwork yet.

## Visual north star

References are **art and design studies**, not assets licensed for redistribution:

- **[Dead Cells — original technical deep dive by artist Thomas Vasseur](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)**: start with a consistent 2D model sheet, rig/animate the character in 3D and render frames to 2D, with a normal map and palette-consistent cel-shading. That provides a credible path to high-quality, stable proportions across dozens of authored animations without duplicating all hand-drawn frames. Dead Cells code, art and music are **not** free assets.
- **[Umbral Core official game description](https://www.umbralcore.com/about/)** and [official gameplay](https://umbralcore.com/gameplay/): dark high-fantasy **2.5D fighter** with serious competitive spacing. Use legible silhouettes and deliberate combat rhythm as a reference; its proprietary character models, fonts, UI and soundtrack are not source files.
- **[FOOTSIES by HiFight](https://hifight.github.io/footsies/)**: precise range, punishes, hit confirmation and honest commitment matter more than ornate overlays. Spectacle should never disguise active frames or a defense decision.
- **[Katana Zero](https://www.redbull.com/mea-en/katana-zero-developer-justin-stander-interview)**: contrast rapid violent action with atmospheric stillness. Short impactful responses make attacks feel strong. This game's browser implementation **does not freeze simulation** or promise input-to-photon latency reduction from presentation-only effects.
- **Salt and Sanctuary / Blasphemous**: high-level inspirations for hand-illustrated gothic composition and readable side-on weapons; **no art, voice, proprietary creature design, fonts or music from them is imported**.

## Shared visual grammar

The original user's private Drive export in `Bloodborne — Private Game Research / Research and Reports / seamlesshunt` includes `/art/moon.webp`, `skyline-far.webp`, `skyline-near.webp`, `fog.webp`, `icon-blades.webp`, and other icon files. The site CSS uses original colors such as `#0d0f13` (slate black), `#d9b878` (old gold), `#f0e2c2` (parchment), as well as deeply beveled Gothic-style controls. The game preserves those colors. Twelve uploaded decorative website WebP files were later checked into the **draft** game as same-origin original-site references; five also power a native 2.5D moonlit layer. No BBSC game binaries, copyrighted PS4 game textures or private font binaries were copied. The native UI uses a separately sourced SIL OFL EB Garamond font. Website art publication rights require verification. The browser remains functional if optional layers are unavailable.

- **Figures:** clear forward/facing line, visible hand-to-weapon connection, easy-to-read feet and landing pose, palette-safe armor and coat trim, visible head and eye detail at practical gameplay size. Current figures are original vector prototypes.
- **Arenas:** a grounded flat duel lane with *decorative depth*, never a lane where characters can move toward/away from camera. Far skyline, middle Gothic galleries, near stone/fog with warm lighting. Each stage has a restrained personality: Cistern cold rain/reflection, Lantern Court hanging flame halos, Ashen Reliquary illuminated refractions.
- **Palette:** stage ambience changes; hit/active sword blade/readability remains consistent regardless of scenery. Accessible outline and reduced-effects settings are preserved.
- **UI:** old-gold controls, quiet text hierarchy, same website fonts if available from host; never make an external font, asset server, or licensed music dependency necessary for the core game.

## Current 2.5D renderer design

`side-engine.mjs` owns all physical facts: 60 Hz fixed tick, world position, jump and crouch, exact two-dimensional hitbox rectangles, parry frames and stamina. Decorative modules must neither import inputs nor write fighter state.

1. **Baked depth:** `paintSideStage` and `paintSideDepthStatic` run once per arena into a cached Canvas. Optional website sky layers are also baked, not fetched every frame.
2. **Dynamic depth:** `paintSideDepthBack` draws multi-depth fog, shafts, hanging pendulums and particles with a bounded draw-call budget. All phase movement uses `performance.now()` only for *rendering*; replay physics is unaffected. Every call saves/restores Canvas state.
3. **Fighters / collision:** the same optical lens is applied to the stage, fighters, impact effects and the optional training hitboxes; fighters remain anchored to the simulation floor. Server-authoritative positions have their own neutral-only interpolation/prediction, independent of aesthetics.
4. **Foreground:** `paintSideDepthFront` adds controlled glimmers, shallow fog and carved near-edge columns, carefully avoiding the two physical fighter lanes. HUD is drawn **after** undoing scene transforms, so health, stamina and round numbers never jitter.
5. **Cinematic effects:** `sideCameraImpact` responds only to real hit/block/parry events, has a maximum 4-pixel offset and expires in 170ms; is automatically disabled in reduced motion, performance mode and local exact-hitbox review. It has no network or gameplay influence.
6. **Audio:** the original deterministic synthesized audio/foley system responds to actual move execution; grounded footsteps have a per-fighter cooldown, and an adaptive score gain follows proximity and health. Camera/score values never settle damage, rankings or replays.

The setting **2.5D environment quality** has three profiles: `performance` (basic depth), `balanced` (modest atmosphere), `cinematic` (full decorative depth). The user can independently disable effects and visual camera response. This is a manually selected quality tier, **not** an unmeasured automatic GPU performance guarantee.

## Premium character-production roadmap

The model/animation deliverable requires actual created and legally distributable original assets. For each archetype:

1. Draw an approved original front/side costume sheet with fixed proportions and unique silhouettes; define coat, face, hair/hat, eyes, weapon mounting points, color masks and foot pivot.
2. Build original Blender rig(s) in glTF-compatible rest poses, with original face expressions, skeletal animation, cloth secondary motion, optional cape rigs and distinct weapons/firearms. Blender is a free creation tool; its license does not license every third-party mesh opened in it.
3. Bake authored attack timelines `idle, walk, jump, land, duck, guard, parry, dash, cut, heavy, firearm, feint, hitstun, recovery, win/loss` to consistent-angle 2D frame atlases (and optional normal/roughness/emissive passes). Side-view hitbox timings must still come from `side-engine.mjs`, not arbitrary sprite frame metadata.
4. Pack atlases into constrained texture pages; use fixed frame sizes, exact anchors, documented color transforms, fallback sprites and precomputed normals; decode asynchronously and swap only once loaded. Preserve an independent Canvas2D path for unpowered WebGL browsers.
5. Build a stage pipeline with authored foreground/background maps, normal maps, masked emissive windows, silhouette-safe grading and original procedural effects. A future optional WebGL2/WebGPU shader compositor should be tested on varied GPUs *before* replacing Canvas on every device.
6. Generate character previews, thumbnail variants and accessibility comparison captures from **the exact same outfit/animation source**; public cosmetic availability must be server-authorized if an unlock economy is added.

No existing proprietary game's meshes, sprite atlases, rig data, fonts, dialogue, soundtracks or recorded actor voices may be copied just because an online folder is accessible.

## External free asset audit (not imported)

Ansimuz's [Gothicvania Town](https://ansimuz.itch.io/gothicvania-town) currently identifies CC0 and parallax layers; its pixel-art density will not automatically match the current illustrated fighter prototypes. The [Gothicvania Patreon's Collection](https://opengameart.org/content/gothicvania-patreons-collection) is presented by the author under CC0; inspect *each* file before reuse. Some other [Gothicvania Sky Backgrounds](https://ansimuz.itch.io/gothicvania-sky-backgrounds) and [Backgrounds 4](https://ansimuz.itch.io/gothicvania-backgrounds-4) currently list **a $5 minimum purchase**; they are **not free downloads** just because the author offers other CC0 packs. `CC0`, `free to download`, and `commercial redistribution permitted` are separate facts to verify for every archive. Licenses and attribution are to be written in `ASSET_CREDITS.md` when actual files are added. The user-supplied proprietary Bloodborne game source is for private reference and remains private.

## Release criteria and measured performance

These are **targets**, not benchmarks already achieved: stable 60 Hz local simulation and 20 Hz authoritative state snapshots; p95 render intervals close to 16.7 ms on desktop, responsive lower-tier mobile fallback, bounded GPU textures and cached stage generation, no animation frame changing the combat state, and graceful reduced-motion handling. Validate with real desktop integrated/discrete GPUs, mobile browsers, 60/120/144+ Hz monitors, wired/wireless gamepads, WAN RTT/jitter and packet loss. The existing Chromium smoke test is browser-level validation, **not input-to-photon measurement or cross-region netcode proof**.

Remaining large systems: public strict-1v1 side-view queue, authenticated ranked ratings and leaderboards, spectator-only lobby attendance, cloud ghost learning with permission/privacy controls, social/voice, more nuanced weapons, and eventually a rollback layer with proven state determinism. None are claimed complete by this visual milestone.

## Native PC research presentation and quality boundary
The separate Godot 4.7.2 Forward+ native Windows project now supports a genuine old-gold/bone/slate main menu, EB Garamond typography, keyboard/mouse/gamepad controls, authoritative combat HUD, practice frame data, two site-inspired arena backdrops, confirmed CC0 recorded impact/step foley, local deterministic C++ practice, rewind, frame advance and recorded dummy playback, and private unrated Node WebSocket 1v1. Presentation does not influence hitboxes or 60Hz combat rules.
The original stage painting and decorative WebPs **are not** a substitute for professional fully rigged and animated hunter characters, facial/eye/cloth/weapon details, authored stage geometry, cinematic lighting and original mastered licensed audio. Empty rig sockets remain the primary visual blocker. Real discrete-GPU Windows display input-to-photon, p95/p99 timing, RAM/VRAM and WAN fairness tests are still required before release.

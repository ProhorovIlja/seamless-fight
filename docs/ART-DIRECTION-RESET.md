# Art-direction reset — no more placeholder quality claims
**21 November 2026. Status: production art INCOMPLETE.**

This plan supersedes the earlier idea of treating extra vector outlines, circles, torches, procedural particle noise or generic low-poly models as a substitute for finished character art. The last real Chromium screenshot before this pass had two visually flat cartoon hunters in a Gothic cathedral; the user correctly rejected that as far below the requested target.

## Delivered in the current art-production batch

- Real **original 1600×900 high-resolution illustrated cathedral** at `public/art/reliquary-painted.webp`, optimized to ~271 KB WebP; painterly material detail, statue/altar depth, rose window, chipped stone, candles and lighting. The browser loads it with same-origin `Image.decode()`, validates dimensions, caches it as a static stage, and keeps original procedural art only as a separate fallback. This is only ONE illustrated stage, not three finished stages.
- The side-view game now has a user-controlled **Illustrated stage artwork** setting and keeps the 60 Hz simulation / online `seamless-side/1` unchanged. There is no gameplay interaction with the painting, and online peers are not asked to fetch any user file.
- Display resolution now scales using **actual canvas backing-store pixels**, not just CSS enlargement of a 960×540 buffer. It caps the decoded display at 2.7× by quality profile and keeps world coordinates fixed.
- `public/side-sprite-rig.mjs`: a real animation-atlas interface with explicit per-frame bounds, foot pivots and timing in server simulation ticks. It supports 11 necessary clips: idle, run, jump, crouch, guard, step, light cut, heavy, shot, stun and feint; scales and mirrors poses without moving the hitbox. Strict input validation prevents unexpected URLs, oversized textures and corrupt frame indices.
- The new **local Character Animation Studio** can open a manifest and WebP atlas on the user's own device for visual evaluation. It never uploads local character files, and it clears them on page refresh. Loading an asset is not permission to publish its art.
- Actual WebP RIFF signatures, decoded dimensions, 32 MiB RGBA8 atlas budget, source/artist/license fields, same-origin path, client memory bounds and exact frame pivots are tested. The character rig is a replacement **capability**, not a finished original character model; the currently bundled hunters still use the procedural fallback.
- A separate read-only GitHub Actions candidate source audit fetched the author-posted **CC0 'Dark Knight 2D Character Sprites' by comphonia** from OpenGameArt, read 37 original PNG animation atlases in a 29.1MB ZIP, and exported metadata / thumbnail contact sheet without publishing the original pack. Its atlases are 512–2048 px but individual character frames are small and its artwork is stylistically mismatched to the target painterly cathedral; this pack is **NOT accepted as final art**. No claim of importing 37 playable animations.
- Existing optional Seamless Hunt website art imports are used only as same-origin decorative references; private source files from the BBSC 1.5.0, portable build, PC port research or website export are not copied to public GitHub.

## Non-negotiable visual acceptance gates

1. **Characters before particles:** two fully authored original character models with distinct silhouettes and complete, consistent side-on animation. One static poster pose, color-shifted duplicate or procedural outline does not count.
2. **Character motion:** approved base designs, foot and weapon pivots; idle, walk, run, jump, land, duck, dodge, block/parry, heavy/light attack, reload/fire, hitstun, feint and end-of-round poses. Facial expression/eye movement and secondary cloth must be attached to the same art rig, not arbitrary overlay transforms.
3. **Animation source pipeline:** author original character meshes and skeletons in Blender, rig skin/cloth/face parts and bake consistent orthographic-view frames with alpha, normal and emissive information to atlas pages. High-resolution painting and intentional limited-resolution cel-pixel art are both valid, but a pack must have an internally consistent resolution and shader policy. **No generic download is AAAA quality by default.**
4. **Environments:** three *individually* illustrated stages, separated into depth planes where possible, with lighting masks, ambience, rain/fog and moving foreground details. Stage art must preserve fighter contrast and not obscure recovery/startup silhouettes. The one imported cathedral painting is a prototype of that pipeline.
5. **Audio:** build event-indexed original or lawfully licensed recorded foley, attacks, cloth, wet footsteps, firearm discharge/reload, guard/chip/hit/parry, breathing/voice and professional original score. Existing synthesized output is a functional fallback, not the target master.
6. **Competitive fairness:** animation time is driven by authoritative gameplay age; there is no damage or parry decision in sprite frames or lights. A cinematic camera, atlas, shader or audio update may never alter a replay, collision rect, hit confirmation or server tick.
7. **Performance / accessibility:** side-view must remain playable without WebGL and missing optional art. Test device profiles, frame-time p95, visual input latency (hardware/camera measurement), and cross-region packet-loss behavior. A browser smoke test alone does not prove zero latency.
8. **Launch gates:** no account-bound ranked ladder, high-stakes public match queue or team 2v2 can be labeled complete until server trust, persistence, abuse controls, authoritative results and appropriate network QA exist.

## Source provenance / redistribution

Original generated concept art and the first cathedral painting were created for this project, not ripped from any proprietary game. Keep concept mock-ups that depict fake ranked HUD or unreleased features **out of the live game** and explicitly label them as concepts. The imported stage has a standalone local binary and provenance in `ASSET_CREDITS.md`; alternative source backups live in the user's private `Seamless Fight — Browser PvP` Drive folder.

Useful public references:
- [Thomas Vasseur / Dead Cells 3D→2D + normal map production](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- [Umbral Core dark 2.5D fighting game](https://www.umbralcore.com/about/)
- [comphonia CC0 sprites](https://opengameart.org/content/dark-knight-2d-character-sprites) — formally evaluated but NOT final artwork
- [Ansimuz Gothicvania Town, CC0](https://ansimuz.itch.io/gothicvania-town) — reference only; do not mix art blindly
- [Sonniss Game Audio GDC bundle](https://gdc.sonniss.com/) — check the current bundle license and restrictions before integrating any audio.

**Reality check:** no single development batch or automatically sourced free pack can guarantee 'AAAA' production quality. Reaching the requested standard requires original art direction, asset authoring, animation coverage, audio production, QA and multiple iterations against actual game screenshots. The work here establishes a source-backed pipeline and a first serious stage replacement rather than falsely marking the whole game finished.

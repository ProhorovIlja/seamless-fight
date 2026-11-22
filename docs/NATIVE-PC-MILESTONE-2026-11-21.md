# Seamless Fight — Native Windows competitive and production handoff
**21 November 2026 | ProhorovIlja/seamless-fight | Draft PR #1 | No production deployment**

## Working architecture
The original side-on 2.5D browser fighter has a Node/WebSocket authority. Its deterministic 60 Hz C++ combat core now has an isolated Godot 4.7.2 Forward+ Windows test scene; its game rules are not rewritten in per-frame rendering scripts. The native window uses actual uploaded site decorative art and legal EB Garamond with private-host/local practice UI, keyboard/gamepad remapping, HUD, CC0 sounds and an orthographic fixed fighting plane.

## Verified exact-commit results
- [Run 44854177730](https://github.com/ProhorovIlja/seamless-fight/actions/runs/44854177730), source commit 67bea928: Godot 4.7.2 native graphics, original site art, menu, health/stamina/timer HUD, KBM/gamepad rebindings, recorded CC0 audio and **two actual local Godot client scenes creating/joining the existing Node private unrated 1v1, receiving real server snapshots, real fighter movement**. Strict CI required success marker GODOT_NATIVE_WINDOWS_1V1_SCENES_SERVER_PASS and no SCRIPT ERROR. Same job built a native Windows x64 EXE+PCK and actually launched the EXE headlessly on Windows Server 2022.
- [Run 44851892361](https://github.com/ProhorovIlja/seamless-fight/actions/runs/44851892361), earlier code commit b000d6d3: C++ Godot GDExtension compiled on Linux and Windows MSVC, 1350 simulation ticks × 41 fields = 55350 fields matching the JavaScript reference, integrated Windows DLL/EXE/PCK export. Earlier success does NOT certify later C++ checkpoint changes.
- Debian 13 Node 22/24, Chromium browser smoke, actual Godot and C++ extension jobs are per-commit. Read their exact HEAD statuses before marking anything else complete.

## New components still undergoing their own latest-commit CI
- Canonical 228-byte portable C++ checkpoint format (little endian IEEE float64, magic/version, FNV integrity, strict bounded state) and 3600-tick roundtrip/replay/corruption test; exposed as Godot SFCombat.save_checkpoint/load_checkpoint and 1350-frame JS-parity resim test. This is a local rollback prerequisite, NOT implemented WAN rollback, secure ranked or cheating prevention.
- Local practice with passive/easy/normal/hard scripted (not trained) opponents; bounded 720-tick (12-second) native rewind, frame advance and branching takeover; local 600-frame (10-second) recorded dummy commands with mirrored repeat and explicit deletion on session exit. This is NOT global player AI ghost learning.
- Private unrated online client: code invites, typed matching origin, bounded input buffer and server-authored positions. New **measured server-echo RTT and 12-probe short-window min/max variation** display, tested against real local Node WebSocket. Do not infer one-way input lag, Wi-Fi/wired, packet loss or player geographic location from RTT.

## Important quality and shipping gates
1. Original professional, fully authored 2.5D hunter and rival rigs with faces, hair, weapon grip and transforming weapons, skin/cloth and full art-directed attack/movement/defense animations; current rig sockets are empty. One background painting is not AAA combat art.
2. Finite accurate fighting mechanics: transparent frame data, readable parry/whiff and cancel balance, real input frame timing; strict deterministic simulation and replay versioning.
3. Real GGPO-style prediction, bounded rollback, cross-machine state compatibility, calibrated input delay, WAN jitter/loss and NAT/relay, plus server integrity. Current socket service is authoritative snapshots, NOT rollback.
4. Authenticated social/account features, ranked ledger and provable wins, abuse protections, 2v2 and casual matchmaking, friends, spectating, optional consent-driven learning ghosts and voice chat. Not production-ready.
5. Actual Windows 10/11 device tests on integrated and discrete GPUs (Vulkan and Direct3D12), performance p95/p99, graphics/VRAM, gamepad, KBM and input-to-photon measurements. No measured zero input lag.
6. Cohesive Gothic PBR materials, rigged character animation, original recorded and mastered grunts, voiced reactions, foley, firearms, music and cinematic arena detail. CC0 sample impacts alone are not premium mastered audio.
7. Asset license audit: original site WebPs require confirmation of underlying redistribution rights; proper SIL OFL embedded font and Kenney CC0 are attributed. No imported proprietary Bloodborne, Souls, Devil May Cry, Guilty Gear, Tekken, Umbral Core, etc assets.

## Engine choice and verified references
Keep tested **Godot 4.7.2 + C++ GDExtension** as the native first-person-combat-*free* (orthographic fighter) experiment, and JS/Node browser as current playable side-view reference. PlayCanvas/WebGPU remains a browser rendering candidate. Compare Unreal Engine 5.8 and vendor SDK integration only when identical real original animated rigs and target GPUs can be objectively benchmarked. Native Godot is **not** shipping FSR 4.1.2, DLSS 5, XeSS 3, NVIDIA Reflex, Anti-Lag2 or frame generation.
Reference: https://docs.godotengine.org/en/4.7/engine_details/engine_api/gdextension/index.html
FSR Unreal 4.1.2: https://gpuopen.com/learn/amd-fsr-ue-plugin-412/ | NVIDIA DLSS 5: https://www.nvidia.com/en-us/geforce/news/dlss-5-3d-guided-neural-rendering/ | Poly Haven CC0 API: https://polyhaven.com/our-api
GGPO: https://github.com/pond3r/ggpo | SF6 practice: https://game.capcom.com/manual/SF6/en/ps5/page/8/6 | Tekken Super Ghost Battle: https://tk8.tekken-official.jp/en/mode/offline.php

## Continuity and safety
Private Drive gungrain@gmail.com Seamless Fight research folder: https://drive.google.com/drive/folders/137LDzii9_0QZTox7b1RdebjLLQ8XdbtD
Canonical development handoff Doc: https://docs.google.com/document/d/1kJu-Kg63zkSGBtaPB4A-UsUPJ9iplaMXudHNLcBhvTY/edit
Development PR: https://github.com/ProhorovIlja/seamless-fight/pull/1
**Draft, no merge, no live website/server changes, no claim of finished premium AAA character art.**

## Follow-up research UI and Gothic stage geometry — source changes

The branch's next integrated optional render-only pass adds Godot's genuine graphics screen (internal 3D scaling, FPS caps, VSync and window modes, reduced-motion), and a frame pacing overlay toggled by F3. Both report actual engine state and never label render frame intervals as input-to-photon delay. The second moonlit site-art scene can optionally load two actual Poly Haven **CC0** Gothic photogrammetry statues behind the competitive 2.5D world plane; `scripts/native-fetch-polyhaven-stage-prop.sh` pins the source mirror revision, checks the Git blob SHA, validates binary GLB v2 length and packages the licensed model only during research export. The static original painting and fog/city wallpaper still work without downloads. File `ASSET_CREDITS.md` records provenance and publisher license. Explicitly **not** full rigged characters, complete lighting/geometry, network rollback or a public content release.

Before claiming these new features operational, require fresh successful exact-head native Godot graphics menu/PBR test and Windows export. Do not mistake staged code for a tested consumer build.

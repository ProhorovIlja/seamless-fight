# Seamless Fight — native Windows production architecture (November 21, 2026)

> **Decision:** make a **native-rendered PC fighting game** the primary long-term deliverable, preserve the tested browser prototype for continuity and test fixtures, and keep Internet services server-hosted. Do **not** stream every player's video from a GPU server; the user's local PC renders the game. This is an architecture decision and source-backed implementation baseline, not a shipping AAA game claim.

## Engine decision for this specific game

**Preferred production comparison:** **Unreal Engine 5.8** for the Windows-first high-fidelity fighter with professional rigging, toon/PBR shader authoring, cinematic staged lighting, audio mixing and widely documented DLSS/FSR/XeSS/low-latency plugin paths. **Godot 4.7.2** remains the independent fully free/MIT native renderer and server-client bridge for measured A/B trials. Neither engine grants free access to fully authored premium art; original modeling/animation/material/sound production remains necessary.

Relevance to verified fighting games: *Tekken 8* uses Unreal Engine 5 (Bandai Namco official); *Guilty Gear Strive* uses Unreal Engine 4 (Arc System Works' developer interview), and its distinctive look is the result of frame-by-frame pose/face/shader craftsmanship rather than engine defaults; *Street Fighter 6* uses Capcom's proprietary RE Engine (Capcom). Their combat/netcode and animation systems are not automatically included in Unreal. *Umbral Core* is a dark-fantasy 2.5D reference, not an asset library or an implied Unreal/Godot source.

**Current working source:** `/fight/side/` has a deterministic independent `seamless-side/1` 60 Hz engine and 60 Hz Node authoritative private UNRATED rooms with 20 Hz snapshots and neutral-only client prediction. A new *Godot* client experiment under `experiments/godot-4.7/` has run two genuine private WebSocket clients against that server in CI; `experiments/godot-native-4.7/` has separately exported a **real Windows x64 PE executable** from Forward+ / D3D12 project settings. Both experiments share the original painted Gothic arena and the same 960×540 simulation-to-16×9 orthographic camera projection. **Neither is yet a finished playable Windows fighting client, true 3D character rig, Vulkan benchmark, or UE binary.**

## Graphics technology matrix — verified official sources

| SDK or feature | Verified November 2026 status | Project implementation |
| --- | --- | --- |
| **NVIDIA DLSS 5 3D-Guided Neural Rendering** | Shipped September 2026 on compatible RTX 50 hardware in participating titles. Later DLSS 5 models shipped; official full developer/indie SDK integration is **not established by the public Unreal DLSS download** | **Not implemented; do not claim it, download unauthorized binaries, or pretend DLSS 4.5 means DLSS 5** |
| **NVIDIA DLSS 4.5 / DLAA / Reflex** | Official October 2026 UE plugin package supports DLSS Super Resolution, ray reconstruction, Frame Generation and Reflex | UE5.8 build integration candidate, **not installed** |
| **AMD FSR Upscaling 4.1.2** | AMD's UE5.3–5.8 plugin updated **November 16, 2026**, with hardware-specific support and the FSR API model | UE5.8 candidate **not installed**; Godot-native currently supports only its own FSR 1 / FSR 2.2 |
| **FSR Frame Generation 4.0.2** | In AMD Redstone SDK current generation. GPUOpen explicitly notes the UE plugin's Vulkan integration is **not yet available** for FSR4.1.2, despite SDK-level Vulkan support | **Not implemented**, never silently enable for ranked |
| **AMD Radeon Anti-Lag 2 v2.0.6** | Updated November 2026 and integrates with the UE plugin using native D3D12 in supported configurations | **Not implemented**, requires hardware measurement |
| **Intel XeSS 3** | Provides XeSS Super Resolution, frame generation, Multi Frame Generation and Xe Low Latency with compatibility constraints | UE plugin candidate **not installed** |
| **DirectX 12** | Native Windows preferred for vendor plugin ecosystem, RTX and AMD GPU feature availability | Godot-native experiment uses D3D12 project target. Actual Win10/11 GPU tested? **No** |
| **Vulkan** | High-quality native API, portable and available in Godot and Unreal; AMD's current SDK supports Vulkan, but current UE FSR plugin has restrictions | Explicit separate PC rendering benchmark, **not established equivalent to DX12 plugins** |
| **Proton/Wine** | Compatibility testing for a native Windows build on Linux/Steam Deck; Linux native build remains an option | **Not tested**, never claim Steam Deck verified |

Official primary sources: NVIDIA developer DLSS https://developer.nvidia.com/rtx/dlss ; NVIDIA DLSS 5 release https://www.nvidia.com/en-us/geforce/news/dlss-5-3d-guided-neural-rendering/ ; AMD FSR 4.1.2 plugin https://gpuopen.com/learn/amd-fsr-ue-plugin-412/ ; AMD SDK https://gpuopen.com/amd-fsr-sdk/ ; Intel XeSS3 https://www.intel.com/content/www/us/en/developer/topic-technology/gamedev/xess.html ; Godot 4.7 features https://docs.godotengine.org/en/4.7/about/list_of_features.html ; UE5.8 release https://www.unrealengine.com/news/unreal-engine-5-8-is-now-available .

**Fighting-game quality defaults:** native-res or reconstruction upscaling that preserves a measured stable frame rate; use hardware latency reduction when genuinely integrated; disable frame generation and neural visual modification by default in ranked *until* audited for silhouettes, visual feedback, input-to-photon times and exploit surface. Higher displayed frames do **not** mean 60 Hz combat tick is faster. User-facing graphics presets must only present detected, installed and functioning SDK features; do not populate an exciting options menu with dead toggles.

## Services stay server-side

- **Identity:** optional guest training, mandatory verified identities for ranked, token rotation, replay permissions, account recovery; never expose private Google Drive credentials or game assets.
- **Online discovery:** HTTPS/TLS control plane for friends, private invites, player queues, ranked queues and spectating tickets. Separate session descriptors with compatible ruleset, region, tested RTT/jitter, platform/crossplay and allowed mode. Authentication is not provided by a WebSocket `Origin` header; it only helps protect browser endpoints. The current private rooms are **account-less/unrated**.
- **1v1 combat transport:** benchmark hybrid deterministic rollback (GGPO-like input prediction, saved states, rollback/resimulation and optional UDP hole punching). Relay for unreachable NAT peers; optionally use an authoritative low-latency server mode for cheating/critical tournaments. **Rollback is not in the current native build**. Never claim zero WAN latency.
- **Spectator and 1v1 lobbies:** each match has only two combatant slots; invitees and public observers use a separate read-only, server-authorized fanout with bounded snapshots, reconnection tickets and optional delay. Larger lobby attendance does not create teams, extra fighter state or combat inputs.
- **Results/rankings:** immutable match IDs, server-signed final results, ranked season/rating service and ladder provenance. Do not accept a client-submitted score or replay as the sole ranking authority.
- **Ghost AI:** opt-in anonymized verified replay data; capture legal confirmed actions/timings and build per-player style estimates with explicit retention controls, privacy and deletion. No claim of ML learning before proper data and evaluation exist.
- **Wi-Fi filters:** optional self-reported wired/wireless preference, **not** an unforgeable server-measured fact. Prefer actual measured RTT, jitter, packet loss and reliable network stability flags with user consent and transparent filters.

**Cost:** native PC rendering uses the player's GPU, not the 2-vCPU VPS. Small coordination/matchmaking/ratings services can be inexpensive at alpha scale, but true fully dedicated 60 Hz simulations, relay traffic, voice/chat and large spectator rooms have measurable CPU, bandwidth and moderation costs. Capacity must be load-tested; neither the current VPS nor a future server supports unlimited concurrent duels, spectators or player counts.

## Combat architecture

One **engine-neutral pure deterministic simulation** with canonical tick/inputs, fixed-point or carefully tested cross-platform arithmetic, serialization, rule versioning, replay state hashes and deterministic rollback unit tests. Keep physics independent of Blender/Unreal/Godot, Vulkan/D3D12, render cadence or audio. Changes to gameplay break compatibility unless rule version changes and replays migrate. Independent 60 Hz simulation; rendering at 60/120/144/240 as display supports, with interpolation on non-authoritative cosmetic state. Rendered character limbs cannot decide actual hitboxes.

`seamless-side/1` is an existing authoritative Node prototype, **not yet identical to a native deterministic C++ implementation**. Port/compare with golden state vectors and exhaustive replay parity before enabling rollback or PC ranked. The current Godot WebSocket bridge simply sends exact existing inputs and consumes authoritative state updates; it does not claim full gameplay parity.

## Native release requirements

1. **Art first:** two original professional rigged fighters with consistent full animation coverage, faces, cloth, firing/transforming weapons, blood/impact and meaningful hit readability. Original 3D meshes/textures/emissive/normal maps, **not** stolen game assets or placeholders labeled premium.
2. **Real fighting game:** local practice with authoritative frame data, replay seek/takeover, customizable keyboard/controller, sensible motion buffering, training dummy, backdash/parry/defense, rollback QA, anti-cheat, stage transitions and visible hitbox checks.
3. **Graphics QA:** genuine performance measurements on GTX/RTX/Radeon/Arc, Win10/11 and Proton, 1080p/1440p/4K, 60/120/144+Hz, HDR/SDR, D3D12/Vulkan, VRAM cap, cache and shader compilation stalls, options persistence and safe fallbacks. DLSS/FSR/XeSS are **optional** and must not gate playability.
4. **Latency QA:** input signal to photon measured with external camera/LDAT or equivalent, 1% low and p95/p99 cadence, controller scan/poll, menu -> match flow, online RTT/jitter/packet loss in at least three regions, WAN NAT/relay and server load. Readable actual measured local RTT vs rendered FPS vs input ACK; never conflate them.
5. **Server operations:** auth, DDOS/backpressure, reporting/blocking, friends chat moderation, GDPR-compliant replay/ghost retention, reconnect protection, database backups, dashboard and deployment staged separately. **No use of proprietary game source in the public game package.**

## Current milestone and evidence

The original painted high-resolution arena was already committed to the browser game. Godot-native Forward+ is independent, true Windows desktop PE + PCK cross-export, not an installed Unreal Engine game; read-only transport integration was verified in headless Godot 4.7.2 against the actual Node 1v1 server. The real Windows application and all vendor upscalers still require **GPU hardware runs**. Preserve all working browser paths, releases, private Google Drive continuity and production VPS unchanged until rollout is safe.

No unapproved migration or production deployment.

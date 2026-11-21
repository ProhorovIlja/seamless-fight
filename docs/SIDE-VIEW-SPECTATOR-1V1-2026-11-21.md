# Seamless Fight — 2.5D spectator rooms, native observation, EN-only 1v1
Date: 2026-11-21 · Research prototype on `feat/lantern-court`.

## Binding product requirements

**English-language game surfaces only. Exactly two players may fight. No tag, 2v2, 3v3, traditional blocking/grapples or other unrelated fighter genres.** Any additional lobby participants are **spectators**, not third/fourth character slots. Host choice controls public discoverability. Single-jump, aerial firearm/parry, timed visceral, paid quickstep, rally, health-for-temporary-bullets, trick transformations, breakable normal hitstun and 60 Hz input gameplay remain the core of `sf-hunt-lab/3`.

## What was actually implemented now

### Host-opt-in side-view watch rooms — legacy transport `seamless-side/1`

Before this batch, public spectator rooms existed only on the overhead `/fight/socket` prototype. **This batch actually adds spectator support to the 2.5D `/fight/side/socket` legacy server** through a separate, room-owned `watchCode` and `viewers` set. All side room creation is private unless the host deliberately sends `{t:'gallery',open:true}`. Watch codes differ from private player-join codes and only reveal the current match's stage, public watch link, two fighter slots, spectator count, and state. A spectator connects by `{t:'watch',code}`, receives an **authoritative current frame instantly**, and receives new current frames and effects during the actual fight.

- Exactly **two fighter seats**. A spectator has slot `-1`, cannot mutate inputs, vote for rematch, fetch a private replay or open/close a gallery. Server ignores forged commands.
- **6 viewers maximum per side room**, bounded WebSocket payload, origin validation, rate limits and buffered-output limits inherited from the side server. The host sees the real audience count.
- A viewer present before the guest joins receives the match-start snapshot. A viewer who joins mid-fight receives the latest verified server simulation snapshot; **no replay fast-forward required**. On rematch, viewers receive the new start snapshot.
- When the host revokes public view or a fighter disconnects, public code is revoked, viewers are informed and disconnected; the private room is not accidentally advertised. No account handle, IP, private join code, or player replay appears in Court listings.
- Public listing `/fight/lobbies.json` unifies host-open **side-view** and original overhead galleries, while `/fight/status.json` separately counts actual live WebSocket spectators, rooms and non-finished duels. Unique users remain `null`, because independent production accounts do not exist. The leaderboard remains honestly unavailable.
- The browser side-view client `public/side-view.mjs` supports shareable `/fight/side/?watch=...` links, renders live server snapshots, disables spectator inputs/online frame inspectors, marks `SPECTATING`, and gives hosts Open/Close public gallery and Copy public watch link controls.
- The Godot 4.7 native candidate gains the same source-compatible public observer handshake, exact snapshot validation, no fighter inputs, `SPECTATING` HUD mode, public gallery controls, copy-watch URL and real spectator latency ping. The native game scene currently supports only its existing original reliquary/moonlit visuals; it **does not yet have full 3D arena artwork for every online side stage**.

**Explicit limitations:** This is the **existing legacy side-view 60Hz authoritative Node simulation with 20Hz state snapshots**. It is not the **new Hunt v3** native combat core; the spectator stream is not GGPO rollback, lag compensation or input-synced P2P. Live watch is opt-in **public code**, not verified account-backed watch-a-friend; a third-party friend service is still required for friends-only ACLs. There is no chat/voice/moderation, persistent social DB, streamer broadcaster tools, permanent replay archives, or authenticated user identity yet. No live VPS deployment, no effect on the existing BBSC website or servers.

### Implementation and tests

| Part | Source | Regression |
|---|---|---|
| Side room observer role + lifecycle + count | `server/side-online.mjs` | `test/side-spectator.test.mjs` |
| Host gallery and observer client transport | `public/side-online-client.mjs` | Side real-WS integration |
| 2.5D watch UI and receive-only local state | `public/side-view.mjs`, `public/side.html` | Chromium smoke + live Node integration |
| Cross-mode Court presence and opt-in gallery listing | `server/public-activity.mjs`, `server.mjs`, `public/hub.mjs` | `test/public-activity.test.mjs` |
| Godot native watch-only transport and HUD | `scripts/native_side_transport.gd`, `scripts/native_online_session.gd`, `scripts/native_menu.gd`, `scripts/native_hud.gd`, `scripts/stage.gd` | `tests/verify_native_side_spectator.gd`, native workflow |
| Permanent English and exclusive 1v1 contract | `public/hunt-identity.mjs`, `test/english-only-content.test.mjs` | Node 22/24 CI |

GitHub CI must pass **on the final commit** before claiming the native Windows spectator entry is actually usable in a compiled export. Server lifecycle and wire safety can be tested on CI with real WebSocket instances; full controller/video/latency/spectator visuals still need real Windows/GPU/hardware QA.

## Why these features fit the game

The strongest compatible online design is not importing a different fighting system. It is importing polished **surrounding infrastructure**: host-controlled lobbies, shared view-only session entry, instant snapshot join, roles/capabilities, usable status, an honest practice readout and cross-input visual quality. This preserves the Bloodborne-first combat grammar.

- [Riot's 2XKO online engineering](https://2xko.riotgames.com/en-us/news/dev/how-2xko-handles-online-play/) explains why deterministic games should let a new spectator load the current verified state rather than replaying the entire input history. **Inspiration for spectator joining; no 2XKO tag or team mechanics.**
- [Street Fighter 6 official online manual](https://game.capcom.com/manual/SF6/en/ps5/page/6/6) documents private custom-room and spectating affordances. **UX inspiration only; no SF high/mid/low guard.**
- [Bloodborne Wiki PvP concepts](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html) and [movement/i-frame guidance](https://www.bloodborne-wiki.com/2015/10/movement.html) ground the different 2.5D action feel; do not copy protected game content.
- [Godot WebSocketPeer official reference](https://docs.godotengine.org/en/stable/classes/class_websocketpeer.html) governs native WebSocket handshake, queued packets and polling.

## Production-quality next gates

1. **Hunt v3 rules migration**: single exact combat simulation shared by native client, server, replay, spectator and practice. Remove legacy guard semantics and other outdated original side prototype differences from the production path, not from the isolated migration test harness prematurely.
2. **Network correctness**: authoritative confirmed 60Hz input stream, bounded rollback-safe event delivery and consistent snapshot checks, reliable reconnect, latency/rtt/packet loss and frame pacing instrumentation, malicious spectator/fighter fuzzing, load tests on shared BBSC VPS.
3. **Social security**: separate login and durable account storage, authenticated friend requests and presence, host role, friends-only view ACL, block/report/mute, one-time invite/revoke controls. Never use unverified public socket counts as player population; do not merge with BBSC accounts without consent and security review.
4. **Premium visual finish**: actually author, import and curate the original 546 animation *requests*, seamless trick-weapon moves, independent high-detail rigs, proper idle and facial/taunt/intro/outro variety, tailored sound/impact feedback and rich 3D arena sets. Source-backed animation metadata does not count as authored animation clips.
5. **English-only premium UI**: full native Court, account/friends/leaderboard screens once backed by real services, 1v1 lobby with viewer cards, better spectator camera/replay and accessible keyboard/controller/arcade/leverless input. Do not add extra languages or 2v2.

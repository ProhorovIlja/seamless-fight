# The Court — English-only 1v1 game, verified activity and independent social infrastructure
21 November 2026 · `feat/lantern-court` · Draft PR #1

## Final product constraints from latest user direction

**English only. One-on-one duels only.** No Russian language option, locale switcher, 2v2 mode, tag/team battle, or team-specific rules. The room/social space may include more people, but only two may enter the fighting simulation. Spectators cannot play or send valid fighter inputs. Spectator privacy must be chosen explicitly by the host. A friend should eventually be able to receive a direct lobby invite, join as the second fighter, or spectate a friend's authorized match, without making the fighting mechanics into another franchise's genre.

Bloodborne-first action grammar remains `sf-hunt-lab/3`: no ordinary guard/grab/double jump/air dodge, single grounded jump with air shot/parry, dodge i-frames, cancel routes, firearm parry only within a real action window, recoverable normal hitstun, limited ammo, blood-bullet ritual, timed restorative vial and visceral windows. Original world, names, licensed/created assets and character designs. 60Hz authoritative logic, separate display FPS (including uncapped), measured latency and rollback acceptance. The production goal is Riot/Arc System Works/Bandai Namco-grade polish, **not** a claim of released high-fidelity AAA assets.

## What actually works in this branch

**Live browser Court:** `/fight/hub/` is a new English-language, responsive, Gothic-themed web hub. `server.mjs` now serves `/fight/status.json`, `/fight/lobbies.json` and `/fight/leaderboard.json` as bounded, same-origin, cache-disabled read-only endpoints. Their values are derived from *actual* live WebSocket connections, private 1v1 rooms, the legacy side-view match service, queued sockets and deliberately host-enabled public spectator galleries.

- `connectedClients` means **WebSocket connections**. It is not the number of distinct verified human accounts. Account identity count is `null` until a separate authenticated service exists. **Never** silently rename sockets as verified people.
- `duels` is actual connected 1v1 pairs in the existing **legacy** main and side-view game servers. Hunt v3 is not yet the networked match implementation.
- `/fight/lobbies.json` lists only the existing `gallery` capability after an owner explicitly enables it; it reveals a separate public **watch** token, not the confidential fighter-join room invitation or player IP. The pre-existing main web match client can actually open those URLs and spectate a live duel, but has no account-backed friend associations.
- `/fight/leaderboard.json` correctly returns `active:false, verified:false, entries:[]`. No invented ELO, ranks, player wins or pretend matches. Actual competitive ranking requires verified identities, legitimate outcomes, anti-cheat, persistent ledger and replay/abuse handling.
- The native Godot candidate now has `CourtStatus` and a visible Court activity line in `NativeMenu`: a bounded HTTPS poll of the same endpoint, parsing only schema `sf-public-activity/1`, English 1v1 fields and actual integer counts. Offline states display *unavailable*, not zero/fake popularity. Headless CI uses injected valid/invalid source payloads and never makes a network request.

**Authenticated social core prepared, not deployed:** `server/social-core.mjs` contains request/accept/remove/block friendship state, authenticated-session presence, authorized friend-only fighter and spectator invites with 10-minute opaque single-use tokens, owner and 1v1 fighter-slot checks, revocation, and privacy. Its required `resolveIdentity` and `resolveOwnedLobby` callbacks are intentionally **not** wired to unverified unauthenticated input. No actual live account service, durable friend DB or cross-session device sync is present. The browser hub accurately says friends are not connected.

**Real gameplay scope:** old `/fight/` includes working host private room, shareable fighter invitation and manual opt-in gallery viewer links. Public Court lists those opt-in watch-only links. No 2v2, fake friend cards, misleading Win Rate numbers, or unsupported spectator access. The new Hunt core and latest 3D rig/animation pipeline remain isolated from the online legacy rules; no claim of live rollback.

## New engineering acceptance contracts

| Area | Existing implementation | Missing before public release |
|---|---|---|
| English localization | `public/hunt-identity.mjs` only exports `en`; rejects `ru`; Court HTML has `lang="en"` | Full new native Hunt v3 game routes must use the same strings |
| Lobby browser | Host-enabled galleries listed with actual watch links, 1v1 capacity, spectator count | Authenticated public/private/friends filters, room lock, discoverability/privacy profiles |
| In-game lobby | Real anonymous private duel + spectator watch codes in legacy online mode | Independent persistent party/session service, reconnect, safe invites, lobby chat moderation |
| Friend list | Authenticated social graph *domain* with tests | Secure auth provider, hashed tokens, encrypted transport, durable DB, block/report UI, session revocation |
| Launcher population | Server-backed count of live **connections**; native Godot menu can fetch it | Verified unique online accounts only once privacy-safe presence service is established |
| Statistics & leaderboard | Honest not-connected, no fabricated rank | Signed server match results, storage/migrations, season rules, replay verification, anti-smurf and abuse controls |
| Spectators | Existing main server authoritative state snapshots and host-open watch codes | Fast Hunt v3 snapshot load into spectator, rollback-safe events, stable watch on reconnect, privacy and spectator queue |
| Training | Hunt v3 isolated frame-meter/8 dummy slots/replay takeover | Native C++ Hunt parity and real polished Windows training UI |
| Gameplay format | `1v1`, two fighter slots | Do not add 2v2 or tag-team |

### Validation and privacy

`test/hunt-identity.test.mjs` enforces EN only and explicit 1v1 UI. `test/public-activity.test.mjs` verifies measured connection stats, opt-in gallery redaction, absence of private invitation codes and no synthetic leaderboard. `test/court-hub-http.test.mjs` launches the real Node server and checks the public hub, live WebSocket duel, opening/closing galleries, read-only watch clients and HTTP API. `test/social-core.test.mjs` exercises authenticated-only friend requests, invites, 1v1 room caps, expiration, blocking and watch privacy. `verify_native_hud_menu.gd` checks the English native menu rejects malformed/unverified data and displays actual counts. CI is required on the exact GitHub head; source alone is not proof of a passing Windows export.

Security requirements for the future production integration: strict Caddy Origin and content-security controls, no client-supplied account ID trust, rate limits, session anti-CSRF where relevant, no ranking through mutable client counters, reliable reconnect and account-device locking, strict opt-in public gallery discoverability, independent account/DB namespace from the existing Bloodborne BBSC project, no personal identity leaks in public APIs, spectators read-only at the server, signed or server-validated match outcomes, report/block features, per-IP abuse throttling, and retention policy.

## Evidence-based cross-game research: borrow surrounding quality, not unrelated combat

- **Bloodborne Wiki:** action timing, weapon transforms, firearm parry, quicksilver finite resource, blood-bullet HP trade and recovery. Source: https://www.bloodborne-wiki.com/2015/04/blood-bullets.html ; https://www.bloodborne-wiki.com/p/game-mechanics.html ; https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html . These are **design references**, not permission to redistribute protected assets, locations or named characters.
- **Riot 2XKO engineering:** server-authoritative stable snapshot plus input forwarding for near-instant live spectate, validated state/time, input-delay and frame-pacing engineering, active lobbies and cross-lobby matchmaking. We adopt **the infrastructure principles, not 2XKO's tag/2v2 game mechanics or its claimed vendor backend**. Technical source: https://2xko.riotgames.com/en-gb/news/dev/how-2xko-handles-online-play/ .
- **Street Fighter 6:** custom rooms, spectating and ranked/casual separation inform social usability, *not* traditional high/mid/low blocking combat. Source: https://game.capcom.com/manual/SF6/en/ps5/page/6/6 ; https://game.capcom.com/manual/SF6/en/ps5/top .
- **Guilty Gear Strive:** spectator queuing, lobby controls and room privacy suggest future audience/host settings. Source: https://www.guiltygear.com/ggst/en/news/post-1280/ ; https://www.guiltygear.com/ggst/en/howto/online/ .
- **GGPO / GGRS:** deterministic confirmed-input streams, verified snapshots and replay/spectator sync tests for future Hunt C++ port; do **not** claim current old Node state broadcasts implement GGPO. Source: https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md ; https://github.com/gschup/ggrs .

## Server deployment and visual release bar

Shared `seamlesshunt.com` domain with add-only `/fight/` scoped Caddy routing, independently sandboxed 127.0.0.1:18080 Node service and conservative 8+8 legacy room pilot. No live BBSC deployment or network changes. An 8+8 cap is a **starting load-test bound**, not safe capacity proof. Each spectating session and room count must be measured against BBSC's own active load.

The premium production goals remain hundreds of genuinely authored original hunter clip performances, character creator, visually strong 3D environments, original impact and voice/audio/intro/outro/taunt sets, carefully timed 60Hz character motion and stable >60 or uncapped visual rendering, actual vendor graphics integrations when verified, and robust production rollback. The new Court is real utility, **not** a finished game or a fake finished Windows launcher.

Draft PR: https://github.com/ProhorovIlja/seamless-fight/pull/1

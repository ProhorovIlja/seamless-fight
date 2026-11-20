# Seamless Fight — Side-view combat foundation

**Status:** Implemented side-view laboratory with offline practice **and experimental server-authoritative private 1v1 rooms** at `/fight/side/` on the development branch. The existing `/fight/` online prototype continues to use the older overhead 2D-plane engine until multiplayer migration and replay compatibility can be independently verified. This branch is draft/unmerged and no production site route is deployed.

## The user-facing 2D requirement

The destination is a **genuine side-on 2D fighting game**, not a top-down hunter duel wearing an isometric texture. The lab now implements actual horizontal positioning and one-dimensional ground collision, vertical jump physics, crouching, vertically differentiated hurtboxes and attacks, player-relative facing, guard/parry, stamina, quickstep invulnerability, firearm as a high line, hit recovery, rounds, and event-based combat audio. All gameplay occurs on a single flat lane; a side-view arena is a *background*, not a second set of physics.

Current `public/side-engine.mjs` is a **separate deterministic 60 Hz ruleset** named `seamless-side/1`. A side-view attack rectangle has both a horizontal reach and a vertical band; hurtboxes follow fighter feet and are reduced by crouch. A high pistol shot cannot hit a ducking defender, while horizontal sword strikes can overlap the low hurtbox. Jumping has a rising-edge gate; simply holding Up cannot create extra jumps on landing. The front-facing guard uses a four-frame deflect window and bounded stamina drain. A quickstep has explicitly limited evasion frames. Same-tick attacks can trade rather than granting the lower-index participant priority.

The new stage renderer `public/side-art.mjs` paints **original layered Gothic architecture, distant silhouette towns, Gothic arches, lit rose windows, stone floor, low-contrast haze and torches**. A large, articulated side-on fighter silhouette uses original vector paths for hats, profiles, coats, boots, a blade, pistol, sigils, active-attack arcs, parry circles and limited-speed travel trails. Stage backgrounds are cached after a single render and reused by Canvas; atmospheric specks can be suppressed by reduced-motion preferences. All three stages share exactly the same collision geometry.

`public/side-ai.mjs` implements three bot skill presets from **delayed observations**, not opponent input queues. `public/side-replay.mjs` stores two fighters' actions/guard/movement in a compact four-character frame tape with strict validation and 120-tick replay checkpoints. Frame stepping, arbitrary seeking, side-specific takeover, export and user-triggered import run locally; none grants ranked results or contacts a backend. Server API remains unchanged.

### Lab entry and controls

- Use the **Play new side-view combat lab** link from `/fight/` or visit `/fight/side/` directly in the isolated staging service.
- Move horizontally with Left/Right (A/D or arrows), jump with Up/W, crouch with Down/S. Cut/Heavy/Pistol/Quickstep/Feint follow the saved fighting-action keys; Guard defaults to O. Movement/action/guard keys can be rebound in the side-view page.
- Standard gamepads use the original saved mapping for action buttons, left/right stick choice and deadzone, plus left trigger hold for Guard. Touch devices get held movement/guard and action buttons. Input changes only affect subsequent local sampled frames.
- The optional box inspector marks **real side-view hurtboxes** and active attack rectangles; it does not change or expose networked player information. Other controls include reduced effects, high contrast, enemy difficulty, sound, and arena choice.
- Offline synthesized sound reuses the existing original asset and audio paths. Optional, already credited Kenney CC0 foley remains enabled only on user gesture. Individual source-file licenses are described in `ASSET_CREDITS.md`.

### Scope integrity

This side-view lab now includes a distinct, experimental **online private 1v1 mode**. The authoritative `/fight/side/socket` endpoint is separate from the older `/fight/socket` game, simulates at 60 Hz, emits 20 Hz snapshots and bounded input receipt acknowledgments, supports private invite codes, consensual rematches, disconnect cleanup and post-bout server replay export. It is not deployed to the live website. It has no authenticated rated ladder, public side-view matchmaking, 2v2, persistent/cloud replays, voice/friends, public ghosts, rollback, selectable weapon roster, unlock progression, or full animation-asset character creator yet. The large procedural hunters are stronger visual placeholders than the old top-down pawn art, but **not final AAA-quality sprite or mesh animation**. No claim is made of zero input lag. A passing Chromium smoke is not a substitute for real USB/Bluetooth controller, high-refresh display, mobile GPU and WAN latency/performance tests.

## Required migration gates before replacing the old online mode

1. **Protocol version and lobby selection**: the experimental private server room already advertises `rules: seamless-side/1` and refuses legacy or malformed side inputs. Before broader release, finish account-bound sessions, rate-limit and abuse simulations, latency/jitter tests, persistent result controls, monitoring and authenticated public queues. Side-view matches must be independently simulated by the authoritative server, with bounded inputs, origin and payload validation, disconnect handling, match timeouts, rate limiting, and reproducible correct outcomes. The existing `lantern-court/1` and `/2` input tapes continue to play through their own legacy simulation.
2. **Combat parity**: run identical tick inputs on headless Node and browser; assert checkpoints at startup, guard, parry, attacks, pushbox, jump landings, simultaneous trades, timer and rematch resets. Replays should hash the authoritative ruleset and reject malformed or unsupported tapes. Local practice cannot settle ranked ratings.
3. **Netcode study**: WebSocket receipt acknowledgments do not guarantee a player can see or confirm a hit instantly. Measure input-to-photon and server arrival separately, quantify p95/p99 frame pacing, RTT, RTT spread, loss and stalls; use deterministic replay, event dedupe and bounded rollback checkpoints before any GGPO-like claim. Treat cross-platform floating-point determinism and visual/audio event deduplication as explicit work items.
4. **Competition**: require authenticated identity, anti-collusion, account-bound settled sets and per-season ratings, robust disconnect/no-contest and queue-abuse rules. Explicitly differentiate unverified browser-reported connection medium from actual quality probes. Ranked and casual/room modes must never silently share rating attribution.
5. **2v2 architecture**: generalize player slots, side/team ownership, camera, health HUD, pushbox interpenetration, attack targeting, party splits, replays and match outcomes before enabling 4-participant battles. Do not merely add two extra sprites to a 1v1 engine.

## Art and sound licensing shortlist

**Imported in this pass:** no binary, website or third-party art; only original Canvas shapes, page styles and code. The previous three Kenney CC0 foley samples remain in the old bundle and are reused by the shared synthesized audio manager. The private `seamlesshunt` export in Google Drive provides the original site's palette and visual grammar, not a public relicensing grant.

**Free candidates verified for further trials** (not bundled here; sample and test silhouette coherence and licensing before integrating):

- [Ansimuz — GothicVania Cemetery](https://ansimuz.itch.io/gothicvania-cemetery) and [GothicVania Town](https://ansimuz.itch.io/gothicvania-town): each itch listing identifies CC0. Suitable for a coherent future pixel-art variant with parallax layers; do **not** casually paste low-resolution tiles under the current higher-resolution vector hunters.
- [OpenGameArt — Dark Knight 2D Character Sprites](https://opengameart.org/content/dark-knight-2d-character-sprites): its current page states CC0 for animated side-view characters; evaluate frame counts, silhouette, source provenance and animation coherence.
- [OpenGameArt — Knight and Knight Animation](https://opengameart.org/content/knight-and-knight-animation): free side-scroller frames; verify per-file terms before any redistribution.
- [Kenney — Platformer Characters](https://kenney.nl/assets/platformer-characters): official listing says CC0, but the bright style is not a natural fit for dark-gothic duels; useful for testing technical sprite sheet support only.
- [SpriteCanvas — Moss Knight](https://spritecanvas.com/free-sprite-sheets/moss-knight/): contemporary high-resolution CC0 labeled character/atlas with multiple action states. The publisher says these frames are AI-generated; evaluate visual consistency and provenance under the game's quality standard, and don't confuse license claims with tested quality.
- [GGPO developer guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md): networking/rollback reference only, not a packaged dependency.
- [shoto-fighter-godot](https://github.com/aminRX/shoto-fighter-godot): 2D fighter code/design reference; its MIT license does not transfer rights to third-party art.

**Design target**: authored standing, crouching, jump, landing, hit, guard, deflect, dodge, light/heavy/recovery, feint, firearm and finisher animations with matching silhouette width, weapon frame registration and foot anchors. Any adopted art must retain user color choices and readable hurtbox outlines. Optimize frame atlases and GPU texture memory and keep accessible effect/caption alternatives. No scraped character art, proprietary FromSoftware/Capcom/Team Ninja textures, original soundtracks, commercial voices or unlicensed fonts are to be copied into the public game.

## Verification targets

`test/side-engine.test.mjs` checks deterministic state save/restore, pushboxes, frame timing, damage, parry, guard, jump and mid-air box rules. `test/side-replay.test.mjs` validates the compact tape, malformed input rejection, checkpoint seek and user takeover. `test/side-presentation.test.mjs` validates deterministic cached backdrops, bounded original fighter drawing and bot observation delay. `scripts/side-browser-smoke.mjs` checks desktop horizontal movement, jumping, hitbox damage, replay seek/takeover, rebinding, all three arenas, mobile touch, reduced effects, and two real-browser private authoritative side-view clients; it emits artifacts for real visual review. The new `test/side-online.test.mjs` exercises side-room invitations, origin checks, snapshot acknowledgments, replay gates and disconnects. The existing Debian 13 Node 22/24 and legacy WebSocket tests continue to protect the prior ruleset.

Deployment boundary: **draft PR only**, no live Caddy/site route, database changes, production ratings, or VPS migration.

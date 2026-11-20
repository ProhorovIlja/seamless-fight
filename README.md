# Seamless Fight

Lantern Court is the first playable slice of a standalone, original gothic 2D browser dueling game for Seamless Hunt. It does not use Bloodborne assets, executable files, or accounts.

## Run
Use Node.js 22+. Run `npm install`, `npm test`, then `npm start`. Open `http://127.0.0.1:8080/fight/`. Choose Practice or create an online room and open its invite in a second tab or browser. Local development accepts the matching HTTP origin; for HTTPS set PUBLIC_ORIGIN to the exact browser origin.

WASD or arrow keys move, J cuts, K hews, L fires, I feints a heavy during startup, and Space quicksteps. Practice offers a sparring partner, an evasion drill and a stationary target; the field guide shows timing data from the shared move definitions. First to two rounds wins. Each round resets stamina, health, and three pistol shots. Light attacks punish misses; heavy attacks trade slower startup for reach and damage. The pistol interrupts melee windups. Quickstep has a short invulnerability window, not immunity through recovery. Round draws award neither player a point.

## Architecture and scope
Shared fixed-step ES modules and Canvas 2D keep the browser slice small; the Node server owns online simulation and accepts inputs rather than positions or damage. The server simulates at 60 Hz and sends snapshots at 20 Hz; the opponent renders from interpolated snapshots. Local free movement is predicted with bounded replay of unacknowledged inputs; attack outcomes, close-contact movement, and committed actions remain authoritative. No combat rollback. In-memory invite rooms are limited to two players, with mutual rematch and disconnect handling. They do not persist across restarts. The browser slice targets keyboard and desktop; no touch, ranked play or multi-region service yet.

See [deployment](docs/DEPLOY.md) and [references and asset credits](ASSET_CREDITS.md). The prototype visuals are procedural original art, not final sprite animation.

The **Duel lab** lets you practice a committed heavy, feint into cut, or pistol interrupt. Pick a starting distance or record up to six seconds as Cinder, then replay as Veil. Replay resets spacing and resources; the frame strip shows both fighters' simulated phases. This is local training, not online replay storage.

The room host can open a **spectator gallery** for up to six viewers. Share the watch link rather than the player invite; viewers cannot move fighters or vote on rematches. Closing the gallery disconnects viewers and invalidates the link. Opening it again issues a different link. Watch links grant live access to anyone who receives them; there is no public directory or broadcast delay.

Online Match Review captures the server's applied inputs for both fighters (up to 32,000 simulation ticks per match, from the start). Players can export JSON or review the capture locally, seek, step, and take over either side. Takeover doesn't edit the original or send inputs to a live room. The replay does not include connection timing, spectator data, or account information. It is not an authenticated result or a ranked record. The active recording resets on rematch; download it before leaving the room if you want to retain it.

Controls and presentation settings support action-key remapping, standard gamepads, adjustable stick dead zone, reduced effects and high-contrast outlines. Preferences and volume levels persist locally; sound still requires a user gesture. Gamepads submit the same discrete inputs as keyboards, without changing combat or replay rules.

Performance and connection diagnostics run locally and report rolling frame intervals, RTT, snapshot gaps, input receipt acknowledgments and footwork correction size. Acknowledgment means the server processed an input sequence, not that an attack started or connected. The Chromium test applies ordered asymmetric message delay and exercises both fighters’ pistol inputs; this is not a WAN loss or reaction-time test.

Choose Lantern Court or The Drowned Cistern for a new duel, practice or the lab. The host's choice is fixed for the room and shared with guests and gallery viewers. Captures retain the arena; old captures default to Lantern Court. Arena visuals and ambient audio are original; both stages have identical geometry and combat rules.

Open Combat inspector in practice, Duel Lab or match review to see both fighters’ input history and current combat phases, including the usable heavy-feint window. Seeking reconstructs recent inputs; takeover replaces only the controlled side going forward. The inspector does not show opponent input during live play.

Match review also supports stepping backward and ½× or ¼× playback. Taking over a fighter always runs at normal speed.

Combat Inspector and match-review markers identify misses, recovery punishes and pistol interrupts from the same simulation that applies damage. A whiff punish means damage during recovery after an attack that did not connect. This is analysis only: no balance, server snapshot, or replay format changes.

Use **Rewind before event** to seek 12 ticks before the last selected marker, then take over either fighter from there. This is a fixed lead-in, not a guaranteed reaction window.

Hunter Wardrobe provides four coat dyes and three sigil options (including none), with a preview and local persistence. Each fighter's look is locked for the room and retained in spectator and replay metadata. A local default-look setting overrides cosmetics without affecting other clients. Dyes and sigils do not change fighter outlines, telegraphs, stats, or replay rules.

Online neutral footwork uses a bounded presentation buffer targeting 50–100 ms from the received snapshot stream. Local prediction, authoritative combat and effects are not buffered. Attacks and round transitions discard buffered neutral poses. The diagnostics target is not measured one-way network latency.

The pistol has separate preparation and discharge cues. Its muzzle flash and report share one trigger derived from the authoritative firing phase, including when the firing tick is between snapshots. Damage feedback can still play on the same snapshot.

The presentation pass adds an adaptive synthesized score, nonverbal exertion cues, animated armor/weapon and hit details, and a larger mobile text scoreboard. Music and exertion have independent saved mix settings; the master sound toggle still requires a gesture. Chromium CI captures screenshots of both arenas and the reduced-motion mobile layout.

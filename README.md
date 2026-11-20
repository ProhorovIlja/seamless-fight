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

Touch devices show a pointer-captured movement stick and five combat buttons during play. Touch uses the same discrete inputs and move rules as keyboard/controller; cancellation and focus loss release held movement. Optional cue captions identify preparation, discharge, hits and interrupts without requiring audio. They do not expose hidden inputs.

Online pistol discharge and impact cues come directly from the authoritative tick, batched into existing snapshots and shared with spectators. Impact sparks follow the strike direction. Offline feedback still uses local simulation state. This does not change simulation rules, replay compatibility or send cadence.

The duel shell follows the Seamless Hunt website’s palette and typography. On a same-origin deployment, `SITE_ART=1` opts into shared site art and font assets with independent fallbacks. See `docs/DEPLOY.md` for the route and asset checks. The standalone build does not depend on the website, Google Drive, or a CDN.

Sound mix includes optional centered combat cues and an independent practice-only distance cue channel. The three tones mark transitions between cut distance, pistol distance, and outside both. They use current positions and move-table radii, not aim, stamina, invulnerability, or future hit prediction. No spacing tones in private matches, spectating or replays.

Canvas backing resolution follows its displayed width, capped at 2× device pixel ratio and 1920 pixels wide. Narrow screens no longer render a full desktop-size buffer. The 960×540 simulation and input coordinates are unchanged.

Controls and presentation saves independent combat mappings for keyboard and standard gamepads, plus movement letters and a left/right stick choice. Arrow keys and D-pad remain fixed fallbacks. A used gamepad button swaps assignments; invalid saved layouts fall back to defaults. Changing mappings clears input and requires a neutral controller before combat resumes.

Mouse buttons can be assigned independently to combat actions. They are unbound by default and only fire on the arena during active play. Mouse movement does not aim or move the hunter; the server input format remains the same.

Practice offers balanced, pressure, and range-keeping opponents alongside the evasion and still-target drills. Bots act on delayed simulated positions and moves, not player input. Capture a local practice session with the same review, export, and takeover tools used for online matches. Takeover keeps the other side's recorded inputs; the bot does not replan inside a replay.

**Learn the basics** uses a still target and advances when the simulation observes movement, a cut, a quickstep, a pistol discharge, and a successful heavy feint. It uses existing remapped inputs and does not add any player assist in online matches.

**Find casual duel** is an unranked first-in-first-out queue on a single server. It keeps the current Practice or Duel Lab session running until another fighter connects, then starts a fresh online duel. Search can be cancelled or expires after two minutes; leaving training for a different mode cancels search. The first queued player's arena is used. Private invite rooms remain separate; no ranks, accounts, region/ping filters or public room listing.

The arena and opponent selectors are locked during a search so the settings on screen match the request already sent to the server. Cancel to change them; local combat inputs keep working while queued.

Casual queue filters use a rolling refresh of the median of three server-timed WebSocket ping/pong probes. The stricter cap must hold for both links; these are server RTTs, not player-to-player RTTs or input-to-display latency. Reported Wi-Fi can be excluded while allowing unknown devices, or only reported Ethernet can be accepted. The browser hint is optional and untrusted. Private invitations bypass public queue filters. No skill rank is assigned.

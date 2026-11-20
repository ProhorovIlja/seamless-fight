# Seamless Fight

Seamless Fight is a playable, in-development standalone original gothic 2D browser dueling game for Seamless Hunt. It does not use Bloodborne assets, executable files, or accounts.

## New genuine side-view combat lab (in-development)

The next combat direction is a **true 2D side-on fighter**, not the existing overhead duel. The draft now includes a separate playable **`/fight/side/`** side-view lab, linked from the main duel page. It runs `seamless-side/1`, an independent deterministic 60 Hz simulation with horizontal spacing, gravity and jump edges, crouching high/low hurtboxes, forward attack rectangles, stamina, dodges, heavy feints, guard and perfect deflects. It has 3 original procedurally layered Gothic arenas, side-profile hunter/coat/sword/pistol animation, display-only hitboxes, Easy/Normal/Hard delayed-observation sparring, keyboard remapping, gamepad and touch, eight coat dyes/six sigils with a live portrait and replay-safe appearance metadata, generated audio, versioned replay export/import, frame scrubbing, and Veil-side takeover.

**Boundary:** `/fight/` remains the **older overhead online prototype**. The side-view page now also supports **experimental private server-authoritative 1v1 rooms** using a distinct `/fight/side/socket` endpoint, with 60 Hz server simulation, 20 Hz snapshots, bounded neutral-only input prediction, browser-observed median RTT, optional same-origin website art and versioned end-of-bout replay. There is no persistent identity, public side-view matchmaking, ranks, rollback or 2v2, and the existing legacy rooms and replays are not migrated. Offline practice and private side-view rooms do not enter the ranked matchmaker or award points, and this is not final AAA production art. See [side-view foundation and migration gates](docs/SIDE-VIEW-FOUNDATION.md). The current `/fight/side/` route is developed in a draft PR; the live seamlesshunt.com site was not changed.

## Run
Use Node.js 22+. Run `npm install`, `npm test`, then `npm start`. Open `http://127.0.0.1:8080/fight/`. Choose Practice or create an online room and open its invite in a second tab or browser. Local development accepts the matching HTTP origin; for HTTPS set PUBLIC_ORIGIN to the exact browser origin.

WASD or arrow keys move, J cuts, K hews, L fires, I feints a heavy during startup, and Space quicksteps. Practice offers a guided tutorial, difficulty-controlled sparring styles, evasions, a stationary target, and a local ghost trained explicitly from replay captures; the field guide shows timing data from the shared move definitions. First to two rounds wins. Each round resets stamina, health, and three pistol shots. Light attacks punish misses; heavy attacks trade slower startup for reach and damage. The pistol interrupts melee windups. Quickstep has a short invulnerability window, not immunity through recovery. Round draws award neither player a point.

## Legacy overhead architecture and scope
Shared fixed-step ES modules and Canvas 2D keep the browser slice small; the Node server owns online simulation and accepts inputs rather than positions or damage. The server simulates at 60 Hz and sends snapshots at 20 Hz; the opponent renders from interpolated snapshots. Local free movement is predicted with bounded replay of unacknowledged inputs; attack outcomes, close-contact movement, and committed actions remain authoritative. No combat rollback. In-memory invite rooms are limited to two players, with mutual rematch and disconnect handling. They do not persist across restarts. The browser slice supports remappable keyboard/gamepad controls, optional mouse combat buttons and touch input. Casual connection-filtered matchmaking and private rooms share one in-memory server; authenticated ranked play, multi-region coordination and 2v2 are not implemented.

Debian 13 (Trixie) is the deployment target. The game uses a separate Node 22+ binary; Debian's default Node 20 is not sufficient. See the [Debian 13 migration guide](docs/DEBIAN-13-MIGRATION.md) and [deployment](docs/DEPLOY.md). No live migration is performed by this repository.

See [deployment](docs/DEPLOY.md) and [references and asset credits](ASSET_CREDITS.md). The prototype visuals are procedural original art, not final sprite animation.

The **Duel lab** lets you practice a committed heavy, feint into cut, pistol interrupt, or an unseen mix-up randomly choosing between those three recorded patterns. Pick a starting distance or record up to six seconds as Cinder, then replay as Veil. Replay resets spacing and resources; the frame strip shows both fighters' simulated phases. This is local training, not online replay storage.

The room host can open a **spectator gallery** for up to six viewers. Share the watch link rather than the player invite; viewers cannot move fighters or vote on rematches. Closing the gallery disconnects viewers and invalidates the link. Opening it again issues a different link. Watch links grant live access to anyone who receives them; there is no public directory or broadcast delay.

Online Match Review captures the server's applied inputs for both fighters (up to 32,000 simulation ticks per match, from the start). Players can export JSON or review the capture locally, seek, step, and take over either side. Takeover doesn't edit the original or send inputs to a live room. The replay does not include connection timing, spectator data, or account information. It is not an authenticated result or a ranked record. The active recording resets on rematch; download it before leaving the room if you want to retain it.

Controls and presentation settings support action and movement-key remapping, independent standard-gamepad button layout and left/right stick choice, optional mouse bindings, adjustable stick dead zone with input-edge hysteresis, saved menu/panel text scaling (100/115/130/150%), reduced effects and high-contrast outlines. Preferences and volume levels persist locally; sound still requires a user gesture. Gamepads submit the same discrete inputs as keyboards, without changing combat or replay rules.

Performance and connection diagnostics run locally and report rolling frame intervals, RTT, snapshot gaps, input receipt acknowledgments and footwork correction size. Acknowledgment means the server processed an input sequence, not that an attack started or connected. The Chromium test applies ordered asymmetric message delay and exercises both fighters’ pistol inputs; this is not a WAN loss or reaction-time test.

Choose Lantern Court, The Drowned Cistern, or Ashen Reliquary for a new duel, practice or the lab. The host's choice is fixed for the room and shared with guests and gallery viewers. Captures retain the arena; old captures default to Lantern Court. Arena visuals and ambient audio are original; all three stages have identical geometry and combat rules.

Open Combat inspector in practice, Duel Lab or match review to see both fighters’ input history and current combat phases, including the usable heavy-feint window. The optional exact combat-geometry overlay marks true collision centers, phase-labeled attack cones and active quickstep invulnerability; this does not reveal live opponent inputs or modify hit detection. Seeking reconstructs recent inputs; takeover replaces only the controlled side going forward. The inspector does not show opponent input during live play.

Match review also supports stepping backward and ½× or ¼× playback. Taking over a fighter always runs at normal speed.

Combat Inspector and match-review markers identify misses, recovery punishes and pistol interrupts from the same simulation that applies damage. A whiff punish means damage during recovery after an attack that did not connect. This is analysis only: no balance, server snapshot, or replay format changes.

Use **Rewind before event** to seek 12 ticks before the last selected marker, then take over either fighter from there. This is a fixed lead-in, not a guaranteed reaction window.

Hunter Wardrobe provides eight coat dyes and six sigil options (including none), with a preview and local persistence. Each fighter's look is locked for the room and retained in spectator and replay metadata. A local default-look setting overrides cosmetics without affecting other clients. Dyes and sigils do not change fighter outlines, telegraphs, stats, or replay rules.

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

**Find casual duel** is an unranked first-in-first-out queue on a single server. It keeps the current Practice or Duel Lab session running until another fighter connects, then starts a fresh online duel. Search can be cancelled or expires after two minutes; leaving training for a different mode cancels search. The first queued player's arena is used. Private invite rooms remain separate; no ranks, accounts, region selection or public room listing. Connection-quality filtering is supported separately, as described below.

The arena and opponent selectors are locked during a search so the settings on screen match the request already sent to the server. Cancel to change them; local combat inputs keep working while queued.

Casual queue filters use a rolling refresh of the median of three server-timed WebSocket ping/pong probes. An optional maximum RTT spread checks the difference between the highest and lowest of those three samples for both players, without widening the filter; this is not a general packet-loss, jitter-distribution or input-latency guarantee. The stricter cap must hold for both links; these are server RTTs, not player-to-player RTTs or input-to-display latency. Reported Wi-Fi can be excluded while allowing unknown devices, or only reported Ethernet can be accepted. The browser hint is optional and untrusted. Private invitations bypass public queue filters. No skill rank is assigned.

### Ghost workshop

Capture a match or open a compatible replay, choose Veil or Cinder, and select **Train / update ghost**. It learns a bounded frequency table of relative movement and legal actions in distance and observed animation contexts. Multiple captures update the table; recent duplicate fighter captures are rejected. Choose **Trained ghost** in Practice. It reacts to the live opponent with a ten-tick observation delay, and falls back to balanced sparring where it has too little data. It does not upload data or train on other players automatically. Clear ghost deletes the local profile. Built-in sparring has Easy, Normal and Hard; the selected difficulty does not change a learned ghost, the still target, or the tutorial.

Ghost profiles can now be exported as small JSON files and imported on another browser. Imports are checked against the current combat rules and replace the existing local ghost only after confirmation. The workshop displays the count of training captures, learned observations, covered contexts and most common sampled combat action. Exports contain aggregate action counts and anonymous replay fingerprints, not raw inputs, accounts or match videos; no upload takes place. Store exchanged files only from trusted sources.

The [ranked design](docs/RANKED-DESIGN.md) includes a regression-tested, pure Glicko-2 rating engine matched against the canonical worked example. It is not wired to the live server and does not assign ranks, accept results or publish leaderboards without persistent authenticated identities and verified result transactions.

**Ghost exhibition:** after training or importing a ghost, enable *Watch AI fight your ghost* in Ghost Workshop and start Practice. The current difficulty controls the Veil bot while the trained ghost controls Cinder. Both respond to delayed observations and use the normal simulation; player input is ignored. You can capture, export, inspect and take over this offline demonstration through local practice replay controls. This is not ranked or an online fight.

Opt-in **Auto-learn my completed practice matches** can update the local ghost after a full human-controlled practice match. It learns only Veil's simulated actions, never automatically records or trains on an online opponent, never trains from a ghost exhibition, and never uploads source replays. Manual training from an ongoing practice capture is disabled while auto-learning is enabled to avoid double-counting the same session. Incomplete matches are not auto-trained. The toggle is off by default and can be changed without restarting the server.

Ghost exhibitions do not mark either bot as **YOU**, show an explicit AI/ghost label, and report winners by fighter name. Touch actions are hidden during exhibitions, and the Rematch control appears only for completed online duels. Offline practice still supports capture and immediate restart via Practice.

**Finite match rule:** new captures use `lantern-court/2`. A duel is still first to two round wins, but after six rounds without a fighter reaching two wins, the higher round score wins; equal scores produce a match draw. This prevents passive mirror or bot matches from continuing forever and ensures even six full 75-second rounds fit within the replay tape limit. The replay engine still accepts `lantern-court/1` input tapes with the prior unlimited-draw behavior, and existing portable ghost files using version 1 remain importable. All attack timings and damage are unchanged.

Static HTML, ES modules and original SVG assets now expose deterministic SHA-256 ETags and correct content lengths. Browsers may revalidate unchanged files with 304 Not Modified, avoiding repeat transfers while preserving revalidation and content security policies. No service worker or long-lived unversioned cache is introduced. The health endpoint and WebSocket traffic remain uncached.

The original procedural ambience no longer fades to silence every eight seconds: its filter state is warmed up over a repeated periodic noise sequence to keep loop boundaries smooth. Exertion has three deterministic variants per register instead of one repeated sample. These are synthesized placeholders, not recorded voice acting; both are generated outside the draw loop and remain under the saved mix controls.

Competitive best-of-three set rules are documented in [the set policy](docs/COMPETITIVE-SETS.md). Only two **won games** finish a set; one win never awards ranked points, and unresolved five-game draw-limit sets are no-contests. Private player rooms still permit unlimited mutual rematches. No authenticated ranked rating or public leaderboard is active.

**Competitive best-of-three preview:** the casual queue now offers a separate *Competitive BO3 · unrated preview* format. It matches only other players selecting that format; each set requires two game wins, automatically advances after an eight-second intermission, and preserves completed game input replays for inspection. A drawn game is replayed up to a five-game safety cap, after which an undecided set is a no-contest. The set status panel shows score and archived games. This prototype does not award points, update Glicko-2, publish ranks, or authenticate participants. Private player rooms retain unlimited mutual rematches and remain separate.

The Canvas HUD displays a compact gold-and-slate competitive-set badge (current game and games won) while the surrounding interface shows completed game archives. Private room creation is explicitly labeled *Create player room* to distinguish unlimited mutual rematches from the capped competitive set.

Private and casual rematch votes are explicitly unlimited and are never permitted to advance or settle competitive sets. Exporting a previously finished competitive game preserves its game number in the JSON and uses a distinct filename, while legacy replays and ordinary online captures retain their original names and format.

After an unrated competitive BO3 set ends, a **Find next competitive set** control exits the finished room and resumes practice-while-queued matchmaking without making players manually return to the main menu. Ranked points remain disabled, and completed match replay exports should be downloaded before leaving the old room.

Directional hit cues and combat captions now consistently attribute a landed hit to the *attacking* fighter while keeping the impact flash, pain voice and positional effects on the *target*. The authoritative simulation and replays are unchanged.

Match Review now displays a local comparative combat report for loaded replays: confirmed damage and hits, misses, punishes, interrupts, movement duration and separately labeled attempted action inputs. These figures come from deterministic simulation and do not award ranked points or upload match data.

An optional set of three tiny CC0 Kenney recordings now layers quietly with the existing original synthesized hit/interrupt and quickstep foley. Sound stays disabled until the user enables it; audio downloads start only after that action, preserve the separate effects volume setting and fall back to synthesis if samples fail to load. Nothing is streamed from Kenney at runtime; the vetted Ogg assets ship under `/fight/audio/` on the same origin.

The Sound Mix panel also offers an explicit recorded-foley toggle (on by default). Disabling it retains all original procedural sounds, prevents fresh recorded sample downloads when audio has not been enabled, and stores the choice locally. Users can switch layers without restarting a match.

### Current development: gameplay clarity and site consistency

The third original arena, **Ashen Reliquary**, uses a prerendered deterministic gothic composition, low-contrast combat floor, ash/bone/brass details, and a distinct synthesized ambient bed. The stage does not use or redistribute any private Bloodborne or website artwork. The optional same-origin website assets still load independently and retain fallback behavior. The game's underlying 960×540 combat plane and replay rules are unchanged. Controller dead-zone hysteresis reduces rapid movement direction toggles near the activation threshold but does not make the browser latency-free. The training collision overlay is deliberately offline-only, because competitive matches must not expose hidden inputs or extra privileged diagnostics.

# Hunt v3 Practice: playable drills, verified frame windows and real device remapping
2026-11-21 · Active research branch `feat/lantern-court` · **English game UI only, strict 1v1**

## Why this work matters

`/fight/hunt/` now has genuine new functionality beyond static move lists. All results are computed by the exact versioned `sf-hunt-lab/3` **60 Hz offline combat source**, not a legacy guard game or a decorative fighting-game UI. The product remains an original Bloodborne-first 2.5D PvP project. No double jump, conventional guard, grabs, two-on-two teams, airborne dodges or automatic counter animations are introduced.

The studio visual benchmark remains expensive original 3D models, properly curated animations, authoritative sound/impacts, lighting, environments, cinematic intros/outros and high frame pacing. The current gameplay stage uses clearly labeled **prototype silhouettes, NOT final original 3D rigs**. The existing **546 animation authoring requests are not complete motion capture or authored animation clips**.

## Actual source-driven training sequences

[`HUNT_PRACTICE_DRILLS`](../public/hunt-practice-suite.mjs) exposes six English-only options, with the first being unassisted free practice. Each other scenario takes place in an unranked normal `huntMatch` with only two characters, selected starting distance and real deterministic dummy **input tape**. The dummy is never handed an artificial parry-success flag or pre-applied damage.

| Drill selector | Original source setup | Player learns |
| --- | --- | --- |
| Free Practice | Normal neutral match spacing | Move/attack/transform, inspect source input |
| Counter Heavy Windup | Near spacing, opponent executes an actual heavy at recorded tick | Shoot so the projectile reaches the action-specific startup/active window, then use temporary visceral opening |
| Counter Vial Healing | Opponent starts below full HP, uses a real limited vial | Interrupt committed heal animation before health payout |
| Counter Blood Rounds | Opponent sacrifices HP to gain 5 temporary firearm rounds | Punish vulnerable blood-bullet ritual, not its idle animation |
| Hitstun Quickstep Escape | Opponent hits with a valid light attack | Wait at least 8 frames and pay real **25 stamina** for grounded escape |
| Evade Firearm Shot | Opponent fires a limited-ammo source bullet | Use ground quickstep i-frames to avoid the shot |

The exact source [`huntInspector`](../public/side-hunt-lab.mjs) now exposes **`firearmCounterWindowOpen`** and **`groundedHitstunEscapeReady`**, which are calculated with the very same action timeline and stamina checks used by the combat rules. The [practice meter](../public/hunt-practice-suite.mjs) and [English Gothic UI](../public/hunt.mjs) display these eligibility flags and visually highlight limited windows. This is legitimate feedback, not fabricated parryability for neutral/idle players or a permanent counter indicator. The old online and native C++ `seamless-side/1` remains different and needs source parity migration.

## Reusable, validated dummy libraries

Existing practice records at most **8 tapes × 600 real input frames**. `saveDummyLibrary()` exports `sf-hunt-dummy-library/1` with exact source rules, English copy and canonical inputs. `loadDummyLibrary()` validates **all eight slots and every individual action before changing any existing tapes**; rejects unsupported rules, incorrect locale, unknown actions, overlength slots, incorrectly-shaped payloads. Imported libraries reset to passive mode so arbitrary imported recordings do not play by surprise. This is a local offline data file, not executable scripting or competitive evidence. Browser import is limited to **512 KiB**.

The real browser [`/fight/hunt/`](../public/hunt.html) has an English-only drill selector, source-based event history, the existing record/playback, frame-step and replay export, and new distinct **Export/Import Dummy Library** controls. The `scripts/browser-smoke.mjs` Chromium test drives the action tape, downloads an actual JSON file and reimports it.

## Fightpad / arcade / leverless control improvements

- [`hunt-browser-input.mjs`](../public/hunt-browser-input.mjs) normalizes browser-standard physical buttons and **both left and right analog stick axes** with a safety deadzone.
- **Exclusive selection of one detected mapped controller** is available in the English practice UI. "Automatic" chooses the first standard-mapped connected pad; manually selecting a USB controller's session index prevents another device from taking over after unplug/reconnect. Unrecognized or disconnected selected controllers give **neutral input**, not guessed raw PCB button layouts.
- Real per-layout **user bindings** are editable and persisted locally for keyboard and mouse, gamepad, fightstick, leverless and fightpad. All 15 Hunt actions are labeled. Conflict validation and the exact original `rebindHuntDeviceProfile` prevent duplicate ambiguous physical inputs; a Restore Defaults control resets one profile. The input sampler uses the **same selected profile** rather than ignoring the user's remap; browser keyboard keydown checks the customized keys.
- Browser shortcuts and unsupported gamepad mappings are not promised. Only standardized Gamepad API devices can be used in the offline browser simulator. Native Godot uses its own tested SDL-based input pipeline; full physical Windows test matrices for Hitbox-style and Cross|Up controllers, debounce, latency, precise electronics and tournament SOCD compliance remain future acceptance.
- Deterministic simulation remains at 60Hz. Live render telemetry reports actually drawn FPS and a 120-sample **median/P95 rendered frame interval**; this is **not** hardware input latency, vendor frame-generation support, network latency or a claim that all monitors can show uncapped FPS.

## Actual regression gates

- `test/hunt-practice-drills.test.mjs` proves input-generated parries against timed heavy/heal/blood starts, actual 25-stamina grounded stun escape, step i-frames versus a real limited bullet, frame-specific eligibility, and atomic eight-slot input-file validation. All **7 isolated pure-engine tests** passed independent in-process execution; Node CI is also required.
- `test/hunt-browser-input.test.mjs` proves browser mapping, input edges, neutral SOCD, multiple controller exclusive selection and disconnect rejection, remapped right stick, and invalid overlapping bindings. All **8 isolated pure adapter tests** passed independent in-process execution.
- `scripts/browser-smoke.mjs` now starts Chromium with two explicit mapped controllers, selects leverless, disconnects the selected board to confirm **no pad-zero control handoff**, remaps a keyboard firearm to `J`, reloads the page and confirms the real source action appears after the new physical key. It also runs a source-driven dummy heavy drill, exports/imports the dummy library and checks the healing drill setup.
- `test/english-only-content.test.mjs` now scans the complete new Hunt web page, JS modules, renderer, CSS and practice logic to reject any Cyrillic player-facing translation.

**Do not report the full Chromium or native Godot pipeline as green without reading the latest commit's Actions result.** The player can use the web practice from a self-hosted source server, but `seamlesshunt.com` has not been redeployed. The existing BBSC Bloodborne services, accounts and site are untouched. No finished Windows release has been published.

## Technology and design evidence

Official [Capcom Street Fighter 6 Training Mode recording manual](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) describes up to eight dummy-recorded action sequences. We apply the valuable **practice recording tool**, not Street Fighter blocking/throw rules. The [Godot 4.7 controller reference](https://docs.godotengine.org/en/4.7/tutorials/inputs/controllers_gamepads_joysticks.html) and [MDN Gamepad standard mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping) explain device mapping and why physically unrecognized arcade boards cannot be promised without actual Windows QA. The [GGPO developer guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md) explains deterministic state and input re-simulation as prerequisites for rollback; local practice replays and branch takeovers do **not** prove network rollback is already working.

## Next production implementation, in priority order

Port Hunt v3 action state/timing/resource transitions into C++/Godot with multi-thousand-tick cross-language parity, then run the real 1v1 server/spectator/practice on that same versioned core. Add authenticated friend-only spectator access, social identity, match integrity and actual ranked results after the authority is correct. Continue original motion capture/hand-tuned animation, facial/cloth/weapon rigs, rich sound mix and actual 3D GPU rendering. The animated window cues and canvas prototype do not fulfill the original AAA art quality gate.

# Hunt Combat — no crouch, bounded defense, and corner pressure

Date: November 21, 2026. Status: **source code and tests on draft PR; not public competitive balance certification**.

## What comes from Bloodborne
Bloodborne primarily uses lock-on quicksteps and dodge rolls rather than conventional blocking; attacks include light R1, heavy/charged R2, transform L1 combos, attack-after-backstep, running attacks, gun counter into visceral and charged rear stagger. Its limited stamina, bullets, blood bullets, vials and Rally recovery give offense meaningful costs. Reference: https://www.bloodborne-wiki.com/p/controls.html ; https://www.bloodborne-wiki.com/2015/10/movement.html ; https://www.bloodborne-wiki.com/2015/10/combat.html ; Sony's counter/rally description https://blog.playstation.com/archive/2018/03/06/12-tips-for-surviving-the-first-few-brutal-hours-of-bloodborne-this-months-ps-plus-headliner .

The user's actual game constraints take precedence: **English-only, fixed 60Hz two-fighter rules, 2.5D Gothic visuals, no 2v2/tag, guard/block, crouch, high/mid/low/throw game, double jump or air step.** Aim is original implementation *inspired* by Bloodborne; no imported copyrighted assets or proprietary tables.

## Identified defect and implemented correction
The initial source and native port erroneously accepted DOWN as a gameplay crouch. It shortened hurtboxes from standing 111 units to 58 and slowed horizontal movement to 1.15 units. This would unintentionally make a traditional low/high evasion game. **Removed all three effects** from both `public/side-hunt-lab.mjs` and `native/combat/hunt_core.hpp`, removed crouch from the original browser silhouette and all device binding labels. The pre-existing `crouch` state bit survives only as a **permanently-false reserved checkpoint field** to avoid silently shifting 69-field native/JS state layouts; canonical binary snapshots now use version 2 to reject the older semantics.

Physical DOWN is retained **only for SOCD** (simultaneous opposite cardinal directions) on keyboard, D-pad, arcade stick or leverless. Alone it produces neutral input; pressed with UP it cancels jump. It never enables blocking, crouching, a lowered hurtbox, altered movement, or a different attack graph. Native and browser profiles now version their incompatible settings separately and reject stale action mappings.

## Defense without blocking: positions are strong, but not checkmate
The corner should give the attacker advantage without making 1v1 essentially over at a screen boundary. The first candidate now implemented is **forward quickstep THROUGH an opponent** during its already-legal six simulation-frame i-frame window (step age 1 through 6). This temporarily disables **body push collision only**. The character still walks/dashes under the same fixed-60Hz motion equations; no free teleport, gravity reversal, double jump, air step, new shield or synthetic throw. Retreating quickstep into the wall is not granted a position swap.

Existing budget at 60 Hz:
- Ground quickstep: 19 stamina, 9 active + 12 recovery frames, invulnerability only at ages 1–6. Exiting the i-frame window makes the fighter vulnerable again. Directional input determines crossing or retreat; no free escape if exhausted.
- Basic Mournweave folded light: 7 startup + 4 active + 13 recovery, costs 10 stamina. Folded heavy: 17+6+23, 24 stamina.
- Firearm shot: 9+1+25 frames, 9 stamina and one of seven initial rounds. Timed shot counters only committed opponent attacks/heals/blood-bullet creation; a late/early shot can still deal chip-free direct firearm damage but not automatically parry.
- Normal melee hitstun: actual damage still applies; a defender can pay 19+6 stamina for dodge after at least eight hitstun frames. Gun-parry stagger and visceral state are **not** freely escapable.
- Regular chains: contact-conditioned and capped; transform cancels and focus costs govern unusual strings. Existing stamina regeneration delay and whiff recovery make repeated aggression finite.
- Rally only on successful melee contact; blood bullets cost 30 HP for five temporary shots. Vials are limited and punishable during startup.

These are **prototype tuning values**, not evidence of PvP balance against skilled human opponents. The attacker can bait the defender's forward step, wait out the i-frames, then punish recovery. The defender may alternatively shoot a commitment, sidestep through timing, challenge with fast attacks when safe or jump **once**—no guaranteed universal escape.

## Training and reproducible acceptance
New source-confirmed `cornerEscape` event fires **only after a real side swap while actually moving away from a stage boundary during a legal forward quickstep**. No scoring is awarded for pressing the dodge key by itself. The sixteenth practice drill, `corner-escape`, places the fighter at x=65 with an opponent at x=107 and schedules a real enemy heavy action; only a genuine cross during pressure completes the objective. It is English-only and offline, with no fake online ranking.

Regressions added to `test/side-hunt-lab.test.mjs`, `test/hunt-input-device.test.mjs`, `test/hunt-practice-drills.test.mjs` and `test/hunt-training-goals.test.mjs`. Native C++ and JS must still agree across all four original weapon pairings over the 9,858+ frame source parity suite; Linux GCC, Windows MSVC and real Godot extension each have separate CI gates.

## Outstanding mechanical work (must be playtested, not blindly copied)
- **Running attack, backstep attack and real single-jump downward attacks**: first audit original Bloodborne motion choices; implement unique weapon-specific authored animations and verified frame/hitbox data rather than treating all of these as generic light/heavy aliases.
- **Corner stress tests**: repeat pressure at both walls with 0, 19, 25 and 100 stamina; observe predicted and late inputs under 0–8 rollback frames; test 2+ chain contacts, firearm bait, whiff punish, simultaneous quicksteps and neutral resets.
- **Anti-infinite**: verify no unavoidable loop that keeps a defender in hitstun without opportunities for paid escape, firearm read or opponent recovery, but do not grant invisible automatic pushbacks or universal get-out-of-corner meters.
- **Items**: optional and **not yet chosen** for PvP. If retained, finite charges, readable punishable windups, anti-stalling rules and unique counter windows are mandatory. Gestures can be noncombat/emote, not attack cancels.
- **3D animation/content**: frame data is not a rigged asset. Build original high-quality characters, grounded quickstep and through-crossing animation, running and landing attacks, readable gun recoil, trick transformations, sound telegraphs and dynamic arena walls.
- **Online**: migrate from old `seamless-side/1` to isolated native Hunt v3 only after signed snapshot compatibility and actual GGPO-like rollback/playtests; do not switch VPS or publish the current draft as a production Windows game.

Other-game references are for *defensive design principles* only; they do not grant a reason to import conventional blocking or throws. Compare https://sirlin.squarespace.com/articles/designing-defensively-guilty-gear and https://mail.dustloop.com/w/GGST/Mechanics . No assets, code or animation files were copied from those games.

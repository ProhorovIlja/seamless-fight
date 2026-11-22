# Seamless Fight — No-Guard Combat Loop and Training Specification
**2026-11-22 · Design proposal (not gameplay implementation) · English-only in-game terminology**
**Branch:** `feat/lantern-court` · **Scope:** original 2.5D 1v1 Hunt v3, isolated from the older `seamless-side/1` online rules.
**Companion:** `docs/HUNT-NEUTRAL-PUNISHMENT-PRESSURE-RFC-2026-11-21.md` and `docs/HUNT-COMBAT-CORNER-DEFENSE-2026-11-21.md`.

## Decision
Build a no-guard, no-grab, no-crouch fighting game whose fundamental cycle is **space → commitment → evasion/counter → recovery punish or true hit-confirm → position/resource reset**. The game is Bloodborne-*inspired*, not a reproduction. Its primary defense is avoidance, not absorbing attacks. The corner is a severe *spatial* disadvantage, not an automatic checkmate.

Do not copy conventional high/low/throw mixups, universal blocking, pushblock, Burst, air dash, double jump, or air step. Do borrow **training instrumentation**, replay takeover, precise punishment labels, authorable bots, and discoverable matchup tools from competitive fighters.

## Source baseline: what the original actually does
- Weapon forms have distinct moves, including R1/R2 chains, held R2, neutral L1 switches and L1 transformation attacks during other actions. R1 after a transformation attack can be a different chain link, not necessarily the default opener.
- Attack-after-dodge/backstep, running/dashing attacks and jump attacks are separate motion choices; they must have weapon-specific authored trajectories, not be rebranded neutral R1.
- Neutral-stick **backstep has zero i-frames**; directional quickstep/roll has finite i-frames. They should not become interchangeable input aliases.
- Gun interrupts rely on contact during a vulnerable, parryable action window, and open a bounded stagger → visceral opportunity. A mistimed shot is not a parry. A charged blow into the actual *rear* of an opponent can also open a visceral; instantaneous auto-facing would undermine it.
- Healing is parryable in original PvP during an actionable window; it is **not** universally safe. Quicksilver Bullets are a finite resource; Blood Bullets cost HP. Rally makes immediate melee retaliation valuable.
- Some original weapon-specific sequences are true combos, but the original's existence of these combos does not justify infinite 2D corner locks.
- Bloodborne does have a Wooden Shield / Loch Shield as exceptions; do **not** turn these edge cases into a standard blocking system.
- Original 3D lock-on and side-steps do not transfer unchanged to 2D side-view movement. Explicitly redesign collision, facing, front/back, body-crossing and vertical projectile targeting.

Sources: [controls](https://www.bloodborne-wiki.com/p/controls.html), [combat and transformation sequences](https://www.bloodborne-wiki.com/2015/10/combat.html), [movement and backstep i-frames](https://www.bloodborne-wiki.com/2015/10/movement.html), [visceral/heal interrupt](https://www.bloodborne-wiki.com/2015/03/visceral-attacks.html), [Rally](https://www.bloodborne-wiki.com/2015/03/regain-system.html), [true combos](https://www.bloodborne-wiki.com/2020/09/true-combos.html).

## Action classes and interaction contract
The engine must expose these fields to tests and the training inspector, without making them exploitable in live ranked overlays:
`action_id, form_id, startup_left, active_left, recovery_left, hitstop_left, hitstun_left, dodge_age, iframe_mask, parryable_mask, cancellable_mask, face_locked, horizontal_velocity, hitbox/hurtbox, stamina, bullets, temporary_bullets, rally_pool, recently_whiffed_action_id, last_hit_source, combo_count, corner_distance, last_actionable_tick`.
All rules must be deterministic at 60Hz; rendering interpolation must not alter collision, hurtboxes, windows or decisions.

### Punishment classification (never "on block")
| Label | Evidence required | Examples / counterplay |
|---|---|---|
| **Whiff Punish** | Source's melee attack missed; hit lands while **that source action remains in recovery** | Step out of long unfurled sweep and step in with fast folded R1 |
| **Recovery Punish** | Hit on an opponent who has committed to a recovering non-whiff action | Gunshot, heal attempt, item use, or completed dodge |
| **Dodge Recovery Punish** | Evasion i-frames genuinely ended before impact; defender still cannot act | Delay a poke, do not swing into invulnerability |
| **Counter Hit** | Melee strikes a vulnerable startup/active commitment; independent from gun parry | Fast folded attack beats the initial long-form windup |
| **Firearm Parry** | Real projectile contact during the exact parryable window, in range, with bullet spent | Predict R2, committed heal, or blood-bullet preparation; timely stagger |
| **Heal Punish** | Opponent was in committed healing state on contact | Shoot/close the actual window, not an arbitrary ranged heal cancel |
| **Blood Bullet Punish** | Opponent voluntarily spent HP and exposed the valid creation animation | Close distance during the commitment; punish if reachable |
| **Anti-Air** | Grounded weapon or projectile connects with an airborne hurtbox before landing | Jump cannot invalidate all grounded attacks |
| **Air Parry** | An airborne firearm fired and actually hit a parryable opponent during the right frames | Proposed enhancement; limited aim cone, meaningful landing recovery and bullet cost |
| **Spacing Trap** | Opponent moved into a still-active zone or tried to counter at a bad range | Long weapon covers the chosen route; punishable if read/whiffed |
| **Visceral Confirm** | Valid stagger/back-stagger, correct front/rear proximity, stagger window still alive | No infinite distance auto-teleport or invisible fake backstab |

The classifier must use simulation evidence rather than "N frames after a whiff" heuristics. If source recovery has ended before impact, classify as a normal hit, not a punish. A counter-hit is not automatically a visceral. An ordinary projectile hit outside parry windows may interrupt or deal damage per explicit move data but must not magically grant a gun parry.

## No-guard decision matrix: the fundamental neutral
| Opponent does... | Best *candidate* response | How the opponent can beat that response |
|---|---|---|
| Walks just into the tip of long R1 | Walk out/backstep, then real whiff punish | Stops early, uses shorter fast check, conserves recovery |
| Charges a slow heavy | Fast interrupt, shoot during parryable frames, or reposition | Feints during **authored** early windup / delays choice |
| Mashes folded lights | Move out of reach, dodge between **verified** gaps, or read gun counter | Delays a link, baits a shot, moves forward to catch retreat |
| Shotguns repeatedly | Run the finite bullet budget down, bait shots, punish recovery | Saves bullets and plays a melee neutral |
| Waits for your dodge | Do not dodge by habit; walk, poke or change distance | Checks movement with a short timed attack |
| Attempts to heal | Reach it with a committed attack or timed firearm, only if real range/window | Pre-positions far enough, baits shot, accepts risk |
| Attempts Blood Bullets | Contest the startup/recovery, or use the time to claim space | Does it at real separation, forces approach |
| Repeatedly jumps | Anti-air with authored vertical coverage; position beneath landing | Airborne strike / **limited** air gun, varied landing timing |
| Repeatedly retreats | Claim stage space; prevent free healing; do **not** buff infinite firearm zoning | Opponent baits overextension and punishes a long chase |

A move is only a *candidate* counter: active frame, startup, travel time, hurtbox shape and current resources decide whether it actually wins. Avoid hidden special rules that make identical contacts behave differently just because a player is near a wall.

## Corner without guard
### Defender's real choices
1. **Forward paid quickstep crossing**: cross the opponent's *body collision* only during existing i-frames; full physical travel required; not a teleport, no auto-side-swap. If the attacker waits or the defender has insufficient stamina, the escape can fail.
2. **Precisely timed gun parry** on a committed heavy/utility action: spends a bullet, works only during the specific vulnerability window. No "press gun to block" rule.
3. **Fast interrupt** after a real pressure gap: fold-form R1 can counter long-form heavy, but loses if late or out of range.
4. **Walk / short backstep** to create a miss where space remains; neutral backstep never grants i-frames.
5. **Single jump** to beat an attack with a genuinely low vertical hitbox, at risk of anti-air/landing recovery. No invincible generic air escape.
6. **Rally counteroffense** after surviving a hit: reclaim only still-available recent recoverable HP through real successful melee contact.
7. **Resource conservation / delayed response**: not every contact requires pressing a button; pressure must have finite source-defined openings.

### Attacker's answer
- Stand at a range that threatens the defender's exit but still has a punishable whiff.
- Delay attacks to catch the end of a quickstep, but become vulnerable to interrupts if the delay is readable.
- Back away slightly to bait an attempted body-crossing step; punish its non-i-frame recovery.
- Change weapon forms to cover distance or vertical path, paying transition cost and assuming the corresponding recovery risk.
- Do not allow the wall to delete all hit pushback **and** all post-contact neutral frames.
- Do not solve corner pressure by inventing wall bounce, forced teleport resets, guard, magical burst or meterless invulnerability.

### Explicit anti-infinite acceptance
- A passive or out-of-stamina defender may *lose badly*. That alone is not an infinite.
- A **true** infinite is a route with no playable, resource-reachable intervention or natural reset for unbounded damage. Prove it with move-level simulations, not by counting passive-script losses.
- Measure unavoidable damage from one ordinary confirmed hit separately from damage after a new neutral read or a failed escape.
- Bound unbroken links through source-defined attack recovery, pushback/weapon inertia, hitstun behavior, stamina, cancel gates and diminishing follow-up properties where needed. Do not insert arbitrary escape i-frames into the middle of a documented visceral.
- Test both corners and mirror-side inputs; body cross, facing and rear visceral must be computed from actual geometry and locked orientation.

## Attack graph: identity and constraints
Natural authored chains: **R1 → R1**, **R1 → R2**, **R1 → L1(transform strike) → alternate-form R1**, **R2 → permitted transform follow-up** (if confirmed), **backstep → dedicated R1**, **quickstep → dedicated attack**, **run → running attack**, **single jump → downward strike**. Distinguish linked true combo from pressure string with a gap.

Prohibited universal shortcuts: heavy→heavy recancel to skip recovery, free whiff→infinite safe transform, post-whiff gun cancel that universally erases punishment, full-invulnerability transform, guaranteed frame-one aim correction, uncapped carry from any single touch.

Potential **conditional** feints are authored on a few slower attacks, commit within visible startup windows, have their own recovery and cost, and are genuinely exploitable when predictable. A feint must not be an invisible instant guard.

## Hitstun and wake-up
- Distinguish ordinary hitstun, stronger stagger, true parry/visceral stagger, knockdown, and landing recovery. They are not one generic `stunned` boolean.
- Preserve an intentionally authored paid early ordinary-hitstun quickstep **only if testing supports it**, never permit it automatically during firearm-parried/visceral state.
- Do not grant a universal free escape that makes all combos fake; equally do not allow unlimited true stun with the wall cancelling all spacing.
- A wake-up defensive attempt is a timed commitment. It must have counterplay: delayed strike beats premature dodge, real gun parry beats a parryable committed meaty, a deliberate backstep can be caught.
- If the fighter is hard-knocked down, any invulnerable recovery window must be strictly bounded and pose-aligned rather than a hidden free strike/teleport.

## Economy and match policies (pending playtest)
- Shared stamina budget for attack, step, run and qualifying cancels. Running away and chaining dodges must not generate an untouchable timeout loop.
- Finite Quicksilver Bullets and temporary +5 Blood Bullets at HP cost. Evaluate a *round-defined* bullet/vial budget, not endless farming.
- Vials should be finite, visibly punishable, and ranked presets need a documented no-heal/limited-heal test before changing Bloodborne's identity.
- Rally should reward *recent* close combat, never passive waiting, firearm spam or arbitrary hitless activity.
- Ground pistol, slower shotgun-style gun and limited airborne shot need meaningful tradeoffs in startup/range/recovery/parry opportunity, with no universally dominant safe parry weapon.
- Optional Molotov/throwing blade/hunter tool/buffs are deferred from competitive core until every item has readable startup, counterplay, ammunition and reproducible deterministic tests.
- Ranked must use a single balanced ruleset; cosmetics, network platform and unlocked clothing must never modify attack timings, silhouettes or hurtboxes.

## Practice Mode: source-backed lessons, not generic block drills
Every drill needs three modes: **Learn** (visual prompt + correct timing), **Repeat** (randomized action cues), **Test** (hidden randomized cue, logged result). Use authored dummy recordings, frame-accurate state-reset presets and replay takeover. All labels here are English in-game.

| Category | Drill name | Dummy / arena script | Correct score event |
|---|---|---|---|
| Neutral | **Tip-Range Walk** | Alternates fast short check vs long sweep | Outspace active hitbox without spending i-frames |
| Neutral | **Whiff and Return** | Two sweeps with different real recovery | Hit during documented whiff recovery, not afterward |
| Neutral | **Form Reach** | Varies opponent's folded / unfurled reach | Select counter-range and correctly timed move |
| Punish | **Dodge Catch** | Quickstep with variable interval | Hit after actual i-frames expire, while recovery remains |
| Punish | **Heavy Startup Check** | Random committed R2 vs light | Interrupt startup without guessing false stagger |
| Punish | **Parry or Hold Fire** | Random heavy, feint, or idle | Parry only valid heavy; withhold bullet on idle/feint |
| Punish | **Vial Intercept** | Heal at short, medium, long separation | Gun or melee reaches *actual* heal vulnerability |
| Punish | **Blood Bullet Intercept** | Creates temporary bullets at random separation | True utility punish, no imaginary long-distance hit |
| Trick | **Trick Confirm** | Random hit, whiff, or dodge | Valid R1→L1 follow-up on actual confirm |
| Trick | **Charged Rear Opening** | Actual side-cross with facing-lock variations | Fully charged rear strike opens bounded visceral |
| Defense | **Backstep Is Not Invincible** | Active fast poke | Backstep outside real hitbox; failed i-frame assumptions logged |
| Defense | **Quickstep Timing** | Variable delayed sweep | Valid source i-frame evade, inspect end recovery |
| Defense | **Stagger Escape** | Ordinary hit vs firearm-parry stagger | Paid escape only from explicitly eligible ordinary stun |
| Defense | **Corner Cross** | Corner-heavy, delayed heavy or feint | Physically cross at right time without free teleport |
| Defense | **Corner Counterpoke** | Long heavy with varying gaps | Hit real gap, not during opponent's active frames |
| Defense | **Corner Bait Shot** | Opponent waits for parry | Do not waste bullets, walk/attack instead |
| Defense | **Rally Under Pressure** | Script recent HP damage, variable punish window | Recover only valid recent HP via melee contact |
| Air | **Anti-Air Read** | Single jump with varied descent | Strike an airborne hurtbox before landing |
| Air | **Aerial Gun Timing** | Jump, gun shot, opponent acts/feints | Bullet spent, correct limited air parry, landing vulnerability |
| Air | **Landing Trap** | Airborne attack, early/late landing | Punish actual landing recovery |
| Combo | **True or Gap** | Alternates true link and pressure reset | Show exact actionability, escape possible only on gap |
| Match | **No-Guard Offense** | Dummy random walk, poke, step, gun | Force openings through space and timing, not block strings |
| Match | **No-Guard Defense** | Dummy random attack/feint/utility | Choose timed dodge, gun, interrupt, or outspace |
| Match | **Adaptation Set** | Bot shifts from parry-heavy to dodge-heavy | Successful answer rate against hidden shifting policy |

Every scored event records `source_tick, target_tick, action_id, enemy_action, source_phase, target_phase, remaining_recovery, distance_at_contact, bullet/stamina_delta, result`. The frame meter must distinguish *punish* from *ordinary hit*, *gun hit* from *gun parry*, *true combo* from *pressure*, and *dodge evade* from *movement causing a whiff*. Do not award success on mere key press or visually plausible but impossible outcomes.

Additional training UI: rewind to pre-contact tick; frame-by-frame scrubbing; hitbox, hurtbox and i-frame overlays; directional input history; randomized dummy reaction; air/ground filters; both-corner reset; cross-side mirroring; slow playback; replay takeover and deterministic retry.

Provenance: [SF6 official dummy recording](https://game.capcom.com/manual/SF6/en/ps5/page/8/6), [Tekken 8 official replay practice](https://tk8.tekken-official.jp/en/mode/replay.php). Their training *principles* may be adapted without importing those games' block/throw/combo systems.

## Deterministic implementation and verification order
**Gate A — action data audit:** document every normal/form/step/backstep/run/jump/heal/gun state and frame contract, plus hitbox/hurtbox/facing geometry. Mark absent implementations explicitly. 60Hz native C++ and JS parity remains mandatory until migration is complete.

**Gate B — neutral counterexample harness:** for each chosen move, sweep distance, startup offset, stamina budget and defender policy. Report false parries, phantom anti-air, unreachable whiff punish and free whiff-cancel escapes. Seeded, deterministic.

**Gate C — corner minimax:** both walls, mirror inputs, all form pairs, 0/10/19/25/30/100 stamina, finite bullets, all escape options, at least early/late/feint/transform/heal opponent policies, simulated 0–8 rollback frames. Unlike the current heavy-only *oracle* matrix, add **adversarial active opponents** with bounded observation delay. Measure maximum *unavoidable* consecutive damage vs repeated voluntary errors independently.

**Gate D — release gate:** original authored move-specific 3D animations synchronized to 60Hz frame data, no visual lying about parry, working native 1v1 rollback, input validation for KBM/gamepad/arcade/leverless, rollback-safe event deduplication, round replay takeover, human balance tests at multiple latency/jitter profiles. Do not treat a passing unit test as competitive quality certification.

### Priority order
1. **Now:** define enforceable parryable and cancellable frame masks, punish classification, facing lock, finite stamina and exact recovery tracking.
2. **Next:** implement and validate non-placeholder backstep/run/jump/trick move graphs, air firearm and anti-air geometry; preserve source/native parity and snapshot versions.
3. **Then:** expand practice/AI/corner-adversarial drills and evidence-rich replay review.
4. **Only after that:** tune damage, hitstun, pressure and resources against skilled humans at measured network delay; integrate with native Windows production client.

## Explicit exclusions
No production VPS or seamlesshunt.com changes. No claim that this file implements the designs. No imported copyrighted Bloodborne character/weapon models, music, animations or third-party copyrighted gameplay data. Asset and code licenses require separate verification.

## 2026-11-22 — Instrumentation corrections and delayed-observation corner tests

**Source correction:** `public/side-hunt-lab.mjs` originally labeled quickstep ages 7–8 as `punishedDodgeRecovery`, though a 0-startup/9-active/12-recovery quickstep is still **active** at those ages; its genuine recovery begins at age 9. This misreported an actually vulnerable post-i-frame tail as recovery. The new `punishedDodgeVulnerableTail` event boolean keeps that evidence distinct, and `punishedDodgeRecovery` is restricted to genuine recovery. Physical damage, action rules, i-frames and native combat state are unchanged. The new `test/hunt-dodge-punishment-phases.test.mjs` checks i-frame ages 1/6, vulnerable tail 7/8, recovery 9/10/20 and post-recovery age 21 in both mirrored fighter positions. This classification distinction is now enforced by source tests.

**Adversarial-ish deterministic extension:** `scripts/hunt-delayed-corner-policy-matrix.mjs` and `test/hunt-delayed-corner-policy-matrix.test.mjs` provide **1,440 actual Hunt v3 source-simulation** scenarios: 2 defender × 2 attacker original weapons × 2 walls × 3 stamina levels (0, 30, 100) × 3 opponent-observation lags (0, 4, 8 frames) × 5 defense policies × 4 attacking policies (heavy, feint-heavy, delayed-heavy, mixed-light-heavy). The defender reads snapshots from completed previous simulation ticks; it does not have oracle access to the opponent's current instantaneous move decision. The attacker is still a deterministic scripted policy. Real matches, human reaction, jitter, input delay, rollback networking and visual timing are **not** simulated. Never claim the script verifies competitive balance or that a passive player's KO proves an infinite. The tests check grounded action events, physical side-crossings, legitimate parries, reproducibility and complete policy coverage.

**CI note:** New source work is accepted into the draft branch but passing CI / balance certification must be checked against the final commit SHA separately; earlier unrelated CI success does not transfer to a newer SHA. The live Seamless Hunt server and old `seamless-side/1` have not been modified.

## Candidate Bloodborne-depth mechanic: authored attack hyperarmor (NOT implemented)

Bloodborne's weapon-specific super/hyperarmor and stagger behavior can distinguish large committed attacks from fast weapon checks; the `Lead Elixir` is an extreme consumable example, not a reason for universal player armor. See [Lead Elixir mechanics](https://www.bloodborne-wiki.com/2015/03/lead-elixir.html), [Bloodborne PvP concepts](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html) and [the Bloodborne Wiki's mechanics index](https://www.bloodborne-wiki.com/p/game-mechanics.html).

**Potential original adaptation:** some clearly telegraphed heavy weapon-specific startup/active frames may resist stagger from *specific light melee hits*. The armored fighter must still lose real HP, gain only normally valid Rally, pay stamina and continue toward a punishable recovery. Correctly timed firearm parry, genuine dodge/whiff punish and position counterplay remain effective. Do not use a generic poise stat, auto-win armor on all heavies, free trade damage reduction or hidden immunity to visceral. Armor must be visually conveyed by the action's weight and sound, not invisible after-the-fact results.

**Evidence before acceptance:** 60Hz deterministic source/native field parity; early/late light interruption experiments; gun parry through armored frames; simultaneous contact trade policy; mirrored corner cases; no armored 100-to-0 loop; replay and practice clips. This is a *balance candidate*, not live gameplay or a promise that a particular weapon must receive it.

## 2026-11-22 — Real source/native frame-window training evidence

**Implemented (research practice, not online/ranked):** `huntInspector` in `public/side-hunt-lab.mjs` now exposes `quickstepIframes`, `quickstepVulnerableTail`, `quickstepRecoveryPunishable`, `quickstepRemainingRecovery`, and retains `firearmCounterWindowOpen` / `groundedHitstunEscapeReady`. The isolated native `SFHuntCombat.get_move_frame_data` exports the same fields straight from the authoritative C++ action state. The native training-only `CombatHud` presents the exact English indicators: **DODGE I-FRAMES**, **DODGE VULNERABLE TAIL**, **DODGE RECOVERY: nF**, **VULNERABLE TO GUN PARRY**, **HITSTUN QUICKSTEP READY**. Live ranked opponents must never be shown each other's parryable action windows as privileged frame evidence.

The quickstep has a **0 / 9 / 12** startup/active/recovery phase breakdown in this *original prototype*: after first step age 1, **ages 1–6** are invulnerable, **ages 7–8** are vulnerable active tail, and **ages 9–20** are actionable to punish only as recovery; age 21 has completed the recovery span. This does **not** claim to reproduce Bloodborne's exact animation frame counts. Source test `test/hunt-frame-window-inspector.test.mjs` covers every frame and both original weapons' real firearm parry windows. Native Godot tests `verify_native_hunt.gd` and `verify_native_hunt_practice.gd` exercise actual game inputs, native combat states, and visible HUD labels. CI is required before calling the complete native integration verified.

### Current experimental frame choices — not final balance

| Weapon / form / move | Startup | Active | Recovery | Reach | Stamina |
|---|---:|---:|---:|---:|---:|
| Mournweave folded R1 | 7 | 4 | 13 | 88 | 10 |
| Mournweave folded R2 | 17 | 6 | 23 | 113 | 24 |
| Mournweave unfurled R1 | 11 | 6 | 17 | 160 | 14 |
| Mournweave unfurled R2 | 23 | 8 | 26 | 193 | 29 |
| Thornwake folded R1 | 5 | 3 | 15 | 82 | 9 |
| Thornwake folded R2 | 16 | 4 | 24 | 124 | 21 |
| Thornwake unfurled R1 | 14 | 5 | 19 | 182 | 16 |
| Thornwake unfurled R2 | 24 | 8 | 29 | 222 | 34 |

These numbers come from `public/side-hunt-lab.mjs` and `native/combat/hunt_core.hpp`, not from copyrighted Bloodborne frame data. The table illustrates fast short-range interrupts, slower long-range control, and recoverable whiff commitments. They are pending live 1v1 playtests and genuine rollback/human reaction tests; changing them requires cross-language 60Hz parity and frame-aligned original animations.

The rank-safe design rule is that a high-quality practice mode can explain exact training damage while a competitive match exposes only fairly observable animation, sound, effects, and player-confirmed game events. Do not show a live opponent's secret vulnerability flags to the local player outside practice, even if they are technically available in state.

## 2026-11-22 — Same-frame melee trade fairness (implemented in isolated JS + C++ source)

**Problem and verified code path:** A no-block fighting game expects real mutual-hit trades. The source previously resolved two colliding melee attacks in slot order. The first strike gave fighter 1 a new Rally pool; when fighter 1's simultaneously active attack was resolved next, they could immediately reclaim HP from the *same incoming trade*, while fighter 0 could not. Fighter 1 also risked retaining `hitConfirmed=true` after being stunned. The imbalance was a simulation ordering artifact, not a move-frame or geometry difference.

**Source/native correction:** Before resolving contact for a 60Hz tick, freeze each fighter's *pre-contact* rally allowance. Only that old pool can be reclaimed by a qualifying melee hit on the current tick; new damage taken during the tick becomes Rally for **future** contact. If a fighter's action was already interrupted by simultaneous impact, they cannot emerge from the trade with a phantom hit-confirm while stunned. Preserve real damage, shot priority, momentum, focus, target hitstun, and source/native state layout. Ordinary one-sided Rally behavior is unchanged.

**Directed verification:**
- `test/hunt-simultaneous-trade-fairness.test.mjs` tests genuine two-hit 60Hz source collisions at the same tick for both slots, both mirrored original-weapon orders, empty Rally and existing Rally. It checks equal neutral HP results, symmetric resources, actual collision events and no extra hit confirm after stun.
- `native/combat/hunt_core.cpp` exposes isolated *test-only* `--trade` and `--trade-rally` starting states with real active hitboxes. `scripts/native-hunt-parity.mjs` now compares all 69 JS/C++ state fields for **eight** directed same-frame trade scenarios (2 Rally conditions × 4 weapon pairs), 32 simulated ticks each, alongside its existing full parity, corner and visceral suite.
- The Godot native GDExtension uses the same portable C++ source. Full CI results on the final commit are required before declaring the Windows build or native integration healthy.

**Game-design invariant:** `Player0(weapon A) vs Player1(weapon B)` and `Player0(weapon B) vs Player1(weapon A)` must produce mirror-equivalent HP/resource state under matching mirrored attacks. Neither side may gain more health from an identical simultaneous contact due solely to array iteration order. Real parry counters, attack-specific superarmor, 2.5D cross-through and future rollback hit arbitration must respect this principle.

**Release gate:** Gameplay semantics have changed without a binary state-layout change; before public online interoperability, explicitly version the full ruleset/rollback protocol and reject mismatched clients. This isolated experimental branch is not presently the production Bloodborne or Seamless Hunt server.


## 2026-11-22 — No-guard counterplay specification and lock-safe visceral input

**Scope:** English-only, single-simulation-plane original 2.5D 1v1; offline training and future spectator modes do not authorize 2v2. Retain the Bloodborne identity: trick weapons (R1/R2/charged R2 and attack-linked L1), real firearm counter into visceral, HP-paid temporary bullets, Rally, finite ammo, single jump and optional air firearm. **No standard guard, crouch/high–low mixup, throw/command-grab, double jump, air step or free burst.** Do not transplant other fighting games' guard pressure rules just to manufacture "opening someone up." Opening is a commitment, a true reach error or a late defensive read.

### Original source-authored risk/answer matrix (not a copy of Bloodborne frames)

| Commitment | Advantage worth preserving | Real risk / defense that must work | Training verification |
|---|---|---|---|
| Short folded R1 | Fast startup interrupt, close-range Rally | Loses to precise spacing/whiff, correctly timed firearm parry, and longer-range counterpoke | Startup interrupt, neutral whiff punish |
| Long unfolded R1/R2 | Space denial and tip-range control | Slower startup/stamina; a missed committed melee exposes a small *recovering weapon arm* hurtbox; already-landed attacks do not gain this bonus target | Whiff-only 69-field JS/C++ parity, recovery arm HUD |
| Charged R2 | Real rear stagger → limited visceral opportunity | Long readable windup; genuine counterhit/parry/quickstep answer, cannot universally cancel recovery into another heavy | Rear visceral, commitment tests |
| Gun / air gun | Punish genuinely parryable active attack/utility window, air parry only on actual collision | Finite shots and authored startup/recovery; too-early/late shot is ordinary bullet damage or whiff, **not** a free stagger | Parry window frame meter, parry-on-heal, air counter |
| Directional quickstep | Paid i-frames and possible legitimate cross-through at either wall | 19 stamina baseline, source ages 7–8 vulnerable tail and ages 9–20 punishable recovery; no air dodge | Both corners, dodge-punish, vulnerable-tail display |
| Neutral backstep | Quick space reset and authored backstep-R1 branch | No i-frames; can be called out by longer weapon/reach | Dedicated backstep R1, no fake quickstep invulnerability |
| Trick transform and feint | Attack-linked form conversion and rhythm/spacing changes, DMC-like skill expression | Spend stamina/frames; cancel must obey real source states; no universal safe-on-whiff escape | Transform-on-contact and feint-read practice |
| Heal / Blood Bullet creation | Limited HP recovery / 30 HP for 5 temporary shots | Long visible commitment, can be interrupted or firearm-countered in the source window | Heal-punish and blood-economy drills |
| Rally or hitstun escape | Regain previously lost HP through **actual melee contact**, or pay extra stamina to exit eligible ordinary hitstun | Gunfire alone does not Rally; same-frame incoming damage cannot be retroactively regained; no escape from visceral victim | Simultaneous trade and hitstun-escape tests |
| Aiming for visceral | Reward confirmed gun parry or charged rear stagger within exposed window | **Both player slots** must evaluate target range (≤76U) and exposure from the same tick-start snapshot; no target teleport | Mirrored opening/expired/inside/outside parity |
| Locked visceral victim | Attacker performs a committed cinematic follow-through | Victim cannot buffer phantom shot/step **during visceralVictim**, but after the hit lands ordinary hitstun and its paid quickstep escape stay available | Two-slot 24-tick locked-victim input replay |

### Formal neutral and corner acceptance

**Neutral:** A long poke must not be simultaneously fastest, longest-ranged, safest on whiff and lowest-cost. A short interrupt must beat predictable slow startup only if its real hitbox reaches in time. A gun counter must interrupt on one precise authored parry window and spend one unit of finite ammunition. Morph/feint must change timing/reach without gifting an invulnerable auto-cancel to all recovery. Attack commit and new-action facing must be slot-neutral from tick-start positions, with neutral refacing recomputed after final body collision.

**Wall:** Neutral walking may never cross an opponent's solid 38U body gap. Only real paid forward quickstep during source i-frames or genuine airborne overpass can change sides. Corner offense gains positional advantage and can bait parry/quickstep; corner defense must have actual R1 startup interrupt, finite-bullet gun parry and costly directional through-step as distinct, counterable answers. Evaluate left/right walls with symmetrical action tapes and tests. This is no universal guarantee that every weapon escapes every pressure sequence.

**Whiff and recovery:** "Punish" means the strike truly connects while the rival's actual committed move is still in relevant vulnerable recovery. A mere button press or guessed frame count earns no score. Missed ordinary melee exposes only a bounded arm section `min(24, floor(reach/5))`; the original torso remains hittable regardless of previous contact, and the extra arm is *not* exposed when `spent=true`. Dodge vulnerable tail must be labeled separately from recovery.

**Network integrity:** The above logic is rollback state, not just presentation. Record input and exact source state for every verified scenario, compare all 69 source/native fields, and reject version mismatches in any eventual ranked server. Never leak an opponent's future or exact source-only vulnerability flags in ranked; use original authored movement/weapon animation, VFX and fair audio telegraphs. Simulated Linux/Windows parity does **not** prove human balance, real online rollback latency or premium finished visuals.

### Concrete fix in the current branch

A newly detected slot-order bug let a player being caught by visceral receive a *new queued shot/step* when they happened to be processed second in the 60Hz drive loop. This produced unequal rollback snapshots despite neither player being legitimately able to act. The source `drive` in `public/side-hunt-lab.mjs` and native `drive` in `native/combat/hunt_core.hpp` now clear and refuse queued inputs **only while action is `visceralVictim`**. They deliberately do **not** disable input buffering in ordinary follow-up hitstun: that stage still supports existing stamina-paid recovery/quickstep rules. Directed test-only CLI states `--visceral-lock-p0-shot`, `--visceral-lock-p1-shot`, `--visceral-lock-p0-step`, `--visceral-lock-p1-step` verify actual states at 60Hz; the victim sends held input during the cinematic interval, then releases it, and full 69-field C++/JavaScript parity checks that no phantom buffered shot/step survives. Source test `test/hunt-visceral-slot-fairness.test.mjs` adds direct mirrored safety tests.

External design reference (not asset/data redistribution): Bloodborne Wiki [PvP Concepts & Techniques](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html), [Movement & iFrames](https://www.bloodborne-wiki.com/2015/10/movement.html), [Visceral Attacks](https://www.bloodborne-wiki.com/2015/03/visceral-attacks.html); Capcom's official [Street Fighter 6 Training Mode Recording Tips](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) informs *dummy recording and scenario repeatability*, not borrowed guarding or grappling.


## 2026-11-22 — Bait and punish the missed firearm (22nd practice drill)

**Why it matters:** A no-guard fighter must not devolve into repeated risk-free gun-counter fishing. A bullet has limited ammunition, an authored active frame and substantial vulnerable recovery. In original Bloodborne, firearm parrying requires catching a genuinely vulnerable enemy action, and a shot into an ordinary attack windup can itself parry rather than deal generic chip. The move still depends on distance, target orientation, real hurtboxes and i-frames; a well-timed punish is an earned read, not a scripted cinematic.

**New source-driven offline practice:** `gun-whiff-punish` (`Punish Missed Firearm Recovery`) in `public/hunt-practice-suite.mjs` and `public/hunt-training-goals.mjs`, documented in English only under *Reads & Footsies*. The recorded enemy uses its actual finite-ammo `shot` at frame 55, with a 110-unit initial setup; no artificial forced whiff or recovery state is awarded. Success requires all of:
1. A genuine confirmed `whiff` event for player 2's `shot` (not `gunParry` or `bulletHit`).
2. Real player 1 melee `hit` against that opponent (not attempted attack input, fire, UI animation or guess).
3. At the contact tick, source event `punishedRecovery === true`, `punishedMove === 'shot'`, `remainingRecovery > 0`.
4. The whiff occurred within a bounded 25-tick window preceding the real contact.

The source-only objective is not a ranking reward and never reveals opponent's private future state in ranked play. The underlying 60Hz C++/JS combat model and firearm frame costs are unchanged; this is a new offline tutorial for existing true mechanics, not new guaranteed combos.

**Playable acceptance regression:** `test/hunt-missed-firearm-recovery.test.mjs` plays through the actual `huntPracticeSession` API and uses a regular forward quickstep at tick 59 and R1 at tick 81 against the authored live gun at tick 56. The test demands a source `shot` action, authentic `shot` whiff from bounded i-frames, true R1 damage during recovery, no damage to player 1 and a source-verified completed goal. Separate seeded frame tests prove both original weapons can hit genuine shot-recovery after actual whiff, and negative tests reject ordinary bullet hits, real gun-parries, attacks before/after recovery and hits that never connected. This is not a claim that these input timings exactly reproduce Bloodborne's frame data.

**Score consistency:** The previous `corner-escape` attempt counter inadvertently recorded a heavy at any wall, while actual left-corner victory required a real `playerWall:'left'`. Attempt provenance now requires the correct designated wall, mirroring the right-corner exercise; right-side pressure cannot inflate left-corner attempts. The existing wall startup-interrupt and through-step tests remain independent.

**Browser and CI:** The English practice catalog is now 22 entries, with Chromium UI smoke checking the new selected option, its *Reads & Footsies* description and looped source dummy, plus the rest of the 21 drills. Native Godot integration already passed on the previous unchanged combat rules in run 44961246250 (Linux extension, Windows MSVC DLL, Windows EXE/PCK, headless Windows exported executable). The final new-practice-UI CI head must independently pass before marking its browser smoke accepted. The authoritative C++/JS state was not modified by this training addition; future ranked game must enforce all original resource and hitbox rules.

**External research references:** Bloodborne Wiki [Controls](https://www.bloodborne-wiki.com/p/controls.html), [PvP concepts and techniques](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html), [Movement and iFrames](https://www.bloodborne-wiki.com/2015/10/movement.html), and [Visceral attacks](https://www.bloodborne-wiki.com/2015/03/visceral-attacks.html). The risk/reward and 60Hz exercises are our original design choices, not Bloodborne engine extracts or a license to reuse proprietary assets.


## 2026-11-22 — R2 whiff commitment versus Bloodborne-style L1 trick conversions

**Real source reference and adaptation boundary.** Bloodborne's L1 can produce transformation attacks immediately after another weapon attack or a directional dodge, and different weapons have distinct transformation frame data. See [Transforming Attack](https://bloodborne.wikidot.com/transforming-attack), [Combat / Weapon Transformation](https://www.bloodborne-wiki.com/2015/10/combat.html) and [Weapon Analysis](https://www.bloodborne-wiki.com/2017/03/weapon-analysis.html). Those sources do NOT establish this original game's frame counts or require Bloodborne assets. Dustloop [Evaluating Risk/Reward](https://mail.dustloop.com/w/Evaluating_Risk/Reward) is design reference for why an unsafe committed option must have a meaningful response, not a request to import guarding or frame-advantage-on-block rules.

**Confirmed implementation design risk.** The original Hunt v3 transition graph allowed a fresh `unfurl` or `refold` attack whenever `age >= old.startup+1` and enough stamina/chain remained, even on a completely **missed heavy R2**. Thus a long-range failed commitment could convert into an additional active attack before the first attack's active frames had even ended, denying many intended spacing/whiff punish situations. The entire Bloodborne L1 mechanic should **not** be removed: it is essential to trick-weapon skill expression, alternate forms, hit-confirm routes and interesting counterattacks.

**Source-native experiment: mandatory FOUR 60Hz recovery ticks after an unconfirmed R2 or charged R2.** Added `HUNT_WHIFF_HEAVY_TRANSFORM_RECOVERY=4` in JavaScript and matching `WHIFF_HEAVY_TRANSFORM_RECOVERY=4` in C++17. While a heavy or charged heavy has **not** `hitConfirmed`, an attack-linked L1 `unfurl/refold` can begin only once `age >= old.startup+old.active+4`. The first four actual recovery frames of the missed heavy are committed, physically exposed and cannot be canceled to a new transform hitbox. This is an original 4/60 s (about 66.7 ms) experiment, **not** an assertion about Bloodborne's historical frame timings.

**Behaviors preserved, with costs:**
- A genuinely **hit-confirmed** heavy/charged heavy retains normal paid transformation timing instead of losing its Bloodborne-inspired route.
- Missed fast R1 and authored normal attack-linked trick routes remain more flexible; the rule is intentionally scoped to R2/charged R2, not a blanket ban on transformation attacks without hit.
- An ordinary grounded forward quickstep can still lead into the same authored paid transformation route; no new aerial step, double jump or free guard.
- A whiffed heavy still has later L1 counterattack potential. The opponent must **read** that response rather than assuming every miss provides a guaranteed full combo; only true contact in the source recovery qualifies as a punish.
- Inputs queued early may be held by the existing bounded six-frame command buffer and start only when the window actually permits. Neither the buffer nor this rule grants new i-frames, a teleport, or infinite chain depth.
- Heavy hit-confirm, stamina cost, previously limited chain count and ordinary end-of-action recovery remain unchanged. Firearm parry and genuine heavy whiff punishment remain viable defensive choices.

**Source-driven teaching:** `huntInspector` and `huntFrameMeter` now expose `whiffHeavyMorphLockFrames` **only in offline training** when a real missed heavy has entered the special early recovery portion. The browser English meter displays `MISSED R2 · TRICK ATTACK LOCK 4F` (counting down to 0), and the native Godot C++ extension / HUD uses matching `MISSED R2 / TRICK LOCK: 4F`. This is not intended to expose opponent source-only information in real ranked play.

**Exact regression contract:** Both source weapons (Mournweave / Thornwake), both player slots, both folded/unfurled forms, both ordinary and charged heavies must reject a new L1 at recovery tick +3, permit it at recovery tick +4 while spending actual stamina, and continue to permit confirmed L1 conversion and fast light whiff conversion. The parity CLI adds **32 test-only directed scenarios** (2 weapons × 2 slots × 2 forms × 4 cases: heavy-early, heavy-late, heavy-hit, light-whiff) with **20 60Hz frames** and all **69 C++ vs JavaScript state fields** checked on each frame. Native Godot validates the default folded heavy's exact inspector ages 23..26 (4, 3, 2, 1), clears at 27 and shows the correct local training HUD text. This is baseline regression coverage, not proof of human meta balance.

**Acceptance before ranked:** Test at both walls and in true neutral against short R1, long range R2, gun parry and paid dodge, including latency/rollback and original visual weapon timing. A 4-frame whiff risk is an adjustable tuning parameter: do not claim the value is perfectly balanced without human reaction, netcode and animation evidence. This project remains strictly 1v1 with **no ordinary guard, throw, crouch high-low guess, air quickstep or second jump**.


## 2026-11-22 — Proving the punish actually hits, rather than merely refusing a premature L1

**Question:** In no-guard footsies, is an unconfirmed R2 meaningfully vulnerable in practice, or can an early trick button, animation/slot order, or left/right wall geometry shield its recovery? A technical cancel rejection is not proof that a defender's R1 hitbox can actually touch the recovering hunter.

**Resulting source tests:** The source-authored `test/hunt-heavy-whiff-transform-risk.test.mjs` now stages a real folded R1 with exact `huntMoveSpec` active timing against the target's existing heavy/charged R2 at `age = startup+active`. Simultaneously, the target tries an early `trick`. The assertion is **real `kind:'hit'` with `punishedRecovery===true`, `punishedMove` exactly the missed heavy/charged action, `remainingRecovery>0`, correct 60Hz stun, no transform `action`, and no buffered phantom L1 after contact**. Merely pressing R1 or a dropped L1 is not enough.

The central arena is verified for 2 weapons × 2 forms × 2 target slots × 2 types of R2 = **16 complete contact cases**. The same source test repeats all 16 across both physically mirrored actual **LEFT** and **RIGHT** walls = **32 additional contact cases**; the defender is placed on the actual wall (x=65 or x=895) and uses its correctly oriented R1, with the attacker at exactly 70U. The target is not teleported by a testing success condition; the real source hitbox must overlap and actual HP/stun resolve. A successful startup-safe R1 counter never fabricates a `cornerEscape` event (that is reserved for actual paid positional crossing).

**C++17 equivalence:** New test-only CLI modes `--morph-counter-p0-folded-heavy`, etc., cover **16 genuine countercontact cases × 20 frames** in portable native C++ under each game's original weapon specification; `scripts/native-hunt-parity.mjs` compares the full **69-field state on each frame** against the identical JavaScript input tape. This distinguishes the earlier 32 directed **cancel admission** fixtures (which put characters far apart) from 16 actual **melee collision and hit reaction** fixtures. It also checks source hit event metadata including recovery phase/target.

**Practical tutorial:** The existing English `Whiff Punishment` offline practice scenario now explicitly says to bait R2 outside its tip, move in, and land a real R1 **while the first four recovery frames remain uncancelable into L1**, without treating an attempted button press as a success. `scripts/browser-smoke.mjs` requires this tactical explanation in the browser. Do not confuse a source-proven punish with a permanently guaranteed combo: the defender must pre-position and time R1 correctly, and the attacker still retains later risk-bearing L1 followups.

**Research basis:** Original Bloodborne permits L1 transforming attacks after normal attacks and quicksteps (https://bloodborne.wikidot.com/transforming-attack ; https://www.bloodborne-wiki.com/p/controls.html ). Different quickstep windows and the cost of mistiming are well documented (https://www.bloodborne-wiki.com/2015/10/movement.html). Whiff and parry fishing terminology (https://www.bloodborne-wiki.com/2017/06/terminology.html). Competitive whiff punishment can be trained with actual opponent recordings (https://mail.dustloop.com/w/Using_Training_Mode). All 60Hz numbers here are our own experimental system, **not copied Bloodborne engine frame data**.

**Latest head at change creation:** `aba5d78e0aa0673f6cee9871b69a5f553712df5f`. CI should independently verify source/native + Node tests + browser and Godot. No live 1v1 ranked launch or production `seamlesshunt.com` changes. No fake score, grant of invulnerability, conventional guard/grab/high-low mixup, air step or double jump.


## 2026-11-22 — Neutral is a choice under uncertainty: source-driven response-delay and corner matrix

**Why this matters.** A working no-block 1v1 system should NOT guarantee a punish simply because an R2 attack has four uncancelable recovery frames. At 60 Hz those frames last 66.7 ms, while even the fast folded R1 requires five to seven authored startup frames before actual contact, plus any human reaction and positional travel. A **pre-read/predictive punish** is distinct from a **reaction to a newly visible attack whiff**; a **startup interrupt of the next transforming L1 attack** is distinct from a **hit during the original missed heavy's recovery**. Bloodborne itself permits L1 transformations after ordinary attacks and quicksteps; the problem to solve is a readable risk/answer relationship, not disabling trick weapon expression. References: [Bloodborne Movement](https://www.bloodborne-wiki.com/2015/10/movement.html), [Controls and linked L1](https://www.bloodborne-wiki.com/p/controls.html), [PvP concepts](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html), [Whiff punish](https://glossary.infil.net/?t=Whiff+Punish%7Cwhiff-punish), [Footsies training](https://mail.dustloop.com/w/Using_Training_Mode).

**New inspectable no-block response laboratory.** `scripts/hunt-whiff-response-matrix.mjs` uses the ACTUAL `huntStep` 60 Hz source and hurtbox/contact system. A committed missed heavy/charged R2 is initialized exactly at the beginning of genuine recovery. The opponent attempts its **paid trick L1 on recovery tick +4**. The defender then responds with either **folded R1**, a **finite-ammo gunshot**, or a **directional stamina-paid quickstep** after an authored **0, 2, 5 or 9 tick input delay**. Both original weapons are considered in every attacker/defender pairing (Mournweave vs Mournweave, Mournweave vs Thornwake, Thornwake vs Mournweave and Thornwake vs Thornwake), with both R2 forms, normal/charged heavies, both player slots, and 45 ticks of physical state resolution. Exactly **384 center-stage scenarios** are in the default report. `--all-arenas` also includes genuine x=65 LEFT and x=895 RIGHT wall setups: **1,152 scenarios**, all using their actual bounded arena geometry. `--summary` returns compact per-arena outcome counts rather than a full JSON table.

**How to inspect reproducibly** (from repository root, Node 22+):
```sh
node scripts/hunt-whiff-response-matrix.mjs --summary
node scripts/hunt-whiff-response-matrix.mjs --all-arenas --summary
node scripts/hunt-whiff-response-matrix.mjs --all-arenas > hunt-whiff-risk-matrix.json
```
These are **one-shot commands**, not background services or scheduled jobs. The JSON source-result schema explicitly distinguishes `realWhiffRecoveryHit` from `transformStartupInterrupt`, a correctly timed `gunParry`, ordinary `gunChipNotParry`, a connected but differently classified melee contact, and `noOffensiveCounter`. It separately reports whether the rival did connect; whether a real stamina-paid positional `cornerEscape` event occurred; HP loss; action/shot source tick; weapon/form, player slot, response delay and starting distance. No input automatically grants a punish or a ranked reward. This is an **isolated offline design report**; no sensitive opponent training inspector state is sent over the network.

**Two complementary mirrored tests, not just guessed frame arithmetic.** `test/hunt-whiff-response-matrix.test.mjs` verifies all 384 default cases across 69-state 60 Hz source semantics, response mirrored player slot, authentic predicted R1 hits on the NEW L1's startup rather than falsely labeling them original heavy recovery hits, and exact-timing finite-ammo gun counters. `test/hunt-whiff-response-corner.test.mjs` sweeps 288 physically mirrored LEFT/RIGHT-wall delayed answer pairs, exercises 32 separate real directional quickstep escapes with the defender initially 42U from the opponent, and checks 256 concise arena-specific result rows. It validates that an escape requires the real `cornerEscape` physics event, not simply pressing the dodge button, and that idle/R1/gun responses cannot fabricate a cross-through.

**Important interpretation limit.** These are seeded, deterministic **start-of-recovery snapshots**, not a full randomized player agent or proof that the originally missed R2 was actually forced by an earlier opponent walk-back. Input delays of 0, 2, 5 and 9 frames are *experimental probes*, **not estimates of human reaction times** or network performance. In real combat, spacing and the rival's previous R2 telegraph also matter; true response viability must be measured from full startup/active sequences, with realistic input latency, rollback, animation readability and human playtests. Do not automatically balance the four-frame value upward/downward without that evidence. The presence of a source gun-parry window does not imply that a gunshot will parry from **every** timing or distance. In Bloodborne, backstep lacks quickstep i-frames, and gun parry depends on vulnerable committed frames, so neither is a universal safety fallback.

**Preserved project constraints:** strict 1v1, English-only UI, original licensed content, one ordinary jump and allowable airborne firearm; no regular blocking/crouch high-low/throw, no free armor/burst, no second jump, no air quickstep. No production VPS/game site was modified.

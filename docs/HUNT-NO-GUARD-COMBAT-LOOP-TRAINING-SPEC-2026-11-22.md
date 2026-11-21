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

# Seamless Fight — Bloodborne-First 1v1 Neutral, Punishment and Corner Pressure
**Combat RFC** · 2026-11-21 · Original game design, 60 Hz simulation · **English-only gameplay UI**

**Status:** decision framework and source-verified research, not finalized PvP balance. The isolated Hunt v3 research branch is separate from the live legacy side/1 online protocol and the Bloodborne server.

## 1. The game's decisive question

A 1v1 side-view fighter does NOT need guarding, throws or low/high/crouch to have a real neutral. It DOES need risks and responses to every major commitment:

- Movement and spacing must avoid some weapon swings **physically**: transparent hitboxes and hurtboxes, no magnetic auto-track, no attacks hitting the whole screen.
- An offensive action must commit to readable startup, active, recovery, directional inertia and finite stamina; not all missed attacks are automatically punishable at any range.
- A fighter who reads that commitment may counter with movement, timed firearm, fast melee, hit-confirmed trick sequence, or a stamina-costly directional step.
- The defender may not be trapped in an unavoidable indefinite melee loop. When forced to the wall, corner disadvantage should matter without deleting all decision-making.
- The precise reward is read from actual hit, phase, distance and resource state, **not** an artificial "+/- on block" system. There is no normal block.
- The game's visual and sound telegraphs must match the combat frame data. Gorgeous cinematic effects must never hide the real parry window or mask the attack's reach.

This is an original gothic Bloodborne-*inspired* PvP system, not a wholesale recreation or re-distribution of Bloodborne assets or animation data.

## 2. Actual Bloodborne research versus chosen adaptation

Verified original mechanics:
- R1/R2 light, heavy and charged heavy; L1 neutral transformation plus transformation attack in a previous attack/quickstep/roll; attack after backstep, rolling attack, sprinting attack, a forward jump attack; directional dodges and moving through attacks during invulnerability frames.
- Firearm with timed interrupt/parry, stagger and finite visceral window; committed/healing actions can be interrupted rather than the victim enjoying blanket safety.
- Charged rear strike can open stagger/visceral; Rally / Regain encourages dangerous close-range response after real HP loss.
- Stamina restricts attacks and evasion, Quicksilver Bullets are limited, and making +5 **Blood Bullets** consumes own HP. Do not confuse these with **Beast Blood Pellets**, a separate consumable.
- Some true combos exist in the original PvP. Their mere existence does not justify allowing a zero-to-death corner loop in this 2.5D game.
- Historical nuance: Wooden Shield and Loch Shield technically exist in Bloodborne. They are intentionally **not** a precedent for a standard guard button in this project.

Original enhancement proposals, NOT faithful Bloodborne source mechanics: normal deliberate 2D single jump, source-backed aerial firearm parry, a small set of attack feints, limited hit-confirm/pursuit cancels, controlled 2D forward dodge crossing and 60Hz rollback. No crouch, ordinary guard, throws, dual jump, air step, mandatory low/mid/high mixups, universal invincible reversal or forced wall bounce.

References:
- SIE producer on aggression, short/long-form weapon tradeoffs, risk of long windups, Rally: https://blog.playstation.com/2014/08/13/bloodborne-on-ps4-new-combat-details/
- Real controls & visceral/transform/rally/blood bullets: https://www.bloodborne-wiki.com/p/controls.html
- Movement and i-frames: https://www.bloodborne-wiki.com/2015/10/movement.html
- Bloodborne PvP whiff/tech/true combos: https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html ; https://www.bloodborne-wiki.com/2020/09/true-combos.html
- Shield exceptions: https://www.bloodborne-wiki.com/2015/03/wooden-shield.html ; https://www.bloodborne-wiki.com/2015/11/loch-shield.html
- Fighting-game footsies/whiff punish as **general design theory**, not borrowed combat mechanics: https://glossary.infil.net/?t=Whiff+Punish ; https://glossary.infil.net/?t=Spacing+Trap

## 3. Match decision states

| State | Attacker's opportunity | Defender's response | What must be readable |
|---|---|---|---|
| **Far neutral** (outside melee reach) | walk in, run, switch trick form, limited firearm | conserve stamina, deny approach, choose form | weapon reach, reload/shot cost, real approach speed |
| **Tip-range footsies** | fast poke, longer transformed poke, delay heavy or feint | step just outside range, whiff-punish, dash read | weapon extension and nonmagnetic attack ranges |
| **Close neutral** | light/heavy mix by timing, hit confirm, transformation attack | fast interrupt, predictive gun counter, costly timed step | attack startup, combo gaps, parry window |
| **Confirmed contact** | limited follow-up, Rally, spend Focus for chase | normal hitstun then paid escape, or accept damage to preserve stamina | real hit-confirm instead of macro buffering |
| **Missed attack** | recover or pay stamina to transform-cancel if allowed | fast ranged/close punish while defender is **still in recovery** | distinct whiff recovery and limited disjoint |
| **Corner / wall** | pressure, bait exit, punish dodge recovery, threaten slow charge | a timed paid **forward** through-step, read/pistol parry, fast challenge, a single jump where hitboxes permit | actual physical side swap and punishable dodge recovery |
| **Utility animation** | catch heal / blood-bullet self-injury | take distance first or bait opponent's shot | visibly readable committed utility window |
| **Post-stagger** | approach for visceral only inside true time/distance window | stagger ends naturally; NOT generic free hitstun quickstep | no phantom viscerals at unlimited distance |

"Punishment" should be classified as *whiff/recovery punish*, *dodge-recovery punish*, *firearm counter*, *resource/utility punish* or *counter-hit*, not "on block": this game has none.

## 4. Measured fixed-60Hz research values (not final balance)

| Research action | Startup / active / recovery | Resource cost | Design role |
|---|---|---|---|
| Mournweave folded light | 7 / 4 / 13 frames | 10 stamina | fast, short-range neutral check |
| Mournweave folded heavy | 17 / 6 / 23 frames | 24 stamina | high commitment, reactable at range |
| Ground firearm | 9 / 1 / 25 frames | 9 stamina + 1 round | read of attack commitment, or limited damage |
| Ground quickstep | 0 / 9 / 12 frames | 19 stamina | invincible **only** ages 1–6, directional repositioning |
| Early ordinary hitstun escape | not before stun age 8 | 19 + 6 stamina | paid response after taking damage, never a free rollback cancel |
| Create blood bullets | 16 / 1 / 23 frames | 30 HP → 5 temporary bullets | a significant self-damage risk / resource choice |
| Healing vial | 21 / 1 / 25 frames | one of two vials | punishable opportunity, not an unreactable reset |

These values are original research game tuning; they are NOT Bloodborne's official frame data. The game uses 60Hz fixed combat/physics and may render at variable FPS above that.

## 5. Whiff punishment must be real

A fundamental flaw was found and patched in commit 4d51b6c: the old training objective awarded a whiff punish if a hit landed within 25 frames of the enemy heavy whiff. This **incorrectly scored hits after the target had already finished recovery**.

Now melee hit evidence captures the target's **actual action and remaining recovery at contact**:
- At initial 182-unit separation, step back 6 frames, approach, trigger fast light at source input index 26. Enemy heavy whiffs on source tick 23. The player's strike connects on tick 34, with **13 recovery frames remaining**. This is a real punish.
- Execute the same light later at source input index 39. It connects at tick 47 while the opponent has already recovered. Even though it is within 24 frames after the whiff, **it is not a whiff punish**.
- Both cases deal real damage; the distinction concerns frame-based scoring, strategy and training feedback, not different arbitrary damage multipliers.
- Training only awards a punish if the opponent is truly in its **missed heavy's recovery** and the source whiff event precedes the hit.

This provides a base for later frame-meter readouts: **"Recovery punish · 13f left"**, distinction between *punish* and *poke*, and real replay drill reviews. Keep these indicators in practice and replay; avoid intrusive competitive HUD walls of text.

## 6. The corner must be strategically bad, not mechanically unwinnable

Existing proposal: a directional grounded quickstep costs 19 stamina and can pass an opponent's **body collision** inside the already-existing ages 1–6 of its i-frames. The fighter must really travel the horizontal distance. A retreat into the wall does not escape; the opponent can bait the forward dodge and strike after i-frames end. No free wall jump, invisibility, super armor, grab or guard.

**Critical unresolved balance risk:** a source scenario with the defender near the wall, minimal stamina, and an opponent repeatedly committing to heavy attacks can land four successive hits and end the round before the defender has accumulated the 25 stamina required for a normal hitstun-escape quickstep. This is not proof the entire game is unwinnable; it is evidence that **stamina exhaustion must not combine with guaranteed indefinite pressure without testing**.

To solve this while preserving Bloodborne identity, prefer this order:
1. Test ordinary hit pushback and **attacker recoil** on strong heavy contacts against a walled opponent, derived from weapon momentum. A pressured wall should not erase all contact distance.
2. Ensure unavoidable same-string damage has a *finite budget*: the strongest four-hit ordinary heavy sequence must be measured for true windows, resource cost and whether a natural neutral reset occurs.
3. Confirm fast weapons cannot pressure indefinitely from neutral on a whiff; otherwise increase visible whiff recovery or stamina expense **for that move**, not all weapons.
4. Validate parry counter-window reach, bullet economy and non-auto-tracking attacks as alternative answers where stamina allows.
5. Only if pressure remains oppressive after those changes, evaluate a brief genuine knockdown/recovery state as a physical consequence of a heavy blow. Do **not** add a magical Burst, automatic wall explosion, conventional block or invincible "get out of corner" move.

Guardrails to measure, not declare as already achieved: no source-defined unavoidable 100-to-0 loop from one ordinary touch without a committed meaningful resource spend or counterable gap; consistent first-hit advantage; genuinely valuable corner position; the ability for a defense read to change sides with punishable risk; no passive easy timeout strategy from standing far away.

## 7. Trick-weapon design and why whiffs remain meaningful

Two original forms must be **different neutral tools**, not just damage skins.
- Folded: quick, accurate attacks, smaller effective range, cheaper start and movement-friendly followups.
- Unfurled: longer sweeping threat, higher stamina/startup/recovery, more space covered but punishable whiffs.
- Neutral L1 change must be noticeable and punishable if used recklessly; transformation **attack** during hit/whiff is an actual move with its own hitboxes, cost and recovery.
- Under source v3, some transforms may cancel committed attacks even on whiff at a stamina cost; the defender must read this possibility instead of expecting every whiff to guarantee a punish.
- **Implemented R2 commitment gate (2026-11-21):** universal hit-confirm cancels no longer let heavy→heavy, heavy→charged, charged→heavy or charged→charged skip their recovery. Repeated R2 attacks remain available after full recovery. Light and authentic costed trick transitions may still follow a confirmed heavy. This is an original competitive choice, **not** a claim that Bloodborne forbids all R2 chains.
- Before the change, heavy-only spam hit a fixed wall defender at ticks 18/40/62/84 with Mournweave and 17/36/55/74/126 with Thornwake. With committed recovery, the same first 150 ticks land Mournweave at 18/64/110 and Thornwake at 17/61/105. A zero-stamina defender in this fixed, reactive-step-only policy survives 150 ticks with 13 or 25 HP and sees actual neutral frames. Human competitive balance is **not** certified by this result.
- Heavy and fully charged attacks, backstep strike, running strike and grounded downward air attacks need **weapon-specific** frame data and original matching 3D animations. "Running attack" cannot secretly be identical to a folded light with a speed multiplier.
- Rear charged-heavy to visceral requires correct physical facing, windup lock and side-crossing. Immediate invisible auto-face turns would defeat the whole rear read. Audit and implement facing commitment explicitly before marketing backstabs as real 2.5D PvP.

## 8. "Mixups" without high/low or throw

Use **timing/space/intent mixups**, not conventional block mixups:
- quick light versus delayed heavy, full charge or early feint;
- walk back bait versus running attack commitment;
- attack then trick-transition versus neutral stance switch;
- gun fired on a real windup versus waiting to catch the gun's recovery;
- cheap short poke versus long reach form;
- real hit-confirmed follow-up versus retreat/reset to preserve stamina.

A mistimed parry must spend an actual bullet, stamina and recovery. A correctly placed shot in the committed target window produces an actual stagger; firing during idle, after the attack's counter window or through valid i-frames should not generate a free visceral. Airborne parries are an original enhancement to audit independently.

## 9. Resources and ranked proposals

- Keep finite gun rounds. Reload through limited HP-cost blood bullets is meaningful; **unlimited gun counter fishing would break attack-based neutral**. Different firearms should trade startup, range, damage and spread, not all be "best pistol".
- Healing should be limited or disabled in some ranked presets after testing. If enabled, expose readable interrupt windows and do not allow instant healing to reverse earned neutral wins.
- Rally is the strategic comeback: a fast physical counter recovers *only recent* HP, never gunfire, and is lost after a bounded window. No new passive health regeneration.
- Consumables (Molotov-like area attacks, thrown blades, buffs) are **optional**; test finite charge, recovery/parry punishability and anti-zoning before allowing in ranked. Beast Blood Pellets are not Blood Bullets.
- Gesture/emote system belongs outside attack cancellation and must not produce invisible invulnerability.

## 10. Measurable acceptance and real playtesting

Automated: \`scripts/hunt-neutral-balance-audit.mjs\`, \`test/hunt-neutral-balance-audit.test.mjs\`, original \`test/hunt-training-goals.test.mjs\`, exact native C++/JS parity and canonical snapshot tests.

| Gate | Scenarios | Required report |
|---|---|---|
| Neutral | heavy at edge of range; walk out then in; real early/late light | correct whiff, real recovery at contact |
| Punishment | fast light/long heavy/trick-cancel/firearm miss in both weapon forms | actual startup, active, recovery, remaining punish window |
| Corner | both walls; 4 weapon pairs; stamina 0/30/100 | first hit, escape tick, side swap, damage, KO warning |
| Pressure | spam light, heavy, mixed, delayed feint, transform cancel | hitstun gaps, max unavoidable damage, attacker stamina |
| Defense | early/late step, failed retreat, gun parry attempt, jump, hitstun escape | actual collision/parry/iframe and cost evidence |
| Network | delayed local inputs, 0–8 rollback frames, both players mirror, reconnect | identical full 60Hz state after replay |
| Human | skilled vs novice, stationary/dash-poke/shot-heavy/turtling (without shield) | ability to understand why an exchange was won/lost |
| Presentation | slow-motion replay overlays, original keyed 3D rigs, gun/trick audio | visual pose/collision/parry windows remain aligned |

No claim of finished competitive balance, netcode, 3D character/animation quality or live integration until these gates are met. All deployable server changes are excluded from this RFC.

## 2026-11-22 — Decision-policy corner pressure audit, not a hidden Burst

The existing 150-frame heavy-only audit was a useful regression, but it was NOT sufficient to claim zero-stamina players are safe. The extended 220-frame [source-based policy matrix](../scripts/hunt-corner-policy-matrix.mjs) models 224 fixed deterministic 60Hz scenarios: **2 original defender weapons × 2 original attacker weapons × 2 symmetric wall sides × 4 stamina budgets (0/10/30/100) × 7 decisions**. It records actual input starts, melee hit events, gun parries, paid corner crossings, round endings and frames when the defender is actionable after taking damage.

Policies intentionally make different decisions: stay passive, attempt to retreat into the wall, quickstep through the opponent after the allowed eight-frame ordinary-hitstun threshold, use a fast counterpoke when able, time a pistol against a revealed heavy windup early, shoot late, or choose a limited hybrid of these. The opponent is scripted to press folded heavy every tick. **All input decisions inspect exact engine state without human reaction delay or packet latency**. Thus the results describe deterministic tactical affordances only, not a trained bot, matchmaking balance, a true-combo proof, or a latency-tolerant competitive meta.

Key source results at 220 ticks in the current v3 prototype (the dedicated test guards measurable properties without freezing a particular future balance outcome):
- **Passive and retreat-into-wall** scripts eventually lose to repeated heavies in all 32 cases each, including fully stocked stamina. Yet each defense has extensive **actionable** frames between damaging contacts. A KO against a passive script is NOT evidence of a true combo or an infinite.
- **Paid through-step from stun** survives the tested heavy-only 220-frame script and physically crosses the opponent in the **16 cases starting with 30 or 100 stamina**. It is *not* a free invulnerable wall escape.
- **Fast counterpokes** land real light attacks in the analyzed cases. **Early timed gunshot** earns actual firearm-parry events; the **late shot** policy does not. Timing windows must remain tied to enemy startup/active frames, not to a universal parry button, and timings need further design work against real ping.
- Do not use these oracle results to increase guaranteed corner damage or remove the ordinary stamina cost. Next test adversarial alternatives (feints, transform pressure, attack-delays), both active players, human input delay and native snapshot rollback.

This aligns with [Bloodborne combat](https://www.bloodborne-wiki.com/2015/10/combat.html) emphasizing spacing and attack commitment, [movement documentation](https://www.bloodborne-wiki.com/2015/10/movement.html) distinguishing non-invincible backstep from i-frame evasions, and [PvP technique documentation](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html). We must not substitute a conventional guard/grab or DMC air step. Original Bloodborne does have weapon-specific running and backstep attacks, and those require separately authored frame/animation data rather than re-labeling a folded light.

## 2026-11-22 — Neutral-stick backstep is not a quickstep

**Implemented source + native combat distinction:** pressing the pre-existing evade control with `x=0` on the ground now produces a backward **backstep** (cost 10 stamina, 17 authored ticks, back-facing locked throughout, no i-frames). Pressing the same evade control with a **held horizontal direction** still selects the pre-existing `step` quickstep (19 stamina, source-owned six invulnerable frame ages, through-opponent crossing only in the paid forward step). The input API has not gained a new guard, crouch, double jump, air dodge, or grab. Grounded neutral backstep is **not** an ordinary hitstun escape. The distinction is consistent with [Bloodborne Movement](https://www.bloodborne-wiki.com/2015/10/movement.html) and [Bloodborne Controls](https://bloodborne.wikidot.com/controls).

**Implemented backstep → R1 link:** when a normal grounded backstep is age 5–13 (exclusive of final recovery) and the user commits R1/light, the authored move is `foldedBackstepLight` or `unfurledBackstepLight` rather than a generic folded light. Separate frame, reach, damage, stamina and recovery data are provided for *both* original trick weapons. A strike cannot get this moveset from neutral for free. These are **original competitive prototypes**, not Bloodborne's numerical animation data.

This action graph is deterministic across both JS and portable C++17, with appended action IDs and an incremented native snapshot codec version **3** (same 348-byte layout). Loading an old codec v2 checkpoint must fail instead of silently deserializing a different action table. The Godot original-animation required-clip manifest now enumerates **56** source-owned clips rather than 50; this is metadata **only**, not proof of authored 3D motions. Untested real controller/mouse input acceptance and original 3D attack animations remain required.

Competitive rationale: players can distance bait without automatically obtaining i-frame safety. A mistimed backstep can be hit, and a deliberate backstep light can whiff or be punished during its own recovery. Directional quickstep retains its actual stamina, recovery and limited invulnerability. This prevents a neutral no-direction evade from acting as an infinite safe approach or from invalidating footsies at the wall.

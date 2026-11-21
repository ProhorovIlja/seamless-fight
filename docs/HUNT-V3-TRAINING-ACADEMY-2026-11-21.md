# Hunt v3 Training Academy — English-only 1v1, source-evidenced drills
2026-11-21 · Standalone Seamless Fight research branch `feat/lantern-court`

## Decisions

All game, practice, launcher and match UI remains **English only**. This game is a **strict two-fighter 1v1** title, including within lobbies that may also have observers. Do not implement 2v2, grabs, standard block/guard, universal jump cancel, double-jump, air-dash/air-step or a traditional low/mid/high defensive triangle. The current combat source, `sf-hunt-lab/3`, supports exactly one ordinary jump and allowed airborne firearm counter with action-dependent parry windows, temporary visceral, two original trick weapons, stamina and rally, limited silver and blood rounds, and hitstun quickstep escapes.

Other fighting games inform **practice ergonomics and observational tooling**, not the combat ontology. A "mixup" here means an unpredictable **timing and commitment read** (full heavy versus actual feint; quickstep spacing, trick-weapon form), never a 50/50 overhead/low/throw guessing game.

## Working offline Practice Mode: 15 independent source scripts

Available locally from a project-owned test web server at `/fight/hunt/`, *not* deployed to the production seamlesshunt.com VPS.

| Category | English training preset | Source action and required learning |
| --- | --- | --- |
| Open Practice | Free Practice | Record input, observe actions, inspect exact startup/active/recovery and hitboxes |
| Defense | Counter Heavy Windup | Gun contact during the enemy's committed heavy vulnerability window |
| Defense | Counter Vial Healing | A real 21F startup vial is punishable; dummy starts below full HP |
| Defense | Counter Blood Rounds | Counter the enemy's actual HP sacrifice and ammunition ritual |
| Defense | Hitstun Quickstep Escape | Source light hit causes stun; 8F later the player can spend 25 stamina to evade |
| Defense | Evade Firearm Shot | Real bullet with finite ammunition; player must execute ground i-frame step |
| Defense | Anti-Air: Read the Jump | Dummy truly jumps once with y=-1 and advances; user connects melee or firearm while target is airborne |
| Defense | Airborne Firearm Counter | Player jumps once and guns an opponent heavy in its valid parry window, with no air-step |
| Offense | Whiff Punishment | Dummy swings heavy at noncontact spacing; player advances and lands a hit promptly after actual whiff |
| Offense | Confirm Follow-up | Two real melee contacts, second bearing the source's combo count (not a free whiff cancel) |
| Offense | Trick-Weapon Pressure | Actual weapon-form transform, followed by a confirmed hit shortly after |
| Offense | Visceral Conversion | Valid enemy gun parry, then source-valid visceral before its temporary opening expires |
| Resources | Rally Recovery | Take an actual melee hit and regain lost HP through confirmed retaliatory melee contact |
| Resources | Blood Rounds | Pay 30 HP, earn five temporary rounds via normal utility, then shoot one |
| Reads & Footsies | Heavy or Feint | Two authored deterministic 150F dummy tapes, one committed folded heavy and the other a genuine mid-startup heavy feint. Repeat them with seeded random playback or isolate a tape. Punish actual feint or whiff; no throw/guard mixup |

Each script is a series of **ordinary canonical 60Hz player inputs**, not a scripted outcome or privileged opponent AI. The opponent remains governed by the exact same `huntStep`, ammunition and stamina limits and match state as the local player.

### Source-verified objective proof

[`public/hunt-training-goals.mjs`](../public/hunt-training-goals.mjs) evaluates confirmed event evidence projected from the actual `huntStep` before/after states. It never marks an action key press alone as a confirmed hit, jump-parry or visceral.

Examples proven in deterministic tests:

- Anti-air: user firearm at simulation tick 52, dummy jumps at 56, actual bullet contact while the opponent is airborne at tick 61.
- Airborne parry: one player jump at tick 45, `airShot` command at 58 and real `gunParry` confirmation at 68 against a heavy.
- Whiff punishment: approach during whiff recovery from tick 69; source heavy whiffs at 78; user light hits at 95.
- Hit-confirm: first source light hits at tick 8, correctly timed second light contact occurs at 18 with combo=2.
- Transform: player shifts form and source emits transform at 6; later unfurled light hits at 31.
- Rally: enemy light hits player at 63; user retaliates with a source strike and reclaims 15 HP at 99.
- Feint read: source heavy at 56, **genuine feint action** at 63, player light hits at 79.
- Visceral: player gun parries at tick 68, enters a valid visceral at 97, damage confirmation at 103.
- Blood economy: 30 HP sacrifice, 5 temporary rounds, then firing a real shot expends one.

These timings apply to **fixed test scenarios**, not universal frame data that would apply to every weapon or opponent; the source frame table and state inspector remain authoritative.

The English UI groups exercises by category and shows objective, confirmed source successes, actual source-defined attempts and feedback. All data is **unrated and offline**. No fake rank, Elo, verified player count or friends service is presented.

### Practice/Replay ownership and limitations

The simulator supports 8 user-recorded dummy tapes × 600 source ticks, loop, seeded random selection, reversible stun-triggered playback, hitbox/hurtbox overlays, actual frame meter, 60Hz input history, real event history, local analytics, and custom physical gamepad/arcade/leverless bindings. Fixed 60Hz gameplay is separate from visual frame cap and measured median/P95 render intervals.

Replay JSON is bounded, versioned and verified by deterministic replay fingerprint. Import **rebuilds source events, input history and training evidence by resimulating valid canonical inputs**, then exposes editable rewind and branch takeover (not merely the last screenshot or snapshot). The original exported replay remains immutable; the local user can branch it. **This fingerprint is not anti-cheat-grade security or signed evidence from an authoritative ranked match.**

Physical arcade controller compatibility still depends on SDL or browser Gamepad recognition, and full Windows fightstick/leverless/Hitbox/Cross|Up tests have NOT been completed.

### Where the ideas came from (adaptation, not copying)

- [Capcom's official Street Fighter 6 Practice manual](https://game.capcom.com/manual/SF6/en/ps5/page/6/3) documents Simple Training Settings; [dummy recording manual](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) documents eight recordings. We borrow guided presets, frame observability and repeatable responses, not high/low guarding, Drive Impact or throws.
- [Tekken 8 official practice description](https://tk8.tekken-official.jp/en/mode/offline.php) discusses character-specific skills and punishment practice; [Replay & Tips](https://tk8.tekken-official.jp/en/mode/replay.php) emphasizes correcting situations through replay. We borrow whiff punishment and takeover, not 3D sidestep/throw break combat.
- [Granblue Fantasy Versus: Rising features](https://rising.granbluefantasy.jp/en/gamemodes/features) show situational training, combo practice and color-coded frame information. We adapt categories and 60Hz timeline visibility.
- [Bloodborne Wiki PvP concepts](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html) and [controls](https://www.bloodborne-wiki.com/p/controls.html) inform evasion, transformation and visceral identity. Public release must not ship Bloodborne game-owned meshes, textures, character identities, voices or soundtracks just because the product name omits “Bloodborne.”
- [GGPO developer guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md) documents deterministic saves/loads needed for rollback. Local practice resimulation is a prerequisite, **not a real GGPO online Hunt v3 implementation**.
- [Poly Haven license](https://polyhaven.com/license) permits its genuinely CC0 materials/3D models; [Godot 3D import guide](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html) details glTF/GLB. Original rigged characters, high-quality animation/Foley, GPU features and a full 3D stage still require selection, documented license and measured QA, not just names in an asset wishlist.

## Build and release gates

Regression files:
`test/hunt-practice-drills.test.mjs`,
`test/hunt-training-goals.test.mjs`,
`test/hunt-practice-suite.test.mjs`,
`test/hunt-browser-practice.test.mjs`,
`scripts/browser-smoke.mjs`,
`test/english-only-content.test.mjs`.

No `seamlesshunt.com` production deployment, independent account service, signed leaderboard, persistent authenticated friend invite/spectate, Windows public release, finished 546 3D animation clips or native `sf-hunt-lab/3` GGPO authority is implied by this documentation. The older online and Godot/C++ prototype still use their separate legacy rules and cannot be labeled Hunt v3 parity.

Next hard quality gates are native Hunt v3 source parity, real 1v1 online authority/rollback, licensed original animated assets and verified frame pacing on Windows GPUs, followed by authorized integration with the existing protected site via the isolated VPS cohost plan.

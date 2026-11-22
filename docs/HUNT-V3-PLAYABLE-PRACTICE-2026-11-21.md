# Hunt v3 — a real playable offline 1v1 practice court
2026-11-21 · Source: `feat/lantern-court` · Research environment, **not a released game**

## Locked game definition

The complete game user interface and all game-facing text are **English only**. Duel simulation contains exactly **two fighters (1v1)**. No 2v2, team tags, block, grabs, universal air-dodge or double-jump are introduced. The character's defense is based on well-timed firearm counters, evasion i-frames, ordinary stun escape with stamina cost, temporary visceral windows, Bloodborne-first recovery and resource tradeoffs implemented independently as original `sf-hunt-lab/3` rules.

The future production visual standard is professionally authored original 3D characters, rigging, motion, cloth, backgrounds, audio, Foley, intros/outros and distinctive trick-weapon attacks. The separate catalog has **546 authoring requirements, not 546 finished animation assets**. None of the current web canvas figures should be mistaken for completed, shipped character art.

## Newly runnable source

The self-hosted reference server now serves [`/fight/hunt/`](../public/hunt.html), a separate **offline-only** local browser training stage. This page does **not** join the old `/fight/socket` or `/fight/side/socket` rooms, and it does **not** change the still-live legacy online rules. It imports the exact `public/side-hunt-lab.mjs`, `public/hunt-practice-suite.mjs`, `public/hunt-input-device.mjs`, `public/hunt-match-analytics.mjs` and `public/hunt-identity.mjs`, rather than using a simulation with hand-drawn or fabricated move statistics.

Actual available features in the web research stage:

- Fixed deterministic **60 simulation ticks per second**, while independent `requestAnimationFrame` rendering uses interpolation and offers display cap selectors 60/80/90/120/144/240/uncapped. **Uncapped is still limited by the browser/display/GPU**, and frame drops cannot be presented as successful stable 240 FPS. The app limits catch-up work to prevent hidden, multi-second frame surges; if the render loop cannot keep up it explicitly reports a slowdown and drops wall-clock time **without skipping source simulation ticks**. Losing focus pauses and sends neutral inputs.
- Two original forms and weapons (`Mournweave`, `Thornwake`); actual 60Hz startup/active/recovery/age/queued phases; source-derived offensive hitboxes and defensive hurtboxes are optionally visible. Canvas presentation reads current and previous authoritative source states but does not affect collision, damage, replay or combat determinism.
- **Real KBM, gamepad, fightstick, fightpad and leverless** logical layouts from existing input profiles, receiving browser `Gamepad` standard-mapped physical buttons/D-pad/sticks. Simultaneous opposite directions neutralize. Button held across multiple ticks is edge-triggered and does not fire an automatic repeat. Browser standard mappings cannot guarantee compatibility with every USB board, nor do they provide a signed device profile or complete native Windows hardware testing.
- Eight individual dummy recording tapes, 600 input frames per slot, loop, seeded random tape selection, and reversal *only after actual stun/stagger recovery*, drawn from the exact battle source rather than autonomous fake artificial intelligence. Recording and input history show **real commands sampled at the fixed 60Hz tick**.
- Pause/resume, exact single-frame advance, 60-frame rewind with timeline fork/takeover, restart, export JSON replay and import after source ruleset/fingerprint validation. Replay integrity uses an **untrusted offline fingerprint, not cryptographically signed or anti-cheat verified competitive match evidence**.
- Actual action events, source-derived frame data, and manual analytics from the saved local simulation (shots, hit probability, firearm counters, melee hits, damage, visceral openings, stamina-recovery escape, rally and other mechanics). No fabricated leaderboards, Elo, friends, identities or published ranks are shown.

### Source and test map

| Area | Implementation | Validation |
| --- | --- | --- |
| Practice HTML and English controls | `public/hunt.html` | `test/hunt-browser-practice.test.mjs` |
| Dark Gothic responsive UI, original painting from repository | `public/hunt.css` | Browser smoke screenshots |
| Deterministic 60 Hz scheduler, keyboard/gamepad input, dummy and replay controls | `public/hunt.mjs` | `scripts/browser-smoke.mjs` + Node tests |
| Source-bound technical 2.5D character silhouettes and hitbox render | `public/hunt-render.mjs` | Browser smoke (no state changes) |
| Browser standard pad/fightstick/leverless normalization | `public/hunt-browser-input.mjs` | `test/hunt-browser-input.test.mjs` |
| Exact combat, recording, events, and offline ratings | `side-hunt-lab.mjs`, `hunt-practice-suite.mjs`, `hunt-match-analytics.mjs` | Existing Hunt tests |
| HTTP asset routing, English 1v1 navigation | `server.mjs`, `hub.html`, `side.html` | `test/hunt-browser-practice.test.mjs` |

As of implementation, the new web Hunt v3 page is an **unreleased research route in GitHub**. Do not advertise it as accessible on the live `seamlesshunt.com` until a separate authorized deployment and smoke test is performed; do not touch the Bloodborne services during this phase.

## Why the architecture is appropriate

**Godot physics interpolation:** [Godot documentation](https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/using_physics_interpolation.html) recommends keeping authoritative object transforms at fixed physics ticks while interpolating presentation frames. Physics interpolation is not a substitute for input latency measurements; see [Godot jitter and lag guidance](https://docs.godotengine.org/en/stable/tutorials/rendering/jitter_stutter.html). The local browser laboratory uses the same principle with a custom accumulator and render-only previous/next projection. It is not itself a finished native GPU implementation or vendor DLSS/FSR/XeSS/Reflex integration.

**GGPO architecture:** [GGPO developer guide](https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md) requires deterministic save/load and confirmed remote input over a reproducible state timeline. The offline Hunt replay and re-simulation are a useful basis for establishing **future deterministic rollback contracts**, but NO live GGPO/P2P/rollback is claimed in this browser stage.

**Competitive practice research:** [Street Fighter 6 training recording](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) illustrates why recording, human-readable frame data, paused exact frame-steps and reversal-specific dummy drills are high-value. Seamless Fight borrows training tools, **not** SF6 defensive high/mid/low block/throw mechanics or tagged 2v2 combat.

**Bloodborne inspiration:** [Bloodborne Wiki PvP concepts](https://www.bloodborne-wiki.com/2018/08/pvp-concepts-techniques.html) motivates resource-led firearm parries, visceral timing and Bloodborne-like movement counterplay. Game assets, names, character models, dialogue, sound and level geometry must be genuinely original or separately cleared; absence of the word “Bloodborne” from a product name alone does not resolve similarity or copyright issues.

## Next production engineering acceptance

Native Windows first: migrate exact `sf-hunt-lab/3` to the current C++/Godot experimental client and prove bit-for-bit or field parity for many ticks, including aerial firearm, parry utility windows, visceral, hitstun-step and charged-rear stagger. Then replace the legacy online prototype's combat with the new authoritative state and implement real rollback; only after that connect account-authorized friend groups, persistent ranked results and private spectator permissions. In parallel, original professional rigs, animation blends, Foley/voice, cinematic entrances/exits and 3D stage sets must be authored and tested on Windows GPUs and real fightsticks. The **web laboratory is an instrument for verifying combat**, not an alternative release-quality visual direction.

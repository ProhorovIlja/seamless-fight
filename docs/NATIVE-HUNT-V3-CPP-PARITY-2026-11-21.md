# Native Hunt v3 C++17 source parity research — November 21, 2026

This branch adds an **isolated original C++17 implementation** of the actual `sf-hunt-lab/3` combat state. The existing Godot GDExtension and public online prototype still use the older `seamless-side/1` (including obsolete block/guardBreak) and are intentionally not modified. Never route the old protocol, verified ranks or real matches through an incompatible core.

Files: `native/combat/hunt_core.hpp` and `native/combat/hunt_core.cpp`. Source rule reference: `public/side-hunt-lab.mjs`. Offline parity harness: `scripts/native-hunt-parity.mjs` and workflow `.github/workflows/native-hunt-parity.yml`. 

Mechanics encoded: exactly two fighters, two original trick weapons, folded/unfurled transform chains, charged and rear staggers, single jump and aerial gunshots, firearm counter windows, visceral, hitstun quickstep escape, stamina, i-frame quickstep, HP-paid temporary bullets, healing, rally, focus cancels, buffered actions, deterministic 60Hz round handling. No guard, grabs, air-step, double jump, tags or extra combatant slots.

Parities tested per toolchain: **4 weapon pairs x 2,400 actual source frames = 9,600** frames; **69 explicit state fields per frame**, including both fighter action queues, resource counts, exposure windows, stamina, velocity, health, score, animation ages and two-form weapon state. Numeric comparison tolerance: 1e-8. Native CLI periodically loads a historical value-state and resimulates eight frames. Both Linux GCC and Windows MSVC have separate builds and strict tests.

Status: This research is **not yet integrated with the native Godot stage**, multiplayer GGPO, server result attestation, signed ranked outcome, custom original rigged 3D art, audio or Windows GPU/input latency testing. The full build cannot be represented as a shipped Hunt v3 client merely because CLI parity passes. Do not touch production seamlesshunt.com services without separate deployment validation.

Engineering references: https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md ; https://docs.godotengine.org/en/4.7/tutorials/scripting/cpp/index.html ; https://game.capcom.com/manual/SF6/en/ps5/page/8/6 . No proprietary copyrighted game assets/code were imported.

## Directed source parry → visceral proof

The original 9,600-frame stress suite produced six genuine gun parries but no visceral, so it was insufficient to claim cross-language coverage of the most important finishing action. A separate directed source input trace now starts from the canonical two-spawn state, approaches into legal range with real movement, allows inertia to settle, triggers the opponent's actual folded-heavy startup, shoots inside the source parry window, then follows through with a real 42-damage visceral attack. The exact same input tape is independently consumed by C++ and JS, compared for all 69 state fields on **every** frame and rewound in native value-state snapshots. This test also requires genuine source `gunParry` and `visceral` events, not attempted button presses. It does not imply an integrated native online ranked game.

## Canonical source-state checkpoints for native rollback (2026-11-21)

Added `native/combat/hunt_state_codec.hpp`: explicit 348-byte v1 little-endian `SFH3` snapshot, 332-byte complete game/fighter payload plus 64-bit FNV checksum. The 69 scalar fields are encoded directly; no C++ ABI/padding/pointers/render state or proprietary game assets are serialized. `SFHuntCombat.save_checkpoint()` and `SFHuntCombat.load_checkpoint()` now expose and validate these bytes from the real Godot GDExtension. Failed loads preserve current state, successful loads discard outdated speculative checkpoints.

`native/combat/hunt_state_codec_test.cpp` exercises 7,200 actual 60 Hz state snapshots across all four weapon combinations, corruption detection, version/magic/length validation, NaN refusal, invalid input no-op and exact 900-frame post-restore replay. The standalone workflow builds the codec under both Linux GCC **with exceptions disabled** and Windows MSVC. Godot source-parity test verifies encoded length, tamper detection and valid load. The checksum is unkeyed **data integrity only**, not an anti-cheat signature or server-trusted ranked result.

# Portable C++ 17 fighting simulation parity experiment

This prototype implements the **exact existing `seamless-side/1` combat rules** in a standalone portable C++17 simulation, independently of Godot, Unreal, networking, audio, AI and visuals. This is not a complete Unreal plugin, not rollback netcode, and not yet a Windows game build.

The authoritative reference is `public/side-engine.mjs`. Each input tick (x, y, action, guard for both sides) is fed to the C++ executable and the JS reference, then **41 fields of both game states** are compared every tick over a seeded 6,500-tick sequence. The suite covers real attacks, movement, jumps, crouch, parries, stamina, hitstun, rounds and match endings, with compiler flags disabling fast-math/FMA contraction for parity.

Run on a machine with Node 22+ and g++: `node scripts/native-combat-parity.mjs`. GitHub Actions runs a separate CI job for this path. If states differ, the job fails at the earliest field and simulation tick.

The CLI also saves native state checkpoints and **replays eight real input frames from a prior checkpoint every 157 ticks**, comparing the reconstructed state against its canonical linear counterpart. The test runner rejects any missing rewind checks and compares both the original and replayed C++ simulation with JavaScript. This is a **local rollback resimulation prerequisite**, not a P2P/UDP/relay rollback implementation.

This gives Unreal C++ and native Godot GDExtension a testable combat-model starting point. It **does not** prove cross-platform deterministic bit-for-bit parity on Windows/MSVC, x64 vs ARM, or an optimized rollback implementation. Such claims require further compilers/platforms, serialized save/load-state validation, input delay and rollback stress tests, and identical event traces.

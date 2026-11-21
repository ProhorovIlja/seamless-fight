# Side-view input rollback research — 21 November 2026

This is an **isolated proof of resimulation**, not networked GGPO and not a ranked release. The module `public/side-rollback.mjs` wraps the existing `seamless-side/1` 60 Hz ruleset while preserving the legacy browser and native experiments. It performs speculative remote-input prediction, frame checkpoints, late-input rewind and deterministic resimulation. Its tests deliver delayed and reordered inputs over hundreds of ticks and compare the final corrected state with an uninterrupted fully confirmed simulation.

Safety/correctness contracts:
- A single remote slot is modeled; 2v2, spectators and arbitrary peer topology are **not supported**.
- Client local input is authoritative only inside this research simulation. The module is **not a trusted ranked results service**.
- Only movement {-1,0,1}, the six legal player actions and boolean guard are accepted. Stun/guard break are simulation results, not user-injectable actions.
- Prediction holds directional/guard input but clears one-shot attack actions. Late confirmed packets trigger recalculation of every affected state, including later speculative inputs.
- No more than `maxRollback` unconfirmed frames may be exceeded. The simulation pauses rather than silently discarding irreplaceable past frames. Too-old, far-future and conflicting confirmed packets are rejected.
- `sideStateFingerprint` is a fast diagnostic checksum over explicit ruleset fields, **not** a cryptographic signature. Server-authenticated input transport and secure session identities are separate requirements.
- This is not yet integrated into native C++ client, UDP peer transport, latency measurement or spectator feeds. Memory/CPU costs and packet jitter must be benchmarked under actual Windows networking.

Why: GGPO's published developer guide requires a fully deterministic sim, state save/load and rollback resimulation before remote-input correction can be trustworthy. See https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md .

Next validation gates: simulate random packet delay/loss, rolling input sequences across longer matches, validate C++ and JS correction parity, add signed/sequence-checked transport, test actual peer/relay NAT and measured input-to-display timing; only then migrate away from the current private authoritative 1v1.

Artwork remains unchanged by this patch. Production-quality authored fighter assets remain an independent blocking milestone; no proprietary Bloodborne/FromSoftware assets are introduced.

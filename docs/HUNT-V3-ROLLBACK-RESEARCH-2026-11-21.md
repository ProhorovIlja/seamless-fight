# Hunt v3 isolated rollback verification — 2026-11-21

Original, strictly 1v1, English-only, Bloodborne-first combat. This is an independent rollback component for the actual sf-hunt-lab/3 combat model and not the legacy seamless-side/1 protocol.

The coordinator saves exact deterministic pre-tick source states. It receives local inputs immediately and predicts only held movement from the last confirmed remote input. It must NOT predict repeated one-shot firearm, visceral, blood, healing or trick inputs. Late or reordered remote inputs replace predictions; the coordinator restores the matching checkpoint and re-simulates all subsequent 60Hz source frames. It rejects conflicting duplicates, out-of-range frames and mismatched game rules, and stalls rather than silently discarding unconfirmed frames.

A separate confirmedPrefixState snapshot and confirmedThrough tick expose the contiguous input-arrived prefix (not an authenticated competitive result). Source fingerprints are debug-only. test/hunt-rollback.test.mjs verifies 360 ticks of delayed/reordered packets against the unmodified original Hunt source simulation and tests cap, input restrictions, duplicate idempotence, prediction and defensive state copies.

Research links: GGPO developer guide https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md ; SF6 training mode https://game.capcom.com/manual/SF6/en/ps5/page/6/3 ; Tekken 8 Replay & Tips https://tk8.tekken-official.jp/en/mode/replay.php .

This file is NOT networked rollback. No public match server, GGPO adapter, authoritative input authentication, native C++ Hunt v3 parity, real latency testing, production anti-cheat or ranked scoring has been implemented by this batch. The online legacy protocol must not accept these snapshots until an end-to-end transition with version checks, native parity, disconnection/abuse policy and remote hardware testing.

The working seamlesshunt.com VPS is not touched. No Bloodborne-owned graphics/sounds/assets were added.

Additional source-driven regression: remote heavy at tick 56, player legal shot at tick 59 and authentic firearm parry on tick 68, conversion to real visceral at tick 103 (42 damage) despite delayed heavy packet delivery. HP-sacrifice bullet ritual and later shot stay correct through speculative opponent quicksteps and reconciliation. All source mechanics remain unmodified.

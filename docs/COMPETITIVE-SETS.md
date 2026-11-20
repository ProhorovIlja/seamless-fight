# Competitive first-to-two match sets (unrated preview)

The requested **ranked best-of-three** rule is **first to two won games**, not best of three rounds. Each *game* is an independent first-to-two round-wins duel under the current `lantern-court/2` six-round limit. A single game victory must not grant any ranked points, ever. An entire decided set (2–0 or 2–1 in games, including drawn replays) is the smallest possible unit eligible for a rating transaction. An unlimited private-player rematch is a different mode and must never award ranked points.

* Set game 1: 1–0 or 0–1, **no rating award**; play the next game in the same room.
* Set game 2: a 2–0 sweep ends the set; a 1–1 tie requires the deciding game.
* Set game 3: if 1–1, the winner of the game wins 2–1. A drawn game does not grant either player a game win.
* Draw protection: allow at most **five total games** including draws. A set reaching that cap without either player earning two game wins becomes **no-contest** and has no rating changes. This is a fixed and disclosed fairness policy, not silent timer manipulation.
* Each completed set should have its own match-set identifier and participant pair; unfinished individual games, local replays, disconnects before verified adjudication, and casual/private sessions are ineligible.
* Private player rooms and casual queues may accept **unlimited mutual rematches**; ranked sets should return the players to matchmaking after the set concludes, preventing an unlimited fixed-opponent rating farm.

**Current safety boundary:** `server/set-policy.mjs` is a deterministic, unit-tested policy and a separately queued **unrated competitive rules preview** can demonstrate the flow. No accounts, database, signed result transactions, anti-collusion ledger or public leaderboard exist yet. The set policy returns eligibility only; it does not allocate or modify ratings. [Glicko-2](RANKED-DESIGN.md) remains disconnected until there are authenticated durable player identities and server-owned idempotent set records.

References for the interaction design: [Tekken 8 patch 1.11](https://en.bandainamcoent.eu/tekken/news/tekken-8-patch-111) distinguishes best-of-three sets from continued quick rematches; [Guilty Gear Strive 1.24](https://www.guiltygear.com/ggst/en/news/post-1739/) discusses up to three ranked matches; [GGPO](https://www.ggpo.net/) describes rollback networking, which this authoritative WebSocket implementation does **not** yet provide. The precise *pay points after the entire set* requirement is a Seamless Fight-specific rule, not a claim about those games' existing ranking systems.

## Implemented in the online prototype

Select **Competitive BO3 · unrated preview** under the casual queue's Match format control. The queue is partitioned from ordinary casual pairings and retains the existing connection filters. It uses the live server's simulation outcomes; the client cannot submit a game winner. A completed game updates the set immediately, and the next game starts automatically after eight seconds, without leaving the room. Players can request the input replay for each archived completed game; the archive lasts only for the life of this room. After the set completes, the same opponent cannot endlessly restart another competitive set, but they can find a new opponent by requeueing.

The default **Casual** queue and private invite rooms still use unlimited mutual rematches. This is a rules and interface preview—not an authenticated ranked ladder. The server does not store points, allow rank filtering, or calculate a leaderboard.

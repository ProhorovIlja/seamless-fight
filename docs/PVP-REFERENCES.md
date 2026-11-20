# PvP design references

- [For Honor terminology guide](https://www.ubisoft.com/en-us/game/for-honor/news-updates/6XEM2qUiwcokp753uCzgkz/for-honor-terminology-guide): feints create a read against defensive reactions. Seamless Fight uses its own early heavy cancel window, a second stamina cost, and fixed recovery. No free cancel, no guardbreak import.
- [Nidhogg](https://messhof.com/nidhogg): keep spacing and weapon commitment legible with a small move set. The evasion drill isolates missed swings and recovery punishes without more content.
- [Ikemen GO](https://ikemen-engine.github.io/) and [GGPO](https://www.ggpo.net/): compare sync instrumentation and rollback approaches before replacing the current authoritative transport. No third-party gameplay code or assets imported.

Evaluation: can a player recognize the heavy, deliberately bait a quickstep, then close or punish without creating a dominant feint loop? Compare drill and live duel results; measure attacker/defender input-to-feedback separately across latency and jitter. The animation is original Canvas art; this change does not claim final animation quality or latency parity.

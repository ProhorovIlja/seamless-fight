# PvP design references

- [For Honor terminology guide](https://www.ubisoft.com/en-us/game/for-honor/news-updates/6XEM2qUiwcokp753uCzgkz/for-honor-terminology-guide): feints create a read against defensive reactions. Seamless Fight uses its own early heavy cancel window, a second stamina cost, and fixed recovery. No free cancel, no guardbreak import.
- [Nidhogg](https://messhof.com/nidhogg): keep spacing and weapon commitment legible with a small move set. The evasion drill isolates missed swings and recovery punishes without more content.
- [Ikemen GO](https://ikemen-engine.github.io/) and [GGPO](https://www.ggpo.net/): compare sync instrumentation and rollback approaches before replacing the current authoritative transport. No third-party gameplay code or assets imported.

Evaluation: can a player recognize the heavy, deliberately bait a quickstep, then close or punish without creating a dominant feint loop? Compare drill and live duel results; measure attacker/defender input-to-feedback separately across latency and jitter. The animation is original Canvas art; this change does not claim final animation quality or latency parity.

- [Street Fighter 6: Training Mode Recording Tips](https://game.capcom.com/manual/SF6/en/ps5/page/8/6): record a dummy's inputs and reproduce the setup. The duel lab adds one local recording and three built-in scenarios, using the same tick logic as the online duel without altering its protocol.
- [Ikemen GO replay issue](https://github.com/ikemen-engine/Ikemen-GO/issues/3457): a reminder to regression-test replay reconstruction. Local drill playback is not online rollback or a match replay format.

- [Tekken 8: My Replays & Tips](https://tk8.tekken-official.jp/en/mode/replay.php): retry a specific moment rather than restart the entire practice sequence. Duel Lab reconstructs the chosen tick from the original inputs, then replaces only Veil’s future inputs. Cinder keeps following the same tape, not reacting as a human would. This is a short local drill, not a saved online match; a future match replay format needs simulation versioning and tests across updates.

- [Brawlhalla custom-lobby spectating](https://www.brawlhalla.com/news/battle-pass-season-11-patch-9-04): keep watching separate from fighter participation. Seamless Fight uses distinct, revocable watch links and a bounded read-only gallery. No third-party code or assets were imported.

- [Gaffer on Games: Snapshot Interpolation](https://www.gafferongames.com/post/snapshot_interpolation/): jitter and presentation delay are separate tradeoffs. The browser test injects ordered delays in both directions using [Playwright WebSocket routing](https://playwright.dev/docs/api/class-websocketroute); it does not change live snapshot cadence or claim latency improvement.

- [Tekken 8 replay takeover](https://tk8.tekken-official.jp/en/mode/replay.php) and [Street Fighter 6 replay compatibility](https://game.capcom.com/manual/SF6/en/ps5/page/7/2): support branching a recorded exchange and reject incompatible simulation versions rather than silently showing different combat. GGPO is a determinism reference, not a transport dependency. The recorded stream captures server-applied actions, not arrival-time packets.

- [Street Fighter 6 configurable controls](https://game.capcom.com/manual/SF6/en/steam/page/2/1) informed action rebinding. [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API) documents standardized browser mappings. No third-party gameplay code or assets imported.

- [VALORANT gameplay consistency](https://playvalorant.com/en-us/news/game-updates/valorant-gameplay-consistency-update-2/) and [Rocket League network graphs](https://www.epicgames.com/help/c-37599050/a11386071?lang=en-US): present latency variation separately from frame pacing and input processing. The panel reports browser-observed values, not one-way delay, packet loss, or input-to-photon. GGPO remains a comparison point, not a dependency.

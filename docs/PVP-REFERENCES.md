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

- [The Art of VALORANT Map Environments](https://playvalorant.com/en-us/news/dev/the-art-of-valorant-map-environments/): place stronger decoration outside the fighting area and keep materials in the play space lower-contrast than the fighters. The Cistern changes presentation only; no assets were imported.

- [Street Fighter 6 input history](https://www.playstation.com/en-us/games/street-fighter-6/everything-you-need-to-know-about-street-fighter-6/) and [Tekken 8 Practice](https://tk8.tekken-official.jp/mode/offline.php): make inputs and combat phase separately inspectable when repeating a setup. No third-party code or assets used.

- [Fighting Game Glossary: Whiff Punish](https://glossary.infil.net/?t=Whiff+Punish): distinguish a missed attack from the follow-up hit during its recovery. [Street Fighter 6 training recording](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) provides the repeatable-exchange reference. No external combat code imported.

- [Brawlhalla cosmetics](https://brawlhalla.wiki.gg/wiki/Cosmetics) and [Guilty Gear Strive appearance locks](https://www.guiltygear.com/ggst/en/news/post-2963/): keep customization outside combat and let viewers suppress it locally. All coat and sigil art is original Canvas drawing.

- [VALORANT Gameplay Consistency Update 2](https://playvalorant.com/en-gb/news/game-updates/valorant-gameplay-consistency-update-2/): balancing buffered motion against responsiveness. Seamless Fight buffers only neutral remote poses and preserves immediate authoritative action cues; this is not rollback or an input delay.

- Street Fighter 6’s separate battle audio and accessibility cues are a reference for optional visual cue captions; those captions use observed simulation events, not client input. No third-party audio imported in this pass.

- [Street Fighter 6 detailed sound settings](https://www.pcgamingwiki.com/wiki/Street_Fighter_6#Audio) document distance-to-opponent cues and independent sound controls. Seamless Fight's three original spacing tones are opt-in and limited to training. No audio was copied.

- [Street Fighter 6 battle controls](https://game.capcom.com/manual/SF6/en/ps5/page/2/3) and [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API): independent battle bindings and standard browser button indices; no third-party input code imported.

- [Street Fighter 6 training recording](https://game.capcom.com/manual/SF6/en/ps5/page/8/6) informed fast repeatable review. [Battle Settings](https://game.capcom.com/manual/SF6/en/ps5/page/6/7) documents training while queued, a reference for future queue design, not an implemented feature.

### Competitive queue boundaries

[Tekken 8's online mode separation](https://tk8.tekken-official.jp/en/mode/online.php) is the reference for keeping casual, private player matches and eventually ranked distinct. [MDN's connection type reference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/type) explains why connection medium is only an optional hint. Use server-timed pings for quality caps and never label unknown as wired. The queue does not alter the tick rate or implement [GGPO-style rollback](https://github.com/pond3r/ggpo/blob/master/doc/README.md).

Before enabling a ranked queue: establish authenticated player IDs and an idempotent, server-written match-result ledger; define disconnect/no-contest and repeat-opponent abuse rules; validate a rating model against expected outcomes and traffic; then test rank windows and provisional placements before publishing a leaderboard. Never rate local practice or private-room captures. Keep latency caps independent of rank windows.

# Seamless Fight — implementation gates for competitive-grade quality

Development checkpoint: 21 November 2026. The current product is an **original 2D browser fighter**, not a native Bloodborne port. Draft PR only; no live route, new account database or production changes.

## Working systems, verified targets and limitations

Current authoritative duel simulation is 60 Hz; server snapshots are 20 Hz. Local movement prediction is bounded and close combat stays server-authoritative. No rollback, real-world input-to-photon guarantee, cross-region matchmaker, automated anti-cheat attestation, account binding or real ranked ladder exists. Private casual rooms permit unlimited mutual rematches; a separate BO3 first-to-two-game preview has no rating rewards. Combat replays use the same versioned deterministic inputs as the authoritative simulation.

Training includes scripts, an unseen randomized mix-up, local match review and replay takeover, character phases and a user-enabled center/range diagnostic. **Engine attacks target the fighter center**, with a cut/heavy cone cosine 0.45 or pistol cone cosine 0.88; the defensive quickstep grants invulnerability in ages 1–8. The diagnostic must not suggest mesh-accurate hurtboxes that do not exist; nor should live competitive inputs become visible to the other fighter. Gameplay balance remains unchanged.

The three original stages share one arena collision plane: Lantern Court, Drowned Cistern, Ashen Reliquary. All stage backgrounds are generated locally once and cached. Ashen Reliquary uses muted ash, bone and old-gold architecture plus a new synthesized bed, not licensed source-game geometry.

The site-owned `/art/` and `/_next/` files have verified private research backups, but no raw website export, BBSC executable, licensed Bloodborne asset or website-font binary should enter the public game repository. `SITE_ART=1` opts into optional existing same-origin resources; every image has a fallback.

## P0: integrity and feel before live rated play

1. Preserve deterministic engine/replay parity under every gameplay balance revision; increment ruleset and maintain correct legacy replay handling. Validate frame-step, hit/whiff classification, attack centers, stun, simultaneous KO and round boundaries.
2. Authenticated, account-bound sessions and server-minted set IDs; only the authoritative server settles a decided BO3, exactly once. Enforce disconnect/no-contest, repeat-opponent anti-collusion and season boundaries; do not expose the offline SQLite prototype directly.
3. Run controlled loss, reordering, jitter, throttling and WAN latency measurements. Report p50/p95 input acknowledgment, frame-time p95, snapshot gaps, correction magnitude and independently measured input-to-photon. Do not advertise `zero lag`; WebSocket input receipt is not hit confirmation. Rollback requires event deduplication and actual multi-peer rollback tests before it can replace the current model.
4. Rank windows and ping-quality constraints must be independently user-selectable; never secretly relax strict filters. A browser-reported Wi-Fi/Ethernet type is unverified and can be unavailable. Show `unknown` distinctly rather than pretending unknown is wired. Require a credible cancellation and exploitation policy.

## P1: fighting-game depth without destroying readability

- Separate training from live power. Expand drills to anti-air, whiff punishment, punish consistency, spacing, dodge, recoil and firearm interrupts; allow repeatable recorded sequences, frame-step, branch playback and reaction time measurement without claiming humanlike bot intelligence.
- Compare new mechanics with Bloodborne/Sekiro/DMC/Ninja Gaiden/For Honor and competitive fighting games for **design ideas**, not imported proprietary animations, voices, textures, sounds or balancing tables. Any new action should have readable startup/active/recovery timing, stamina/risk trade-offs, reliable attack geometry, consistent controls and replay version migration.
- For 2v2: first generalize teams, targeting, camera, collision, ally identifiers, start state, input ownership, win conditions and authoritative replay tapes. Separate team queue, casual team rematches, spectating, teammate telemetry and server resource budgets; preserve unmodified 1v1 replay compatibility. No 2v2 claim until real four-client tests pass.
- Ghost library: make uploads entirely opt-in, consented and revocable; remove identifiable account or replay contents. Characteristic summaries, style presets, versioned portable models and robust AI difficulty tests come before any shared online training service.
- Unlockable cosmetics and character editor should remain appearance-only in ranked play. Confirm visible hitbox silhouettes, colorblind contrast, model budgets, wardrobe privacy and per-player settings.

## P1: visuals, effects and audio quality

- Keep Seamless Hunt's ash/slate background, parchment typography, old-gold separators and restrained Gothic architecture. Fighters, attacks, score and inputs must remain legible against every arena. Prefer pre-baked procedural scenery and cheap 2D particles with a single effects-density/reduced-motion switch.
- Design coherent and *licensed* animation, character part meshes and texture sets. Prototype source files and third-party asset terms must be auditable (original, CC0 or properly credited compatible licenses); record license text, origin, transformation and content hash. The current original Canvas art is an early playable slice, not final premium sprites.
- Mix audio by event priority: attack startup, commit, impact, dodge, firearm, UI, ambience and tension. Keep individual mix controls and caption/visual equivalents. The three credited Kenney CC0 Ogg layers are optional; procedural synthesis remains functional if decoding fails. No scraped speech or game soundtrack from third-party titles.
- Verify on real Windows KBM/controllers and mobile devices. Controller deadzone hysteresis is input stabilization, not latency elimination. Input rebinding and audio settings must survive reload without trapping focus or touching competitive rules.

## P2: social and operating model

Friends, block lists, private invites, explicit consent-based voice, region-aware queues, seasonal leaderboards, replay moderation, reporting and privacy controls require persistent services and abuse defenses. Never add a chat/voice bridge or store identifiable input histories by default. Live `seamlesshunt.com` remains unaffected until staging and rollout approval.

## References (research, not imported code)

- GGPO developer guide: https://github.com/pond3r/ggpo/blob/master/doc/DeveloperGuide.md
- Guilty Gear Strive 1.48 network and ranked update: https://www.guiltygear.com/ggst/en/news/post-2559/
- Guilty Gear Strive ranked matchmaking maintenance (May 2026): https://www.guiltygear.com/ggst/en/news/post-2995/
- Capcom Street Fighter 6 training record/replay manual: https://game.capcom.com/manual/SF6/en/ps5/page/8/6
- Microsoft Xbox input accessibility guidance: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107
- IGDA Game Accessibility SIG: https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/
- Kenney official CC0 terms: https://kenney.nl/support

Follow current `README.md`, `ASSET_CREDITS.md`, `docs/DEPLOY.md`, `docs/COMPETITIVE-SETS.md` and `docs/RANKED-LEDGER.md` for actual implemented behavior. Research suggestions are not completion claims.

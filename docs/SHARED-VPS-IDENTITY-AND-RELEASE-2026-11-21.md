# Same-VPS deployment candidate: Seamless Fight beside Seamless Hunt

**STATUS: Staged files only. Not installed, not deployed, not started.** Existing BBSC services, database, registration, Caddy site and game ports must remain unchanged.

## Recommended architecture

Use `https://seamlesshunt.com/fight/` on the existing Caddy HTTPS virtual host, with the independent Node game process bound only to `127.0.0.1:18080`. Preserve the full `/fight` prefix when reverse proxying: the Node reference game and WebSocket upgrades expect `/fight/`, `/fight/socket`, `/fight/side/socket` and `/fight/health`. No new public port. **Do not use `handle_path`**, because it removes the prefix. Avoid using `/account`, `/api`, `/hunters-online.json`, `/release.json`, `/activity`, the registration backend or existing BBSC WebAPI/TCP/UDP port ranges.

Files:
- `deploy/seamlesshunt-fight.caddy`: the additive site-block-scoped matcher, not a complete replacement Caddyfile.
- `deploy/seamless-fight.service`: separate dynamic-user process, zero inherited BBSC service dependencies, own environment, private temp, no privileges, low CPU/IO weight and bounded 384/768 MiB memory high/maximum plus restart throttling.
- `deploy/debian-13-preflight.sh`: prior dry-run OS/runtime check.
- `scripts/check-cohost-contract.mjs` and `test/cohost-contract.test.mjs`: static safety/namespace/unit validation; **they do not simulate the live website configuration or measure actual VPS capacity.**

Use only after the user finishes the planned **Ubuntu-to-Debian migration** and restores, validates and backs up all BBSC services. The production website/Caddy changes must occur in a separate review and explicit deployment action; this PR intentionally makes no such changes.

### Pre-deployment checklist (manual, read-only)

1. Record actual VPS CPU cores, free and total memory, network bandwidth, disk usage, service/resource peaks and 24h logs during expected peak BBSC concurrency. The historical VPS may still have a 1-vCPU / 2-GiB configuration; **that is not accepted for a shared-host pilot without proof**. Target at least 2 vCPU and 4 GiB physical RAM, while retaining headroom for BBSC, Caddy, website and registration.
2. Create an immutable off-server archive of the full existing Caddyfile, website and systemd units, BBSC configs, users, logs required for diagnosis and any SQLite/accounts persistent stores. Verify recovery on a separate working directory. Do not copy plaintext secrets into GitHub.
3. Stage the new build to `/opt/seamless-fight/releases/<commit>`, with `current` as a reviewed symlink; stage dedicated Node runtime `/opt/seamless-fight/runtime/bin/node` and environment `/etc/seamless-fight.env` mode 0600, containing `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=18080`, `PUBLIC_ORIGIN=https://seamlesshunt.com`, `SITE_ART=0` until asset rights review. Do not point it at the existing Python/Qt Bloodborne service or share SQLite files.
4. Run `node scripts/check-cohost-contract.mjs`, existing runtime validation, `systemd-analyze verify`, `caddy validate --config ...` on a **copy** of the complete assembled site config, and inspect `caddy adapt` order to ensure /fight is routed before any fallback catch-all without changing other routes. No direct Caddyfile overwrite.
5. Start only the new `seamless-fight.service` in a controlled maintenance window, verify `ss -tlpn` shows `127.0.0.1:18080` **and not** public 0.0.0.0, then `curl -fsS http://127.0.0.1:18080/fight/health`. Test real WebSocket upgrades and origin checks over Caddy only after the import has been reviewed. Unprivileged ports remain private.
6. Load test duels with the exact game CPU 60Hz simulation, WebSocket queue sizes, process RSS, heap, per-tick p99 latency, Caddy response times, game-server restarts and the other project's active rooms; fail admission if BBSC latency, HTTP registration or roster health worsens. Sharing the VPS is possible but **not guaranteed cheaper or safe merely because this game is 2.5D**: CPU cost depends on active matches, netcode, tick frequency, replay/spectator traffic and memory.
7. Roll back by removing only the additive /fight matcher import and stopping only seamless-fight.service, then verify normal Bloodborne routes, registration, live hunters counter, and website URLs. Never roll back by rebooting the VPS or resetting the original services.

### Migration and security requirements

No public credentials in repo; no shared sessions or registration DB; game has separate rate-limiting and limits; an authoritative online service cannot yet be called production-quality Hunt v3 because it still serves the **legacy `seamless-side/1`** rules. Do not enable ranked progression, account identity, shared Bloodborne database, or transaction-grade rating until the Hunt native/network protocol, anti-cheat and reliability checks are complete.

Resource control policy follows the systemd cgroup recommendations: `MemoryHigh` throttles first, `MemoryMax` as last-resort protection; `CPUWeight` is relative under contention rather than a guaranteed CPU reservation. On this shared server, BBSC remains higher priority. Real quota tuning needs benchmark evidence.

References:
- [Caddy reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy handle matching](https://caddyserver.com/docs/caddyfile/directives/handle)
- [systemd resource control, Debian 13](https://manpages.debian.org/trixie/systemd/systemd.resource-control.5.en.html)

## Naming and legal release discipline

Keep **Seamless Fight** as a development/working title. User wants a serious standalone Gothic dueling game's identity, not a conspicuous imitation or a silly fictional title. A separate project must have independently cleared gameplay proper names, character identities, silhouettes, logos, soundtrack, voices, weapons, stage designs and graphic materials. Copyright does not ordinarily protect short names/phrases in the US, **but trademark law and likelihood of confusion can apply to game titles, franchises and brand-associated terms**. Avoid treating removing just the word "Bloodborne" as sufficient clearance. Generic mechanics (stamina, dodge i-frames, gun-counter timing, transformation weapons) can be separately implemented, but copying a recognizable proprietary character, location, asset or logo is a different matter. Branding requires EU/US/UK trademark and storefront search and license review before public release, not an unsupported claim of legal immunity.

The isolated `public/hunt-identity.mjs` offers **draft** English/Russian presentation terms—Silver Rounds / Crimson Rounds, Rending Strike / Reclaim, etc.—with source-state HUD projection, while preserving game actions in `sf-hunt-lab/3`. These labels are not final trade-dress/mark clearance or a product name announcement.

References:
- [USPTO likelihood of confusion](https://www.uspto.gov/trademarks/search/likelihood-confusion)
- [U.S. Copyright Office names and short phrases](https://www.copyright.gov/help/faq/faq-protect.html)

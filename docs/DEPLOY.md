# Staging and production boundary

The existing site stays independent. Start this service under its own unprivileged process, bind it to 127.0.0.1, set PORT to an unused port and PUBLIC_ORIGIN to the exact scheme and host. Do not expose the Node port publicly. For an existing Caddy site block, the candidate route is:

```caddyfile
@seamlessFight path /fight /fight/*
handle @seamlessFight {
    reverse_proxy 127.0.0.1:18080
}
```

Put it in the appropriate routing group before the site's catch-all; do not strip /fight. Stage against an isolated Caddy instance, verify /fight/health and an HTTPS WebSocket duel, and check existing site routes are unchanged before deploying. Run a two-browser smoke test with 0/60/120/180 ms RTT, jitter and disconnects. Compare input-to-feedback, positional correction and contested hits. Undo by removing only the new route and stopping the isolated game service. This repo does not deploy automatically.

## Debian 13 staging

**Target OS:** Debian 13 (Trixie). Follow the [Debian 13 migration runbook](DEBIAN-13-MIGRATION.md) for the isolated Node 22+ runtime, separate staging host, unit validation, Caddy preservation and rollback. Debian 13's distribution Node package is Node 20 and is not suitable for this service.

The unit deliberately calls `/opt/seamless-fight/runtime/bin/node` rather than replacing `/usr/bin/node` or the website's runtime. `ExecStartPre` checks Debian, Node major, HTTPS origin and loopback binding. CI executes Node 22/24 and Chromium inside Debian 13 containers. No OS or website changes happen automatically.

The Chromium smoke check injects ordered application-message delays (guest uplink 55–78 ms, downlink 26–49 ms). This checks room join and authoritative movement with deterministic jitter, not loss, TCP retransmits, or combat reaction fairness. The VPS requires neither this test harness nor a browser.

### Share the website’s presentation assets

The standalone build uses the Seamless Hunt palette, locally bundled fallback icons, and a system serif. For a same-origin `/fight/` deployment, set `SITE_ART=1` in `/etc/seamless-fight.env` after checking that the host serves `/art/icon-blades.webp`, `/art/icon-lantern.webp`, `/art/icon-tricorn.webp`, `/art/divider.webp`, and `/art/skyline-near.webp`. The duel may also try a hashed EB Garamond WOFF2 under `/_next/static/media/` as a nonessential enhancement; the uploaded site static/media reference folder did not contain that binary during the November 2026 review. Verify the exact font file exists and may be loaded from the deployed site before enabling SITE_ART=1. The application falls back to its system-serif stack and does not redistribute a font. Do not proxy `/art/` or `/_next/` to the duel server. Unavailable assets fall back individually; the duel never contacts Drive or a third-party CDN. This does not require any changes to the main site's files.

Lantern Court also composites `/art/skyline-far.webp`, `/art/moon.webp`, `/art/skyline-near.webp`, and `/art/fog.webp` once into the cached backdrop above the fighting floor. These paths stay on the host site; missing layers do not block the duel. The standalone procedural skyline, Drowned Cistern and Ashen Reliquary remain independent of these files. The optional side-view route `/fight/side/` uses this same SITE_ART switch for its crest, optional font and cached noninteractive sky strip; its own Gothic fighter sprites, floor, hitboxes and audio have no website dependency. All three stages share exact world bounds and game rules; none requests textures from Google Drive or third-party hosts.

Optional HUD ornament paths on the same host: `/art/icon-vial.webp`, `/art/icon-bell.webp`, `/art/icon-skull.webp`. Missing ornament files do not block HUD or round text.

Casual matchmaking is in-memory and instance-local. A multi-instance deployment needs a shared matchmaker or sticky routing before advertising a shared queue. No new endpoint, port, or reverse proxy rule is required.

### Browser static asset revalidation

The duel process serves HTML, JavaScript and CSS with `Cache-Control: no-cache`, strong SHA-256 `ETag` values and conditional `304` responses. Retain these headers when validating the staged reverse proxy; do not blanket-cache `/fight/health`, `/fight/socket` or unversioned game scripts without revalidation. The site's existing `/art/` and `/_next/` caching remains the website's responsibility.

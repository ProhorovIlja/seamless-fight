# Staging and production boundary

The existing site stays independent. Start this service under its own unprivileged process, bind it to 127.0.0.1, set PORT to an unused port and PUBLIC_ORIGIN to the exact scheme and host. Do not expose the Node port publicly. For an existing Caddy site block, the candidate route is:

```caddyfile
@seamlessFight path /fight /fight/*
handle @seamlessFight {
    reverse_proxy 127.0.0.1:18080
}
```

Put it in the appropriate routing group before the site's catch-all; do not strip /fight. Stage against an isolated Caddy instance, verify /fight/health and an HTTPS WebSocket duel, and check existing site routes are unchanged before deploying. Run a two-browser smoke test with 0/60/120/180 ms RTT, jitter and disconnects. Compare input-to-feedback, positional correction and contested hits. Undo by removing only the new route and stopping the isolated game service. This repo does not deploy automatically.

## Ubuntu 26.04 staging

The hosted Chromium runner is separate from the production runtime. The production service needs Node 22 or newer at /usr/bin/node (or an explicit ExecStart override), npm-installed production dependencies, and Caddy. It does not need a browser or Playwright.

Use a root-owned release directory readable by the dynamic service user, and point /opt/seamless-fight/current at the reviewed release. Install dependencies as a build user before making the release read-only. Copy deploy/seamless-fight.service to the system unit directory and create /etc/seamless-fight.env with PUBLIC_ORIGIN=https://seamlesshunt.com (use the actual HTTPS origin for staging). Check that port 18080 is unused; if changing it, change the staged proxy target too. Verify the unit with systemd-analyze verify before starting it. Verify loopback /fight/health and a complete HTTPS two-browser duel through a staged Caddy config before adding any live route. Do not replace the existing Caddyfile or change the ShadNet service. Verify existing site routes and the boot-time configuration after any approved cutover.

Rollback the game independently: remove its Caddy route using the existing site's change process, stop/disable only the game service, and point the release symlink back if needed. Open matches are in memory and do not survive process restarts.

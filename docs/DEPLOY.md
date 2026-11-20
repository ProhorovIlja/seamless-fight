# Staging and production boundary

The existing site stays independent. Start this service under its own unprivileged process, bind it to 127.0.0.1, set PORT to an unused port and PUBLIC_ORIGIN to the exact scheme and host. Do not expose the Node port publicly. For an existing Caddy site block, the candidate route is:

```caddyfile
@seamlessFight path /fight /fight/*
handle @seamlessFight {
    reverse_proxy 127.0.0.1:8080
}
```

Put it in the appropriate routing group before the site's catch-all; do not strip /fight. Stage against an isolated Caddy instance, verify /fight/health and an HTTPS WebSocket duel, and check existing site routes are unchanged before deploying. Run a two-browser smoke test with 0/60/120/180 ms RTT, jitter and disconnects. Compare input-to-feedback, positional correction and contested hits. Undo by removing only the new route and stopping the isolated game service. This repo does not deploy automatically.

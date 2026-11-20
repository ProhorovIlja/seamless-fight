# Debian 13 (Trixie) — staging and migration runbook

This is an operator-only runbook. The repository does not change the operating system, production website, Caddy, ShadNet, or game service automatically. Prefer a separate Debian 13 server and a verified rollback over an in-place Ubuntu-to-Debian replacement.

## Preflight and backup

1. On the old host, inventory DNS, certificates, firewall, Caddyfile and imported snippets, website deployments and builds, `/art/`, `/_next/`, environment files, systemd units, and all ShadNet/game data volumes. Take access-controlled off-host backups and **test recovery**. Do not copy secrets, private co-op binaries or uploaded website archives into the public GitHub repository.
2. Provision the new server with the current patched Debian 13.x release. Verify `/etc/os-release`, architecture, service users, permissions, DNS/SSH access, storage mounts, time sync, and security updates. Follow the [Debian 13 release notes](https://www.debian.org/releases/trixie/release-notes/).
3. Install/review Caddy using [official Debian instructions](https://caddyserver.com/docs/install); preserve the existing website Caddy config and imported snippets. **Never replace them with a default configuration.** Staging must not hijack the production domain.

## Separate Node 22+ runtime

Debian 13's `apt install nodejs` provides Node 20, which is insufficient for this project. The systemd unit uses `/opt/seamless-fight/runtime/bin/node`. Do not replace `/usr/bin/node` or the website's Node installation. Obtain a supported, patched [official Node 22 release](https://nodejs.org/en/download/archive/v22) for your CPU architecture and verify its checksums/signature according to your supply-chain policy.

The following **example** installs a versioned official binary for Debian 13 x64 or arm64. Review the current security patch before running it on the staging host:

```bash
set -euo pipefail
NODE_VERSION=22.23.5
case "$(dpkg --print-architecture)" in
  amd64) NODE_ARCH=x64 ;;
  arm64) NODE_ARCH=arm64 ;;
  *) echo 'Unsupported architecture for this example' >&2; exit 1 ;;
esac
work="$(mktemp -d)"
cd "$work"
curl -fSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"
curl -fSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
grep -F " node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" SHASUMS256.txt | sha256sum --check --strict
sudo install -d -m 0755 "/opt/seamless-fight/runtime-${NODE_VERSION}"
sudo tar -xJf "node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz" -C "/opt/seamless-fight/runtime-${NODE_VERSION}" --strip-components=1
sudo ln -sfn "runtime-${NODE_VERSION}" /opt/seamless-fight/runtime
/opt/seamless-fight/runtime/bin/node --version
```

The SHA256 comparison against upstream HTTPS detects corruption; verify signed release metadata separately when required. Keep previous versioned runtimes for rollback. Install the reviewed game revision into its own release path under `/opt/seamless-fight/releases/<commit>` with `node_modules`, readable by the service's dynamic user and read-only in production. Install dependencies in a writable build directory using `PATH="/opt/seamless-fight/runtime/bin:$PATH" npm install --omit=dev --ignore-scripts --no-audit`; then copy/stage the release. Point `/opt/seamless-fight/current` at the reviewed release only after its tests pass.

## Staging service and Caddy routing

Create a root-owned, mode-0600 `/etc/seamless-fight.env` containing the exact **HTTPS** `PUBLIC_ORIGIN=https://<staging-host>` (no path or trailing slash). Only set `SITE_ART=1` after verifying the host serves the website art/font URLs. The unit supplies `NODE_ENV=production HOST=127.0.0.1 PORT=18080`, and fails closed if the OS/Node version/origin/binding is incompatible.

Run `bash deploy/debian-13-preflight.sh` to inspect the staging machine **without changing anything**. When the release, environment and runtime are ready, install `deploy/seamless-fight.service` into `/etc/systemd/system/`; run `sudo systemd-analyze verify /etc/systemd/system/seamless-fight.service`, then (only after review) `sudo systemctl daemon-reload` and `sudo systemctl enable --now seamless-fight.service`. Verify `sudo journalctl -u seamless-fight.service -n 100 --no-pager` and `curl -fsS http://127.0.0.1:18080/fight/health`. The Node port must not be exposed publicly.

Add a **single** `/fight` proxy route inside the existing Caddy site before the site's catch-all, preserving the prefix and leaving all other routes alone:

```caddyfile
@seamlessFight path /fight /fight/*
handle @seamlessFight {
    reverse_proxy 127.0.0.1:18080
}
```

Check the complete actual Caddyfile with `caddy validate --config /etc/caddy/Caddyfile` before an approved reload. Caddy owns TLS and WebSocket upgrades. `/art/`, `/_next/`, existing site paths and ShadNet stay on their original handlers.

## Acceptance tests and rollback

Verify `/fight/health` through HTTPS, then a full **two-browser WebSocket duel**, private room and casual queue, opponent filters, spectator token, replay import/export, disconnect handling and responsive graphics. Check other website routes, fonts/images, TLS renewal, security headers, and reboot behavior. Test measured RTT, jitter and packet loss on the new host; a green health request is not a responsiveness or fairness benchmark. No network connection can guarantee zero latency.

Keep the old server, verified backups, DNS rollback, Caddy configuration, earlier release/runtime symlinks and service units until the new site and game pass post-reboot checks. Back out the `/fight` handler and **only** `seamless-fight.service` if needed. Live matches and queues are memory-only and are lost on restart. Debian CI jobs validate an isolated container environment, not the live website or the OS cutover.

A Debian systemd restart now sends a WebSocket **1012 Service Restart** close frame to connected fighters/viewers and closes their rooms; it does not persist unfinished matches or queue state. The service allows up to 1.5 seconds for close frames to flush before terminating remaining sockets. Test restart behaviour on staging, not by restarting the live website.

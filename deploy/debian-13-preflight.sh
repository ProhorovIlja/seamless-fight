#!/usr/bin/env bash
# Read-only host preflight. No package installation or service restart.
set -euo pipefail
if [[ "${1:-}" != "" && "${1:-}" != "--ci" ]]; then
  echo 'Usage: debian-13-preflight.sh [--ci]' >&2; exit 2
fi
source /etc/os-release
if [[ "$ID" != debian || "${VERSION_ID%%.*}" != 13 ]]; then
  echo 'STOP: Debian 13 (trixie) required.' >&2; exit 1
fi
echo "OS: Debian $VERSION_ID"
if [[ "${1:-}" == "--ci" ]]; then
  node -e 'if (+process.versions.node.split(".")[0] < 22) process.exit(1)'
  echo 'Debian and Node major version checked.'
  exit 0
fi
NODE=/opt/seamless-fight/runtime/bin/node
if [[ ! -x "$NODE" ]]; then
  echo "STOP: Versioned Node runtime missing at $NODE." >&2; exit 1
fi
"$NODE" -e 'if (+process.versions.node.split(".")[0] < 22) process.exit(1)'
echo "Duel Node: $("$NODE" --version)"
if command -v caddy >/dev/null && [[ -r /etc/caddy/Caddyfile ]]; then
  caddy validate --config /etc/caddy/Caddyfile
else
  echo 'NOTICE: Preserve and validate the existing Caddyfile before cutover.'
fi
if [[ -r /etc/systemd/system/seamless-fight.service ]] && command -v systemd-analyze >/dev/null; then
  systemd-analyze verify /etc/systemd/system/seamless-fight.service
else
  echo 'NOTICE: Review and verify the staged unit before installing it.'
fi
echo 'No OS packages, website files, or services were changed.'

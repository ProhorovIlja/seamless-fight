#!/usr/bin/env bash
# Read-only co-host admission preflight. Never edits Caddy, systemd, firewall,
# accounts, BBSC services or web files. Requires existing Debian 13.
set -euo pipefail
if [[ ${1:-} != "--read-only" ]]; then
  printf '%s\n' "Usage: bash deploy/shared-vps-preflight.sh --read-only" >&2
  exit 2
fi
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
if [[ ! -r /etc/os-release || ! -r /proc/meminfo ]]; then
  echo "STOP: requires a Linux host with readable OS and memory diagnostics" >&2
  exit 1
fi
# shellcheck disable=SC1091
source /etc/os-release
if [[ "$ID" != debian || "${VERSION_ID%%.*}" != 13 ]]; then
  echo "STOP: run on the target Debian 13 VPS after preserving the existing BBSC installation" >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "STOP: Node 22+ needed to run local configuration checks (no install performed)" >&2
  exit 1
fi
node "$ROOT/scripts/check-cohost-contract.mjs"
CORES=$(getconf _NPROCESSORS_ONLN)
MEM_TOTAL_KB=$(awk '$1=="MemTotal:"{print $2}' /proc/meminfo)
MEM_AVAILABLE_KB=$(awk '$1=="MemAvailable:"{print $2}' /proc/meminfo)
printf 'COHOST_CPU_THREADS=%s\nCOHOST_MEM_TOTAL_MIB=%s\nCOHOST_MEM_AVAILABLE_MIB=%s\n'   "$CORES" "$((MEM_TOTAL_KB/1024))" "$((MEM_AVAILABLE_KB/1024))"
if (( CORES < 2 || MEM_TOTAL_KB < 3670016 || MEM_AVAILABLE_KB < 921600 )); then
  echo "STOP: conservative initial 2-vCPU/4-GiB/900-MiB-free pilot admission threshold not met" >&2
  exit 1
fi
if command -v ss >/dev/null 2>&1; then
  if ss -H -ltn | awk '{print $4}' | grep -Eq '(^|:)18080$'; then
    echo "STOP: planned private port 18080 is already in use; do not overwrite another service" >&2
    exit 1
  fi
else
  echo "NOTICE: ss is unavailable; manual private-port occupancy check required" >&2
fi
if command -v caddy >/dev/null 2>&1; then
  echo "CADDY_PRESENT=yes. A complete, backed-up candidate Caddyfile must still be validated manually."
else
  echo "CADDY_PRESENT=no. Confirm actual host reverse proxy and migration state before any deployment."
fi
echo "READ_ONLY_PREFLIGHT=PASS: still requires BBSC load-test, backup restore proof, staged Caddy validation and explicit deployment approval"

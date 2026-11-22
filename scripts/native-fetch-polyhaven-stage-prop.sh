#!/usr/bin/env bash
# Pinned, opt-in CC0 1.0 decorative photogrammetry model by Poly Haven.
# Official model: https://polyhaven.com/a/gothic_statue
# License: https://polyhaven.com/license
# Attribution mirror: https://github.com/lsgmasa33/modoki-postfx-demo/blob/main/ATTRIBUTION.md
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="experiments/godot-native-4.7/assets/pbr/gothic_statue.glb"
SOURCE_COMMIT="88e73f2d0cc05bd1564d7615c3d23aea6f1dc68d"
BLOB_SHA="1f63030912105d4bd31a97aa8bccdf00d4b44772"
URL="https://raw.githubusercontent.com/lsgmasa33/modoki-postfx-demo/88e73f2d0cc05bd1564d7615c3d23aea6f1dc68d/runtime/assets/models/gothic_statue.glb"
mkdir -p "$(dirname "$DEST")"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
curl -fLS --retry 3 --retry-delay 2 --max-time 120 --user-agent "SeamlessFight-Research/1.0" "$URL" -o "$TMP"
ACTUAL="$(git hash-object "$TMP")"
if [ "$ACTUAL" != "$BLOB_SHA" ]; then
  echo "Pinned Poly Haven CC0 Gothic Statue file changed: $ACTUAL" >&2
  exit 2
fi
python3 - "$TMP" <<'PY'
from pathlib import Path
import struct, sys
p=Path(sys.argv[1]); size=p.stat().st_size
with p.open("rb") as f:
    head=f.read(12)
magic,version,declared=struct.unpack("<4sII",head)
assert magic==b"glTF" and version==2 and declared==size, "Malformed glTF 2.0 binary"
assert 2000000 < size < 6000000, "Unexpected model payload size"
print("PINNED_POLYHAVEN_GOTHIC_STATUE_CC0_GLTF2_VERIFIED",size)
PY
cp "$TMP" "$DEST"
printf "Gothic prop: %s bytes, source blob %s\n" "$(wc -c < "$DEST")" "$BLOB_SHA"

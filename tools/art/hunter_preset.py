"""Offline authoring-only MakeHuman/MPFB preset validation.

Source config is not a public character customization service. No body/hair/face
geometry is created here; the Blender/MPFB studio builder uses these values.
The community's *core art assets* are CC0; the Blender MPFB addon *code* is GPLv3,
and third-party clothing/hair/skin packs have individual licenses.
"""
from __future__ import annotations

import json
import math
import re
from pathlib import Path

SCHEMA = "sf-studio-human/1"
MACRO_FIELDS = ("gender", "age", "muscle", "weight", "height", "proportions")
REQUIRED_ASSETS = ("eyes", "eyebrows", "eyelashes", "tongue", "teeth", "hair")
CLOTHING_MINIMUM = 1
ALLOWED_RIGS = frozenset(("game_engine",))
IDENTIFIER = re.compile(r"^[a-z][a-z0-9_]{1,47}$", re.ASCII)
SAFE_ASSET = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}\.(?:mhclo|mhmat)$", re.ASCII)

class PresetError(ValueError):
    pass

def _asset(value, kind):
    if not isinstance(value, str) or not SAFE_ASSET.fullmatch(value):
        raise PresetError(f"Asset {kind} must be a single .mhclo/.mhmat filename without path traversal")
    if value.endswith(".mhmat") != (kind == "skin"):
        raise PresetError(f"Wrong asset extension for {kind}")
    return value

def validate_preset(value):
    if not isinstance(value, dict) or set(value) != {"schema", "id", "macros", "rig", "skin", "parts", "clothing", "license"}:
        raise PresetError("Unknown or missing preset fields")
    if value["schema"] != SCHEMA:
        raise PresetError("Incompatible authoring schema")
    if not isinstance(value["id"], str) or not IDENTIFIER.fullmatch(value["id"]):
        raise PresetError("Character ID must be a safe, stable, lower-case identifier")
    if value["rig"] not in ALLOWED_RIGS:
        raise PresetError("Only the vetted game_engine rig is supported")
    macros = value["macros"]
    if not isinstance(macros, dict) or set(macros) != set(MACRO_FIELDS):
        raise PresetError("Macro properties must match the audited MPFB service keys")
    for k, v in macros.items():
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not 0 <= v <= 1:
            raise PresetError(f"Macro {k} must be a finite number from zero to one")
    _asset(value["skin"], "skin")
    parts = value["parts"]
    if not isinstance(parts, dict) or set(parts) != set(REQUIRED_ASSETS):
        raise PresetError("Eyes, brows, lashes, teeth, tongue and hair are mandatory")
    for k, v in parts.items():
        _asset(v, k)
    clothes = value["clothing"]
    if not isinstance(clothes, list) or not CLOTHING_MINIMUM <= len(clothes) <= 6 or len(set(map(str, clothes))) != len(clothes):
        raise PresetError("One to six nonduplicate clothing elements required")
    for item in clothes:
        _asset(item, "clothing")
    license_info = value["license"]
    if not isinstance(license_info, dict) or set(license_info) != {"core", "third_party_audited"} or license_info["core"] != "CC0-1.0" or license_info["third_party_audited"] is not True:
        raise PresetError("Character sources require explicit CC0 base and separately audited clothing/hair rights")
    return value

def read_preset(file):
    path = Path(file)
    if not path.is_file() or path.stat().st_size > 16_384:
        raise PresetError("Missing or oversized preset file")
    try:
        return validate_preset(json.loads(path.read_text(encoding="utf-8")))
    except (ValueError, UnicodeError) as exc:
        raise PresetError(str(exc)) from exc

if __name__ == "__main__":
    import sys
    try:
        preset = read_preset(sys.argv[1])
        print("SF_MH_STUDIO_PRESET_VALID:", preset["id"], preset["schema"])
    except (PresetError, IndexError) as error:
        print("SF_MH_STUDIO_PRESET_INVALID:", error, file=sys.stderr)
        sys.exit(2)

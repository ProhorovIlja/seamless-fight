"""No Blender installed in CI: validate source-art preset gate with stdlib only.

A passing schema test is not a generated 3D actor, high-quality art review,
MakeHuman pack audit or license clearance for commercial redistribution.
"""
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

ART = Path(__file__).resolve().parents[2] / "tools" / "art"
sys.path.insert(0, str(ART))
from hunter_preset import PresetError, SCHEMA, read_preset, validate_preset
from build_hunter_base import _required_asset


class StudioPresetTests(unittest.TestCase):
    def setUp(self):
        self.good = json.loads(
            (ART / "presets" / "veil_studio_base.json").read_text(encoding="utf-8")
        )

    def mutate(self, field, value):
        attempt = copy.deepcopy(self.good)
        attempt[field] = value
        return attempt

    def test_official_cc0_studio_baseline_parses(self):
        result = validate_preset(self.good)
        self.assertEqual(result["schema"], SCHEMA)
        self.assertEqual(result["rig"], "game_engine")
        self.assertEqual(len(result["parts"]), 6)
        self.assertEqual(len(result["clothing"]), 1)
        self.assertEqual(result["license"]["core"], "CC0-1.0")

    def test_forbidden_model_names_rejected_before_blender(self):
        for bad in ("../Bloodborne/eboot.bin", "Neon Hunter", "x", "x\\evil", "untrusted.glb"):
            with self.subTest(bad=bad), self.assertRaises(PresetError):
                validate_preset(self.mutate("id", bad))

    def test_rejects_unknown_macro_or_wrong_customization_bounds(self):
        for name, value in [
            ("height", -1), ("gender", 1.1), ("age", float("nan")),
            ("muscle", float("inf")), ("weight", True),
        ]:
            bad = copy.deepcopy(self.good)
            bad["macros"][name] = value
            with self.subTest(name=name, value=value), self.assertRaises(PresetError):
                validate_preset(bad)
        bad = copy.deepcopy(self.good)
        bad["macros"]["unknown_unsafe_operator"] = 0.7
        with self.assertRaises(PresetError):
            validate_preset(bad)

    def test_requires_full_face_and_licensed_body_clothes(self):
        for kind, value in [
            ("hair", "../../Downloads/bought_asset.mhclo"),
            ("eyes", "eyes.glb"),
            ("eyebrows", "/tmp/private.mhclo"),
            ("teeth", "eyes.mhmat"),
        ]:
            attempt = copy.deepcopy(self.good)
            attempt["parts"][kind] = value
            with self.subTest(kind=kind), self.assertRaises(PresetError):
                validate_preset(attempt)
        bad = self.mutate("clothing", [])
        with self.assertRaises(PresetError):
            validate_preset(bad)
        bad = self.mutate("clothing", ["female_casualsuit01.mhclo"] * 2)
        with self.assertRaises(PresetError):
            validate_preset(bad)
        bad = self.mutate("license", {"core": "UNKNOWN", "third_party_audited": True})
        with self.assertRaises(PresetError):
            validate_preset(bad)
        bad = self.mutate("license", {"core": "CC0-1.0", "third_party_audited": False})
        with self.assertRaises(PresetError):
            validate_preset(bad)

    def test_rejects_stale_schemas_and_unapproved_rigs(self):
        for key, value in [("schema", "sf-studio-human/0"), ("rig", "untrusted_rig")]:
            with self.subTest(key=key), self.assertRaises(PresetError):
                validate_preset(self.mutate(key, value))
        value = copy.deepcopy(self.good)
        value["hidden_private_key"] = "secret"
        with self.assertRaises(PresetError):
            validate_preset(value)

    def test_asset_root_is_explicit_and_rejects_symlink_escape(self):
        class StubAssets:
            def __init__(self, result):
                self.result = result
            def find_asset_absolute_path(self, name, asset_subdir):
                return self.result

        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            allowed = base / "audited_cc0" / "skins"
            allowed.mkdir(parents=True)
            original = allowed / "approved.mhmat"
            original.write_bytes(b"verified test asset")
            self.assertEqual(
                _required_asset(StubAssets(str(original)), "approved.mhmat",
                                "skins", allowed.parent.resolve()),
                original.resolve(),
            )
            outside = base / "unaudited.mhmat"
            outside.write_bytes(b"unreviewed")
            with self.assertRaises(RuntimeError):
                _required_asset(StubAssets(str(outside)), "approved.mhmat",
                                "skins", allowed.parent.resolve())
            link = allowed / "tricked.mhmat"
            link.symlink_to(outside)
            with self.assertRaises(RuntimeError):
                _required_asset(StubAssets(str(link)), "tricked.mhmat",
                                "skins", allowed.parent.resolve())
            with self.assertRaises(RuntimeError):
                _required_asset(StubAssets(None), "missing.mhmat",
                                "skins", allowed.parent.resolve())

    def test_reading_file_fails_closed_on_oversize_and_invalid_json(self):
        with tempfile.TemporaryDirectory() as root:
            file = Path(root) / "hunter.json"
            file.write_text(json.dumps(self.good), encoding="utf-8")
            self.assertEqual(read_preset(file)["id"], "veil_studio_base")
            file.write_text("{" + " " * 17000 + "}", encoding="utf-8")
            with self.assertRaises(PresetError):
                read_preset(file)
            file.write_text("{not JSON", encoding="utf-8")
            with self.assertRaises(PresetError):
                read_preset(file)
            file.unlink()
            with self.assertRaises(PresetError):
                read_preset(file)


if __name__ == "__main__":
    unittest.main()

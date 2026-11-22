"""Synthetic GLB metadata acceptance cases. No copied third-party character data."""
from __future__ import annotations
import copy
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2] / "tools" / "art"
sys.path.insert(0, str(TOOLS))
from audit_glb import GLBError, REQUIRED_CLIPS, audit_glb, load_glb

def scene():
    nodes = [{"name": "Bone_" + str(i)} for i in range(24)]
    nodes.append({"name": "SyntheticSkeletonMesh", "skin": 0, "mesh": 0})
    document = {
        "asset": {"version": "2.0"},
        "nodes": nodes,
        "skins": [{"joints": list(range(24)), "skeleton": 0}],
        "accessors": [{"count": 2100}, {"count": 2100},
                      {"count": 2100}, {"count": 2}],
        "meshes": [{"primitives": [{
            "attributes": {"POSITION": 0, "JOINTS_0": 1, "WEIGHTS_0": 2},
            "material": 0, "mode": 4
        }]}],
        "materials": [{"pbrMetallicRoughness": {"roughnessFactor": 0.75}}],
        "animations": [
            {"name": name, "samplers": [{"input": 3}],
             "channels": [{"sampler": 0, "target": {"node": 0, "path": "rotation"}}]}
            for name in sorted(REQUIRED_CLIPS)
        ]
    }
    return document

def fake_glb(document):
    payload = json.dumps(document, sort_keys=True, separators=(",", ":")).encode("utf-8")
    payload += b" " * ((-len(payload)) % 4)
    return (struct.pack("<4sII", b"glTF", 2, len(payload) + 20)
            + struct.pack("<I4s", len(payload), b"JSON") + payload)

class OriginalHunterGLBAuditTests(unittest.TestCase):
    def test_synthetic_metadata_reaches_only_technical_gate(self):
        report = audit_glb(scene())
        self.assertEqual(report["mandatory_clips_passed"], 12)
        self.assertEqual(report["skinned_vertices"], 2100)
        self.assertEqual(report["joints"], 24)
        self.assertFalse(report["human_art_quality_approved"])
        self.assertFalse(report["redistribution_rights_confirmed"])

    def test_bad_glb_magic_declared_size_and_external_images(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "synthetic.glb"
            p.write_bytes(fake_glb(scene()))
            parsed, digest, size = load_glb(p)
            self.assertEqual(len(digest), 64)
            self.assertEqual(size, p.stat().st_size)
            self.assertEqual(parsed["asset"]["version"], "2.0")
            p.write_bytes(b"WRONG" + p.read_bytes()[5:])
            with self.assertRaises(GLBError):
                load_glb(p)
            p.write_bytes(fake_glb(scene()) + b"extraneous")
            with self.assertRaises(GLBError):
                load_glb(p)
        bad = scene()
        bad["images"] = [{"uri": "https://example.com/asset.png"}]
        with self.assertRaises(GLBError):
            audit_glb(bad)

    def test_rejects_unskinned_and_low_detail_fake_hunters(self):
        b = scene()
        b["nodes"][-1].pop("skin")
        with self.assertRaisesRegex(GLBError, "Low-detail"):
            audit_glb(b)
        b = scene()
        b["accessors"][0]["count"] = 24
        with self.assertRaisesRegex(GLBError, "Low-detail"):
            audit_glb(b)
        b = scene()
        b["skins"][0]["joints"] = [0,1]
        with self.assertRaisesRegex(GLBError, "24-joint"):
            audit_glb(b)
        b = scene()
        b["meshes"][0]["primitives"][0]["attributes"].pop("WEIGHTS_0")
        with self.assertRaisesRegex(GLBError, "Low-detail"):
            audit_glb(b)

    def test_rejects_fake_empty_or_mismatched_animation_clips(self):
        b = scene()
        b["animations"][0]["name"] = "unrelated_anim"
        with self.assertRaisesRegex(GLBError, "Missing real keyed"):
            audit_glb(b)
        b = scene()
        b["accessors"][3]["count"] = 1
        with self.assertRaisesRegex(GLBError, "Missing real keyed"):
            audit_glb(b)
        b = scene()
        b["animations"][1]["channels"][0]["target"]["path"] = "weights"
        with self.assertRaisesRegex(GLBError, "Missing real keyed"):
            audit_glb(b)
        b = scene()
        b["animations"][1]["channels"][0]["target"]["node"] = 24
        with self.assertRaisesRegex(GLBError, "Missing real keyed"):
            audit_glb(b)

    def test_skinned_material_geometry_is_required(self):
        b = scene()
        b["materials"] = []
        with self.assertRaisesRegex(GLBError, "material"):
            audit_glb(b)
        b = scene()
        b["meshes"][0]["primitives"][0]["material"] = 44
        with self.assertRaisesRegex(GLBError, "material"):
            audit_glb(b)
        b = scene()
        b["nodes"][-1]["mesh"] = 100
        with self.assertRaisesRegex(GLBError, "mesh"):
            audit_glb(b)

if __name__ == "__main__":
    unittest.main()

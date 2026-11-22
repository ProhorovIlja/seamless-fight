"""Offline GLB 2.0 technical acceptance preflight for ORIGINAL high-detail hunters.

Scans bytes and glTF metadata without Blender, Godot or external dependencies.
It cannot assess artistic quality, confirm animation naturalness, verify individual
3D indices, test skin deformation, infer asset ownership, or grant redistribution.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import struct
from pathlib import Path

MAX_GLB_BYTES = 256 * 1024 * 1024
MIN_BONES = 24
MIN_SKINNED_VERTICES = 1800
REQUIRED_CLIPS = frozenset({
    "idle", "run", "jump", "crouch", "guard", "step",
    "cut", "hew", "shot", "stun", "feint", "guard_break"
})

class GLBError(ValueError):
    pass

def load_glb(path):
    file = Path(path)
    if not file.is_file() or file.stat().st_size < 20 or file.stat().st_size > MAX_GLB_BYTES:
        raise GLBError("Missing, empty, or oversized GLB; 256 MiB limit")
    bytes_ = file.read_bytes()
    magic, version, size = struct.unpack_from("<4sII", bytes_, 0)
    if magic != b"glTF" or version != 2 or size != len(bytes_):
        raise GLBError("Bad GLB v2 magic, version or declared byte count")
    if len(bytes_) < 20:
        raise GLBError("Missing JSON chunk")
    chunk_length, chunk_kind = struct.unpack_from("<I4s", bytes_, 12)
    if chunk_kind != b"JSON" or chunk_length > len(bytes_) - 20 or chunk_length % 4 != 0:
        raise GLBError("Malformed or oversized GLB JSON chunk")
    try:
        document = json.loads(bytes_[20:20 + chunk_length].decode("utf-8").rstrip(" \t\r\n"))
    except (UnicodeError, ValueError) as exc:
        raise GLBError("Malformed GLB scene JSON") from exc
    if not isinstance(document, dict) or not isinstance(document.get("asset"), dict) or document["asset"].get("version") != "2.0":
        raise GLBError("Scene is not glTF 2.0")
    return document, hashlib.sha256(bytes_).hexdigest(), len(bytes_)

def _at(items, index, label):
    if not isinstance(items, list) or isinstance(index, bool) or not isinstance(index, int) or index < 0 or index >= len(items):
        raise GLBError("Invalid " + label + " index")
    return items[index]

def audit_glb(document):
    """Metadata preflight only. Godot GPU visual, anim and legal review are separate."""
    if not isinstance(document, dict):
        raise GLBError("Invalid glTF document")
    accessors = document.get("accessors", [])
    meshes = document.get("meshes", [])
    nodes = document.get("nodes", [])
    skins = document.get("skins", [])
    animations = document.get("animations", [])
    materials = document.get("materials", [])
    if not materials:
        raise GLBError("Missing even a basic authored material")
    for item in document.get("buffers", []):
        if isinstance(item, dict) and item.get("uri"):
            raise GLBError("Standalone GLB must embed buffer bytes; external URIs are rejected")
    for item in document.get("images", []):
        if isinstance(item, dict) and item.get("uri"):
            raise GLBError("Standalone GLB must embed imagery; external URIs are rejected")
    humanoid_skins = [s for s in skins if isinstance(s, dict) and isinstance(s.get("joints"), list)
                     and len(s["joints"]) >= MIN_BONES]
    if not humanoid_skins:
        raise GLBError("No sufficiently articulated 24-joint humanoid skin")
    for skin in humanoid_skins:
        for joint in skin["joints"]:
            _at(nodes, joint, "bone")
    vertices = 0
    skinned_meshes = 0
    for node in nodes:
        if not isinstance(node, dict) or not isinstance(node.get("skin"), int):
            continue
        skin = _at(skins, node["skin"], "skin")
        if skin not in humanoid_skins or "mesh" not in node:
            continue
        mesh = _at(meshes, node["mesh"], "skinned mesh")
        for primitive in mesh.get("primitives", []):
            if primitive.get("mode", 4) != 4:
                continue
            attributes = primitive.get("attributes", {})
            if not all(k in attributes for k in ("POSITION", "JOINTS_0", "WEIGHTS_0")):
                continue
            accessor = _at(accessors, attributes["POSITION"], "position accessor")
            count = accessor.get("count", 0)
            if isinstance(count, int) and count > 0:
                vertices += count
                skinned_meshes += 1
            _at(materials, primitive.get("material"), "material")
    if vertices < MIN_SKINNED_VERTICES:
        raise GLBError("Low-detail or unskinned mesh: no 1,800-vertex articulated body")
    names = {}
    for animation in animations:
        if not isinstance(animation, dict) or not isinstance(animation.get("name"), str):
            continue
        keyframes = 0
        for channel in animation.get("channels", []):
            sampler = _at(animation.get("samplers", []), channel.get("sampler"), "animation sampler")
            target = channel.get("target", {})
            if target.get("path") not in ("rotation", "translation", "scale"):
                continue
            target_node = _at(nodes, target.get("node"), "animated bone")
            # The node must actually be in some accepted humanoid skin.
            target_id = target.get("node")
            if not any(target_id in skin["joints"] for skin in humanoid_skins):
                continue
            input_access = _at(accessors, sampler.get("input"), "animation time accessor")
            if isinstance(input_access.get("count"), int) and input_access["count"] >= 2:
                keyframes += 1
        names[animation["name"]] = max(names.get(animation["name"], 0), keyframes)
    missing = sorted(n for n in REQUIRED_CLIPS if names.get(n, 0) < 1)
    if missing:
        raise GLBError("Missing real keyed humanoid animation clips: " + ", ".join(missing))
    return {
        "status": "GLB_TECHNICAL_PREFLIGHT_ONLY",
        "skinned_vertices": vertices,
        "skinned_primitives": skinned_meshes,
        "joints": max(len(s["joints"]) for s in humanoid_skins),
        "animated_clips": len(names),
        "mandatory_clips_passed": len(REQUIRED_CLIPS),
        "material_count": len(materials),
        "human_art_quality_approved": False,
        "redistribution_rights_confirmed": False,
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    parser.add_argument("--report")
    args = parser.parse_args()
    try:
        scene, digest, byte_count = load_glb(args.glb)
        report = audit_glb(scene)
        report["sha256"] = digest
        report["file_bytes"] = byte_count
        if args.report:
            Path(args.report).write_text(json.dumps(report, sort_keys=True, indent=2), encoding="utf-8")
        print(json.dumps(report, sort_keys=True))
    except GLBError as error:
        parser.exit(2, "SF_HUNTER_GLB_TECHNICAL_REJECTED: " + str(error) + "\n")

if __name__ == "__main__":
    main()

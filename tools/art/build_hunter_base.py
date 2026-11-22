"""Studio-only Blender/MPFB2 CC0 human-base builder for original art production.

Run *inside Blender with MPFB installed*; never bundle the MPFB GPL addon into
the Windows game. This writes an intentionally UNANIMATED rigged body preview,
not an approved hunter. Artists must supply bespoke animations, hair/clothing,
faces, weapons and material refinement before any runtime use.
"""
from __future__ import annotations

import hashlib
import importlib
import json
import sys
from pathlib import Path

# Work as Blender --background --python script.py -- preset.json output-dir.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from hunter_preset import read_preset, PresetError


def _mpfb_service(module_suffix: str, symbol: str):
    # Blender extension package prefixes are dynamic. Resolve the already
    # enabled MPFB namespace using the upstream documented public service API.
    for candidate in list(sys.modules):
        if candidate.endswith("mpfb.services." + module_suffix) or candidate.endswith("mpfb.entities." + module_suffix):
            module = importlib.import_module(candidate)
            if hasattr(module, symbol):
                return getattr(module, symbol)
    raise RuntimeError(
        f"MPFB service {symbol} not loaded. Install/enable MakeHuman for Blender "
        "2.0.18+, and configure its official CC0 makehuman_system_assets pack."
    )


def _required_asset(AssetService, asset_name: str, category: str, verified_root: Path) -> Path:
    resolved = AssetService.find_asset_absolute_path(asset_name, asset_subdir=category)
    if not resolved:
        raise RuntimeError(f"MPFB system asset missing: {category}/{asset_name}")
    path = Path(resolved).resolve()
    if not path.is_file() or not path.is_relative_to(verified_root):
        raise RuntimeError(f"Asset not under the explicitly audited CC0 root: {category}/{asset_name}")
    return path


def _all_hierarchy(root):
    # Unlike retrieving a Blender object by an unqualified global name, this
    # keeps only the freshly staged and audited human subtree.
    queue = [root]
    for node in queue:
        queue.extend(list(node.children))
    return queue


def build(preset_file: Path, target_directory: Path, cc0_root: Path):
    preset = read_preset(preset_file)
    if not cc0_root.is_dir():
        raise RuntimeError("The explicit, source-audited official MakeHuman system-assets root is missing")
    try:
        import bpy
    except ImportError as error:
        raise RuntimeError("Run this tool from Blender's Python, not system Python") from error

    HumanService = _mpfb_service("humanservice", "HumanService")
    AssetService = _mpfb_service("assetservice", "AssetService")
    ExportService = _mpfb_service("exportservice", "ExportService")
    ObjectService = _mpfb_service("objectservice", "ObjectService")
    HumanProperties = _mpfb_service("objectproperties", "HumanObjectProperties")
    TargetService = _mpfb_service("targetservice", "TargetService")

    target_directory.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    base = HumanService.create_human()
    base.name = "StudioHuman_" + preset["id"]
    for macro, fraction in preset["macros"].items():
        HumanProperties.set_value(macro, float(fraction), entity_reference=base)
    TargetService.reapply_macro_details(base)
    verified_assets = []

    def resolve(name, subdir):
        file = _required_asset(AssetService, name, subdir, cc0_root)
        verified_assets.append({
            "category": subdir,
            "name": name,
            "sha256": hashlib.sha256(file.read_bytes()).hexdigest(),
            "license": "CC0-1.0",
        })
        return str(file)

    skin = resolve(preset["skin"], "skins")
    HumanService.set_character_skin(skin, base, skin_type="GAMEENGINE")
    HumanService.add_builtin_rig(base, preset["rig"])
    types = {
        "eyes": "Eyes", "eyebrows": "Eyebrows", "eyelashes": "Eyelashes",
        "tongue": "Tongue", "teeth": "Teeth", "hair": "Hair"
    }
    for subdir, name in preset["parts"].items():
        HumanService.add_mhclo_asset(
            resolve(name, subdir), base, asset_type=types[subdir],
            material_type="GAMEENGINE",
        )
    for garment in preset["clothing"]:
        HumanService.add_mhclo_asset(
            resolve(garment, "clothes"), base,
            asset_type="Clothes", material_type="GAMEENGINE",
        )
    # Save editable source first. Do not bake away body/face controls in .blend.
    bpy.ops.wm.save_as_mainfile(filepath=str(target_directory / (preset["id"] + ".blend")))

    exported = ExportService.create_character_copy(base, name_suffix="_studio_export")
    export_base = ObjectService.find_object_of_type_amongst_nearest_relatives(exported, "Basemesh")
    if export_base is None:
        raise RuntimeError("The MPFB export copy did not contain a human base mesh")
    ExportService.bake_modifiers_remove_helpers(
        export_base, bake_masks=True, bake_subdiv=True, remove_helpers=True, also_proxy=True
    )
    selected = _all_hierarchy(exported)
    for item in bpy.context.selected_objects:
        item.select_set(False)
    for item in selected:
        item.select_set(True)
    bpy.context.view_layer.objects.active = exported

    binary = target_directory / (preset["id"] + "_UNANIMATED_STUDIO_BASE.glb")
    result = bpy.ops.export_scene.gltf(
        filepath=str(binary), export_format="GLB", use_selection=True,
        export_skins=True, export_animations=False, export_apply=False,
    )
    if "FINISHED" not in result or not binary.is_file():
        raise RuntimeError("Blender GLB export failed")
    exported_bones = sum(len(o.data.bones) for o in selected if o.type == "ARMATURE")
    exported_vertices = sum(len(o.data.vertices) for o in selected if o.type == "MESH")
    if exported_bones < 24 or exported_vertices < 3000:
        raise RuntimeError("Exported CC0 body has insufficient articulated geometry")

    manifest = {
        "schema": "sf-studio-human-artifact/1",
        "id": preset["id"],
        "status": "UNANIMATED_AND_NOT_APPROVED_FOR_RUNTIME",
        "rig": preset["rig"],
        "vertices": exported_vertices,
        "bones": exported_bones,
        "blender": bpy.app.version_string,
        "mpfb_code_license": "GPL-3.0-or-later (not bundled)",
        "base_asset_license": "CC0-1.0",
        "sources": verified_assets,
        "glb_file": binary.name,
        "glb_sha256": hashlib.sha256(binary.read_bytes()).hexdigest(),
        "user_data_collected": False,
    }
    out = target_directory / (preset["id"] + ".provenance.json")
    out.write_text(json.dumps(manifest, sort_keys=True, indent=2), encoding="utf-8")
    print("SF_MH_STUDIO_BASE_EXPORTED_UNANIMATED:", binary, exported_vertices, exported_bones)
    return binary


def main():
    try:
        args = sys.argv[sys.argv.index("--") + 1:]
        if len(args) != 3:
            raise PresetError("Usage: blender -b --python build_hunter_base.py -- <preset.json> <output> <audited-CC0-assets-root>")
        build(Path(args[0]), Path(args[1]), Path(args[2]).resolve())
    except (PresetError, RuntimeError, ValueError) as error:
        print("SF_MH_STUDIO_EXPORT_REJECTED:", error, file=sys.stderr)
        sys.exit(2)

if __name__ == "__main__":
    main()

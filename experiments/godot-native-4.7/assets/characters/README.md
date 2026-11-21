# Native original hunter rig import contract

**Source-only acceptance gateway; no finished hunter models are shipped.** This folder is deliberately empty of playable characters until original, professionally authored, legally redistributable high-detail GLBs are available.

Expected filename and scope: `veil.glb` for local Hunter 1 and `cinder.glb` for Hunter 2, each under `experiments/godot-native-4.7/assets/characters/`. The Godot scene mounts them automatically only after passing the structural and animation contract in `scripts/rig_socket.gd`. Do not substitute hidden geometry, low-poly primitives or unrelated WebP concept art and call them finished characters.

## Mandatory technical format

- GLB / glTF 2.0 `PackedScene`, root Node3D; at least one MeshInstance3D using a real Skin with at least 24 bind bones, one Skeleton3D with at least 24 bones, and a reachable AnimationPlayer.
- Twelve independently authored AnimationPlayer clips named exactly `idle`, `run`, `jump`, `crouch`, `guard`, `step`, `cut`, `hew`, `shot`, `stun`, `feint`, `guard_break`. A model that is static, missing attacks, or has no articulated skin is rejected. All clips must remain spatially coherent with the fixed orthographic 2.5D combat projection.
- Root origin at the fighter's feet. Face+weapon gestures should read in profile with weapon arcs matching transparent startup/active/recovery windows. Animation pose is driven from the authoritative 60Hz state age; the imported GLB **never** changes collision, parry, damage, server authority, or round clock.
- Ship self-contained verified original or appropriately licensed textures/materials and audio as applicable. No PS4 Bloodborne assets, Devil May Cry/Sekiro/Tekken/Umbral Core/Guilty Gear models or rip-derived motion. Licenses need explicit permission to redistribute inside the Windows package. User's private research Drive is not a rights grant.

## Production acceptance after technical import

An accepted GLB proves technical compatibility, **not** premium visual quality. Art review must separately check physically plausible silhouette and proportions, bespoke professional animation for light/heavy/firearm/feint/guard/step, cloth and hair, facial rigging and blinking, readable profile weapon grip, lore-compatible outfit and footwear, LOD/material/normal map consistency, re-lighting on the cathedral/moonlit scenes, shader cost and memory on low-to-high Windows GPUs.

Optional authored clips for later systems: `walk`, `land`, `reload`, `parry`, `counter`, `knockdown`, `victory`, `defeat`, `transform`, `emote`, `voice_breath`, and facial/eye animation. The deterministic combat kernel must gain corresponding real rules before new active-hit mechanics are advertised.

Current source acceptance test: `tests/verify_native_rig_contract.gd` constructs a test-only technical skeleton/mesh/animation set in memory; **no test primitive is bundled or rendered to players**. Full product art, source BLEND, glTF animation metadata and provenance will be required for commercial production.

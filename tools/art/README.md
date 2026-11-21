# Hunter character-production pipeline — editable free base, not release art

This is **studio tooling**, not a fake character creator UI or a completed fighter. The 2.5D native project has empty optional `veil.glb` and `cinder.glb` sockets. Until genuinely authored, fully licensed fighters are available, the sockets must remain empty rather than show crude primitives.

## Why MakeHuman for Blender (MPFB2)

[MPFB2 2.0.18](https://extensions.blender.org/add-ons/mpfb/) runs in Blender 4.2 LTS+ and is maintained by MakeHuman Community. It provides adjustable human body proportions, facial detail sources, skinned body and hair/eye/clothing art, and a game-engine-friendly rig. [Official license](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md) separates **GPLv3 application code** from **CC0 core art/output**. Third-party asset packs retain their own licenses. No GPL MPFB add-on is bundled in the standalone game.

Example preset `presets/veil_studio_base.json` is deliberately an editable basic human studio starting point: approved CC0 system assets, game-engine rig, skin, eyes, eyebrows, lashes, tongue, teeth, hair and a sample **casual suit**. That outfit is NOT final Gothic wardrobe and this output contains NO authored attack animations or weapon transforms.

## Studio reproduction

1. Install Blender 4.2 LTS or newer and MPFB 2.0.18. Install and audit the official `makehuman_system_assets` pack and set its path inside MPFB.
2. Modify `presets/veil_studio_base.json`: bounded macro properties `gender`, `age`, `muscle`, `weight`, `height`, `proportions` in [0,1]. Eye, skin, hair, face and clothing references must be verified actual `.mhclo` or `.mhmat` filenames under the **same** approved asset root.
3. Validate without Blender: `python3 tools/art/hunter_preset.py tools/art/presets/veil_studio_base.json`.
4. Generate with MPFB enabled inside Blender. Supply the explicit, independently audited official CC0 system-assets directory:

```sh
blender -b --python tools/art/build_hunter_base.py -- \
  tools/art/presets/veil_studio_base.json \
  artifacts/studio-human/veil_base \
  /absolute/path/to/audited/official_makehuman_system_assets_root
```

5. Review the editable `.blend`, `_UNANIMATED_STUDIO_BASE.glb`, and `.provenance.json` with SHA-256 per source file. The manifest deliberately does not store the local machine's private directory path. A GLB without authored combat clips must FAIL the native runtime's animation contract.
6. Author original premium Gothic coats, boots, hair cards and materials, weapons with two genuine mechanical forms, hand-IK, faces/eyes and expressions, bespoke startup-active-recovery attacks, trick transform attacks, aerial actions and parry responses. Retarget only legally usable motion and refine frame-by-frame for the side-on viewpoint. Evaluate PBR/skin quality and actual Windows GPU/VRAM cost.
7. Only after professional art review, rig deformation, complete animation protocol, GLB skin/clip QA and license review can it become `assets/characters/veil.glb` or `cinder.glb`. Current native runtime names refer to `seamless-side/1`; trick-lab v3 animations require their own explicit migration.

## Validation and legal boundaries

- Official sources: [MPFB scripting examples](https://github.com/makehumancommunity/mpfb2/tree/master/script_samples), [HumanObjectProperties](https://github.com/makehumancommunity/mpfb2/blob/master/docs/entities/objectproperties.md), [MakeHuman asset packs](https://static.makehumancommunity.org/assets/assetpacks.html).
- `test/python/test_hunter_preset.py` tests source configuration with Python standard library only. CI does **not** run Blender/MPFB or generate a game-ready GLB. MPFB licensing of core assets does not grant rights over unrelated third-party add-ons.
- A preset's license acknowledgement is not independent commercial legal clearance. Preserve pack version, source URLs, exact file hashes, creator rights and public redistribution permissions before public release.
- MPFB is a serious zero-cost human base and customization pipeline, not a shortcut to AAA-ready Gothic characters. No professionally authored finished fighter art, weapon animation, performance facial rigs or mastered voices are claimed.
- Production Windows builds must not bundle the Blender MPFB application, its GPL scripts, research game assets or unfinished body preview meshes.

## GLB preflight and legal animation-source selection

Once a fully **animated** and art-director-reviewed GLB exists, run `python3 tools/art/audit_glb.py path/to/hunter.glb --report artifacts/hunter-qa.json`. This pure-standard-library, file-size-bounded glTF2 structural scanner requires a real 24+ joint skin, 1,800+ skinned body vertices, embedded resources, at least one material, and all twelve 2+-keyframe skeletal clips. It will reject fake named-but-empty animations. It is a **technical metadata filter only**: it cannot judge visual beauty, deformation, animation quality or source-license clearance, and its report explicitly marks human art and redistribution as *not approved*. A real Godot import and GPU/animation review are still mandatory.

CC0 and permissively licensed motion **candidates** to review and retarget into original keyframe sequences; **none are imported or shipped here**:

- [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html): CC0, broad locomotion, attacks, gunplay and movements. Good technical starting point, not automatically polished for side-on Mournweave or Thornwake trick transformations.
- [KinemIQ free game animations](https://github.com/Kinemiq/free-game-animations): first free 35 are described as Quaternius-derived CC0 GLB/FBX. Its larger 460-pack mixes CC BY and other sources; preserve authors and each asset's required attribution. Do not blindly mark the entire library CC0.
- [Adobe Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): generally usable royalty-free in personal and commercial games, but original raw file redistribution restrictions apply. It is *not* CC0 and should not be uploaded to the public source repo unreviewed.
- [CMU Motion Capture Database](https://mocap.cs.cmu.edu/): official site explicitly states free for **research**. Do not treat that as blanket approval for distributing a commercial game.

Use [Godot's official humanoid retargeting workflow](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/retargeting_3d_skeletons.html) with compatible humanoid rest poses and SkeletonProfileHumanoid, then art-direct every active attack/recovery and test foot plants, weapon-hand IK, cloth and eyelines. Do not ship generic identical attack clips for two different weapons simply because the clips have the required filenames.

## Exact-frame two-form weapon animation shot list (research tool)

The current experimental `sf-trick-lab/3` ruleset can export the **actual frame data for both Mournweave and Thornwake** as a stable JSON production shot list:

```sh
node tools/art/export-trick-animation-brief.mjs > artifacts/trick-animations-v3.json
```

Create `artifacts/` first. The generator documents every authored move's startup/active/recovery, world-space reach and vertical hit envelope, initial/final form, deterministic form-switch age, and separate full-body/grip/foot/cloth QA flags. The 60 Hz combat simulation remains authoritative; imported 3D clips must align with these windows rather than control physics. `test/trick-animation-brief.test.mjs` checks completeness and timing across both original weapons. This export is **not** an animated GLB, does not make the present native runtime support trick-lab v3, and does not establish that a single premium hunter or transformation clip already exists. Real authored Blender rigs, animation QA, licenses, native visual integration and hardware testing are still required.

# Native PC production assets — source verification and licensing gate
**Reviewed 21 November 2026. Candidates are NOT bundled or automatically approved.**

A Windows-first Unreal/Godot 2.5D game can use higher quality offline character rigs, GPU shaders, textures, lighting, orchestral audio and recorded sound effects than the current browser prototype. That does not mean any collection of free assets automatically becomes a coherent production art direction. New sources below were checked against their **original publisher/license documentation**, not search snippets alone. Preserve **individual source name/version, acquisition date, license snapshot and file checksum** for every asset entering source control or distribution. This is a verified *source audit*, not a visual/technical acceptance claim.

## Environment and material shortlist

| Source | Proven rights/availability | High-value uses for Seamless Fight | Current import status |
| --- | --- | --- | --- |
| [Poly Haven](https://polyhaven.com/license) | **CC0** assets per publisher; no attribution required for textures, models, HDRIs. API/service usage can have separate terms. | Stone/tile floor material, aged masonry, metal patina, leather, candlelight HDRI, physically accurate indirect lighting and stage props. Requires deliberate Gothic art direction; raw PBR is not automatically compatible with painterly/cel characters. | Not imported |
| [ambientCG](https://docs.ambientcg.com/license/) | **CC0** by publisher; commercial usage and redistribution allowed. | High-resolution scanned PBR cobblestone, wet stone, carved old plaster, cloth/fabric micro-normal maps, leather, roughness, ambient occlusion; compress textures to shipping resolution and test VRAM. | Not imported |
| [Quixel Megascans via Fab](https://quixel.com/news/update-megascans-are-going-free-again) | Original publisher announced **5 November 2026**: full Megascans library returning to **free on Fab**. **Free acquisition is not the same as CC0**; each asset is governed by Fab terms (standard/license as provided on acquired listing), account access and redistribution restrictions. | Major high-fidelity source for photogrammetric arches, stones, rubble, roof tile, masonry, statues, plant/ivy, lighting consistency. Source ZIPs cannot be distributed as a generic asset pack. Do not treat UE import as automatically permitted in all other engines without checking license. | Not acquired or imported |

**Art direction note:** the actual game already has only one original painted Reliquary and **flat placeholder characters**, despite the improved stage. Material libraries should be used after producing a cohesive original character concept and shader palette, not as a pretext to add random detail.

## Character rigging, animation and facial systems

| Source | Rights and restrictions | Evaluation |
| --- | --- | --- |
| [Blender](https://www.blender.org/about/license/) | Free/open-source production software. Individual models, plugins and reference files still have their own licenses. | Primary authoring tool for original glTF/FBX humanoid rigs, high-resolution faces, coat cloth, weapon sockets, normal and emissive texture baking, authored squash/stretch and manual frame refinement. |
| [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Adobe states Mixamo is free with an Adobe ID and royalty-free in personal/commercial games. Check the current FAQ for raw file resale/redistribution and project/asset-pack restrictions. | Useful for generic locomotion base only; high-end action-game attacks, whip/saw weapons, guard feints, parries, hair/coat dynamics and precise hitbox silhouette must be hand-authored. Do not copy proprietary Guilty Gear or FromSoftware animation sets. |
| [OpenGameArt Dark Knight](https://opengameart.org/content/dark-knight-2d-character-sprites) | Published by author as CC0; separately inspected in GitHub actions. 37 separate PNG animation sheets and corresponding metadata (some Unity-specific). | **Rejected as final AAA-quality character art** after native-frame review. It is neither visually coherent with the illustrated cathedral nor an original high-resolution professional hunter. Source archive remains in private Drive QA, not bundled. |
| [Quaternius](https://quaternius.com/) | Many source packs advertised CC0; confirm the *specific pack/version* and actual license before import. | Useful rig/prototype motion studies, not guaranteed premium character detail or original Gothic design. |

**First playable production character acceptance:** two original high-resolution orthographic models with coherent head/face/eye/mouth articulation, cloth follow-through, hands connected to transformable weapons/pistols, fixed pivot and animation frame coverage for idle/walk/run/dash/jump/land/duck/guard/parry/feint/light/heavy/shot/hitstun/knockdown/victory. Require consistency across poses and author a visual grammar comparable in craftsmanship—not copied from—Guilty Gear Strive/Umbral Core. Never represent a generic downloaded model or one static generated splash image as final multi-animation playable art.

## Sound, Foley, voice and music

| Source | Publisher terms | Use and quality gate |
| --- | --- | --- |
| [Sonniss GDC Game Audio Bundle 2026](https://gdc.sonniss.com/) | Publisher advertises **7.47GB+** of free high-quality sound effects. **Special 2026 GDC audio license v2.0**, not CC0. Verify terms at [publisher's GDC bundle license](https://sonniss.com/gdc-bundle-license/), **27 August 2026** effective version; usage in published games allowed, but raw effects/libraries/sample packs redistribution restricted, as are AI/ML training uses. | Real Foley for sword metal contact, flesh impacts, cloth friction, wet cobblestone steps, gothic ambiance, firearms/locks, weather and stone. Download specific files under the original rules, choose licensed sub-assets, normalize loudness, vary samples and build a 3D/2D spatial mixing pipeline. Only processed embedded in-game sound banks, never a redistributed sound library. |
| [Kenney audio](https://kenney.nl/assets) | Individual CC0 Kenney asset packs as marked. | Current basic impact/walk layers already present in browser. Soundboard quality below target; keep as fallback rather than pretending to have professional mastering. |
| **Original voice / grunts / dialogue** | Needs properly released/licensed recordings, performer rights and correct consent for synthetic voices if any. | Record or commission dedicated multi-intensity combat exertions, pain, defeat and win reactions per character; do not sample actors' Bloodborne, Capcom, FromSoftware or Team Ninja dialogue. |
| **Music** | Prefer original authored and properly licensed scores; many "royalty-free" libraries prohibit raw redistribution or have separate soundtrack rules. | Compose distinct exploration ambience, duel intensity and boss-theme score with mastered stems and beat/transition metadata; crossfade music independently of gameplay tick and account for low-latency combat foley. |

## 2026 renderer and packaging gate

- Use a true native PC renderer with separate graphics paths. Godot 4.7 Forward+ is the current **verified Windows PE and headless launch**. Unreal Engine 5.8 is the **high-fidelity production evaluation candidate**, not an installed UE project. Source materials remain engine-neutral where licensing permits.
- Optimize textures (mipmapping, ASTC/BCn/KTX2), LODs, GPU instance budget and atlases. Validate actual 1080p/1440p/4K on representative RTX/AMD/Intel GPUs, hardware VSync/VRR, HDR/SDR, input-to-photon.
- Not installed: Nvidia DLSS4.5/5, Reflex, AMD FSR4.1.2/FG4.0.2, XeSS3 or native AntiLag2. Their *availability* is not a selectable feature. See [native architecture and vendor GPU matrix](NATIVE-WINDOWS-ARCHITECTURE.md).
- Native renderer should use local PC GPU; remote server should handle identity/queue/ratings/match state. A 2vCPU VPS is not an unlimited high-traffic relay or dedicated match simulation host.

## Required intake manifest per shipped asset

```json
{
  "id": "original-asset-identifier",
  "source_url": "https://publisher.example/individual-asset",
  "creator": "actual-creator-or-studio",
  "acquisition_date": "YYYY-MM-DD",
  "license_name": "exact asset license",
  "license_snapshot": "private-research/license-snapshot",
  "sha256": "actual-64-character-file-hash",
  "format": "glb | ktx2 | wav | ogg | webp",
  "art_review": "approved | rejected",
  "technical_review": "approved | rejected",
  "provenance_notes": "rights, raw-source restrictions and adaptation"
}
```

The template is **not a completed manifest**. Never fabricate provenance, SHA256, per-file licenses or user consent. Do not import or publish private Bloodborne/BBSC/website files solely because they were uploaded to Drive.

**Status:** no external Poly Haven/ambientCG/Megascans/Mixamo/Sonniss binaries imported in this pass. Research has identified credible professional source libraries; the original painterly Reliquary and prototype fighting core remain the only shipped new 2.5D components.

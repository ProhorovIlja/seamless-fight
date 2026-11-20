# References and asset credits

Shipped art: original procedural Canvas stages for Lantern Court, The Drowned Cistern and Ashen Reliquary, with two placeholder fighters. Shipped audio: original synthesized soundtrack, ambience and combat/exertion plus three separately documented Kenney CC0 Ogg foley layers. Lorc’s three CC BY 3.0 UI vectors are bundled; no proprietary game assets, third-party music, third-party fonts or voice recordings are bundled.

- [ws](https://github.com/websockets/ws) — MIT WebSocket runtime; dependency, not copied source.
- [GGPO](https://github.com/pond3r/ggpo) — MIT rollback reference; not integrated. Prototype uses server authority and interpolated snapshots. Measure attack responsiveness and fairness under asymmetric latency before choosing prediction/rollback rules.
- [Ansimuz GothicVania Cemetery](https://opengameart.org/content/gothicvania-cemetery-pack) and [GothicVania Town](https://ansimuz.itch.io/gothicvania-town) — free CC0 visual references, not bundled. These are side-view packs, so use compatible props or palette studies, not mismatched fighter silhouettes. Cemetery music has separate attribution terms; do not assume it is CC0.

Art direction: dusk courtyard, drowned cistern and the ash-brass Reliquary; distinct silhouettes, uncluttered active frames and one shared symmetric combat plane. Decorative architecture is baked once per stage. Any future stage, model, texture or font must have verified redistribution terms and keep telegraph contrast. No asset enters the game without an explicit license and source entry.

- [Client-side prediction and reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — reference for input sequencing and replay; no code copied.

## Lantern Court audio

The combat cues, round bell, score and ambient beds are original synthesis. Three optional, separately credited Kenney CC0 impact/step Ogg clips are bundled as layered foley; no recorded voices or proprietary soundtrack are included. [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) is the original source of those shipped optional clips. [MDN AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) informed use of a shared context and interactive latency hint; latency is not guaranteed. The separate combat and ambience controls preserve combat cues when the atmospheric layer is turned down. Online cues follow server snapshots, not local input prediction; the sound layer does not modify simulation timing.

## Presentation pass

Original code draws armor details, dodge streaks, impact sparks, HUD plates and arena reflections. Original synthesis supplies an arena-dependent score (drone and threat pulse) and two nonverbal exertion cues. No recorded dialogue or third-party tracks are bundled. Reduced effects suppress moving decoration and streaks. Palette and arena layering were compared with Riot’s [map environment guidance](https://playvalorant.com/en-us/news/dev/the-art-of-valorant-map-environments/).

Other candidates screened but not bundled: [Paul Wortmann’s Dark Cavern Ambient](https://opengameart.org/content/dark-cavern-ambient), [yd’s Dungeon Ambience](https://opengameart.org/content/dungeon-ambience) (each listed as CC0). See the upstream terms before importing any additional files. No runtime third-party asset requests.

- **crossed-swords** by Lorc, [upstream SVG](https://github.com/game-icons/icons/blob/master/lorc/crossed-swords.svg), upstream blob `38f2a8c74b206fc0285f470c1731e62aa0e310f2`. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Modified: removed the black square and recolored the path. Served locally.
- **lantern** by Lorc, [upstream SVG](https://github.com/game-icons/icons/blob/master/lorc/lantern.svg), upstream blob `7f68ddecb57e27fb2eb2f04e0c38145675c7a601`. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Modified: removed the black square and recolored the path. Served locally.

The duel stage floor now includes seeded, baked material weathering, and attack animations ease between key poses without changing the active hit window. CI captures both arena presentations and a narrow reduced-motion layout for visual review.

- **Visored Helm** by Lorc, [upstream SVG](https://github.com/game-icons/icons/blob/master/lorc/visored-helm.svg), upstream blob `acd470fcf4060f87f3aa779d2797499c4dd5da04`. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Recolored and black background removed; used as a locally served HUD emblem.

The score briefly ducks under hits, interruptions, pistol discharge, and round bells, independently of the player's saved music volume.

Combat foley uses three original precomputed takes for cut, heavy, quickstep, impact, interrupt and discharge. Metal resonance is more pronounced on interrupts; the pistol has a separate short crack layered into its synthesis. [Brian MacIntosh’s Metal Impact Sounds](https://opengameart.org/content/metal-impact-sounds) (CC0) was evaluated as a candidate but no sample was downloaded or bundled.

### Shared Seamless Hunt presentation

The site shell uses the ash, bone, and gold colors and the Garamond hierarchy inspected in the supplied website export. With `SITE_ART=1`, the duel references the host site's own blade, lantern, tricorn, divider and near skyline images plus its existing EB Garamond face. The export, font binaries, private uploads, co-op builds and production configuration are not copied into this repository. The existing Lorc icons remain as standalone fallbacks. HUD resource separation was compared with [Capcom's Battle HUD](https://game.capcom.com/manual/SF6/en/ps4/page/3/2); Kenney's CC0 Impact Sounds provides the three optional credited recorded foley layers.

The Lantern Court backdrop optionally reuses the website’s moon, far and near skylines, and fog in the non-playable top strip. Layering and corner rules follow the uploaded Seamless Hunt stylesheet. No site WebPs were vendored. Low-contrast stage dressing follows the readability principle discussed in Riot’s [map environment notes](https://playvalorant.com/en-us/news/dev/the-art-of-valorant-map-environments/).

The optional shared-site HUD uses the website’s vial emblem and its bell/skull motifs on round and result plates. The standalone plates use a vector diamond. The short gold damage afterimage is presentation only and resets on seeks, rematches and round changes. Muting stops ambience, music and in-flight effects rather than leaving them running behind a zero gain.

The ghost workshop's import/export and analytics use original JavaScript and no third-party art or model weights. They follow the explicit opt-in and deletion practices visible in Tekken 8 Super Ghost Battle (Bandai Namco, https://tk8.tekken-official.jp/en/mode/offline.php); this project does not use its models or player data.

Ambient loops now use a periodic two-pass noise filter and stay non-silent at the loop boundary; the source is fully synthesized. Exertion uses three deterministic generated takes for each voice range, with no third-party samples or impersonations. Both variants are generated when audio is enabled, not in the render loop.

### Kenney Impact Sounds (selected optional layers)

Source: [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds) · author Kenney · license Creative Commons Zero 1.0 (CC0-1.0). The [original pack's license](https://creativecommons.org/publicdomain/zero/1.0/) permits redistribution and modification. Downloaded exact Ogg files from the independently indexed [GeorgeQLe/assets-sfx-combat](https://github.com/GeorgeQLe/assets-sfx-combat) mirror, whose manifest records the Kenney source and CC0 for each file. These assets remain unmodified. Git blob SHA-1 is listed for source verification.

- `public/audio/impactMetal_light_000.ogg` — `assets/kenney/impact-sounds/Audio/impactMetal_light_000.ogg` — Git SHA-1 `7d49262cc9f69eb517cf644f61940ace16714f22`. Low-level hit layer.
- `public/audio/impactMetal_heavy_000.ogg` — `assets/kenney/impact-sounds/Audio/impactMetal_heavy_000.ogg` — Git SHA-1 `d4432f48b6ff5b4a501045ef0b8068963ef5530d`. Interrupt impact layer.
- `public/audio/footstep_concrete_000.ogg` — `assets/kenney/impact-sounds/Audio/footstep_concrete_000.ogg` — Git SHA-1 `163cc56468f1734fe694351e7ff984699afa8b86`. Quickstep layer.

Audio is decoded on demand after an explicit click to enable sound, mixed at a low fixed gain *in addition to* the procedural sample bank, and never requested from third-party servers at runtime. If the browser does not support Ogg decoding or an asset fails, the generated effect remains available. The source Bloodborne/Yharnam game audio was not used.

### Ashen Reliquary and training geometry

The Ashen Reliquary is original procedural Canvas geometry in `public/arenas.mjs`; it loads no external textures or copyrighted game meshes. Its eight-second atmospheric loop and pitched score variant are generated by `public/score.mjs` and use no additional sound samples. Both remain cosmetic/presentational and use the same engine bounds, attacks and moves as the other arenas. The optional offline training overlay in `public/training-geometry.mjs` draws exact attack cones and collision-center markers from engine move definitions, and never modifies combat or uploads player inputs. The site's verified `seamlesshunt/art` export in private Google Drive contains all 11 currently referenced WebP site-theme ornaments; those assets are only referenced at their same-origin paths, not copied into this public repository. The independent Lorc vectors and synthesized ambience remain functional without those paths.

# References and asset credits

Shipped art: procedural Canvas render code for original Lantern Court and the two placeholder fighters. Shipped hit audio: procedural Web Audio. Lorc’s three credited UI vectors are bundled; no external music, fonts, or proprietary game files are bundled.

- [ws](https://github.com/websockets/ws) — MIT WebSocket runtime; dependency, not copied source.
- [GGPO](https://github.com/pond3r/ggpo) — MIT rollback reference; not integrated. Prototype uses server authority and interpolated snapshots. Measure attack responsiveness and fairness under asymmetric latency before choosing prediction/rollback rules.
- [Ansimuz GothicVania Cemetery](https://opengameart.org/content/gothicvania-cemetery-pack) and [GothicVania Town](https://ansimuz.itch.io/gothicvania-town) — free CC0 visual references, not bundled. These are side-view packs, so use compatible props or palette studies, not mismatched fighter silhouettes. Cemetery music has separate attribution terms; do not assume it is CC0.

Art direction: dusk courtyard, warm lanterns and cold stone, distinct silhouettes, uncluttered active hit frames. Candidate next arenas are a flooded cloister and an iron bellhouse; retain one symmetric hit-testable arena until combat measurements pass. No asset enters the game without an explicit license and source entry.

- [Client-side prediction and reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — reference for input sequencing and replay; no code copied.

## Lantern Court audio

The shipped combat cues, round bell and arena bed are original synthesis. No third-party samples or recorded voices are bundled; the original score and exertion cues are synthesized locally. [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) is a verified CC0 foley candidate for listening comparisons, not an imported dependency. [MDN AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) informed use of a shared context and interactive latency hint; latency is not guaranteed. The separate combat and ambience controls preserve combat cues when the atmospheric layer is turned down. Online cues follow server snapshots, not local input prediction; the sound layer does not modify simulation timing.

## Presentation pass

Original code draws armor details, dodge streaks, impact sparks, HUD plates and arena reflections. Original synthesis supplies an arena-dependent score (drone and threat pulse) and two nonverbal exertion cues. No recorded dialogue or third-party tracks are bundled. Reduced effects suppress moving decoration and streaks. Palette and arena layering were compared with Riot’s [map environment guidance](https://playvalorant.com/en-us/news/dev/the-art-of-valorant-map-environments/).

Candidates screened but not bundled: [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds), [Paul Wortmann’s Dark Cavern Ambient](https://opengameart.org/content/dark-cavern-ambient), [yd’s Dungeon Ambience](https://opengameart.org/content/dungeon-ambience) (each listed as CC0). See the upstream terms before importing any additional files. No runtime third-party asset requests.

- **crossed-swords** by Lorc, [upstream SVG](https://github.com/game-icons/icons/blob/master/lorc/crossed-swords.svg), upstream blob `38f2a8c74b206fc0285f470c1731e62aa0e310f2`. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Modified: removed the black square and recolored the path. Served locally.
- **lantern** by Lorc, [upstream SVG](https://github.com/game-icons/icons/blob/master/lorc/lantern.svg), upstream blob `7f68ddecb57e27fb2eb2f04e0c38145675c7a601`. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Modified: removed the black square and recolored the path. Served locally.

The duel stage floor now includes seeded, baked material weathering, and attack animations ease between key poses without changing the active hit window. CI captures both arena presentations and a narrow reduced-motion layout for visual review.

- **Visored Helm** by Lorc, [upstream SVG](https://github.com/game-icons/icons/blob/master/lorc/visored-helm.svg), upstream blob `acd470fcf4060f87f3aa779d2797499c4dd5da04`. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Recolored and black background removed; used as a locally served HUD emblem.

The score briefly ducks under hits, interruptions, pistol discharge, and round bells, independently of the player's saved music volume.

Combat foley uses three original precomputed takes for cut, heavy, quickstep, impact, interrupt and discharge. Metal resonance is more pronounced on interrupts; the pistol has a separate short crack layered into its synthesis. [Brian MacIntosh’s Metal Impact Sounds](https://opengameart.org/content/metal-impact-sounds) (CC0) was evaluated as a candidate but no sample was downloaded or bundled.

### Shared Seamless Hunt presentation

The site shell uses the ash, bone, and gold colors and the Garamond hierarchy inspected in the supplied website export. With `SITE_ART=1`, the duel references the host site's own blade, lantern, tricorn, divider and near skyline images plus its existing EB Garamond face. The export, font binaries, private uploads, co-op builds and production configuration are not copied into this repository. The existing Lorc icons remain as standalone fallbacks. HUD resource separation was compared with [Capcom's Battle HUD](https://game.capcom.com/manual/SF6/en/ps4/page/3/2); Kenney's CC0 Impact Sounds remains a foley candidate, not bundled.

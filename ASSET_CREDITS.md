# References and asset credits

Shipped art: procedural Canvas render code for original Lantern Court and the two placeholder fighters. Shipped hit audio: procedural Web Audio. No external game art, music, fonts, or proprietary game files are bundled.

- [ws](https://github.com/websockets/ws) — MIT WebSocket runtime; dependency, not copied source.
- [GGPO](https://github.com/pond3r/ggpo) — MIT rollback reference; not integrated. Prototype uses server authority and interpolated snapshots. Measure attack responsiveness and fairness under asymmetric latency before choosing prediction/rollback rules.
- [Ansimuz GothicVania Cemetery](https://opengameart.org/content/gothicvania-cemetery-pack) and [GothicVania Town](https://ansimuz.itch.io/gothicvania-town) — free CC0 visual references, not bundled. These are side-view packs, so use compatible props or palette studies, not mismatched fighter silhouettes. Cemetery music has separate attribution terms; do not assume it is CC0.

Art direction: dusk courtyard, warm lanterns and cold stone, distinct silhouettes, uncluttered active hit frames. Candidate next arenas are a flooded cloister and an iron bellhouse; retain one symmetric hit-testable arena until combat measurements pass. No asset enters the game without an explicit license and source entry.

- [Client-side prediction and reconciliation](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) — reference for input sequencing and replay; no code copied.

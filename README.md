# Seamless Fight

Lantern Court is the first playable slice of a standalone, original gothic 2D browser dueling game for Seamless Hunt. It does not use Bloodborne assets, executable files, or accounts.

## Run
Use Node.js 22+. Run `npm install`, `npm test`, then `npm start`. Open `http://127.0.0.1:8080/fight/`. Choose Practice or create an online room and open its invite in a second tab or browser. Local development accepts the matching HTTP origin; for HTTPS set PUBLIC_ORIGIN to the exact browser origin.

WASD or arrow keys move, J cuts, K hews, L fires, I feints a heavy during startup, and Space quicksteps. Practice offers a sparring partner, an evasion drill and a stationary target; the field guide shows timing data from the shared move definitions. First to two rounds wins. Each round resets stamina, health, and three pistol shots. Light attacks punish misses; heavy attacks trade slower startup for reach and damage. The pistol interrupts melee windups. Quickstep has a short invulnerability window, not immunity through recovery. Round draws award neither player a point.

## Architecture and scope
Shared fixed-step ES modules and Canvas 2D keep the browser slice small; the Node server owns online simulation and accepts inputs rather than positions or damage. The server simulates at 60 Hz and sends snapshots at 20 Hz; the opponent renders from interpolated snapshots. Local free movement is predicted with bounded replay of unacknowledged inputs; attack outcomes, close-contact movement, and committed actions remain authoritative. No combat rollback. In-memory invite rooms are limited to two players, with mutual rematch and disconnect handling. They do not persist across restarts. The browser slice targets keyboard and desktop; no touch, ranked play or multi-region service yet.

See [deployment](docs/DEPLOY.md) and [references and asset credits](ASSET_CREDITS.md). The prototype visuals are procedural original art, not final sprite animation.

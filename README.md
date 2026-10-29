# Potato Club

A browser-local potato merge game, built with the user's eleven transparent PNG characters. Static HTML, CSS, Canvas 2D and Matter.js 0.20.0; no build step or runtime service dependencies.

Run `node serve.mjs` and open `http://127.0.0.1:4173`.

Mouse: move to aim, click to drop. Touch: drag and release. Keyboard: arrows aim, Enter drops, A/D tilt, Space shakes, P pauses. Progress and personal best are saved in this browser's localStorage. Fresh start preserves best score and discovered characters.

The game includes eleven merge tiers, chain score multipliers, Soft & Jiggly / Extra Bouncy physics, a rechargeable shake, an overflow grace period, an end screen, an ultimate-potato celebration, sound synthesis, responsive layout, and reduced-motion support.

Characters render as the original transparent PNGs, without circular backplates or round colliders. `scripts/build-shapes.cjs` reads the PNG alpha, traces the main connected silhouette and its transparent holes, simplifies the contour, triangulates with Earcut, and combines convex pieces into compound Matter.js bodies. Detached tear droplets and tiny alpha specks stay decorative. The outlines approximate the pixels for stable, efficient collision detection. Run `node scripts/build-shapes.cjs` after replacing artwork.

Impacts drive a damped squash-and-stretch spring. The collider and sprite use the same area-preserving deformation so their contacts stay aligned. This is a springy deforming silhouette, not a full cloth or fluid simulation. Reduced-motion mode disables deformation. Existing version-1 saves, high scores and collection progress remain compatible.

Run `node tests/physics.test.cjs` to check merges, silhouette bounds, transparent holes, landing jiggle, bounce modes, cooldowns, pauses, shake cost, overflow, and persistence. Matter.js is vendored in `dist/assets/matter.min.js` with its MIT license header intact. Earcut is used only by the offline shape builder; its ISC license is in `scripts/lib/EARCUT-LICENSE.txt`.

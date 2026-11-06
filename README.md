# Potato Club

A desktop and mobile potato merge game, built with eleven transparent PNG characters. Static HTML, CSS, Canvas 2D and Matter.js 0.20.0; no build step or runtime service dependencies.

On Windows, double-click **Start Potato Club.cmd**. It starts the game and opens your browser. Keep its terminal window open while playing; close it or press Ctrl+C to stop. Node.js 18 or newer is required; no package installation or build is needed.

Alternatively, run `node serve.mjs` and open `http://127.0.0.1:4173/`. The server only listens on this computer. All game code and artwork are included locally, so playing needs no internet connection. The same `dist/` files are the finished production game.

Mouse: move to aim, click to drop. Keyboard: arrows aim, Enter drops, A/D tilt, Space shakes, P pauses. Progress and personal best are saved in this browser's localStorage. Fresh start preserves best score and discovered characters.

The game includes eleven merge tiers, chain score multipliers, one combined soft, jiggly and bouncy physics setting, a rechargeable shake, an overflow grace period, an end screen, an ultimate-potato celebration, louder synthesized sound with a peak compressor, and reduced-motion support.

On a phone, tap **Motion → Enable phone tilt** and allow motion access if prompted. Hold the phone comfortably during setup, then lean left or right to tilt the playfield. Motion uses a small dead zone and smoothing, works in either orientation, and pauses with the game. Open Motion again to recenter or turn it off; the tilt arrows remain available. Sensor control requires a supported browser on HTTPS (or localhost), and is enabled separately for each visit. Run `node --test tests/motion.test.cjs` to check sensor calibration, orientation changes, smoothing, permissions, cancellation, and missing readings.

On phones, play upright for a full-screen portrait layout with the score and next potato above the board, tilt and shake below it, and a Meet the spuds button for the complete collection. Drag across the board to aim and lift your finger to drop. The game fits the available browser height. Opening a collection or help panel pauses the round, and closing it restores its previous pause state. Landscape and desktop layouts are also available.

Characters render as the original transparent PNGs, without circular backplates or round colliders. `scripts/build-shapes.cjs` reads the PNG alpha, traces the main connected silhouette and its transparent holes, simplifies the contour, triangulates with Earcut, and combines convex pieces into compound Matter.js bodies. Detached tear droplets and tiny alpha specks stay decorative. The outlines approximate the pixels for stable, efficient collision detection. Run `node scripts/build-shapes.cjs` after replacing artwork.

Impacts drive a damped squash-and-stretch spring, with a gentle rebound and a soft jelly-like wobble. The collider and sprite use the same area-preserving deformation so their contacts stay aligned. This is a springy deforming silhouette, not a full cloth or fluid simulation. Reduced-motion mode disables deformation. Existing version-1 saves, high scores and collection progress remain compatible.

Run `node tests/physics.test.cjs` to check merges, silhouette bounds, transparent holes, landing jiggle, rebound, cooldowns, pauses, shake cost, overflow, and persistence. Matter.js is vendored in `dist/assets/matter.min.js` with its MIT license header intact. Earcut is used only by the offline shape builder; its ISC license is in `scripts/lib/EARCUT-LICENSE.txt`.

Browser saves belong to the address where you play. Progress from a previous hosted address does not automatically transfer to the local address. Always use `http://127.0.0.1:4173/` and the same browser profile to keep your local progress.

This repository has no cloud hosting configuration. To host elsewhere in the future, serve the contents of `dist/` as a static website. There is no online leaderboard or backend.

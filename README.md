# Potato Club

A browser-local potato merge game, built with the user's eleven transparent PNG characters. Static HTML, CSS, Canvas 2D and Matter.js 0.20.0; no build step or runtime service dependencies.

Run `node serve.mjs` and open `http://127.0.0.1:4173`.

Mouse: move to aim, click to drop. Touch: drag and release. Keyboard: arrows aim, Enter drops, A/D tilt, Space shakes, P pauses. Progress and personal best are saved in this browser's localStorage. Fresh start preserves best score and discovered characters.

The game includes eleven merge tiers, chain score multipliers, Classic/Bouncy physics, a rechargeable shake, an overflow grace period, an end screen, an ultimate-potato celebration, sound synthesis, responsive layout, and reduced-motion support.

Run `node tests/physics.test.cjs` to check merges, distinct tiers, cooldowns, pauses, shake cost, overflow, and persistence. Matter.js is vendored in `dist/assets/matter.min.js` with its MIT license header intact.

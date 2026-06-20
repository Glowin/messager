# AGENTS.md

Browser game: a Messenger (Abeto) clone — single-player, spherical-planet delivery game. Vite + TypeScript + Three.js (cel-shaded low-poly). No framework shell, no tests.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run build` — `tsc && vite build` (typecheck **then** bundle; both must pass)
- `npm run preview` — serve built `dist/`
- No test/lint/format scripts. Verify with: `npx tsc --noEmit`, `npm run build`, then hands-on Playwright QA.

## Verification quirks (easy to get wrong)

- `tsx` is **not** a project dependency. Use `npx tsx -e "..."` for one-off checks; do **not** add tsx to `package.json`.
- `npx tsx` cannot parse CSS imports. `src/ui/dialogue.ts` imports `dialogue.css` — in tsx contexts use a dynamic `import('./ui/dialogue')`, or the module must inject styles via JS. Several modules use JS-injected `<style>` for this reason.
- `window.__game` (DEV only, see below) is the primary hook for Playwright state assertions — prefer `page.evaluate(() => window.__game.*)` over visual checks for logic correctness.

## Architecture

`src/main.ts` wires all modules together — it is the only integration point. Read it first to understand execution flow.

- Render loop uses **OutlineEffect**: `effect.render(scene, camera)`, NOT `renderer.render()`. OutlineEffect wraps the renderer; calling `renderer.render` directly loses all outlines.
- Game state machine lives in `src/intro.ts`: `title` → `intro` → `playing`. The player is disabled (`player.setEnabled(false)`) until the opening dialogue completes; the main loop only simulates when `intro.getState() === 'playing' && !hud.isPaused`.
- Module map: `world.ts` (planet + gravity helpers), `gravity.ts` (radial jump physics), `player.ts` (spherical movement), `camera.ts` (third-person follow), `cel-material.ts` (toon + outline), `character.ts` (primitive humanoid + animation), `npc.ts`, `quest.ts` (state machine), `interaction.ts` (E key → dialogue → quest), `regions.ts` (3 scenery zones), `ui/dialogue.ts`, `ui/hud.ts`, `intro.ts`, `audio.ts`, `debug-api.ts`, `data/quests.ts` + `data/npcs.ts` (content), `types.ts`.

## Three.js r0.161 gotchas (verified, non-obvious)

- **`getWorldDirection()` returns +Z** (local +Z axis), NOT -Z. This contradicts older docs/versions. Movement and camera code rely on this — check `src/player.ts` and `src/camera.ts` before "fixing" signs.
- **`flatShading` on `MeshToonMaterial`**: must be set AFTER construction (`material.flatShading = true`). Passing it in the constructor params is silently dropped. `@types/three@0.161` omits the field, so a narrow cast is needed: `(material as THREE.MeshToonMaterial & { flatShading: boolean }).flatShading = true`.
- Toon shader samples only the `.r` channel of the gradientMap → use grayscale bands (R=G=B), not colored ones.
- `NearestFilter === 1003` (not 1004). Always compare against `THREE.NearestFilter`, never a literal.

## Spherical-world constraints (critical — breaking these breaks the game)

These are guardrails verified by research; do not violate them without explicit reason:

- **Planet geometry**: `IcosahedronGeometry(radius, detail)`. Never `SphereGeometry` (pole pinching corrupts textures + movement).
- **Runtime orientation**: incremental `rotateOnAxis` + `quaternion.premultiply` ONLY. Never `setFromUnitVectors(up, normal)` at runtime — it causes south-pole lockup (Hairy Ball theorem). One-time static setup (e.g. placing NPCs/scenery) is fine.
- **Never `rotation.set()` Euler** for character orientation (gimbal lock). Limb animation via single-axis `rotation.x =` is OK (not orientation).
- **Camera up**: `camera.up.copy(surfaceNormal)` every frame. A fixed world-up flips at the poles.
- **Forward movement**: rotate BOTH `position.applyQuaternion(q)` AND `quaternion.premultiply(q)` around the `cross(up, forward)` axis — `rotateOnAxis` alone only changes orientation, not position. The rotation angle must be **positive** for forward (W): since `getWorldDirection()` returns +Z (the facing direction), `cross(up, forward)` yields the right axis and a positive angle moves along the facing direction. A negative angle moves backward (this was a real bug — W went backward until the sign was corrected).

## Non-negotiable renderer setting

`WebGLRenderer({ preserveDrawingBuffer: true })` — required for Playwright screenshot QA; removing it makes all visual QA return blank. Do not remove even if a linter suggests it.

## Debug API

`src/debug-api.ts` exposes `window.__game` (getters: `getPlayer/getCamera/getScene/getQuests`, actions: `teleport/completeQuest/pause/resume`, plus `isReady`/`fps`). Guarded by `if (!import.meta.env.DEV) return` — tree-shaken from PROD builds. `tickFps()` must be called each frame from the render loop. The HUD's pause has no public method, so `pause()`/`resume()` toggle it via `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))`.

## QA / verification workflow

No unit tests — verification is layered:

1. **Module logic** (fast, no browser): `npx tsx -e "import {fn} from './src/X'; ..."` — check return values, data shapes, math. Modules importing `.css` need a dynamic `import()`.
2. **Runtime state** (Playwright + `window.__game`): `page.evaluate(() => window.__game.getPlayer().position)`, `getQuests()`, etc. Prefer this over visual checks for logic correctness.
3. **Visual** (Playwright screenshot + a vision-capable model): confirm "renders non-blank", cel bands visible, character/HUD present. `preserveDrawingBuffer:true` is required for screenshots to be non-blank.

**Pole safety** (highest-risk edge case): `window.__game.teleport(0,-25,0)` (south pole) → check `getPlayer().up` has no NaN and the player still moves; for the camera, verify `getCamera().up · surfaceNormal > 0.95` at north pole, south pole, and 3 equator points. Wait ~300ms after `teleport()` for the main loop to update before reading state (reading immediately returns stale values).

## Audio

Howler. Browser AudioContext starts `suspended` — `AudioManager.resume()` must be called from a user gesture (the Begin button click in `intro.ts`). Howler has no `muted()` getter; use `AudioManager.isMuted()`.

## TypeScript config notes

- `isolatedModules: true` → use `import type` for type-only imports.
- `noEmit: true` (Vite handles emit) + `allowImportingTsExtensions: true`.
- `strict`, `noUnusedLocals`, `noUnusedParameters` all on — no unused vars allowed.

## Repo layout

- `src/` — all game code (entry: `main.ts`).
- `public/audio/` — CC0 placeholder audio (bgm + sfx); replace with real CC0 assets from freesound etc.
- `.omo/` — OpenCode orchestration state (plans, notepads, evidence, boulder/sessions). Not part of the game; transient parts are gitignored. `learnings.md` under `.omo/notepads/messenger-clone/` has detailed per-task context worth reading before non-trivial changes.

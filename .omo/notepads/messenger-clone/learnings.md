# Task 1 Learnings — Project Scaffold + Vite/TS/Three.js + Renderer

## Environment / Versions (installed)
- three@0.161.0
- @types/three@0.161.2
- vite@5.4.21
- typescript@5.9.3
- Node packages: 17 total (three + vite + typescript + deps)

## Key Decisions
- **WebGLRenderer (NOT WebGPU)** — required because downstream OutlineEffect only supports WebGL (Metis research).
- **`preserveDrawingBuffer: true`** — G17 hard prerequisite for Playwright screenshot QA. Verified via `gl.getContextAttributes().preserveDrawingBuffer === true` in browser. DO NOT remove in any future task.
- `antialias: true` also set.
- Scene background set to `0x87ceeb` (sky blue) so the empty scene renders non-black — useful as a smoke-test visual signal.

## Config Notes
- `tsconfig.json`: `moduleResolution: "bundler"`, `target: ES2020`, `strict: true`, `noEmit: true` (Vite handles emit). `allowImportingTsExtensions: true` requires `noEmit`.
- `tsconfig.node.json`: `composite: true` for the vite.config.ts project reference.
- `package.json`: `"type": "module"` + scripts `dev`/`build`/`preview`. Build = `tsc && vite build` (type-check then bundle).
- `vite.config.ts`: default config is sufficient — no special plugins needed for vanilla Three.js.

## Renderer Setup Pattern (src/main.ts)
- Canvas selected via `document.querySelector<HTMLCanvasElement>('#app canvas')`.
- `renderer.setSize(innerWidth, innerHeight)` + `renderer.setPixelRatio(devicePixelRatio)`.
- `renderer.setAnimationLoop(animate)` for the render loop (preferred over requestAnimationFrame).
- Resize handler updates `camera.aspect` + `updateProjectionMatrix()` + `renderer.setSize()`.

## Scene Setup Pattern (src/scene.ts)
- `createScene()` returns `{ scene, camera }` — keeps scene construction out of main loop.
- HemisphereLight(sky 0x87ceeb, ground 0x556633, intensity 0.6) + DirectionalLight(0xfff5e1 warm white, intensity 1.0) at (20,40,30).
- PerspectiveCamera: fov 60, near 0.1, far 1000, position (0,30,40) lookAt origin.

## Verification Results
- `npm run build`: exit 0, produces `dist/index.html` + `dist/assets/index-*.js` (~457 KB, 116 KB gzip).
- `npm run dev`: starts on http://localhost:5173/ in ~87ms.
- Browser check: `preserveDrawingBuffer === true`, `antialias === true`.
- Screenshot: light blue background (non-black) — lighting renders correctly.
- Resize: canvas + drawing buffer update to new viewport size (verified 800x600 -> 1600x1200 buffer at 2x DPR).

## Gotchas
- `favicon.ico` 404 in console is harmless (no favicon added). Can ignore or add an empty favicon later.
- Non-empty directory (had `.omo/`, `.git/`, `.gitignore`) — could NOT use `npm create vite@latest .`; had to hand-write all config files. This is the correct approach for this repo.
- `.playwright-mcp/` dir is created by Playwright MCP — added to `.gitignore` as transient test artifact.

# Task 2 Learnings — Types & Data Model (quests/npcs)

## Files Added
- `src/types.ts` — pure interface definitions (QuestStep, Quest, QuestState, NPC, DialogueLine, Region). No runtime code.
- `src/data/quests.ts` — exports `quests: Quest[]` (5 delivery quests). Shared `COMPLETION_TEXT` constant.
- `src/data/npcs.ts` — exports `npcs: NPC[]` (5 NPCs). Each NPC links to its quest via `questId`.

## Key Decisions
- **Type-only imports**: data files use `import type { Quest } from '../types'` — required under `isolatedModules: true` so the import is erased at emit and doesn't leak a runtime dependency on a types-only module.
- **NPC positions on sphere radius ~25**: worker `[-18,17,0]` (24.76), kid `[0,25,0]` (25), dave `[25,0,0]` (25), doctor `[0,-18,17]` (24.76), caveman `[0,0,-25]` (25). All within 25-26 band, spread across 5 distinct surface points. Task 5 will use `IcosahedronGeometry(25,5)` so these sit right on the surface.
- **objectiveText is UPPERCASE** per original game convention; NPC dialogue lines are lowercase (matches source JS bundle).
- **completionText shared** across all 5 quests via a single `COMPLETION_TEXT` constant — keeps the data DRY without over-engineering.
- **Quest step variety**: quest_0 has 2 steps (goto + talk), the rest have 1 step each. All three step types (`talk`/`deliver`/`goto`) are represented across the quest set.
- **NPC `questId` back-reference**: each NPC points to the quest it gives (worker→quest_0, kid→quest_1, caveman→quest_2, doctor→quest_3, dave→quest_4). Enables O(1) lookup of an NPC's offered quest.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict mode, noUnusedLocals/Parameters all clean).
- Verification script (`npx tsx -e ...`): outputs `5 true 5 true` (5 quests each with ≥1 step, 5 NPCs each with ≥3 dialogue lines).
- Evidence saved to `.omo/evidence/task-2-data.txt`.
- `tsx@4.22.4` was auto-installed by npx (not a project dep) — fine for one-off verification scripts; do NOT add to package.json.

## Gotchas
- `tsx` is not a project dependency — `npx tsx` triggers a one-time install + npm warn. Harmless for verification; use `npx tsx -e` for inline scripts rather than adding tsx to devDependencies.
- Did NOT touch `src/main.ts` / `src/scene.ts` (Task 1 files) — G17 preserveDrawingBuffer lock preserved.
- `noUnusedLocals: true` is satisfied because data files only export — no local vars left dangling. The `COMPLETION_TEXT` const is used in all 5 quests.

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

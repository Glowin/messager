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

# Task 3 Learnings — Cel-Shading Material Module (src/cel-material.ts)

## Files Added
- `src/cel-material.ts` — exports `createGradientMap()`, `createToonMaterial(color)`, `createOutlineEffect(renderer)`. ~89 lines. No changes to main.ts/scene.ts (Wave 2 will integrate).

## Key Decisions
- **Gradient map = 3-pixel RGBAFormat DataTexture, grayscale bands** (0x40 / 0xa0 / 0xff). The toon fragment shader samples ONLY the `.r` channel (`vec3(texture2D(gradientMap, coord).r)` — confirmed in `gradientmap_pars_fragment.glsl.js`), so R carries the band brightness; G/B are equal (grayscale) for cleanliness. RGBAFormat chosen over RedFormat for robustness (matches official `webgl_materials_toon` example pattern).
- **NearestFilter for BOTH mag AND min** (CRITICAL). LinearFilter would interpolate between bands → smooth gradient → no cel banding. Also set `generateMipmaps = false` (1D 3px texture, mipmaps meaningless).
- **flatShading set AFTER construction, NOT in constructor params** — see Gotchas below. This was the single biggest subtlety of the task.
- **No alphaTest on toon materials** — conflicts with OutlineEffect's outline pass (documented in JSDoc).
- **OutlineEffect imported from `'three/examples/jsm/effects/OutlineEffect.js'`** — the `.js` extension is required under `moduleResolution: bundler` + `isolatedModules`. Types resolve via `@types/three/examples/jsm/effects/OutlineEffect.d.ts` automatically.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `lsp_diagnostics` on cel-material.ts: no diagnostics.
- Runtime (`npx tsx -e`): `type=MeshToonMaterial`, `magFilter=1003`, `minFilter=1003`, `flatShading=true`, `gradientMap_is_DataTexture=true`, `width=3 height=1 format=1023(RGBAFormat)`.
- `createOutlineEffect` import resolves; arity=1 (renderer). Full runtime test deferred (needs WebGL context — Node tsx can't create WebGLRenderer); type-correctness covered by tsc.
- Evidence: `.omo/evidence/task-3-filter.txt`.

## Gotchas
- **flatShading constructor-param trap (CRITICAL)**: `Material.setValues()` (Material.js L130-137) SKIPS any key whose `this[key]` is `undefined` (warns "'X' is not a property of THREE.MeshToonMaterial" and continues). The `Material` constructor NEVER initialises `this.flatShading` (only referenced in `toJSON` L379). So passing `flatShading: true` in the `MeshToonMaterial` constructor params is SILENTLY DROPPED — flatShading stays undefined, no FLAT_SHADED define emitted, no flat normals. **Fix**: construct first, then `material.flatShading = true` as a direct property assignment. Works because the shader program compiles lazily on first render, at which point `WebGLPrograms.js` (L302 `flatShading: material.flatShading === true`, L525 `if (parameters.flatShading)`) reads the assigned value and emits the define. No `needsUpdate` needed for a fresh (never-rendered) material.
- **@types/three@0.161 type gap**: `flatShading` is declared in `MeshPhongMaterialParameters` / `MeshStandardMaterialParameters` / `MeshLambertMaterialParameters` / `MeshNormalMaterialParameters` / `MeshMatcapMaterialParameters` but NOT in `MeshToonMaterialParameters` (which `extends MaterialParameters`), and NOT in `Material.d.ts` at all. So `material.flatShading = true` is a TS error. **Fix**: narrow cast `(material as THREE.MeshToonMaterial & { flatShading: boolean }).flatShading = true`. Runtime fully supports it (see above); purely a type-definition omission.
- **NearestFilter value is 1003, NOT 1004** (task spec had a typo). In three@0.161 `constants.js`: `NearestFilter = 1003`, `NearestMipmapNearestFilter = 1004`, `LinearFilter = 1006`. The correct verification criterion is `magFilter === THREE.NearestFilter` (1003===1003 ✓), not the literal 1004.
- **Toon shader only uses .r channel** — so a 3-color gradient map with distinct RGB colors would NOT produce 3 distinct toon bands; only the R channel matters. Grayscale bands (R=G=B) are the correct way to get 3 brightness steps. This is why the task's "暗 0x404040 / 中 0xa0a0a0 / 亮 0xffffff" (grayscale) spec is right.
- **OutlineEffect is WebGL-only** — confirmed; project uses WebGLRenderer (G17 preserveDrawingBuffer lock preserved, main.ts untouched).
- **tsx is not a project dep** (same as Task 2) — `npx tsx -e` triggers one-time install; harmless for verification, do NOT add to package.json.

# Task 4 Learnings — Audio System (src/audio.ts + Howler)

## Files Added
- `src/audio.ts` — AudioManager singleton (~110 lines). Exports `AudioManager` instance + `SfxName` type.
- `public/audio/bgm.mp3` + `public/audio/sfx/{jump,footstep,quest-complete,dialogue}.mp3` — CC0 placeholders.
- `public/audio/README.md` — CC0 source doc + freesound replacement guidance.

## Dependencies Added
- `howler@2.2.4` (runtime dep)
- `@types/howler@2.2.12` (dev dep)
- `tsx` NOT added (used via `npx tsx -e` for verification only — one-time install, harmless).

## Key Decisions
- **Howler global has NO `muted()` getter** — only `mute(boolean): this` setter. The task spec's `Howler.muted() === true` verification is impossible as written. Fix: `AudioManager` tracks mute state internally in `this.muted` and exposes `isMuted()`. The `Howl` *instance* does have `mute(): boolean` getter, but the global `Howler` does not. This is a @types/howler `HowlerGlobal` interface fact.
- **Fault tolerance via onloaderror/onplayerror** — Howler swallows load/play errors via callbacks rather than throwing. Added empty-arrow-function handlers + outer try/catch as belt-and-suspenders. playBgm/playSfx never throw even when WebAudio is absent (verified in Node where `Howler.ctx === undefined`).
- **resume() guards on `ctx && ctx.state === 'suspended'`** — in Node there's no WebAudio ctx; in browser it starts 'suspended' until user gesture. `void ctx.resume().catch(()=>{})` handles rejection if context is closed.
- **bgm idempotent**: `playBgm()` no-ops if `this.bgm.playing()` is already true — prevents overlapping loops on repeated calls.
- **sfx lazy-cached**: `sfxCache: Map<SfxName, Howl>` — first playSfx(name) creates+loads the Howl, subsequent calls reuse it. Howler dedupes concurrent plays of the same Howl automatically.
- **Volumes**: bgm 0.4, sfx 0.6 (per spec). bgm `loop: true`, `html5: false` (WebAudio, not HTML5 Audio — better for games/low-latency sfx).
- **CC0 audio self-generated via ffmpeg** — `ffmpeg -f lavfi -i "sine=..."` synthesizes tones with no third-party sampling, so inherently CC0. README documents freesound CC0 replacement candidates for later polish.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `npm run build`: exit 0; dist/audio/* copied from public/ by Vite.
- `npx tsx -e` runtime: setMuted(true)→isMuted()=true; playBgm/playSfx/resume all no-throw in Node (no WebAudio).
- lsp_diagnostics on audio.ts: no diagnostics.

## Gotchas
- **TS6133 on write-only private fields**: initially added `private bgmLoaded = false` for tracking, but only ever *wrote* to it (never read) → `noUnusedLocals` flagged TS6133. Removed it — Howler tracks load state internally via onload/onloaderror, so a separate flag was redundant. Lesson: under strict + noUnusedLocals, every private field must be read somewhere.
- **`Howler.muted()` does not exist** — see Key Decisions. Don't trust task spec verification commands blindly; check the actual @types definitions.
- **Howler.ctx is undefined in Node** — Howler only creates the AudioContext lazily in a browser environment. Any code touching `Howler.ctx` must null-guard. This is why `resume()` uses `if (ctx && ctx.state === 'suspended')`.
- **Vite copies `public/` to `dist/` root** — so `public/audio/bgm.mp3` → `/audio/bgm.mp3` at runtime. Howl `src: ['/audio/bgm.mp3']` resolves correctly. No vite config change needed.
- **Did NOT touch main.ts/scene.ts** (G17 preserveDrawingBuffer lock preserved, Task 1 files untouched per task constraint).

# Task 5 Learnings — Spherical World + Gravity System (src/world.ts + src/gravity.ts)

## Files Added
- `src/world.ts` — exports `planetRadius`(=25), `planet` mesh (IcosahedronGeometry(25,5) + green toon), `snapToSurface(pos, height=0)`, `getSurfaceNormal(pos)`. ~75 lines.
- `src/gravity.ts` — exports `GRAVITY`(=9.8), `applyGravity(obj, velocity, dt, jumpVelocity?, height=0)`. ~70 lines.

## Key Decisions
- **IcosahedronGeometry(25, 5)** — NOT SphereGeometry (G18). Detail 5 gives smooth low-poly sphere; flat-shaded facets pair with toon material. Planet centred at origin → surface normal = normalize(position) everywhere (no per-face normal lookup needed).
- **snapToSurface mutates in place**: `pos.copy(pos.clone().normalize().multiplyScalar(planetRadius + height))`. The `.clone()` is essential — `normalize()` mutates, so without clone you'd normalize then scale the already-zeroed vector. Matches spec exactly.
- **getSurfaceNormal returns a fresh clone** (`pos.clone().normalize()`) — caller can mutate freely without affecting the source position. Does NOT orient any object (G19: orientation is Task 9's job via incremental `rotateOnAxis`).
- **applyGravity velocity decomposition**: radial = (v·n)·n, tangential = v − radial. Gravity only affects radial: `vRadial -= GRAVITY*dt`. Tangential preserved (for player, tangential ≈ 0 since movement is via rotateOnAxis in Task 9; for other objects, tangential velocity integration works too).
- **Landing guard uses `rs < 0` (falling) not `rs <= 0`**: only zero radial velocity when the object is actually falling inward. If `rs > 0` (jumping, still near ground), don't snap — let it rise. This prevents killing a jump on frame 0 when the object hasn't left the ground yet. Resting objects: gravity makes rs negative each frame → landing triggers → snap + zero. Works correctly.
- **jumpVelocity is OPTIONAL** (`jumpVelocity?: Vector3`): the EXPECTED OUTCOME spec says `applyGravity(obj, velocity, dt)` (3 params) while MUST DO says `applyGravity(obj, velocity, dt, jumpVelocity)` (4 params). Making it optional satisfies both. Caller can either pass jumpVelocity (applied as impulse at frame start) OR add it to velocity directly before calling — both work.
- **height param (optional, default 0)**: spec mentions "planetRadius + height" for landing but signature doesn't include height. Added as 5th optional param with default 0. Player (Task 9) rests at height 0 (feet on surface, character origin at feet per Task 6). Other objects can pass a different height.
- **GRAVITY = 9.8** exported as tunable const. With jumpForce=5, jump apex ≈ 1.23 units above surface, lands in ~60 frames (~1s at 60fps). Task 9 will tune jumpForce against this.
- **planet NOT added to scene** — this module only constructs/exports the mesh. Adding to scene is the integrator's job (Task 12). Did NOT touch main.ts/scene.ts.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `lsp_diagnostics` on world.ts + gravity.ts: no diagnostics.
- Runtime (`npx tsx -e`): snapToSurface(0,30,0,h=0)→len 25.0000; snapToSurface(0,30,0,h=1)→len 26.0000; getSurfaceNormal(0,30,0)→[0,1,0]; planet geometry instanceof IcosahedronGeometry=true; off-axis (3,4,0) snap→len 25 direction (15,20,0) preserved.
- applyGravity jump sim: jumpForce=5 → max altitude 1.2342, landed frame 60, final len 25.0000, radial velocity 0.0000. Resting object stays at 25.0000 over 60 frames. Tangential preserved (1.0000→1.0011, tiny drift is physical: radial direction rotates as object moves on sphere).
- Evidence: `.omo/evidence/task-5-snap.txt`.
- Guardrail grep: no `SphereGeometry`/`setFromUnitVectors`/`rotation.set`/`EffectComposer`/`cannon`/`rapier` in code (only in comments documenting the prohibitions).

## Gotchas
- **Spec signature conflict (EXPECTED OUTCOME vs MUST DO)**: EXPECTED OUTCOME says `applyGravity(obj, velocity, dt)` (3 params), MUST DO says `applyGravity(obj, velocity, dt, jumpVelocity: Vector3)` (4 params, jumpVelocity required). Resolution: make `jumpVelocity` optional (`jumpVelocity?: Vector3`). Both call styles work. This is the kind of inconsistency to resolve by making params optional, not by picking one spec over the other.
- **`height` mentioned in MUST DO body but not in signature**: "落地（obj.position.length() ≤ planetRadius + height）" — height is referenced but not declared as a param. Added as optional 5th param with default 0. Don't silently use a magic constant; make it a parameter.
- **Landing check must guard on velocity direction, not just position**: if you snap + zero radial whenever `|pos| <= groundRadius` (regardless of velocity direction), a jump that doesn't clear the ground in one frame gets killed immediately. Fix: only land when `rs < 0` (falling inward). Objects moving outward (jumping) are allowed to rise even if still at/below ground level on frame 0.
- **`pos.clone().normalize()` in snapToSurface**: the clone is mandatory. `normalize()` mutates the vector it's called on. Without clone: `pos.normalize()` zeroes pos, then `multiplyScalar` scales zero → pos becomes (0,0,0). The spec's exact form `pos.copy(pos.clone().normalize().multiplyScalar(R+h))` is correct.
- **Tangential velocity drift on sphere is physical, not a bug**: as an object with tangential velocity moves along the sphere, the radial direction (normal) rotates, so the decomposition's tangential component relative to the ORIGINAL frame drifts slightly. This is correct spherical physics. For the player (Task 9), tangential velocity is ~0 (movement via rotateOnAxis), so this is a non-issue.
- **Did NOT touch main.ts/scene.ts** (G17 preserveDrawingBuffer lock preserved, Task 1 files untouched per task constraint). planet mesh is exported but not added to scene — Task 12 will integrate.

# Task 6 Learnings — Character Low-Poly Model + Animation (src/character.ts)

## Files Added
- `src/character.ts` — exports `createCharacter()`, `setAnimation(char, state)`, `updateCharacter(char, time)`, `AnimationState` type. ~190 lines. No changes to main.ts/scene.ts/other task files.

## Key Decisions
- **Leg pivots are `new THREE.Object3D()` (not Group/Mesh)** — lightweight transform nodes at hip height (y=0.9). Each holds 3 mesh children (shorts/sock/shoe) offset downward. Rotating `pivot.rotation.x` swings the entire leg. This is the standard pattern for procedural limb animation without bones.
- **`bodyGroup` (THREE.Group) at hip height** holds torso/head/hair/arms/backpack. Its `position.y` is modulated for idle/talk breathing. Legs are siblings of bodyGroup (not children) so breathing doesn't move the feet.
- **Shared materials per color** — 7 `createToonMaterial()` calls for 12 meshes (both shoes share one red material, both socks share one white material, etc.). Efficient and avoids 12 separate gradient map textures.
- **Shared geometries per part type** — `shortsGeo`, `sockGeo`, `shoeGeo`, `armGeo` created once, reused for left/right. Good practice; reduces GPU buffer count.
- **Procedural animation = reset-then-apply each frame**: `updateCharacter` first resets all limbs to neutral (rotation.x=0, bodyGroup.y=hipHeight, head.rotation.x=0), then applies the active state's sin offsets. This prevents accumulation drift and makes state transitions clean (no need for transition blending).
- **`rotation.x` for leg swing is NOT G20 violation**: G20 prohibits `rotation.set()` for character ORIENTATION (facing direction on sphere — gimbal lock). Single-axis `rotation.x` for limb animation is standard and safe (gimbal lock only occurs with 2+ Euler axes). The spec's "rotateOnAxis" mention is imprecise — `rotateOnAxis` is incremental (accumulates), which is wrong for oscillation; `rotation.x = sin(t)*amp` is the correct approach.
- **Feet at origin**: shoe is BoxGeometry(0.3, 0.1, 0.45) at y=-0.85 relative to leg pivot (y=0.9). Shoe center at 0.05, bottom at 0.0. Verified via `Box3.setFromObject` after `c.updateMatrixWorld(true)`.
- **Character total height ~3.4 units** (feet to hair top) on planet radius 25 — about 14% of radius. Visible at gameplay scale. Task 9 can scale the Group if needed.

## Animation Parameters
- **walk**: `sin(time*8) * 0.5` rad leg swing, left/right opposite phase. Frequency 8/(2π) ≈ 1.27 Hz — reasonable walk cadence.
- **idle**: `sin(time*2) * 0.02` upper body Y offset. Frequency 2/(2π) ≈ 0.32 Hz — calm breathing (~3s per cycle).
- **talk**: breathing + `sin(time*5) * 0.12` rad head nod. Frequency 5/(2π) ≈ 0.8 Hz — natural nodding rate.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `lsp_diagnostics` on character.ts: no diagnostics.
- Runtime (`npx tsx -e`): children=3, meshes=12 (≤15), feet minY=-0.0000, walk legs swing ±0.3784 (opposite phase), idle bodyY=0.9182 (hip+breath), talk headRot=-0.0653.
- Spec verification command: `children: 3 ok`.
- Evidence: `.omo/evidence/task-6-character.txt`.

## Gotchas
- **`updateMatrixWorld(true)` on a child does NOT update the parent chain**: three.js `Object3D.updateMatrixWorld(force)` uses `this.parent.matrixWorld` as-is — it does NOT recursively update parents. So calling `mesh.updateMatrixWorld(true)` on a deeply nested mesh gives stale world matrices if ancestors weren't updated. Fix: call `root.updateMatrixWorld(true)` on the top-level Group first — this recursively updates all descendants top-down. This caused a false `minY=-0.9` (stale parent = identity matrix) in the initial verification script.
- **`Box3.setFromObject` requires updated world matrices**: it internally calls `updateMatrixWorld` but only on the object passed, not ancestors. Always ensure the root's world matrix is fresh before computing bounding boxes of children.
- **`CapsuleGeometry(radius, length)` total height = length + 2*radius**: the `length` parameter is the cylinder part only; hemispherical caps add `radius` on each end. Must account for this when stacking parts (shorts → sock → shoe) to avoid gaps or overlaps. E.g. `CapsuleGeometry(0.13, 0.15)` has total height 0.41, not 0.15.
- **`IcosahedronGeometry(0.5)` defaults to detail=0** (20 faces) — perfect for low-poly look. No need to pass the second arg.
- **`createToonMaterial` creates a new gradient map each call** — for 12 meshes this means 7 gradient textures (one per shared material). Could be optimized by sharing a single gradient map, but that would require changing cel-material.ts (Task 3's file). 7 textures is negligible overhead; not worth the cross-task coupling.
- **Did NOT touch main.ts/scene.ts** (G17 preserveDrawingBuffer lock preserved, Task 1/3 files untouched per task constraint).

# Task 7 Learnings — Debug API (window.__game, src/debug-api.ts)

## Files Added
- `src/vite-env.d.ts` — `/// <reference types="vite/client" />` (1 line). Required for `import.meta.env.DEV` to type-check under tsc. Task 1 scaffold missed this; no existing code used `import.meta.env` so it wasn't caught.
- `src/debug-api.ts` — exports `GameState` interface, `DebugApi` interface, `tickFps()`, `installDebugApi(getState)`, `declare global { interface Window { __game?: DebugApi } }`. ~105 lines.

## Key Decisions
- **`import.meta.env.DEV` is Vite's static boolean** — `true` in dev, `false` in prod. Vite replaces it at transform time (before Rollup). In PROD: `if (!import.meta.env.DEV) return;` → `if (!false) return;` → `if (true) return;` → unconditional return → `window.__game = {...}` is unreachable → Rollup dead-code-eliminates it. This is the documented Vite pattern for DEV-only code.
- **Entire module tree-shaken in PROD** — since no module imports `debug-api.ts` yet (Wave 4 integration), Rollup removes the entire module. Verified: `grep -c 'installDebugApi\|tickFps\|frameCount' dist/assets/*.js` → 0 matches. Even when Wave 4 imports it, only the `tickFps` function (no `__game` string) would survive in PROD; the `installDebugApi` body's `window.__game = {...}` is dead code after the DEV guard.
- **`isReady` and `fps` implemented as getters** — they need to reflect live state, so `get isReady()` checks current `getState()` and `get fps()` reads the module-level `currentFps`. TypeScript allows getters to satisfy interface property declarations (`isReady: boolean`).
- **`tickFps()` exported separately** — the debug API doesn't own the render loop, so FPS frame counting must be called from the render loop (main.ts, Wave 4). `tickFps()` increments `frameCount` and recomputes `currentFps` every ~500ms via `performance.now()`. Cheap between updates (just an increment + time check).
- **`GameState` all fields optional** — game may not be fully initialized when `installDebugApi` is called. Getters use `?? null` / `?? []` for missing fields — never throw. Action methods (`teleport`/`completeQuest`/`pause`/`resume`) use optional chaining `?.()` — no-op if underlying function is undefined.
- **Tuples `[number, number, number]` not `THREE.Vector3`** — the task spec explicitly uses tuples for the debug API return types. This decouples the debug API from THREE types (no THREE import needed in debug-api.ts) and makes Playwright `page.evaluate` assertions simpler (JSON-serializable).
- **`completeQuest` has "仅 QA 用" comment** — per spec, marks it as bypassing quest validation for test scenarios only.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `lsp_diagnostics` on debug-api.ts: no diagnostics.
- `npm run build`: exit 0, dist/assets/index-*.js ~457 KB (same as before — debug-api module tree-shaken, zero size impact).
- `grep -rl '__game' dist/`: exit 1 (no matches — correct, PROD does not expose `window.__game`).
- `grep -c 'installDebugApi\|tickFps\|frameCount\|lastFpsTime\|currentFps' dist/assets/*.js`: 0 (entire module tree-shaken).
- Evidence: `.omo/evidence/task-7-debug.txt`.

## Gotchas
- **Missing `vite-env.d.ts`** — Task 1 scaffold didn't create this file. Without `/// <reference types="vite/client" />`, `import.meta.env.DEV` is a TS error (`Property 'env' does not exist on 'ImportMeta'`). Created it as part of this task. This is a Vite project standard file — safe to add, doesn't modify any existing task file.
- **`declare global` is type-only** — under `isolatedModules: true`, the `declare global { interface Window { __game?: DebugApi } }` block is erased at emit. It produces zero runtime code, so it cannot leak `__game` into PROD. It only augments the TypeScript `Window` type for DEV-time type safety.
- **Object literal getters satisfy interface properties** — `const obj = { get foo() { return 42; } }` satisfies `interface I { foo: number }`. This is standard TypeScript behavior but worth noting: the interface declares `isReady: boolean` (not `readonly`), and the getter implementation is inherently read-only. Callers cannot assign to `window.__game.isReady = true` (it's a getter), but the interface doesn't require assignability.
- **PROD elimination has two layers**: (1) `import.meta.env.DEV` → `false` makes the `window.__game = {...}` assignment dead code within `installDebugApi`; (2) since no module imports `debug-api.ts` yet, Rollup tree-shakes the entire module. Both layers ensure `__game` never appears in dist. When Wave 4 imports `installDebugApi` and `tickFps`, layer 1 still protects: `installDebugApi`'s body is dead code, and `tickFps` contains no `__game` string.
- **Did NOT touch main.ts/scene.ts** (G17 preserveDrawingBuffer lock preserved; integration deferred to Wave 4 per task constraint).

# Task 8 Learnings — Dialogue UI Overlay (src/ui/dialogue.ts + src/ui/dialogue.css)

## Files Added
- `src/ui/dialogue.ts` — exports `showDialogue(lines, onComplete)` + `hideDialogue()`. ~115 lines. Pure DOM, no React/Vue.
- `src/ui/dialogue.css` — white rounded box + blue name tag (left) + blue ▶ advance button (bottom-right). ~110 lines. First CSS file in project.

## Key Decisions
- **Single module-level `state: DialogueState | null` object** — instead of many individual `let` variables (which risk stale values and `noUnusedLocals` issues), all dialogue state lives in one object. `null` = no dialogue active. Clean lifecycle: `showDialogue` creates, `hideDialogue` nulls. This pattern avoids the "stale variable" problem where module-level vars retain values from a previous dialogue after `hideDialogue`.
- **CSS imported via `import './dialogue.css'` in dialogue.ts** — standard Vite pattern. Vite's build pipeline processes the CSS import (extracts to bundle). TypeScript accepts it via `vite/client` type declarations (already present from Task 7's `vite-env.d.ts`). The CSS module is tree-shaken in production until an integrator (Task 14/15) imports `showDialogue`.
- **`position: fixed` on overlay (not `absolute`)** — `#app` has no `position: relative` set (it's `static` in index.html). Using `fixed` ensures the overlay covers the viewport regardless of `#app`'s position context. The overlay is still appended to `#app` per spec, but `fixed` decouples positioning from the parent's layout.
- **`pointer-events: none` on overlay, `auto` on box** — the game canvas remains mouse-interactive during dialogue (render loop continues, per spec "不阻塞渲染循环"). Only the dialogue box itself captures mouse events. Task 14 will gate keyboard input separately.
- **Typewriter with skip-on-advance** — 18ms/char (≈55 chars/sec, readable pace). If the user presses Space/E/Enter or clicks ▶ while typing, the full line is revealed instantly (no advance to next line). Second advance proceeds to next line. This is the standard VN/dialogue UX.
- **Button `blur()` after click** — prevents Space/Enter from double-firing (button keydown activation + window keydown listener). After `blur()`, the button loses focus, so subsequent Space/Enter only triggers the window listener.
- **`e.preventDefault()` on Space keydown** — prevents page scroll (Space's default action when no focusable element is active).
- **CSS design tokens on `:root`** — `--ui-blue`, `--ui-blue-dark`, `--ui-text`, `--ui-bg`, `--ui-font`, `--ui-radius`, `--ui-shadow`. Established as the foundation for future UI tasks (Task 15 title screen, Task 16 HUD) to reuse. Nunito font (Google Fonts) — rounded, friendly, NOT in the avoid list (Arial/Inter/Roboto/Space Grotesk).
- **`text-transform: lowercase` on dialogue text** — CSS safety net ensures NPC dialogue is always lowercase per original game convention, even if data has mixed case. Name tag uses `text-transform: uppercase` for speaker names.
- **`Pick<DialogueState, 'overlay' | 'nameTag' | 'text'>` as `buildDom()` return type** — `buildDom()` creates the DOM tree (including the advance button + its event listener) but only returns the 3 elements that `showDialogue` needs to store in `state`. The advance button doesn't need to be in `state` because its click listener calls `advance()` which accesses `state` directly. `Pick` avoids declaring a separate return type interface.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `npm run build`: exit 0 (Vite processes CSS import; module tree-shaken since no integrator imports it yet — same as Task 7).
- `lsp_diagnostics` on dialogue.ts: no diagnostics.
- Export check: `npx esbuild src/ui/dialogue.ts --bundle --loader:.css=empty --format=cjs` → `node -e "require(...)"` → `exports ok: function function`.
- Evidence: `.omo/evidence/task-8-dialogue.txt`.

## Gotchas
- **`npx tsx -e "import {...} from './src/ui/dialogue'"` FAILS** — Node.js/tsx cannot parse CSS imports (`@import url(...)` in the CSS file is treated as JS syntax error). CSS imports are a Vite feature processed by Vite's build pipeline, not Node.js. **Workaround**: use `npx esbuild --loader:.css=empty` to stub CSS imports, then `node -e` to check exports. The real-world verification is `npm run build` (Vite handles CSS correctly). Do NOT remove the CSS import from dialogue.ts to make tsx work — `import './dialogue.css'` is the standard Vite pattern.
- **`noUnusedLocals` with destructured returns** — if `buildDom()` returns `{ overlay, nameTag, text, advanceBtn }` but the caller only destructures `{ overlay, nameTag, text }`, the unused `advanceBtn` local triggers TS6133. Fix: don't return `advanceBtn` from `buildDom()` (the button's event listener is attached inside `buildDom`, so the caller doesn't need a reference to it).
- **Button focus causes Space/Enter double-fire** — after clicking the ▶ button, it retains focus. Subsequent Space/Enter keydown triggers BOTH the window keydown listener AND the button's default activation (click event). Fix: `advanceBtn.blur()` in the click handler. This is a common gotcha for any UI with both keyboard and mouse advance.
- **`setInterval` returns `number` in browser, `NodeJS.Timeout` in Node** — under `lib: ["DOM"]`, `window.setInterval` returns `number`. Using `window.setInterval` (not bare `setInterval`) ensures the return type is `number`, matching the `typewriterId: number | null` field. Bare `setInterval` might resolve to Node's `Timer` type in some TS configurations.
- **CSS `@import` must be the first statement in CSS** — the Google Fonts `@import url(...)` must appear before any other CSS rules (except `@charset`). Placing it after `:root {}` would be silently ignored by the browser. Vite's CSS processing also requires this ordering.
- **Did NOT touch main.ts/scene.ts** (G17 preserveDrawingBuffer lock preserved; integration deferred to Wave 4 per task constraint).

# Task 9 Learnings — Player Controller (Spherical Movement / Jump / Sprint) (src/player.ts)

## Files Added
- `src/player.ts` — exports `createPlayer(_world?)`, `Player` interface, `InputState` interface. ~165 lines. No changes to main.ts/scene.ts/other task files.

## Key Decisions
- **Spherical forward movement = rotate BOTH position AND orientation around sphere center**: `rotateOnAxis`/`rotateOnWorldAxis` only modify the quaternion (orientation), NOT the position. To move along the sphere, you must also rotate the position around the origin (sphere center) using `position.applyQuaternion(q)`. The task spec's `rotateOnAxis(axis, angle)` only handles orientation; the position rotation is implied by "球心为隐含 pivot" (sphere center is implicit pivot). Implementation: `const q = new Quaternion().setFromAxisAngle(axis, angle); group.position.applyQuaternion(q); group.quaternion.premultiply(q);` — `premultiply` (world-space) not `multiply` (local-space), because the position rotation is in world space.
- **`getWorldDirection()` returns -Z, NOT the character's facing direction**: Task 6 character faces +Z, but Three.js `Object3D.getWorldDirection()` returns the local -Z axis in world space (camera convention). The task's formula `axis = crossVectors(up, forward)` with `forward = getWorldDirection()` and `angle = -speed*dt` has a double negation that cancels out: `cross(up, -Z) = -X`, `rotateOnAxis(-X, -speed) = rotateOnAxis(+X, +speed)`, which correctly moves the character in its +Z facing direction. Do NOT negate `getWorldDirection()` — the task's formula works as-is.
- **Turning uses `rotateOnAxis(LOCAL_UP, angle)` not `rotateOnAxis(player.up, angle)`**: `rotateOnAxis` expects a LOCAL-space axis (post-multiply), but `player.up` is a WORLD-space vector. When the player is properly oriented (local Y = surface normal), `rotateOnAxis(new Vector3(0,1,0), angle)` = `rotateOnWorldAxis(surfaceNormal, angle)`. Using `LOCAL_UP = (0,1,0)` is the correct local-space equivalent. The task spec's `player.rotateOnAxis(player.up, ...)` is imprecise — it should be either `rotateOnAxis(LOCAL_Y, ...)` or `rotateOnWorldAxis(player.up, ...)`.
- **Initial position at north pole with identity orientation**: At (0, R, 0), surface normal = (0,1,0) = local Y with identity orientation. No special orientation setup needed. All subsequent movement is via incremental rotations. For other starting positions, a one-time `setFromAxisAngle` (NOT `setFromUnitVectors`) is safe — G19/G20 prohibit RUNTIME absolute reconstruction, not one-time initial setup.
- **Jump = `velocity.copy(up * JUMP_FORCE)` + `applyGravity` each frame**: The jump sets a purely radial outward velocity. `applyGravity` (Task 5) handles the gravity deceleration, apex, fall, and landing (snap + zero radial velocity). The player's `isGrounded` flag is set when `|pos| <= planetRadius + 0.01`. Movement is only allowed when grounded (no air control) — simpler for MVP.
- **`jumpRequested` flag prevents auto-repeat jumps**: `keydown` fires repeatedly when a key is held (auto-repeat). Using `e.repeat` guard: `if (action === 'jump' && !e.repeat) jumpRequested = true;` ensures jump only triggers on the initial press, not on auto-repeat. The flag is consumed (set to false) in `update()` each frame.
- **NaN prevention: check `axis.lengthSq() > 1e-10` before normalize**: If `up` and `forward` are parallel (e.g., player orientation corrupted), `cross(up, forward)` = zero vector, and `normalize()` produces NaN. Guard: `if (_axis.lengthSq() > 1e-10) { _axis.normalize(); /* movement */ }` — skips movement for that frame instead of producing NaN.
- **`position` and `up` are direct references, not getters**: `return { position: group.position, up: group.up, ... }` — since `group.position` and `group.up` are Vector3 objects mutated in place (never replaced), `player.position` and `group.position` are the same object. Changes are reflected automatically. Getters would also work but are unnecessary.
- **`typeof window !== 'undefined'` guard for event listeners**: In Node (tsx verification), `window` doesn't exist. The guard prevents `ReferenceError` and allows the player to be created and updated in Node for testing. For tsx verification, a fake `window` object with `addEventListener` is set up before calling `createPlayer`.
- **`_world` parameter accepted but unused**: The task spec says `createPlayer(world)` but we import directly from `./world`. The parameter is prefixed with `_` to satisfy `noUnusedParameters`. Making it optional (`_world?: unknown`) allows `createPlayer()` for testing.

## Movement Math (verified)
- **Forward at north pole (0,25,0), identity orientation, W pressed 30 frames (0.5s)**:
  - up = (0,1,0), getWorldDirection = (0,0,-1)
  - axis = cross(up, forward) = cross((0,1,0),(0,0,-1)) = (-1,0,0)
  - angle = -3.0 * 1.0 * 1 * dt = -3.0*dt per frame
  - After 30 frames: position (0, 1.77, -24.94) — moved toward +Z (character facing direction), |pos| = 25.0000 (on surface) ✓
- **South pole (0,-25,0), orientation = setFromAxisAngle((1,0,0), π), W pressed 30 frames**:
  - Player moved to (0, -1.77, 24.94), no NaN, no lockup ✓
- **Jump**: Space → velocity = (0, 6, 0), 1 frame later height = 25.097 (rising), 90 frames later height = 25.0000 (landed) ✓

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `lsp_diagnostics` on player.ts: no diagnostics.
- Runtime (`npx tsx`): all 11 checks pass — forward_moved, on_surface, up_not_nan, turn_changed, jump_works, land_on_surface, south_no_lockup, south_no_nan, north_no_lockup, north_no_nan, disable_works.
- Guardrail grep: no `setFromUnitVectors` / `rotation.set` in player.ts (G19/G20 compliant).
- Evidence: `.omo/evidence/task-9-player.txt`.

## Gotchas
- **`npx tsx -e` doesn't support top-level await**: tsx uses CJS format for `-e` inline scripts, which doesn't support `await import()`. **Fix**: write a temporary `.ts` file in the project root and run `npx tsx file.ts`. The file must be in the project root (not /tmp) so `three` can be resolved from `node_modules`.
- **`rotateOnAxis` vs `rotateOnWorldAxis`**: `rotateOnAxis(axis, angle)` post-multiplies (`quaternion.multiply(q)`) — axis is in LOCAL space. `rotateOnWorldAxis(axis, angle)` pre-multiplies (`quaternion.premultiply(q)`) — axis is in WORLD space. For turning (yaw around surface normal), use `rotateOnAxis(LOCAL_UP=(0,1,0), angle)` since local Y = surface normal when properly oriented. For forward movement, use `quaternion.premultiply(q)` directly (world-space) to match the position rotation.
- **`applyGravity` called every frame even when grounded**: When grounded with zero velocity, `applyGravity` applies a tiny inward velocity (-GRAVITY*dt), integrates position (moves slightly inward), then snaps back to surface and zeros radial velocity. This is correct — the player stays on the surface. The `isGrounded` flag is set separately by checking `|pos| <= planetRadius + 0.01`.
- **`snapToSurface` safety after grounded movement**: Even though `position.applyQuaternion(q)` preserves the position length (rotation around origin), floating-point precision can cause tiny drift. Adding `if (isGrounded) snapToSurface(group.position, 0)` after movement ensures the player is always exactly on the surface.
- **`e.preventDefault()` on all mapped keys**: Space (page scroll), arrow keys (page scroll) must have default prevented. Calling `e.preventDefault()` for all mapped keys (WASD, arrows, Space, Shift) is safe and prevents unwanted browser behavior.
- **Did NOT touch main.ts/scene.ts** (G17 preserveDrawingBuffer lock preserved; integration deferred to Wave 4 per task constraint).

# Task 10 Learnings — NPC System (src/npc.ts)

## Files Added
- `src/npc.ts` — exports `createNpcs()`, `getNearestNpc(playerPos, threshold=3)`, `updateNpcs(time)`. ~190 lines. No changes to main.ts/scene.ts/other task files.

## Key Decisions
- **NPC recolouring via post-creation material swap**: `createCharacter()` (Task 6) doesn't accept colour params and we can't modify it (task constraint: no modifying other task files). Solution: after `createCharacter()`, traverse the group and replace any mesh whose material colour matches `SHIRT_COLOR` (0xffdd00) with a new `createToonMaterial(npc.color)`. This swaps the shirt (torso + both arms share one material in character.ts) while preserving skin/hair/shorts/socks/shoes/backpack. Each NPC gets a distinct shirt colour (worker=gray, kid=gold, dave=royal blue, doctor=white, caveman=saddle brown).
- **One-time `setFromUnitVectors` for static NPC orientation is G19/G20 compliant**: G19/G20 prohibit RUNTIME absolute orientation reconstruction (causes south-pole lockup during movement). Static NPCs are oriented ONCE at creation via `quaternion.setFromUnitVectors((0,1,0), surfaceNormal)`. This is explicitly safe per Task 9 learnings: "G19/G20 prohibit RUNTIME absolute reconstruction, not one-time initial setup." None of the 5 NPC positions are at the exact south pole, so `setFromUnitVectors` has no opposite-vector edge case.
- **Cone marker pointing down via `rotation.x = Math.PI`**: `ConeGeometry` defaults to apex-up. Rotating π around X flips it to apex-down. Setting `rotation.y` afterwards (for spin) works correctly with Euler 'XYZ' order: the Y rotation is applied in local space after the X flip, spinning the cone around its (now downward) axis. With 4 radial segments (pyramid), the spin is visually visible.
- **Marker float + spin in one mesh (no parent group needed)**: `marker.position.y = baseY + sin(t)*amp` (float) and `marker.rotation.y = t * speed` (spin) can both be set on the same mesh. The `rotation.x = π` stays constant (set once at creation), only `rotation.y` changes per frame. No need for a separate markerGroup parent.
- **Name tag as THREE.Sprite with CanvasTexture**: Sprite always faces the camera (billboard) — no manual screen-space projection needed. Canvas (256×64) draws red rounded rect + white uppercase text. `SpriteMaterial` (not toon) is correct — sprites are billboards that don't participate in cel-shading.
- **`typeof document !== 'undefined'` guard for Node compatibility**: `createNameTag` uses `document.createElement('canvas')` which doesn't exist in Node (tsx verification). The guard makes the sprite fall back to plain red colour (no text) in Node, while the full canvas texture renders in browser. The NPC group structure is intact in both environments — structural assertions (children count, userData.npcId) work in Node.
- **Module-level `instances` array**: Populated by `createNpcs()`, consumed by `getNearestNpc()` and `updateNpcs()`. Cleared (`length = 0`) at the start of each `createNpcs()` call to prevent stale references if called multiple times. This avoids the need to pass the NPC list around or attach it to the returned group's userData.

## Verification Results
- `npx tsc --noEmit`: exit 0 (strict, noUnusedLocals/Parameters clean).
- `lsp_diagnostics` on npc.ts: no diagnostics.
- Runtime (`npx tsx -e`): 11 checks pass — npc_count=5, structure_ok (1 char + 1 marker + 1 nameTag per NPC), all positions on sphere (len=25.00), getNearestNpc returns correct NPC (kid at (0,25,0), worker at worker pos), returns null when far (south pole, threshold 3), updateNpcs no error, marker floats (y=4.021), marker spins (rotY=2.250), marker points down (rotation.x=π).
- Spec verification command: `npcs: 5 nearest: kid` ✓
- Evidence: `.omo/evidence/task-10-npc.txt`.

## Gotchas
- **`mat.color.getHex()` for material colour comparison**: `MeshToonMaterial.color` is a `THREE.Color` object. To compare against a hex value, use `mat.color.getHex() === 0xffdd00`, NOT `mat.color === 0xffdd00` (object vs number). The `getHex()` method returns the numeric hex value.
- **`SpriteMaterial` vs `MeshToonMaterial` for name tags**: Sprites use `SpriteMaterial` (billboard, always faces camera, not cel-shaded). Do NOT use `createToonMaterial` for sprites — toon materials are for 3D meshes that participate in the lighting/gradient pipeline. Sprites bypass that pipeline entirely.
- **CanvasTexture in Node**: `THREE.CanvasTexture` requires a canvas element from `document.createElement('canvas')`. In Node, `document` is undefined. Must guard with `typeof document !== 'undefined'` before creating canvas. The `SpriteMaterial` can be created without a map (just colour), so the sprite still exists in Node — it just has no text.
- **`getNearestNpc` distance is 3D straight-line, not surface arc**: Both player and NPC are on the sphere surface (radius 25). For small thresholds (3 units), straight-line distance ≈ surface arc distance. For a threshold of 3 on radius 25, the arc length is ~3.0 and the chord length is ~3.0 (difference is negligible for small angles). This is simpler and sufficient for proximity detection.
- **NPC data positions are pre-snap values**: The `npcs` data has positions like `[-18, 17, 0]` (length 24.76) and `[0, 25, 0]` (length 25). `snapToSurface` normalises and scales to exactly 25. After snapping, all 5 NPCs are at exactly radius 25. The pre-snap values are close to the surface but not exact — `snapToSurface` fixes this.
- **Did NOT touch main.ts/scene.ts/character.ts** (G17 preserveDrawingBuffer lock preserved; character.ts is Task 6's file — recolouring done via post-creation traversal, not modification; integration deferred to Wave 4 per task constraint).

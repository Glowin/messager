# Messager 🌍

A single-player, spherical-planet delivery game — a clone of [Messenger](https://messenger.abeto.co/) by Abeto. Walk around a tiny cel-shaded globe, talk to its residents, and deliver their mail.

**▶ Play live**: https://messager-swart.vercel.app

## Features

- **Spherical world** — a small planet you can walk around in any direction and end up back where you started (no invisible walls).
- **Cel-shaded low-poly visuals** — `MeshToonMaterial` + `OutlineEffect`, built entirely from Three.js primitives.
- **5 delivery quests** — talk to NPCs, pick up deliveries, find the recipients across the globe.
- **5 NPCs** — each with a name tag, a floating quest marker, and dialogue.
- **Spherical gravity + safe poles** — incremental `rotateOnAxis` movement (no south-pole lockup); camera follows the surface normal (no flip at poles).
- **Third-person camera** with auto-centering.
- **Title screen + opening cutscene**, HUD with quest objectives, pause menu, sound toggle.
- **Lo-fi background music + SFX** (Howler, CC0 placeholder audio).

## How to play

| Key | Action |
|---|---|
| `W` `A` `S` `D` / Arrow keys | Move / Turn |
| `Space` | Jump |
| `Shift` | Sprint |
| `E` | Interact (talk to NPC / deliver) |
| `Esc` | Pause menu |

Walk up to an NPC with a triangle marker above their head, press `E` to talk, then follow the "NEXT UP" objective to the delivery target.

## Tech stack

- **Vite** + **TypeScript** (strict)
- **Three.js r0.161** (WebGL, cel-shaded)
- **Howler.js** (audio)
- No framework shell, no tests — verified via Playwright + a `window.__game` debug API.

## Getting started

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # typecheck (tsc) + bundle (vite build) → dist/
npm run preview  # serve the built dist/
```

Requires Node.js (Vite 5 / TypeScript 5.3+).

## Deployment

- **Vercel** (auto-detects Vite): `vercel --prod --yes` — build command `npm run build`, output `dist/`. Live: https://messager-swart.vercel.app
- **GitHub**: https://github.com/Glowin/messager

## Architecture

`src/main.ts` wires every module together — read it first.

| Module | Responsibility |
|---|---|
| `world.ts` / `gravity.ts` | IcosahedronGeometry planet, surface snap, radial jump gravity |
| `player.ts` | Spherical movement (`rotateOnAxis`), jump, sprint |
| `camera.ts` | Third-person follow, `up = surfaceNormal` every frame |
| `cel-material.ts` | `MeshToonMaterial` + `gradientMap` + `OutlineEffect` |
| `character.ts` | Primitive humanoid + procedural idle/walk/talk animation |
| `npc.ts` | 5 static NPCs, triangle markers, name tags, proximity detection |
| `quest.ts` | Step state machine (locked → active → completed), "NEXT UP" overlay |
| `interaction.ts` | `E` key → dialogue → quest pickup / delivery |
| `regions.ts` | 3 scenery zones (neighborhood / plaza / beach) |
| `ui/dialogue.ts` / `ui/hud.ts` | Dialogue box, HUD (menu/sound/objective/pause) |
| `intro.ts` | Title screen + opening cutscene (`title → intro → playing`) |
| `audio.ts` | Howler bgm + sfx manager |
| `debug-api.ts` | `window.__game` (DEV-only) for Playwright state assertions |
| `data/quests.ts` / `data/npcs.ts` | Quest + NPC content |

See [`AGENTS.md`](./AGENTS.md) for non-obvious technical constraints (Three.js r0.161 gotchas, spherical-world guardrails, verification quirks).

## Credits

- Original game: **Messenger** by [Abeto](https://abeto.co/) — this is a non-commercial study/clone.
- Audio: CC0 placeholder (replace with real CC0 assets from [freesound](https://freesound.org/) etc.).

## License

MIT

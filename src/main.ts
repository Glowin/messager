import * as THREE from 'three';
import { createScene } from './scene';
import { planet } from './world';
import { createRegions } from './regions';
import { createNpcs, updateNpcs } from './npc';
import { createPlayer } from './player';
import { createFollowCamera } from './camera';
import { createOutlineEffect } from './cel-material';
import { questManager } from './quest';
import { createInteraction } from './interaction';
import { createHud } from './ui/hud';
import { createIntro } from './intro';
import { AudioManager } from './audio';
import { installDebugApi, tickFps } from './debug-api';
import type { GameState } from './debug-api';

// --- Renderer ---
// G17: preserveDrawingBuffer:true is REQUIRED for Playwright screenshot QA.
// Do NOT remove it — all downstream visual QA tasks depend on it.
const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
if (!canvas) {
  throw new Error('Canvas element not found in DOM (#app canvas)');
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  preserveDrawingBuffer: true, // G17 — DO NOT REMOVE
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// OutlineEffect wraps the renderer. The render loop MUST call
// effect.render(scene, camera) — NOT renderer.render() — or outlines are lost.
const effect = createOutlineEffect(renderer);

// --- Scene + world content ---
const { scene } = createScene(); // default camera discarded — follow camera replaces it

scene.add(planet); // the spherical world
scene.add(createRegions()); // 3 regions of scenery (neighborhood / plaza / beach)

const npcs = createNpcs(); // 5 NPCs (populates npc.ts module-level registry)
scene.add(npcs);

const player = createPlayer(); // player controller (character + movement)
scene.add(player.group);

// --- Follow camera (replaces the scene's default camera) ---
const { camera, update: updateCamera } = createFollowCamera();

// --- Quest manager (singleton from ./quest) ---
// questManager is already an instance — used by interaction, HUD, and debug API.

// --- Interaction system (E key → dialogue → quest pickup/delivery) ---
const interaction = createInteraction(player, npcs, questManager);

// --- HUD (menu / sound / objective / pause) ---
const hud = createHud(questManager);

// --- Intro (title screen → opening dialogue → playing) ---
// Player is disabled until the opening dialogue completes.
player.setEnabled(false);
const intro = createIntro(() => {
  hud.show();
  player.setEnabled(true);
  AudioManager.playBgm();
});

// --- Debug API (window.__game, DEV only) ---
// getState is queried live by each getter so the API always reflects current state.
function getState(): GameState {
  return {
    player: {
      position: [player.position.x, player.position.y, player.position.z],
      up: [player.up.x, player.up.y, player.up.z],
    },
    camera: {
      position: [camera.position.x, camera.position.y, camera.position.z],
      up: [camera.up.x, camera.up.y, camera.up.z],
    },
    scene,
    renderer,
    quests: questManager.getQuests(),
    teleport: (x, y, z) => player.position.set(x, y, z),
    completeQuest: (id) => questManager.completeQuest(id),
    // Toggle the HUD's pause state via a synthetic Escape keydown (the HUD's
    // internal listener toggles pause on Escape). This avoids modifying hud.ts.
    pause: () => {
      if (!hud.isPaused) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      }
    },
    resume: () => {
      if (hud.isPaused) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      }
    },
  };
}
installDebugApi(getState);

// --- Main loop ---
const clock = new THREE.Clock();

function animate(): void {
  const dt = clock.getDelta();
  const time = clock.elapsedTime;

  tickFps();

  // Only simulate when the intro has finished and the game isn't paused.
  if (intro.getState() === 'playing' && !hud.isPaused) {
    player.update(dt, time);
    interaction.update();
    updateNpcs(time);
    updateCamera(player.group);
  }

  hud.update();
  effect.render(scene, camera); // OutlineEffect render (NOT renderer.render)
}

renderer.setAnimationLoop(animate);

// --- Resize handler: update follow camera aspect + renderer size ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Startup ---
intro.show(); // display the title screen (MESSENGER + Begin)

// Startup log (allowed)
const attrs = renderer.getContext().getContextAttributes();
console.log(
  '[messager] renderer ready | preserveDrawingBuffer =',
  attrs?.preserveDrawingBuffer,
  '| antialias =',
  attrs?.antialias,
);

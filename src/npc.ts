import * as THREE from 'three';
import { createCharacter, setAnimation, updateCharacter } from './character';
import { createToonMaterial } from './cel-material';
import { snapToSurface, getSurfaceNormal } from './world';
import { npcs as npcData } from './data/npcs';

/**
 * Static NPC system — 5 non-player characters placed on the planet sphere.
 *
 * Each NPC uses the GLB character model (Task 6 rewrite) with a distinct
 * outfit color (NPC.color) so the five are visually distinguishable. Above
 * every NPC floats a yellow downward-pointing cone marker (the original
 * game's quest-giver indicator) and a red name tag sprite. NPCs are static:
 * they snap to the surface and never move — only the marker floats/spins
 * and the character plays the idle animation.
 *
 * Exports:
 *   createNpcs()                    → THREE.Group containing 5 NPC groups
 *   getNearestNpc(playerPos, thr=3) → nearest NPC group within threshold | null
 *   updateNpcs(time)                → per-frame marker + idle animation
 */

const MARKER_COLOR = 0xffd700; // yellow
const MARKER_RADIUS = 0.3;
const MARKER_HEIGHT = 0.5;
const MARKER_BASE_Y = 2.5; // above NPC feet (character head ~2.0 = TARGET_HEIGHT, marker just above)
const MARKER_FLOAT_AMP = 0.15;
const MARKER_FLOAT_SPEED = 2;
const MARKER_SPIN_SPEED = 1.5;
const NAMETAG_Y = 3.0;

interface NpcInstance {
  group: THREE.Group;
  marker: THREE.Mesh;
  character: THREE.Group;
}

// Module-level registry populated by createNpcs, consumed by getNearestNpc
// and updateNpcs. Cleared on each createNpcs call to avoid stale references.
const instances: NpcInstance[] = [];

/**
 * Draw a rounded rectangle path on a 2D canvas context.
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Create a red name-tag sprite with white uppercase text.
 *
 * Uses CanvasTexture when in a browser environment. In Node (tsx verification)
 * `document` is undefined, so the sprite falls back to a plain red colour —
 * the group structure is still intact for structural assertions.
 */
function createNameTag(name: string): THREE.Sprite {
  const material = new THREE.SpriteMaterial({ color: 0xcc2222 });

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Red rounded background.
    ctx.fillStyle = '#cc2222';
    drawRoundRect(ctx, 0, 0, 256, 64, 12);
    ctx.fill();

    // White uppercase name, centred.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 128, 32);

    material.map = new THREE.CanvasTexture(canvas);
  }

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}

/**
 * Build all 5 NPCs and return them in a single THREE.Group.
 *
 * Each NPC is a sub-group containing:
 *   - The recoloured character model (feet at local origin, idle animation)
 *   - A yellow downward cone marker (floats + spins via updateNpcs)
 *   - A red name-tag sprite (billboard, always faces camera)
 *
 * The sub-group is positioned on the sphere surface and oriented so its
 * local +Y aligns with the surface normal. This orientation is set once at
 * creation time (static NPCs never move), which is G19/G20 compliant — the
 * guardrails prohibit RUNTIME absolute orientation reconstruction, not
 * one-time initial setup.
 *
 * @returns THREE.Group with 5 NPC children.
 */
export function createNpcs(): THREE.Group {
  const root = new THREE.Group();
  instances.length = 0;

  for (const data of npcData) {
    const npcGroup = new THREE.Group();

    const character = createCharacter(data.color);
    setAnimation(character, 'idle');
    npcGroup.add(character);

    // Yellow triangle marker — cone pointing down, 4 radial segments for
    // low-poly pyramid look (spinning is visible with 4 facets).
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(MARKER_RADIUS, MARKER_HEIGHT, 4),
      createToonMaterial(MARKER_COLOR),
    );
    marker.rotation.x = Math.PI; // flip to point down
    marker.position.y = MARKER_BASE_Y;
    npcGroup.add(marker);

    // Red name tag sprite above the marker.
    const nameTag = createNameTag(data.name);
    nameTag.position.y = NAMETAG_Y;
    npcGroup.add(nameTag);

    // Snap to sphere surface.
    const pos = new THREE.Vector3(...data.position);
    snapToSurface(pos);
    npcGroup.position.copy(pos);

    // Orient local +Y to surface normal (one-time, static).
    const normal = getSurfaceNormal(pos);
    npcGroup.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normal,
    );

    // Metadata for interaction system (Task 14).
    npcGroup.userData.npcId = data.id;
    npcGroup.userData.npcData = data;

    instances.push({ group: npcGroup, marker, character });
    root.add(npcGroup);
  }

  return root;
}

/**
 * Find the nearest NPC to the player within a distance threshold.
 *
 * Distance is straight-line 3D distance (both player and NPC are on the
 * sphere surface, so this approximates surface proximity well for small
 * thresholds).
 *
 * @param playerPos Current player position.
 * @param threshold Maximum distance in world units (default 3).
 * @returns The nearest NPC group, or null if none within threshold.
 */
export function getNearestNpc(
  playerPos: THREE.Vector3,
  threshold = 3,
): THREE.Group | null {
  let nearest: THREE.Group | null = null;
  let nearestDist = threshold;

  for (const { group } of instances) {
    const dist = group.position.distanceTo(playerPos);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = group;
    }
  }

  return nearest;
}

/**
 * Per-frame update for all NPCs.
 *
 * - Marker: floats up/down (sin wave) and spins around its vertical axis.
 * - Character: drives the procedural idle animation (breathing).
 *
 * @param time Elapsed time in seconds.
 */
export function updateNpcs(time: number): void {
  for (const { marker, character } of instances) {
    marker.position.y =
      MARKER_BASE_Y + Math.sin(time * MARKER_FLOAT_SPEED) * MARKER_FLOAT_AMP;
    marker.rotation.y = time * MARKER_SPIN_SPEED;
    updateCharacter(character, time);
  }
}

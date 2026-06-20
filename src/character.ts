import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createToonMaterial } from './cel-material';

/**
 * Character module — loads a CC0 GLB model (Quaternius Animated Human) and
 * plays skeletal animations via AnimationMixer.
 *
 * API (unchanged from the primitive version):
 *   createCharacter(color?)  → THREE.Group (sync return; GLB loads async)
 *   setAnimation(char, state) → switch animation state
 *   updateCharacter(char, time) → drive the mixer one frame
 *
 * The GLB is fetched once and cached; subsequent characters clone the cached
 * scene via SkeletonUtils (proper skinned-mesh skeleton cloning). Materials
 * are swapped to cel-shaded MeshToonMaterial to match the game's art style.
 *
 * Animation states: idle | walk | run | jump | talk.
 * The Quaternius pack includes Idle/Walk/Run/Jump (and Punch/Death/Working).
 * 'talk' has no dedicated clip → falls back to 'idle'.
 */

export type AnimationState = 'idle' | 'walk' | 'run' | 'jump' | 'talk';

interface CharacterData {
  animationState: AnimationState;
  mixer: THREE.AnimationMixer | null;
  clips: Map<AnimationState, THREE.AnimationClip>;
  currentAction: THREE.AnimationAction | null;
  lastTime: number;
}

const MODEL_URL = '/models/character.glb';
const TARGET_HEIGHT = 2.0; // world units — character fits camera framing
const MAX_DT = 0.1; // clamp mixer dt to prevent post-pause animation jumps
const ORIGINAL_COLOR = 0xe7e7e7; // GLB's original material color (fallback)

/** Cached GLTF result so the model is fetched only once. */
interface GltfCache {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}
let gltfCache: GltfCache | null = null;
let gltfPromise: Promise<GltfCache> | null = null;

/**
 * Create a character from the GLB model.
 *
 * Returns immediately with an empty placeholder Group. The GLB loads
 * asynchronously; once ready, the model is scaled, materials are swapped to
 * toon, and the idle animation starts. If loading fails, a simple primitive
 * humanoid is used as fallback (no blank screen).
 *
 * @param color Optional outfit color (NPCs). If omitted, the model's original
 *              gray color is used.
 * @returns THREE.Group with feet at y=0, facing +Z.
 */
export function createCharacter(color?: number): THREE.Group {
  const character = new THREE.Group();

  character.userData = {
    animationState: 'idle' as AnimationState,
    mixer: null,
    clips: new Map<AnimationState, THREE.AnimationClip>(),
    currentAction: null,
    lastTime: 0,
  } as CharacterData;

  void loadModel(character, color);

  return character;
}

/** Compute bounding box from mesh geometry only (excludes skeleton bones). */
function computeMeshBounds(model: THREE.Object3D): THREE.Box3 {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry?.attributes?.position) {
      const geoBox = new THREE.Box3().setFromBufferAttribute(
        obj.geometry.attributes.position,
      );
      geoBox.applyMatrix4(obj.matrixWorld);
      box.union(geoBox);
    }
  });
  return box;
}

/** Load (or return cached) GLTF — single fetch for all characters. */
function loadGltf(): Promise<GltfCache> {
  if (gltfCache) return Promise.resolve(gltfCache);
  if (gltfPromise) return gltfPromise;
  const loader = new GLTFLoader();
  gltfPromise = loader
    .loadAsync(MODEL_URL)
    .then((gltf) => {
      gltfCache = { scene: gltf.scene, animations: gltf.animations };
      return gltfCache;
    })
    .catch((err) => {
      // Reset promise so a retry is possible; re-throw for the caller.
      gltfPromise = null;
      throw err;
    });
  return gltfPromise;
}

/** Async load + setup: clone, scale, swap materials, init mixer, play idle. */
async function loadModel(
  character: THREE.Group,
  color?: number,
): Promise<void> {
  try {
    const cache = await loadGltf();

    // SkeletonUtils.clone properly duplicates skinned-mesh skeletons.
    const model = cloneSkeleton(cache.scene) as THREE.Group;

    // Scale to target height. We compute bounds from mesh geometry only —
    // Box3.setFromObject includes bone/skeleton positions which are much
    // larger than the actual mesh, producing a wildly incorrect scale.
    const box = computeMeshBounds(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) {
      model.scale.setScalar(TARGET_HEIGHT / size.y);
    }

    // Shift so feet (min Y) are at y=0.
    const box2 = computeMeshBounds(model);
    model.position.y = -box2.min.y;

    // Swap all materials to cel-shaded toon.
    const toonColor = color ?? ORIGINAL_COLOR;
    const toonMat = createToonMaterial(toonColor);
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = toonMat;
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    // Animation mixer + clip mapping.
    const mixer = new THREE.AnimationMixer(model);
    const clips = mapAnimations(cache.animations);

    const data = character.userData as CharacterData;
    data.mixer = mixer;
    data.clips = clips;

    character.add(model);

    // Play the initial (or previously-requested) animation state.
    playAnimation(character, data.animationState);
  } catch (e) {
    console.warn('[character] GLB load failed, using primitive fallback:', e);
    createFallback(character, color);
  }
}

/**
 * Map GLTF animation clips to AnimationState keys by name (case-insensitive).
 * The Quaternius pack names clips "Human Armature|<Name>" — we match the
 * suffix. 'talk' has no dedicated clip → falls back to 'idle'.
 */
function mapAnimations(
  animations: THREE.AnimationClip[],
): Map<AnimationState, THREE.AnimationClip> {
  const clips = new Map<AnimationState, THREE.AnimationClip>();

  const find = (keyword: string): THREE.AnimationClip | undefined =>
    animations.find((a) => a.name.toLowerCase().includes(keyword));

  const idle = find('idle');
  const walk = find('walk');
  const run = find('run');
  const jump = find('jump');

  if (idle) clips.set('idle', idle);
  if (walk) clips.set('walk', walk);
  if (run) clips.set('run', run);
  if (jump) clips.set('jump', jump);
  // 'talk' — no dedicated clip; fall back to idle.
  if (idle) clips.set('talk', idle);

  return clips;
}

/** Stop the current action and play the clip for the given state. */
function playAnimation(char: THREE.Group, state: AnimationState): void {
  const data = char.userData as CharacterData;
  if (!data.mixer) return;

  const clip = data.clips.get(state) ?? data.clips.get('idle');
  if (!clip) return;

  const newAction = data.mixer.clipAction(clip);
  if (data.currentAction === newAction) return;

  if (data.currentAction) {
    data.currentAction.stop();
  }
  newAction.reset().play();
  data.currentAction = newAction;
}

/**
 * Set the character's current animation state.
 *
 * If the model is still loading, the state is stored and will be applied
 * once loading completes. If the model is loaded, the animation switches
 * immediately.
 */
export function setAnimation(char: THREE.Group, state: AnimationState): void {
  const data = char.userData as CharacterData;
  data.animationState = state;
  if (data.mixer) {
    playAnimation(char, state);
  }
}

/**
 * Drive the animation mixer for one frame.
 *
 * Computes dt from the time parameter (first frame dt=0). The dt is clamped
 * to MAX_DT to prevent large jumps after a pause (when the main loop skips
 * updates but clock.elapsedTime keeps advancing).
 *
 * @param char  The Group returned by createCharacter().
 * @param time  Elapsed time in seconds.
 */
export function updateCharacter(char: THREE.Group, time: number): void {
  const data = char.userData as CharacterData;
  if (!data.mixer) return;

  const dt =
    data.lastTime > 0 ? Math.min(MAX_DT, Math.max(0, time - data.lastTime)) : 0;
  data.lastTime = time;
  data.mixer.update(dt);
}

/**
 * Simple primitive humanoid fallback (used only if GLB loading fails).
 *
 * Creates a static (non-animated) capsule+icosahedron figure so the game
 * never shows a blank character. The mixer stays null, so updateCharacter
 * and setAnimation are no-ops.
 */
function createFallback(char: THREE.Group, color?: number): void {
  const bodyColor = color ?? ORIGINAL_COLOR;
  const skinMat = createToonMaterial(0xf0c8a0);
  const bodyMat = createToonMaterial(bodyColor);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
    bodyMat,
  );
  body.position.y = 1.2;
  char.add(body);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), skinMat);
  head.position.y = 2.1;
  char.add(head);

  const legGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 6);
  const leftLeg = new THREE.Mesh(legGeo, skinMat);
  leftLeg.position.set(-0.2, 0.4, 0);
  char.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, skinMat);
  rightLeg.position.set(0.2, 0.4, 0);
  char.add(rightLeg);
}

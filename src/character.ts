import * as THREE from 'three';
import { createToonMaterial } from './cel-material';

/**
 * Low-poly humanoid character built entirely from Three.js primitives.
 *
 * Appearance (matches original game): black short hair / yellow T-shirt /
 * red shorts / white socks / red shoes / brown backpack.
 *
 * Structure:
 *   character (Group, origin at feet y=0)
 *   ├── bodyGroup (Group at hip height — breathes during idle/talk)
 *   │   ├── body (yellow capsule)
 *   │   ├── head (skin icosahedron)
 *   │   ├── hair (flattened black sphere)
 *   │   ├── leftArm / rightArm (yellow capsules)
 *   │   └── backpack (brown box)
 *   ├── leftLeg (Object3D pivot at hip — rotates for walk)
 *   │   ├── shorts (red capsule)
 *   │   ├── sock (white capsule)
 *   │   └── shoe (red box)
 *   └── rightLeg (Object3D pivot at hip — rotates for walk)
 *       ├── shorts / sock / shoe
 *
 * Animation is fully procedural (sin-driven), no skeletal/bone system.
 * All materials are cel-shaded toon (flatShading handled by createToonMaterial).
 */

export type AnimationState = 'idle' | 'walk' | 'talk';

interface CharacterData {
  animationState: AnimationState;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  bodyGroup: THREE.Group;
  head: THREE.Mesh;
  hipHeight: number;
}

// Colors matching the original character appearance.
const COLOR_SKIN = 0xf0c8a0;
const COLOR_HAIR = 0x1a1a1a;
const COLOR_SHIRT = 0xffdd00;
const COLOR_SHORTS = 0xcc2222;
const COLOR_SOCK = 0xffffff;
const COLOR_SHOE = 0xcc2222;
const COLOR_BACKPACK = 0x8b4513;

const HIP_HEIGHT = 0.9;

/**
 * Build the humanoid character from primitives.
 *
 * @returns THREE.Group with feet at the origin (y=0), facing +Z.
 */
export function createCharacter(): THREE.Group {
  const character = new THREE.Group();

  // Shared materials — one per color, reused across meshes of the same color.
  const skinMat = createToonMaterial(COLOR_SKIN);
  const hairMat = createToonMaterial(COLOR_HAIR);
  const shirtMat = createToonMaterial(COLOR_SHIRT);
  const shortsMat = createToonMaterial(COLOR_SHORTS);
  const sockMat = createToonMaterial(COLOR_SOCK);
  const shoeMat = createToonMaterial(COLOR_SHOE);
  const backpackMat = createToonMaterial(COLOR_BACKPACK);

  // --- Upper body group (moves with breathing during idle/talk) ---
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = HIP_HEIGHT;
  character.add(bodyGroup);

  // Torso — yellow T-shirt capsule (radius 0.4, cylinder length 0.8).
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.8, 4, 8),
    shirtMat,
  );
  body.position.y = 0.8; // center above hip
  bodyGroup.add(body);

  // Head — skin icosahedron (low-poly facets pair with flatShading).
  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 0),
    skinMat,
  );
  head.position.y = 2.1; // above torso
  bodyGroup.add(head);

  // Hair — flattened black sphere sitting on top of the head.
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 8, 6),
    hairMat,
  );
  hair.scale.set(1, 0.5, 1);
  hair.position.y = 2.25;
  bodyGroup.add(hair);

  // Arms — yellow capsules (T-shirt sleeves) at shoulder height.
  const armGeo = new THREE.CapsuleGeometry(0.1, 0.5, 4, 6);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.45, 1.3, 0);
  bodyGroup.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.45, 1.3, 0);
  bodyGroup.add(rightArm);

  // Backpack — brown box on the back (-Z).
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.5, 0.25),
    backpackMat,
  );
  backpack.position.set(0, 0.85, -0.38);
  bodyGroup.add(backpack);

  // --- Legs (independent Object3D pivots at hip for walk animation) ---
  const shortsGeo = new THREE.CapsuleGeometry(0.13, 0.15, 4, 6);
  const sockGeo = new THREE.CapsuleGeometry(0.12, 0.1, 4, 6);
  const shoeGeo = new THREE.BoxGeometry(0.3, 0.1, 0.45);

  // Left leg pivot — rotateOnAxis/rotation.x swings the whole leg.
  const leftLeg = new THREE.Object3D();
  leftLeg.position.set(-0.17, HIP_HEIGHT, 0);
  character.add(leftLeg);
  const leftShorts = new THREE.Mesh(shortsGeo, shortsMat);
  leftShorts.position.y = -0.205;
  leftLeg.add(leftShorts);
  const leftSock = new THREE.Mesh(sockGeo, sockMat);
  leftSock.position.y = -0.58;
  leftLeg.add(leftSock);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.y = -0.85; // shoe bottom at y=0 (feet on ground)
  leftLeg.add(leftShoe);

  // Right leg pivot.
  const rightLeg = new THREE.Object3D();
  rightLeg.position.set(0.17, HIP_HEIGHT, 0);
  character.add(rightLeg);
  const rightShorts = new THREE.Mesh(shortsGeo, shortsMat);
  rightShorts.position.y = -0.205;
  rightLeg.add(rightShorts);
  const rightSock = new THREE.Mesh(sockGeo, sockMat);
  rightSock.position.y = -0.58;
  rightLeg.add(rightSock);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.y = -0.85;
  rightLeg.add(rightShoe);

  // Store animation references on userData.
  character.userData = {
    animationState: 'idle' as AnimationState,
    leftLeg,
    rightLeg,
    bodyGroup,
    head,
    hipHeight: HIP_HEIGHT,
  };

  return character;
}

/**
 * Set the character's current animation state.
 *
 * Call once when the state changes (e.g. player starts/stops moving).
 */
export function setAnimation(char: THREE.Group, state: AnimationState): void {
  (char.userData as CharacterData).animationState = state;
}

/**
 * Drive the procedural animation for one frame.
 *
 * Each frame resets limbs to neutral, then applies the active state:
 * - walk: legs swing opposite phase via sin(t*8) * 0.5 rad
 * - idle: subtle breathing — upper body Y offset sin(t*2) * 0.02
 * - talk: breathing + head nod sin(t*5) * 0.12 rad
 *
 * @param char  The Group returned by createCharacter().
 * @param time  Elapsed time in seconds.
 */
export function updateCharacter(char: THREE.Group, time: number): void {
  const data = char.userData as CharacterData;
  const state = data.animationState;

  // Reset to neutral pose every frame (prevents accumulation drift).
  data.leftLeg.rotation.x = 0;
  data.rightLeg.rotation.x = 0;
  data.bodyGroup.position.y = data.hipHeight;
  data.head.rotation.x = 0;

  if (state === 'walk') {
    const swing = Math.sin(time * 8) * 0.5;
    data.leftLeg.rotation.x = swing;
    data.rightLeg.rotation.x = -swing;
  } else if (state === 'idle') {
    data.bodyGroup.position.y = data.hipHeight + Math.sin(time * 2) * 0.02;
  } else if (state === 'talk') {
    data.bodyGroup.position.y = data.hipHeight + Math.sin(time * 2) * 0.02;
    data.head.rotation.x = Math.sin(time * 5) * 0.12;
  }
}

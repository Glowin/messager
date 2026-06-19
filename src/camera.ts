import * as THREE from 'three';
import { getSurfaceNormal } from './world';

const CAMERA_HEIGHT = 4;
const CAMERA_DISTANCE = 7;
const LERP_FACTOR = 0.1;
const FOV = 60;
const NEAR = 0.1;
const FAR = 1000;

export interface FollowCamera {
  camera: THREE.PerspectiveCamera;
  update(target: THREE.Object3D): void;
}

/**
 * Create a third-person follow camera.
 *
 * The camera sits behind and above the target (player), looking at the player.
 * Every frame `camera.up` is set to the surface normal at the player's position
 * (G19: no fixed world up — prevents pole flip). Position is smoothed via lerp.
 * The camera auto-centers behind the player's facing direction (no manual look).
 */
export function createFollowCamera(): FollowCamera {
  const aspect = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 1;
  const camera = new THREE.PerspectiveCamera(FOV, aspect, NEAR, FAR);
  camera.position.set(0, 30, 30);

  let initialized = false;
  const dir = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function update(target: THREE.Object3D): void {
    const up = getSurfaceNormal(target.position);
    camera.up.copy(up);

    target.getWorldDirection(dir);
    // In three@0.161.0 getWorldDirection() returns the local +Z axis in world
    // space (the character's facing direction — Task 6 character faces +Z).
    // Camera goes behind (- dir) and above (+ up) the player.
    camPos
      .copy(target.position)
      .addScaledVector(up, CAMERA_HEIGHT)
      .addScaledVector(dir, -CAMERA_DISTANCE);

    if (!initialized) {
      camera.position.copy(camPos);
      initialized = true;
    } else {
      camera.position.lerp(camPos, LERP_FACTOR);
    }

    camera.lookAt(target.position);
  }

  return { camera, update };
}

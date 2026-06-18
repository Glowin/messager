import * as THREE from 'three';
import { planetRadius, snapToSurface, getSurfaceNormal } from './world';

/**
 * Radial gravity acceleration (world units / s²). Pulls objects toward the
 * planet centre along the surface normal. Exported so Task 9 can tune jump
 * force against a known gravity.
 */
export const GRAVITY = 9.8;

/**
 * Apply spherical gravity for one frame (no physics engine — guardrail G1).
 *
 * Model:
 * 1. (Optional) add `jumpVelocity` impulse — the caller may instead add the
 *    jump impulse to `velocity` directly before calling.
 * 2. Decompose `velocity` into radial (along surface normal) + tangential.
 * 3. Gravity acts only on the radial component: `vRadial -= GRAVITY * dt`.
 * 4. Integrate position: `pos += velocity * dt`.
 * 5. Landing: if `|pos| <= planetRadius + height` and the object is falling
 *    (`vRadial < 0`), snap to the surface and zero the radial velocity.
 *
 * Jumping: the caller gives a radial-outward impulse
 * (`velocity.add(normal * jumpForce)` or via the `jumpVelocity` arg). Gravity
 * then decelerates the outward radial velocity, reverses it, and pulls the
 * object back to the surface where it lands.
 *
 * Tangential movement for the player is handled separately in Task 9 via
 * incremental `rotateOnAxis`; for the player, `velocity` is expected to carry
 * only the radial (jump) component. This function preserves any tangential
 * velocity it finds, so it is also usable by other objects that move via
 * velocity integration.
 *
 * @param obj          Object whose `position` is integrated (mutated).
 * @param velocity     Velocity vector — mutated (gravity applied; radial
 *                     component zeroed on landing).
 * @param dt           Frame delta time in seconds.
 * @param jumpVelocity Optional jump impulse added to `velocity` this frame
 *                     (e.g. `normal.clone().multiplyScalar(jumpForce)`).
 * @param height       Resting height above the surface (default 0). The object
 *                     is considered landed when `|pos| <= planetRadius + height`.
 */
export function applyGravity(
  obj: THREE.Object3D,
  velocity: THREE.Vector3,
  dt: number,
  jumpVelocity?: THREE.Vector3,
  height = 0,
): void {
  // 1. Apply jump impulse if provided.
  if (jumpVelocity) {
    velocity.add(jumpVelocity);
  }

  // Surface normal at the current position (radial direction).
  const normal = getSurfaceNormal(obj.position);

  // 2. Decompose velocity into radial + tangential.
  const radialSpeed = velocity.dot(normal); // >0 outward, <0 inward
  const tangential = velocity.clone().addScaledVector(normal, -radialSpeed);

  // 3. Gravity pulls the radial component inward.
  const newRadialSpeed = radialSpeed - GRAVITY * dt;

  // Reconstruct velocity = tangential + newRadial.
  velocity.copy(tangential).addScaledVector(normal, newRadialSpeed);

  // 4. Integrate position.
  obj.position.addScaledVector(velocity, dt);

  // 5. Landing: snap to surface and zero inward radial velocity.
  const groundRadius = planetRadius + height;
  if (obj.position.length() <= groundRadius) {
    const n = getSurfaceNormal(obj.position);
    const rs = velocity.dot(n);
    if (rs < 0) {
      snapToSurface(obj.position, height);
      // Remove the inward radial component (stop falling); keep tangential.
      velocity.addScaledVector(n, -rs);
    }
  }
}

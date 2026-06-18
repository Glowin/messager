import * as THREE from 'three';
import { createToonMaterial } from './cel-material';

/** Planet radius in world units. */
export const planetRadius = 25;

/**
 * Planet mesh.
 *
 * Uses `IcosahedronGeometry` (NOT `SphereGeometry`) to avoid pole pinching
 * (guardrail G18). Detail 5 yields a smooth low-poly sphere whose flat-shaded
 * facets pair well with the cel toon material. Green toon material = grass.
 *
 * The planet is centred at the origin, so the surface normal at any point is
 * simply the normalised position vector — see `getSurfaceNormal`.
 *
 * Adding the mesh to the scene is the integrator's responsibility (Task 12);
 * this module only constructs and exports it.
 */
export const planet: THREE.Mesh = new THREE.Mesh(
  new THREE.IcosahedronGeometry(planetRadius, 5),
  createToonMaterial(0x4a7c3a),
);

/**
 * Snap a position onto the planet surface at radius `planetRadius + height`.
 *
 * Mutates `pos` in place: `pos` is normalised (giving the radial direction)
 * then scaled to the surface radius. Because the planet is centred at the
 * origin, normalising any non-zero position yields its surface normal.
 *
 * @param pos    Position to snap — mutated.
 * @param height Offset above the surface (default 0 = exactly on surface).
 */
export function snapToSurface(pos: THREE.Vector3, height = 0): void {
  pos.copy(pos.clone().normalize().multiplyScalar(planetRadius + height));
}

/**
 * Surface normal at a given position.
 *
 * For an origin-centred sphere the outward normal equals the normalised
 * position. The returned vector is a fresh clone (caller may mutate freely).
 *
 * NOTE: this does NOT orient any object — it only returns the normal vector.
 * Runtime orientation must use incremental `rotateOnAxis` (Task 9); absolute
 * `setFromUnitVectors(up, normal)` reconstruction is forbidden (G19, south-pole
 * lockup per the Hairy Ball theorem).
 *
 * @param pos Position (not mutated).
 * @returns Unit-length surface normal.
 */
export function getSurfaceNormal(pos: THREE.Vector3): THREE.Vector3 {
  return pos.clone().normalize();
}

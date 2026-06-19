import * as THREE from 'three';
import { createToonMaterial } from './cel-material';
import { snapToSurface, getSurfaceNormal } from './world';

/**
 * World content — 3 regions of low-poly primitive scenery on the planet sphere.
 *
 * Regions:
 *   neighborhood — near the Office Worker NPC: houses, trees, roads.
 *                  Landmark: RED CLIFF HOUSE (quest_0 target).
 *   plaza        — near the Young Kid NPC: fountain, benches, signpost, trees.
 *                  Landmark: FOUNTAIN.
 *   beach        — near Dave the Musician NPC: water, sand, rocks.
 *                  Landmark: WATER SURFACE.
 *
 * All objects are snapped to the sphere surface and oriented once at creation
 * via `quaternion.setFromUnitVectors((0,1,0), normal)`. This one-time setup is
 * G19/G20 compliant — the guardrails prohibit RUNTIME absolute orientation
 * reconstruction, not one-time initial placement of static scenery.
 *
 * No external 3D models (G3): everything is built from Three.js primitives.
 * No collision (MVP): objects are purely visual.
 */

const UP = new THREE.Vector3(0, 1, 0);

// Region centers — near the 3 NPCs (worker, kid, dave).
const NEIGHBORHOOD_CENTER = new THREE.Vector3(-18, 17, 0);
const PLAZA_CENTER = new THREE.Vector3(0, 25, 0);
const BEACH_CENTER = new THREE.Vector3(25, 0, 0);

// --- Placement helpers ---

/**
 * Compute two orthogonal tangent vectors at a surface point.
 * These span the local tangent plane (perpendicular to the normal).
 */
function tangentBasis(normal: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const ref =
    Math.abs(normal.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
  const t1 = new THREE.Vector3().crossVectors(normal, ref).normalize();
  const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize();
  return [t1, t2];
}

/**
 * Compute a surface position near `center` at tangent offset (a, b).
 * The position is snapped to the sphere surface at the given height.
 */
function placeNear(
  center: THREE.Vector3,
  t1: THREE.Vector3,
  t2: THREE.Vector3,
  a: number,
  b: number,
  height = 0,
): THREE.Vector3 {
  const pos = center.clone();
  pos.addScaledVector(t1, a);
  pos.addScaledVector(t2, b);
  snapToSurface(pos, height);
  return pos;
}

/**
 * Position and orient an object on the sphere surface.
 * The object's local +Y is aligned with the surface normal at `pos`.
 */
function placeObject(obj: THREE.Object3D, pos: THREE.Vector3): void {
  obj.position.copy(pos);
  const normal = getSurfaceNormal(pos);
  obj.quaternion.setFromUnitVectors(UP, normal);
}

// --- Object factories (all primitives, all toon materials) ---

/** House: box body + pyramidal cone roof. */
function createHouse(
  bodyColor: number,
  roofColor: number,
  w: number,
  h: number,
  d: number,
): THREE.Group {
  const house = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    createToonMaterial(bodyColor),
  );
  body.position.y = h / 2;
  house.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.6, 4),
    createToonMaterial(roofColor),
  );
  roof.position.y = h + h * 0.3;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  return house;
}

/** Tree: cylindrical trunk + icosahedron canopy. */
function createTree(
  trunkColor: number,
  leafColor: number,
  height: number,
): THREE.Group {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, height, 6),
    createToonMaterial(trunkColor),
  );
  trunk.position.y = height / 2;
  tree.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.IcosahedronGeometry(height * 0.55, 0),
    createToonMaterial(leafColor),
  );
  canopy.position.y = height + height * 0.15;
  tree.add(canopy);

  return tree;
}

/** Road: flat box. */
function createRoad(color: number, w: number, d: number): THREE.Mesh {
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.12, d),
    createToonMaterial(color),
  );
  road.position.y = 0.06;
  return road;
}

/** Fountain: cylindrical base + water disc + center pillar + cap. */
function createFountain(): THREE.Group {
  const fountain = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.35, 12),
    createToonMaterial(0x8a8a8a),
  );
  base.position.y = 0.17;
  fountain.add(base);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.12, 12),
    createToonMaterial(0x3a7ca5),
  );
  water.position.y = 0.38;
  fountain.add(water);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 1.1, 8),
    createToonMaterial(0x8a8a8a),
  );
  pillar.position.y = 0.9;
  fountain.add(pillar);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.15, 8),
    createToonMaterial(0xaaaaaa),
  );
  cap.position.y = 1.5;
  fountain.add(cap);

  return fountain;
}

/** Bench: seat + back + two legs. */
function createBench(): THREE.Group {
  const bench = new THREE.Group();

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 0.5),
    createToonMaterial(0x8b4513),
  );
  seat.position.y = 0.5;
  bench.add(seat);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.5, 0.1),
    createToonMaterial(0x8b4513),
  );
  back.position.set(0, 0.8, -0.2);
  bench.add(back);

  for (const x of [-0.6, 0.6]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.5, 0.4),
      createToonMaterial(0x5a3010),
    );
    leg.position.set(x, 0.25, 0);
    bench.add(leg);
  }

  return bench;
}

/** Signpost: post + board. */
function createSignpost(): THREE.Group {
  const sign = new THREE.Group();

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.0, 6),
    createToonMaterial(0x8b4513),
  );
  post.position.y = 1.0;
  sign.add(post);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.05),
    createToonMaterial(0xd4a76a),
  );
  board.position.set(0, 1.6, 0);
  sign.add(board);

  return sign;
}

/** Water surface: flat blue disc. */
function createWaterSurface(radius: number): THREE.Mesh {
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.15, 16),
    createToonMaterial(0x3a7ca5),
  );
  water.position.y = 0.075;
  return water;
}

/** Sand: flat yellow disc. */
function createSand(radius: number): THREE.Mesh {
  const sand = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.1, 16),
    createToonMaterial(0xe8d170),
  );
  sand.position.y = 0.05;
  return sand;
}

/** Rock: icosahedron. */
function createRock(size: number, color: number): THREE.Mesh {
  const rock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(size, 0),
    createToonMaterial(color),
  );
  rock.position.y = size * 0.4;
  return rock;
}

/** Red cliff house landmark: cliff pedestal + red house on top (quest_0 target). */
function createCliffHouse(): THREE.Group {
  const landmark = new THREE.Group();

  // Cliff pedestal — emerges from the ground.
  const cliff = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 0),
    createToonMaterial(0x7a6a5a),
  );
  cliff.scale.set(1.4, 1.2, 1.4);
  cliff.position.y = 0.8;
  landmark.add(cliff);

  // Red house on top — the quest_0 target, must be identifiable.
  const house = createHouse(0xcc2222, 0x661111, 1.6, 1.3, 1.6);
  house.position.y = 2.2;
  landmark.add(house);

  landmark.userData.landmark = 'red_cliff_house';
  landmark.userData.questTarget = 'quest_0';
  return landmark;
}

// --- Region builders ---

/** Neighborhood: houses, trees, roads + red cliff house landmark. */
function buildNeighborhood(root: THREE.Group): void {
  const center = NEIGHBORHOOD_CENTER.clone();
  snapToSurface(center);
  const [t1, t2] = tangentBasis(getSurfaceNormal(center));

  // Red cliff house (quest_0 target) — prominent, offset from center.
  const cliffHouse = createCliffHouse();
  placeObject(cliffHouse, placeNear(center, t1, t2, 5, 0));
  root.add(cliffHouse);

  // Houses — warm earth tones with brown roofs.
  const house1 = createHouse(0xd4a76a, 0x8b4513, 1.5, 1.2, 1.5);
  placeObject(house1, placeNear(center, t1, t2, -3, 2));
  root.add(house1);

  const house2 = createHouse(0xc9b08a, 0x6b4226, 1.4, 1.1, 1.4);
  placeObject(house2, placeNear(center, t1, t2, -4, -2));
  root.add(house2);

  const house3 = createHouse(0xe8d5b7, 0x8b4513, 1.6, 1.3, 1.4);
  placeObject(house3, placeNear(center, t1, t2, 3, -3));
  root.add(house3);

  // Trees — brown trunks, green canopies.
  const treePositions: Array<[number, number]> = [
    [2, 4],
    [-2, -4],
    [6, -1],
  ];
  for (const [a, b] of treePositions) {
    const tree = createTree(0x6b4226, 0x3a6b2a, 1.5);
    placeObject(tree, placeNear(center, t1, t2, a, b));
    root.add(tree);
  }

  // Roads — crossroad at center.
  const road1 = createRoad(0x9a9a9a, 7, 1.5);
  placeObject(road1, placeNear(center, t1, t2, 0, 0));
  root.add(road1);

  const road2 = createRoad(0x9a9a9a, 1.5, 7);
  placeObject(road2, placeNear(center, t1, t2, 0, 0));
  root.add(road2);
}

/** Plaza: fountain landmark + benches + signpost + trees. */
function buildPlaza(root: THREE.Group): void {
  const center = PLAZA_CENTER.clone();
  snapToSurface(center);
  const [t1, t2] = tangentBasis(getSurfaceNormal(center));

  // Fountain (landmark) at center.
  const fountain = createFountain();
  placeObject(fountain, placeNear(center, t1, t2, 0, 0));
  root.add(fountain);

  // Benches flanking the fountain.
  const bench1 = createBench();
  placeObject(bench1, placeNear(center, t1, t2, 3, 0));
  root.add(bench1);

  const bench2 = createBench();
  placeObject(bench2, placeNear(center, t1, t2, -3, 0));
  root.add(bench2);

  // Signpost.
  const signpost = createSignpost();
  placeObject(signpost, placeNear(center, t1, t2, 0, 4));
  root.add(signpost);

  // Trees.
  const tree1 = createTree(0x6b4226, 0x3a6b2a, 1.5);
  placeObject(tree1, placeNear(center, t1, t2, 4, 3));
  root.add(tree1);

  const tree2 = createTree(0x6b4226, 0x3a6b2a, 1.5);
  placeObject(tree2, placeNear(center, t1, t2, -4, -3));
  root.add(tree2);
}

/** Beach: sand + water surface landmark + rocks. */
function buildBeach(root: THREE.Group): void {
  const center = BEACH_CENTER.clone();
  snapToSurface(center);
  const [t1, t2] = tangentBasis(getSurfaceNormal(center));

  // Sand — large flat disc.
  const sand = createSand(6);
  placeObject(sand, placeNear(center, t1, t2, 0, 0));
  root.add(sand);

  // Water surface (landmark) — overlaps sand edge.
  const water = createWaterSurface(4);
  placeObject(water, placeNear(center, t1, t2, 3, 0));
  root.add(water);

  // Rocks — scattered gray icosahedrons.
  const rockSpecs: Array<[number, number, number, number]> = [
    [0.7, 0x707070, -3, 2],
    [0.5, 0x808080, 2, -3],
    [0.6, 0x6a6a6a, -4, -2],
    [0.8, 0x787878, 5, 2],
  ];
  for (const [size, color, a, b] of rockSpecs) {
    const rock = createRock(size, color);
    placeObject(rock, placeNear(center, t1, t2, a, b));
    root.add(rock);
  }
}

/**
 * Build all 3 regions and return them in a single THREE.Group.
 *
 * The returned group contains all scenery objects as direct children (flat
 * structure, no per-region sub-groups) so callers can iterate or raycast
 * against individual objects directly. Each object is positioned on the
 * sphere surface and oriented along the surface normal.
 *
 * The red cliff house (quest_0 target) is tagged with
 * `userData.landmark = 'red_cliff_house'` and `userData.questTarget = 'quest_0'`
 * so the interaction system (Task 14) can locate it by traversal.
 *
 * @returns THREE.Group with all region scenery (>10 direct children).
 */
export function createRegions(): THREE.Group {
  const root = new THREE.Group();
  buildNeighborhood(root);
  buildPlaza(root);
  buildBeach(root);
  return root;
}

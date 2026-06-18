import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

/**
 * Creates the base scene for the Messager game.
 * - HemisphereLight (sky/ground tint) + DirectionalLight (warm white key light)
 * - PerspectiveCamera at (0, 30, 40) looking at the origin
 */
export function createScene(): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // sky blue, ensures non-black render

  // Hemisphere light: sky color top, ground color bottom
  const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x556633, 0.6);
  scene.add(hemiLight);

  // Directional light: warm white key light
  const dirLight = new THREE.DirectionalLight(0xfff5e1, 1.0);
  dirLight.position.set(20, 40, 30);
  scene.add(dirLight);

  // Perspective camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(0, 30, 40);
  camera.lookAt(0, 0, 0);

  return { scene, camera };
}

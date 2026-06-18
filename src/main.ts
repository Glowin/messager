import * as THREE from 'three';
import { createScene } from './scene';

const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
if (!canvas) {
  throw new Error('Canvas element not found in DOM (#app canvas)');
}

// G17: preserveDrawingBuffer:true is REQUIRED for Playwright screenshot QA.
// Do NOT remove it — all downstream visual QA tasks depend on it.
const renderer = new THREE.WebGLRenderer({
  canvas,
  preserveDrawingBuffer: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const { scene, camera } = createScene();

function animate(): void {
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

// Handle window resize: update camera aspect + renderer size
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Startup log (allowed)
const attrs = renderer.getContext().getContextAttributes();
console.log(
  '[messager] renderer ready | preserveDrawingBuffer =',
  attrs?.preserveDrawingBuffer,
  '| antialias =',
  attrs?.antialias,
);

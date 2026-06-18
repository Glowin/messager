import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';

/**
 * Cel-shading material module.
 *
 * IMPORTANT (Wave 2 integration): when using the OutlineEffect returned by
 * `createOutlineEffect()`, the render loop MUST call
 *   `effect.render(scene, camera)`
 * NOT `renderer.render(scene, camera)`. OutlineEffect wraps the renderer and
 * performs the outline pass inside its own `render()` method. Calling
 * `renderer.render()` directly will bypass outlines entirely.
 *
 * No custom ShaderMaterial, no EffectComposer / post-processing pipeline —
 * this module relies solely on three.js built-ins (MeshToonMaterial +
 * OutlineEffect), per design constraint G4.
 */

/**
 * 3-step gradient map for MeshToonMaterial.
 *
 * The toon fragment shader samples only the `.r` channel of this texture
 * (`vec3(texture2D(gradientMap, coord).r)`), so each pixel is grayscale and
 * its R channel carries the band's brightness. We use RGBAFormat with full
 * grayscale pixels for robustness.
 *
 * NearestFilter (mag + min) is CRITICAL: LinearFilter would interpolate
 * between bands and produce a smooth gradient, destroying the hard cel-band
 * look. NearestFilter snaps each shaded fragment to one of 3 discrete steps.
 *
 * Bands: dark 0x40 / mid 0xa0 / bright 0xff.
 */
export function createGradientMap(): THREE.DataTexture {
  // 3 pixels, RGBA (4 bytes each) → 12 bytes. Grayscale so R=G=B.
  const data = new Uint8Array([
    0x40, 0x40, 0x40, 0xff, // dark
    0xa0, 0xa0, 0xa0, 0xff, // mid
    0xff, 0xff, 0xff, 0xff, // bright
  ]);

  const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Create a cel-shaded toon material.
 *
 * `flatShading: true` improves low-poly silhouette readability and avoids
 * OutlineEffect corner gaps on curved geometry (per inherited wisdom).
 *
 * NOTE: do NOT set `alphaTest` on toon materials — it conflicts with
 * OutlineEffect's outline pass.
 *
 * @param color Base diffuse color (e.g. 0xff0000).
 */
export function createToonMaterial(color: number): THREE.MeshToonMaterial {
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: createGradientMap(),
  });

  // Set after construction: Material.setValues() drops keys whose current
  // value is undefined, and `flatShading` is never initialised in the Material
  // ctor, so passing it as a constructor param is silently ignored. The cast
  // is needed because @types/three@0.161 omits `flatShading` from Material.
  // Lazy program compilation (first render) picks up the assigned value.
  (material as THREE.MeshToonMaterial & { flatShading: boolean }).flatShading =
    true;

  return material;
}

/**
 * Wrap a WebGLRenderer with OutlineEffect for cel-style outlines.
 *
 * OutlineEffect is WebGL-only (the project already uses WebGLRenderer — do
 * not switch to WebGPU). The returned effect exposes a `render(scene, camera)`
 * method that REPLACES `renderer.render()` in the animation loop.
 *
 * @param renderer An existing THREE.WebGLRenderer.
 */
export function createOutlineEffect(renderer: THREE.WebGLRenderer): OutlineEffect {
  return new OutlineEffect(renderer);
}

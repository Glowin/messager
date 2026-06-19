/**
 * Debug API exposed as `window.__game` in DEV mode only.
 *
 * Thin wrapper over live game state for Playwright state assertions
 * (QA scenarios in the plan). PROD builds never mount `window.__game`:
 * Vite statically replaces `import.meta.env.DEV` with `false`, the
 * install branch becomes dead code, and Rollup eliminates it —
 * `grep __game dist/` returns nothing.
 *
 * Integration (Wave 4): the render loop calls `tickFps()` each frame
 * and `installDebugApi(getState)` is called once at startup.
 */

/** Snapshot of game state queried by the debug API. All fields optional. */
export interface GameState {
  player?: { position: [number, number, number]; up: [number, number, number] } | null;
  camera?: { position: [number, number, number]; up: [number, number, number] } | null;
  scene?: unknown | null;
  renderer?: unknown | null;
  quests?: Array<{ id: string; status: string; currentStep: number }>;
  teleport?: (x: number, y: number, z: number) => void;
  completeQuest?: (id: string) => void;
  pause?: () => void;
  resume?: () => void;
}

/** Public debug surface mounted at `window.__game` (DEV only). */
export interface DebugApi {
  isReady: boolean;
  fps: number;
  getPlayer(): { position: [number, number, number]; up: [number, number, number] } | null;
  getCamera(): { position: [number, number, number]; up: [number, number, number] } | null;
  getScene(): unknown | null;
  getRenderer(): unknown | null;
  getQuests(): Array<{ id: string; status: string; currentStep: number }>;
  teleport(x: number, y: number, z: number): void;
  completeQuest(id: string): void;
  pause(): void;
  resume(): void;
}

declare global {
  interface Window {
    __game?: DebugApi;
  }
}

// --- FPS tracking (performance.now() frame counting) ---
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

/**
 * Advance the FPS counter. Call once per frame from the render loop.
 * Recomputes fps every ~500ms; cheap between updates.
 */
export function tickFps(): void {
  frameCount++;
  const now = performance.now();
  const elapsed = now - lastFpsTime;
  if (elapsed >= 500) {
    currentFps = Math.round((frameCount * 1000) / elapsed);
    frameCount = 0;
    lastFpsTime = now;
  }
}

/**
 * Mount `window.__game` in DEV mode only. `getState` returns the live
 * game snapshot; getters read through it each call so the API always
 * reflects current state. Getters return null/empty when state isn't
 * ready yet (never throw).
 */
export function installDebugApi(getState: () => GameState): void {
  if (!import.meta.env.DEV) return;

  window.__game = {
    get isReady(): boolean {
      const s = getState();
      return s.player != null && s.camera != null && s.scene != null && s.renderer != null;
    },
    get fps(): number {
      return currentFps;
    },
    getPlayer() {
      return getState().player ?? null;
    },
    getCamera() {
      return getState().camera ?? null;
    },
    getScene() {
      return getState().scene ?? null;
    },
    getRenderer() {
      return getState().renderer ?? null;
    },
    getQuests() {
      return getState().quests ?? [];
    },
    teleport(x, y, z) {
      getState().teleport?.(x, y, z);
    },
    // 仅 QA 用 — bypasses quest validation for test scenarios.
    completeQuest(id) {
      getState().completeQuest?.(id);
    },
    pause() {
      getState().pause?.();
    },
    resume() {
      getState().resume?.();
    },
  };
}

// HUD: top-right menu button + sound toggle + current objective + Esc pause menu.
// Self-contained DOM module — styles JS-injected for tsx compatibility (no CSS import).

import { AudioManager } from '../audio';
import { quests } from '../data/quests';

/** Minimal quest-manager interface (structural — accepts QuestManager or test doubles). */
interface QuestManagerLike {
  getQuests(): Array<{ id: string; status: string; currentStep: number }>;
}

/** HUD controller returned by createHud. */
export interface Hud {
  /** Mount the HUD overlay to #app. */
  show(): void;
  /** Remove the HUD overlay and clean up listeners. */
  hide(): void;
  /** Per-frame: refresh the current objective text from the quest manager. */
  update(): void;
  /** True when the pause menu is open. */
  readonly isPaused: boolean;
}

/**
 * Create a HUD controller.
 * @param questManager - provides getQuests() for the current objective display.
 */
export function createHud(questManager: QuestManagerLike): Hud {
  let paused = false;
  let root: HTMLDivElement | null = null;
  let pauseOverlay: HTMLDivElement | null = null;
  let objectiveEl: HTMLDivElement | null = null;
  let soundBtn: HTMLButtonElement | null = null;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  let lastObjective = '';

  function show(): void {
    if (typeof document === 'undefined') return;
    hide(); // clean up any existing instance

    ensureStyles();

    root = document.createElement('div');
    root.className = 'hud-root';

    // --- Button row (menu + sound) ---
    const buttons = document.createElement('div');
    buttons.className = 'hud-buttons';

    const menuBtn = document.createElement('button');
    menuBtn.className = 'hud-btn hud-btn--menu';
    menuBtn.type = 'button';
    menuBtn.setAttribute('aria-label', 'Open menu');
    menuBtn.textContent = '\u2630'; // ☰ three horizontal lines
    menuBtn.addEventListener('click', () => {
      menuBtn.blur();
      openPauseMenu();
    });

    soundBtn = document.createElement('button');
    soundBtn.className = 'hud-btn hud-btn--sound';
    soundBtn.type = 'button';
    soundBtn.setAttribute('aria-label', 'Toggle sound');
    soundBtn.textContent = '\u266A'; // ♪ eighth note
    soundBtn.classList.toggle('hud-btn--muted', AudioManager.isMuted());
    soundBtn.addEventListener('click', () => {
      if (soundBtn) soundBtn.blur();
      toggleMute();
    });

    buttons.appendChild(menuBtn);
    buttons.appendChild(soundBtn);
    root.appendChild(buttons);

    // --- Current objective text (small, top-right, below buttons) ---
    objectiveEl = document.createElement('div');
    objectiveEl.className = 'hud-objective';
    objectiveEl.style.display = 'none';
    root.appendChild(objectiveEl);

    const mount = document.getElementById('app') ?? document.body;
    mount.appendChild(root);

    // --- Esc key listener: toggle pause ---
    keydownHandler = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (paused) closePauseMenu();
        else openPauseMenu();
      }
    };
    window.addEventListener('keydown', keydownHandler);
  }

  function hide(): void {
    closePauseMenu();
    if (keydownHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', keydownHandler);
    }
    keydownHandler = null;
    if (root) {
      root.remove();
      root = null;
    }
    objectiveEl = null;
    soundBtn = null;
    lastObjective = '';
  }

  function update(): void {
    if (!objectiveEl) return;

    const states = questManager.getQuests();
    const active = states.find((q) => q.status === 'active');
    let text = '';
    if (active) {
      const quest = quests.find((q) => q.id === active.id);
      const step = quest?.steps[active.currentStep];
      text = step?.objectiveText ?? '';
    }

    // Only touch the DOM when the objective actually changes.
    if (text === lastObjective) return;
    lastObjective = text;

    if (text) {
      objectiveEl.textContent = text;
      objectiveEl.style.display = 'block';
    } else {
      objectiveEl.style.display = 'none';
    }
  }

  function openPauseMenu(): void {
    if (paused || typeof document === 'undefined') return;
    paused = true;

    pauseOverlay = document.createElement('div');
    pauseOverlay.className = 'hud-pause-overlay';

    const card = document.createElement('div');
    card.className = 'hud-pause-card';

    const title = document.createElement('h2');
    title.className = 'hud-pause-title';
    title.textContent = 'PAUSED';

    const resumeBtn = document.createElement('button');
    resumeBtn.className = 'hud-pause-btn hud-pause-btn--resume';
    resumeBtn.type = 'button';
    resumeBtn.textContent = 'RESUME';
    resumeBtn.addEventListener('click', () => {
      resumeBtn.blur();
      closePauseMenu();
    });

    const quitBtn = document.createElement('button');
    quitBtn.className = 'hud-pause-btn hud-pause-btn--quit';
    quitBtn.type = 'button';
    quitBtn.textContent = 'QUIT TO TITLE';
    quitBtn.addEventListener('click', () => {
      quitBtn.blur();
      window.location.reload();
    });

    card.appendChild(title);
    card.appendChild(resumeBtn);
    card.appendChild(quitBtn);
    pauseOverlay.appendChild(card);

    const mount = document.getElementById('app') ?? document.body;
    mount.appendChild(pauseOverlay);
  }

  function closePauseMenu(): void {
    if (!paused) return;
    paused = false;
    if (pauseOverlay) {
      pauseOverlay.remove();
      pauseOverlay = null;
    }
  }

  function toggleMute(): void {
    const nowMuted = !AudioManager.isMuted();
    AudioManager.setMuted(nowMuted);
    if (soundBtn) {
      soundBtn.classList.toggle('hud-btn--muted', nowMuted);
    }
  }

  return {
    show,
    hide,
    update,
    get isPaused() {
      return paused;
    },
  };
}

// --- Styles (JS-injected for tsx compatibility — no CSS import) ---

let stylesInjected = false;

function ensureStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = HUD_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

const HUD_CSS = `
.hud-root {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  pointer-events: none;
  font-family: var(--ui-font, 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif);
}

.hud-buttons {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.hud-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  transition: background 0.15s ease, transform 0.1s ease;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.hud-btn:hover {
  background: rgba(15, 23, 42, 0.88);
  transform: scale(1.06);
}

.hud-btn:active {
  transform: scale(0.94);
}

.hud-btn--muted::after {
  content: '';
  position: absolute;
  width: 65%;
  height: 2.5px;
  background: #ef4444;
  border-radius: 2px;
  transform: rotate(-45deg);
}

.hud-objective {
  max-width: 260px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  text-align: right;
  display: none;
}

/* --- Pause menu --- */

.hud-pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  font-family: var(--ui-font, 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif);
  animation: hud-fade-in 0.2s ease;
}

@keyframes hud-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.hud-pause-card {
  background: var(--ui-bg, #ffffff);
  border-radius: var(--ui-radius, 14px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  padding: 36px 32px 28px;
  width: 300px;
  max-width: 85vw;
  text-align: center;
  animation: hud-card-in 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes hud-card-in {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.hud-pause-title {
  margin: 0 0 24px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--ui-blue, #2563eb);
  text-transform: uppercase;
}

.hud-pause-btn {
  display: block;
  width: 100%;
  padding: 12px 20px;
  margin-bottom: 10px;
  border: none;
  border-radius: 10px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.hud-pause-btn:last-child {
  margin-bottom: 0;
}

.hud-pause-btn--resume {
  background: var(--ui-blue, #2563eb);
  color: #ffffff;
  box-shadow: 0 3px 12px rgba(37, 99, 235, 0.35);
}

.hud-pause-btn--resume:hover {
  background: var(--ui-blue-dark, #1d4ed8);
  transform: scale(1.02);
}

.hud-pause-btn--resume:active {
  transform: scale(0.98);
}

.hud-pause-btn--quit {
  background: transparent;
  color: var(--ui-text, #1e293b);
  border: 2px solid rgba(30, 41, 59, 0.15);
}

.hud-pause-btn--quit:hover {
  background: rgba(30, 41, 59, 0.06);
  border-color: rgba(30, 41, 59, 0.3);
}
`;

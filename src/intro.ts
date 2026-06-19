// Title screen + opening dialogue cutscene.
// State machine: title -> intro -> playing.
//
// Flow:
//   1. show() displays the title overlay (MESSENGER + yellow Begin button).
//   2. Begin click / Enter / Space -> AudioManager.resume() (unlock audio)
//      -> hide title -> state 'intro' -> opening dialogue (2 lines).
//   3. Dialogue onComplete -> state 'playing' -> onStart() (game takes over).
//
// Styles are JS-injected (no CSS import) so `npx tsx -e` verification works.
// showDialogue is dynamically imported to avoid tsx parsing dialogue.css.

import { AudioManager } from './audio';
import type { DialogueLine } from './types';

export type IntroState = 'title' | 'intro' | 'playing';

export interface Intro {
  show(): void;
  getState(): IntroState;
}

const INTRO_LINES: DialogueLine[] = [
  { speaker: 'messenger', text: "LOOKS LIKE I SLEPT IN... I BETTER START TODAY'S DELIVERIES." },
  { speaker: 'messenger', text: "I'VE GOT FIVE ON THE LIST. HOPEFULLY THEY'RE EASY TO FIND." },
];

/**
 * Create the title screen + opening cutscene controller.
 *
 * @param onStart Called once after the opening dialogue completes — the
 *                integrator enables player control / 3D world here.
 * @returns { show, getState } — call show() to display the title overlay.
 */
export function createIntro(onStart: () => void): Intro {
  let state: IntroState = 'title';
  let overlay: HTMLDivElement | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  let stylesInjected = false;

  function getState(): IntroState {
    return state;
  }

  function show(): void {
    if (typeof document === 'undefined') return;
    if (overlay) return;
    ensureStyles();

    overlay = buildTitleDom();
    const mount = document.getElementById('app') ?? document.body;
    mount.appendChild(overlay);

    keyHandler = (e: KeyboardEvent): void => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        beginGame();
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  function beginGame(): void {
    if (state !== 'title') return;
    AudioManager.resume();
    hideTitle();
    state = 'intro';
    void showOpeningDialogue();
  }

  // Dynamic import: dialogue.ts imports dialogue.css which tsx cannot parse.
  // The import only runs in the browser when beginGame() is triggered.
  async function showOpeningDialogue(): Promise<void> {
    try {
      const { showDialogue } = await import('./ui/dialogue');
      showDialogue(INTRO_LINES, () => {
        state = 'playing';
        onStart();
      });
    } catch {
      // If dialogue fails to load, skip straight to playing.
      state = 'playing';
      onStart();
    }
  }

  function hideTitle(): void {
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function buildTitleDom(): HTMLDivElement {
    const root = document.createElement('div');
    root.className = 'intro-title-overlay';

    const glow = document.createElement('div');
    glow.className = 'intro-title-glow';

    const title = document.createElement('h1');
    title.className = 'intro-title-text';
    title.textContent = 'MESSENGER';

    const subtitle = document.createElement('p');
    subtitle.className = 'intro-title-subtitle';
    subtitle.textContent = 'A delivery adventure';

    const beginBtn = document.createElement('button');
    beginBtn.type = 'button';
    beginBtn.className = 'intro-begin-btn';
    beginBtn.textContent = 'Begin';
    beginBtn.setAttribute('aria-label', 'Begin game');
    beginBtn.addEventListener('click', () => {
      beginBtn.blur();
      beginGame();
    });
    // Auto-focus so Enter/Space activates the button natively.
    beginBtn.autofocus = true;
    requestAnimationFrame(() => beginBtn.focus());

    const hint = document.createElement('p');
    hint.className = 'intro-hint';
    hint.textContent = 'Press Enter or click to begin';

    root.appendChild(glow);
    root.appendChild(title);
    root.appendChild(subtitle);
    root.appendChild(beginBtn);
    root.appendChild(hint);
    return root;
  }

  function ensureStyles(): void {
    if (stylesInjected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = INTRO_CSS;
    document.head.appendChild(style);
    stylesInjected = true;
  }

  return { show, getState };
}

const INTRO_CSS = `
.intro-title-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #7dd3fc 0%, #38bdf8 32%, #06b6d4 66%, #0891b2 100%);
  font-family: var(--ui-font, 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif);
  animation: intro-fade-in 0.6s ease-out;
  overflow: hidden;
}

@keyframes intro-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.intro-title-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 70vmin;
  height: 70vmin;
  transform: translate(-50%, -55%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 68%);
  pointer-events: none;
}

.intro-title-text {
  color: #ffffff;
  font-size: clamp(48px, 13vw, 148px);
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1;
  margin: 0;
  text-align: center;
  text-shadow: 0 4px 28px rgba(8, 47, 73, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2);
  user-select: none;
  z-index: 1;
}

.intro-title-subtitle {
  color: rgba(255, 255, 255, 0.82);
  font-size: clamp(12px, 2vw, 15px);
  font-weight: 600;
  letter-spacing: 0.32em;
  margin: 16px 0 0;
  text-align: center;
  text-transform: uppercase;
  user-select: none;
  z-index: 1;
}

.intro-begin-btn {
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  background: #fbbf24;
  color: #422006;
  border: none;
  border-radius: 999px;
  padding: 16px 58px;
  font-family: inherit;
  font-size: clamp(18px, 3vw, 22px);
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: 0 6px 0 #d97706, 0 10px 30px rgba(0, 0, 0, 0.25);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.15s ease;
  animation: intro-begin-pulse 1.8s ease-in-out infinite;
  z-index: 2;
}

.intro-begin-btn:hover {
  background: #fcd34d;
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 8px 0 #d97706, 0 14px 36px rgba(0, 0, 0, 0.3);
}

.intro-begin-btn:active {
  transform: translateX(-50%) translateY(3px);
  box-shadow: 0 3px 0 #d97706, 0 6px 16px rgba(0, 0, 0, 0.25);
}

.intro-begin-btn:focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 4px;
}

@keyframes intro-begin-pulse {
  0%, 100% { box-shadow: 0 6px 0 #d97706, 0 10px 30px rgba(0, 0, 0, 0.25); }
  50% { box-shadow: 0 6px 0 #d97706, 0 10px 44px rgba(251, 191, 36, 0.55); }
}

.intro-hint {
  position: absolute;
  bottom: 7%;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-align: center;
  pointer-events: none;
  user-select: none;
}
`;

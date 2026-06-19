// Quest system: step state machine + "NEXT UP" objective overlay + completion prompt.
// Linear quests only (locked -> active -> completed). No branching, no persistence.

import type { QuestState } from './types';
import { quests } from './data/quests';
import { AudioManager } from './audio';

const HOLD_MS = 2200;
const FADE_MS = 400;
const FALLBACK_COMPLETION_TEXT = 'CONGRATULATIONS! ANOTHER SUCCESSFUL DELIVERY COMPLETED';

/**
 * Manages the 5 delivery quests as linear step state machines.
 * States: locked -> active -> completed. Steps advance linearly; reaching
 * the end of a quest's step list marks it completed.
 */
export class QuestManager {
  private states = new Map<string, QuestState>();

  constructor() {
    for (const quest of quests) {
      this.states.set(quest.id, {
        questId: quest.id,
        status: 'locked',
        currentStep: 0,
      });
    }
  }

  /** Activate a locked quest and show its first step's objective. */
  startQuest(id: string): void {
    const state = this.states.get(id);
    if (!state || state.status !== 'locked') return;
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;
    state.status = 'active';
    state.currentStep = 0;
    const step = quest.steps[0];
    if (step) {
      this.showObjective(step.objectiveText);
    }
  }

  /** Advance to the next step; completes the quest if past the last step. */
  advanceStep(id: string): void {
    const state = this.states.get(id);
    if (!state || state.status !== 'active') return;
    const quest = quests.find((q) => q.id === id);
    if (!quest) return;
    state.currentStep++;
    if (state.currentStep >= quest.steps.length) {
      this.completeQuest(id);
      return;
    }
    const step = quest.steps[state.currentStep];
    if (step) {
      this.showObjective(step.objectiveText);
    }
  }

  /** Mark an active quest completed, show completion prompt + play SFX. */
  completeQuest(id: string): void {
    const state = this.states.get(id);
    if (!state || state.status !== 'active') return;
    state.status = 'completed';
    const quest = quests.find((q) => q.id === id);
    const text = quest?.completionText ?? FALLBACK_COMPLETION_TEXT;
    this.showCompletion(text);
    AudioManager.playSfx('quest-complete');
  }

  /** True if the quest has reached 'completed' status. */
  isComplete(id: string): boolean {
    const state = this.states.get(id);
    return state?.status === 'completed';
  }

  /** Snapshot of all quest states for HUD / debug API. */
  getQuests(): Array<{ id: string; status: string; currentStep: number }> {
    return quests.map((q) => {
      const s = this.states.get(q.id);
      return {
        id: q.id,
        status: s?.status ?? 'locked',
        currentStep: s?.currentStep ?? 0,
      };
    });
  }

  /** Show the "NEXT UP" objective overlay (uppercase text, centered, auto-fade). */
  showObjective(text: string): void {
    showOverlay('NEXT UP', text, 'objective');
  }

  /** Show the completion overlay (celebratory, centered, auto-fade). */
  showCompletion(text: string): void {
    showOverlay('', text, 'completion');
  }
}

/** Shared singleton instance for integration (Task 14 / 16 / debug API). */
export const questManager = new QuestManager();

// --- Overlay UI (DOM, self-contained — no CSS import for tsx compatibility) ---

let stylesInjected = false;

function showOverlay(
  label: string,
  text: string,
  variant: 'objective' | 'completion',
): void {
  if (typeof document === 'undefined') return;
  ensureStyles();

  const overlay = document.createElement('div');
  overlay.className = `quest-overlay quest-overlay--${variant}`;

  const panel = document.createElement('div');
  panel.className = 'quest-overlay__panel';

  if (label) {
    const labelEl = document.createElement('div');
    labelEl.className = 'quest-overlay__label';
    labelEl.textContent = label;
    panel.appendChild(labelEl);
  }

  const textEl = document.createElement('div');
  textEl.className = 'quest-overlay__text';
  textEl.textContent = text;
  panel.appendChild(textEl);

  overlay.appendChild(panel);

  const mount = document.getElementById('app') ?? document.body;
  mount.appendChild(overlay);

  // Fade in on next frame.
  requestAnimationFrame(() => {
    overlay.classList.add('quest-overlay--visible');
  });

  // Hold, then fade out and remove.
  window.setTimeout(() => {
    overlay.classList.remove('quest-overlay--visible');
    window.setTimeout(() => overlay.remove(), FADE_MS);
  }, HOLD_MS);
}

function ensureStyles(): void {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = QUEST_OVERLAY_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

const QUEST_OVERLAY_CSS = `
.quest-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-family: var(--ui-font, 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif);
  opacity: 0;
  transition: opacity ${FADE_MS}ms ease;
}

.quest-overlay--visible {
  opacity: 1;
}

.quest-overlay__panel {
  text-align: center;
  padding: 24px 48px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.82);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: 80vw;
}

.quest-overlay--completion .quest-overlay__panel {
  background: rgba(15, 23, 42, 0.88);
  border: 2px solid #fbbf24;
}

.quest-overlay__label {
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: #60a5fa;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.quest-overlay__text {
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.quest-overlay--completion .quest-overlay__text {
  color: #fbbf24;
  font-size: 22px;
}
`;

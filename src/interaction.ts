// Interaction system: E key -> NPC dialogue -> quest pickup -> delivery completion.
// Wires together Task 8 (dialogue UI), Task 9 (player), Task 10 (NPC), Task 11 (quest).
//
// Flow:
//   1. Player approaches NPC, presses E -> showDialogue(npc.dialogue)
//   2. Dialogue onComplete:
//      a. If NPC has a locked quest -> startQuest + player carries item (hasItem flag)
//      b. If player carries item and NPC is current step's target -> advanceStep/completeQuest + clear item
//   3. During dialogue, player movement is disabled (player.setEnabled(false))
//   4. "Press E" hint overlay shows when near an NPC

import * as THREE from 'three';
import { getNearestNpc } from './npc';
import type { QuestManager } from './quest';
import { quests } from './data/quests';
import type { Player } from './player';
import type { NPC } from './types';

const INTERACTION_THRESHOLD = 3;

export interface Interaction {
  update(): void;
  readonly isDialogueActive: boolean;
}

/**
 * Create the interaction system that wires E-key and click dialogue triggers
 * to the quest state machine.
 *
 * @param player       Player controller (Task 9) — movement disabled during dialogue.
 * @param npcGroup     NPC group (Task 10) — used for click raycasting; getNearestNpc uses npc.ts internal registry.
 * @param questManager Quest manager (Task 11) — startQuest / advanceStep / isComplete.
 * @param camera       Perspective camera used for raycasting click → NPC.
 * @returns { update, isDialogueActive } — call update() every frame for hint display.
 */
export function createInteraction(
  player: Player,
  npcGroup: THREE.Group,
  questManager: QuestManager,
  camera: THREE.PerspectiveCamera,
): Interaction {
  let dialogueActive = false;
  let hasItem = false;
  let carriedQuestId: string | null = null;
  let hintEl: HTMLDivElement | null = null;
  let stylesInjected = false;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const canvasEl =
    typeof document !== 'undefined'
      ? document.querySelector<HTMLCanvasElement>('#app canvas')
      : null;

  function onKeyDown(e: KeyboardEvent): void {
    if (e.code !== 'KeyE') return;
    if (dialogueActive) return;
    const nearest = getNearestNpc(player.position, INTERACTION_THRESHOLD);
    if (!nearest) return;
    void startDialogue(nearest);
  }

  function onPointerDown(e: PointerEvent): void {
    if (dialogueActive) return;
    // Only trigger on canvas clicks — ignore HUD/dialogue UI elements.
    if (e.target !== canvasEl) return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(npcGroup.children, true);
    if (hits.length === 0) return;
    // Traverse up from the hit mesh to find the NPC root group (has npcId).
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData.npcId) {
      obj = obj.parent;
    }
    if (!obj) return;
    const clickedNpc = obj as THREE.Group;
    // Require the player to be in interaction range (consistent with E key).
    const nearest = getNearestNpc(player.position, INTERACTION_THRESHOLD);
    if (nearest !== clickedNpc) return;
    void startDialogue(clickedNpc);
  }

  // Dynamic import avoids tsx CSS-import incompatibility (dialogue.ts imports
  // dialogue.css which tsx cannot parse). The import only executes in the
  // browser when createInteraction is actually called, never during tsx
  // module loading.
  async function startDialogue(npcGroup: THREE.Group): Promise<void> {
    try {
      const { showDialogue } = await import('./ui/dialogue');
      const npcData = npcGroup.userData.npcData as NPC;
      dialogueActive = true;
      player.setEnabled(false);
      hideHint();
      showDialogue(npcData.dialogue, () => onDialogueComplete(npcData));
    } catch {
      dialogueActive = false;
      player.setEnabled(true);
    }
  }

  function onDialogueComplete(npcData: NPC): void {
    if (hasItem && carriedQuestId) {
      tryDeliver(npcData.id);
    } else if (npcData.questId) {
      tryPickupQuest(npcData.questId);
    }

    player.setEnabled(true);
    dialogueActive = false;
  }

  function tryDeliver(npcId: string): void {
    if (!carriedQuestId) return;
    const questState = questManager
      .getQuests()
      .find((q) => q.id === carriedQuestId);
    if (!questState || questState.status !== 'active') return;

    const quest = quests.find((q) => q.id === carriedQuestId);
    const step = quest?.steps[questState.currentStep];
    if (step?.targetNpcId !== npcId) return;

    questManager.advanceStep(carriedQuestId);
    if (questManager.isComplete(carriedQuestId)) {
      hasItem = false;
      carriedQuestId = null;
    }
  }

  function tryPickupQuest(questId: string): void {
    const questState = questManager.getQuests().find((q) => q.id === questId);
    if (questState?.status !== 'locked') return;
    questManager.startQuest(questId);
    hasItem = true;
    carriedQuestId = questId;
  }

  function update(): void {
    if (dialogueActive) {
      hideHint();
      return;
    }
    const nearest = getNearestNpc(player.position, INTERACTION_THRESHOLD);
    if (nearest) {
      showHint();
    } else {
      hideHint();
    }
  }

  function showHint(): void {
    if (typeof document === 'undefined') return;
    if (!hintEl) {
      ensureStyles();
      hintEl = document.createElement('div');
      hintEl.className = 'interaction-hint';
      hintEl.textContent = 'Press E or click to interact';
      const mount = document.getElementById('app') ?? document.body;
      mount.appendChild(hintEl);
    }
    hintEl.style.display = '';
  }

  function hideHint(): void {
    if (hintEl) {
      hintEl.style.display = 'none';
    }
  }

  function ensureStyles(): void {
    if (stylesInjected || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = INTERACTION_CSS;
    document.head.appendChild(style);
    stylesInjected = true;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
  }

  return {
    update,
    get isDialogueActive(): boolean {
      return dialogueActive;
    },
  };
}

const INTERACTION_CSS = `
.interaction-hint {
  position: fixed;
  bottom: 25%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.82);
  color: #ffffff;
  padding: 8px 20px;
  border-radius: 8px;
  font-family: var(--ui-font, 'Nunito', 'Avenir Next', 'Segoe UI', sans-serif);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.05em;
  pointer-events: none;
  z-index: 80;
  text-transform: uppercase;
  display: none;
}
`;

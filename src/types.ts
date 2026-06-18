// Core data model for the messager quest/NPC/dialogue system.
// Pure type definitions — no runtime logic, no validation.

/** A single atomic step within a quest. */
export interface QuestStep {
  id: string;
  type: 'talk' | 'deliver' | 'goto';
  /** NPC the step is resolved against (required for talk/deliver, optional for goto). */
  targetNpcId?: string;
  /** Uppercase player-facing objective text. */
  objectiveText: string;
}

/** A delivery quest: a chain of steps given by an NPC. */
export interface Quest {
  id: string;
  title: string;
  /** NPC who offers this quest. */
  giverNpcId: string;
  steps: QuestStep[];
  completionText: string;
}

/** Runtime state of a quest for the player. */
export interface QuestState {
  questId: string;
  status: 'locked' | 'active' | 'completed';
  /** Index into Quest.steps of the next unresolved step. */
  currentStep: number;
}

/** One line of NPC dialogue. */
export interface DialogueLine {
  speaker: string;
  text: string;
}

/** A non-player character standing on the planet surface. */
export interface NPC {
  id: string;
  name: string;
  /** Hex color used for the NPC marker. */
  color: number;
  /** Position on the planet sphere (radius ~25). */
  position: [number, number, number];
  dialogue: DialogueLine[];
  /** Quest this NPC offers, if any. */
  questId?: string;
}

/** A named region of the world. */
export interface Region {
  id: string;
  name: string;
  center: [number, number, number];
}

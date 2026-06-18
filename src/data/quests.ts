import type { Quest } from '../types';

// Five delivery quests adapted from the original messager game.
// objectiveText is uppercase per the game's convention.
// completionText is shared across all quests.

const COMPLETION_TEXT = 'CONGRATULATIONS! ANOTHER SUCCESSFUL DELIVERY COMPLETED';

export const quests: Quest[] = [
  {
    id: 'quest_0',
    title: 'The Office Worker\'s Regret',
    giverNpcId: 'worker',
    steps: [
      {
        id: 'q0_s0',
        type: 'goto',
        objectiveText: 'FIND THE RED CLIFF HOUSE AND GET THE LETTER BACK',
      },
      {
        id: 'q0_s1',
        type: 'talk',
        targetNpcId: 'worker',
        objectiveText: 'TELL THE OFFICE WORKER THE LETTER IS SAFE',
      },
    ],
    completionText: COMPLETION_TEXT,
  },
  {
    id: 'quest_1',
    title: 'A Letter to Brother Dave',
    giverNpcId: 'kid',
    steps: [
      {
        id: 'q1_s0',
        type: 'deliver',
        targetNpcId: 'dave',
        objectiveText: 'TAKE THE MYSTERY LETTER TO DAVE AT SMELLY FALLS',
      },
    ],
    completionText: COMPLETION_TEXT,
  },
  {
    id: 'quest_2',
    title: 'Clean Clothes for the Cave',
    giverNpcId: 'caveman',
    steps: [
      {
        id: 'q2_s0',
        type: 'deliver',
        objectiveText: 'GO BACK TO THE MAN IN THE CAVE AND DELIVER THE CLOTHES',
      },
    ],
    completionText: COMPLETION_TEXT,
  },
  {
    id: 'quest_3',
    title: 'The Mixed-Up Letter',
    giverNpcId: 'doctor',
    steps: [
      {
        id: 'q3_s0',
        type: 'deliver',
        objectiveText: 'BRING THE MIXED-UP LETTER TO DOCTOR FREBI AT CAPITAL CORP',
      },
    ],
    completionText: COMPLETION_TEXT,
  },
  {
    id: 'quest_4',
    title: 'Dave\'s Song Request',
    giverNpcId: 'dave',
    steps: [
      {
        id: 'q4_s0',
        type: 'talk',
        objectiveText: 'DELIVER DAVE\'S SONG REQUEST TO THE MUSICIAN BY THE TEMPLE',
      },
    ],
    completionText: COMPLETION_TEXT,
  },
];

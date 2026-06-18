import type { NPC } from '../types';

// Five NPCs placed on the planet sphere (radius ~25), spread across the surface.
// Dialogue is adapted from the original messager game; speaker is the NPC's name.

export const npcs: NPC[] = [
  {
    id: 'worker',
    name: 'Office Worker',
    color: 0x808080,
    position: [-18, 17, 0],
    questId: 'quest_0',
    dialogue: [
      {
        speaker: 'Office Worker',
        text: "thank god you're here! i sent a letter to my boss earlier, but i need to get it back before he sees it...",
      },
      {
        speaker: 'Office Worker',
        text: 'he works at the red cliff house. please, hurry!',
      },
      {
        speaker: 'Office Worker',
        text: "if he reads that letter, i'm done for.",
      },
    ],
  },
  {
    id: 'kid',
    name: 'Young Kid',
    color: 0xffd700,
    position: [0, 25, 0],
    questId: 'quest_1',
    dialogue: [
      {
        speaker: 'Young Kid',
        text: 'hi, how are you doing? i was wondering if you would mind delivering this letter to my brother.',
      },
      {
        speaker: 'Young Kid',
        text: "he's a musician, you'll find him at smelly falls.",
      },
      {
        speaker: 'Young Kid',
        text: 'he goes by dave. thanks a lot!',
      },
    ],
  },
  {
    id: 'dave',
    name: 'Dave the Musician',
    color: 0x4169e1,
    position: [25, 0, 0],
    questId: 'quest_4',
    dialogue: [
      {
        speaker: 'Dave the Musician',
        text: 'a letter for me? from under the sea? the one who wrote it... is me!',
      },
      {
        speaker: 'Dave the Musician',
        text: "play me a song and i'll give you something in return.",
      },
      {
        speaker: 'Dave the Musician',
        text: "music is the only thing that makes sense down here.",
      },
    ],
  },
  {
    id: 'doctor',
    name: 'Doctor Frieb',
    color: 0xffffff,
    position: [0, -18, 17],
    questId: 'quest_3',
    dialogue: [
      {
        speaker: 'Doctor Frieb',
        text: 'they probably mixed me up with doctor frebi at capital corp...',
      },
      {
        speaker: 'Doctor Frieb',
        text: 'could you bring this to the right address?',
      },
      {
        speaker: 'Doctor Frieb',
        text: "these mix-ups happen all the time, i'm afraid.",
      },
    ],
  },
  {
    id: 'caveman',
    name: 'Cave Man',
    color: 0x8b4513,
    position: [0, 0, -25],
    questId: 'quest_2',
    dialogue: [
      {
        speaker: 'Cave Man',
        text: "would you mind bringing him these clean clothes? don't let him catch you.",
      },
      {
        speaker: 'Cave Man',
        text: "i've been waiting here so long.",
      },
      {
        speaker: 'Cave Man',
        text: "the cave is cold, but it's home.",
      },
    ],
  },
];

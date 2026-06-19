import type { DialogueLine } from '../types';
import './dialogue.css';

interface DialogueState {
  overlay: HTMLDivElement;
  nameTag: HTMLDivElement;
  text: HTMLParagraphElement;
  lines: DialogueLine[];
  index: number;
  onComplete: (() => void) | null;
  typewriterId: number | null;
  typing: boolean;
  fullText: string;
  keydownHandler: (e: KeyboardEvent) => void;
}

let state: DialogueState | null = null;

const TYPEWRITER_MS = 18;

export function showDialogue(lines: DialogueLine[], onComplete: () => void): void {
  if (state) hideDialogue();

  if (lines.length === 0) {
    onComplete();
    return;
  }

  const keydownHandler = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
      e.preventDefault();
      advance();
    }
  };

  const s: DialogueState = {
    ...buildDom(),
    lines,
    index: 0,
    onComplete,
    typewriterId: null,
    typing: false,
    fullText: '',
    keydownHandler,
  };
  state = s;

  const app = document.getElementById('app');
  (app ?? document.body).appendChild(s.overlay);

  window.addEventListener('keydown', keydownHandler);

  showLine(s, 0);
}

export function hideDialogue(): void {
  if (!state) return;
  const s = state;
  state = null;

  window.removeEventListener('keydown', s.keydownHandler);
  stopTypewriter(s);
  s.overlay.remove();
}

function showLine(s: DialogueState, index: number): void {
  const line = s.lines[index];
  if (!line) return;
  s.nameTag.textContent = line.speaker;
  startTypewriter(s, line.text);
}

function startTypewriter(s: DialogueState, text: string): void {
  stopTypewriter(s);
  s.fullText = text;
  s.text.textContent = '';
  s.text.classList.add('typing');
  s.typing = true;

  let i = 0;
  s.typewriterId = window.setInterval(() => {
    if (i < text.length) {
      s.text.textContent += text[i];
      i++;
    } else {
      stopTypewriter(s);
    }
  }, TYPEWRITER_MS);
}

function stopTypewriter(s: DialogueState): void {
  if (s.typewriterId !== null) {
    window.clearInterval(s.typewriterId);
    s.typewriterId = null;
  }
  s.typing = false;
  s.text.classList.remove('typing');
}

function advance(): void {
  if (!state) return;
  const s = state;

  if (s.typing) {
    stopTypewriter(s);
    s.text.textContent = s.fullText;
    return;
  }

  s.index++;
  if (s.index >= s.lines.length) {
    const cb = s.onComplete;
    hideDialogue();
    cb?.();
    return;
  }

  showLine(s, s.index);
}

function buildDom(): Pick<DialogueState, 'overlay' | 'nameTag' | 'text'> {
  const overlay = document.createElement('div');
  overlay.className = 'dialogue-overlay';

  const box = document.createElement('div');
  box.className = 'dialogue-box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'NPC dialogue');

  const nameTag = document.createElement('div');
  nameTag.className = 'dialogue-name-tag';

  const text = document.createElement('p');
  text.className = 'dialogue-text';

  const advanceBtn = document.createElement('button');
  advanceBtn.className = 'dialogue-advance';
  advanceBtn.type = 'button';
  advanceBtn.setAttribute('aria-label', 'Advance dialogue');
  advanceBtn.textContent = '\u25B6';
  advanceBtn.addEventListener('click', () => {
    advanceBtn.blur();
    advance();
  });

  box.appendChild(nameTag);
  box.appendChild(text);
  box.appendChild(advanceBtn);
  overlay.appendChild(box);

  return { overlay, nameTag, text };
}

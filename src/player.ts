import * as THREE from 'three';
import { createCharacter, setAnimation, updateCharacter } from './character';
import type { AnimationState } from './character';
import { planetRadius, snapToSurface, getSurfaceNormal } from './world';
import { applyGravity } from './gravity';
import { AudioManager } from './audio';

const FORWARD_SPEED = 3.0;
const TURN_SPEED = 2.0;
const JUMP_FORCE = 6.0;
const SPRINT_MULTIPLIER = 1.8;
const GROUND_THRESHOLD = 0.01;
const FOOTSTEP_INTERVAL = 0.35;

let footstepTimer = 0;

export interface InputState {
  forward: boolean;
  backward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  jump: boolean;
  sprint: boolean;
}

export interface Player {
  group: THREE.Group;
  position: THREE.Vector3;
  up: THREE.Vector3;
  velocity: THREE.Vector3;
  update(dt: number, time: number): void;
  getInputState(): InputState;
  setEnabled(enabled: boolean): void;
}

const KEY_MAP: Record<string, keyof InputState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'jump',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
};

const LOCAL_UP = new THREE.Vector3(0, 1, 0);

export function createPlayer(_world?: unknown): Player {
  const group = createCharacter();

  const startPos = new THREE.Vector3(0, planetRadius, 0);
  group.position.copy(startPos);
  group.up.copy(getSurfaceNormal(startPos));

  const velocity = new THREE.Vector3();
  const keys = new Set<keyof InputState>();
  let enabled = true;
  let jumpRequested = false;
  let isGrounded = true;
  let currentAnim: AnimationState = 'idle';

  function onKeyDown(e: KeyboardEvent): void {
    const action = KEY_MAP[e.code];
    if (!action) return;
    keys.add(action);
    if (action === 'jump' && !e.repeat) jumpRequested = true;
    e.preventDefault();
  }

  function onKeyUp(e: KeyboardEvent): void {
    const action = KEY_MAP[e.code];
    if (!action) return;
    keys.delete(action);
    e.preventDefault();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function getInputState(): InputState {
    return {
      forward: keys.has('forward'),
      backward: keys.has('backward'),
      turnLeft: keys.has('turnLeft'),
      turnRight: keys.has('turnRight'),
      jump: keys.has('jump'),
      sprint: keys.has('sprint'),
    };
  }

  function setEnabled(e: boolean): void {
    enabled = e;
    if (!e) keys.clear();
  }

  const _up = new THREE.Vector3();
  const _forward = new THREE.Vector3();
  const _axis = new THREE.Vector3();
  const _q = new THREE.Quaternion();

  function update(dt: number, time: number): void {
    _up.copy(getSurfaceNormal(group.position));
    group.up.copy(_up);

    if (enabled && jumpRequested && isGrounded) {
      velocity.copy(_up).multiplyScalar(JUMP_FORCE);
      isGrounded = false;
      AudioManager.playSfx('jump');
    }
    jumpRequested = false;

    applyGravity(group, velocity, dt, undefined, 0);

    if (group.position.length() <= planetRadius + GROUND_THRESHOLD) {
      isGrounded = true;
    }

    let moving = false;
    if (isGrounded && enabled) {
      const input = getInputState();
      const speedMul = input.sprint ? SPRINT_MULTIPLIER : 1.0;

      if (input.turnLeft) {
        group.rotateOnAxis(LOCAL_UP, TURN_SPEED * dt);
      }
      if (input.turnRight) {
        group.rotateOnAxis(LOCAL_UP, -TURN_SPEED * dt);
      }

      const moveDir = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      if (moveDir !== 0) {
        group.getWorldDirection(_forward);
        _axis.crossVectors(_up, _forward);
        if (_axis.lengthSq() > 1e-10) {
          _axis.normalize();
          const angle = FORWARD_SPEED * speedMul * moveDir * dt;
          _q.setFromAxisAngle(_axis, angle);
          group.position.applyQuaternion(_q);
          group.quaternion.premultiply(_q);
          moving = true;
        }
      }
    }

    if (isGrounded) {
      snapToSurface(group.position, 0);
    }

    if (moving && isGrounded) {
      footstepTimer += dt;
      if (footstepTimer >= FOOTSTEP_INTERVAL) {
        footstepTimer = 0;
        AudioManager.playSfx('footstep');
      }
    } else {
      footstepTimer = 0;
    }

    const newAnim: AnimationState = moving ? 'walk' : 'idle';
    if (newAnim !== currentAnim) {
      setAnimation(group, newAnim);
      currentAnim = newAnim;
    }
    updateCharacter(group, time);
  }

  const player: Player = {
    group,
    position: group.position,
    up: group.up,
    velocity,
    update,
    getInputState,
    setEnabled,
  };
  return player;
}

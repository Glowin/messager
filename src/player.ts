import * as THREE from 'three';
import { createCharacter, setAnimation, setFacing, updateCharacter } from './character';
import type { AnimationState } from './character';
import { planetRadius, snapToSurface, getSurfaceNormal } from './world';
import { applyGravity } from './gravity';
import { AudioManager } from './audio';

const FORWARD_SPEED = 0.2;
const STRAFE_SPEED = 0.2;
const CAMERA_TURN_SPEED = 0.15; // < STRAFE_SPEED — camera yaws slower than character
const LOCAL_UP = new THREE.Vector3(0, 1, 0); // local Y = surface normal (player up)
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
  let lastFacing = 0;

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
    dt = Math.min(dt, 0.1); // clamp dt — prevents flip on tab-switch (huge dt from paused rAF)
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
    let sprinting = false;
    if (isGrounded && enabled) {
      const input = getInputState();
      sprinting = input.sprint;
      const speedMul = sprinting ? SPRINT_MULTIPLIER : 1.0;

      // Determine facing angle from movement input.
      // Priority: forward > backward > left > right > keep last.
      let facing = lastFacing;
      if (input.forward) {
        facing = 0;
      } else if (input.backward) {
        facing = Math.PI;
      } else if (input.turnLeft) {
        facing = -Math.PI / 2;
      } else if (input.turnRight) {
        facing = Math.PI / 2;
      }
      if (facing !== lastFacing) {
        setFacing(group, facing);
        lastFacing = facing;
      }

      // Forward / backward.
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

      // Strafe (A/D): rotate around forward axis — keeps group forward (and
      // thus camera view) fixed. strafeDir=+1 (D) → +θ → right;
      // strafeDir=-1 (A) → -θ → left.
      const strafeDir =
        (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
      if (strafeDir !== 0) {
        group.getWorldDirection(_forward);
        const angle = STRAFE_SPEED * speedMul * strafeDir * dt;
        _q.setFromAxisAngle(_forward, angle);
        group.position.applyQuaternion(_q);
        group.quaternion.premultiply(_q);
        moving = true;

        // Camera yaw: turns the view in the same direction as the strafe,
        // but at a smaller rate than the character's facing change.
        // A (strafeDir=-1, left)  → +yaw (camera left)
        // D (strafeDir=+1, right) → -yaw (camera right)
        group.rotateOnAxis(LOCAL_UP, -CAMERA_TURN_SPEED * strafeDir * dt);
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

    let newAnim: AnimationState;
    if (!isGrounded) {
      newAnim = 'jump';
    } else if (moving && sprinting) {
      newAnim = 'run';
    } else if (moving) {
      newAnim = 'walk';
    } else {
      newAnim = 'idle';
    }
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

import { Howl, Howler } from 'howler'

/**
 * AudioManager — singleton wrapping Howler.js for the Messenger game.
 *
 * Provides bgm loop, named sfx, global mute, and a resume() hook to unlock
 * the WebAudio context on a user gesture (called from the title-screen Begin
 * button in Task 15).
 *
 * All playback is fault-tolerant: missing/unloaded audio fails silently
 * (Howler's onload/onplayerror handlers swallow errors) so the game never
 * crashes on audio.
 */

const BGM_VOLUME = 0.4
const SFX_VOLUME = 0.6

export type SfxName = 'jump' | 'footstep' | 'quest-complete' | 'dialogue'

const SFX_PATHS: Record<SfxName, string> = {
  jump: '/audio/sfx/jump.mp3',
  footstep: '/audio/sfx/footstep.mp3',
  'quest-complete': '/audio/sfx/quest-complete.mp3',
  dialogue: '/audio/sfx/dialogue.mp3',
}

class AudioManagerClass {
  private bgm: Howl | null = null
  private sfxCache = new Map<SfxName, Howl>()
  private muted = false

  /**
   * Start (or restart) the lo-fi background loop. Safe to call before the
   * file has finished loading — Howler queues playback. Also safe to call
   * repeatedly; subsequent calls are no-ops if bgm is already playing.
   */
  playBgm(): void {
    if (this.bgm && this.bgm.playing()) return
    if (!this.bgm) {
      this.bgm = new Howl({
        src: ['/audio/bgm.mp3'],
        loop: true,
        volume: BGM_VOLUME,
        html5: false,
        onloaderror: () => {
          // Missing/corrupt bgm — fail silently, game continues.
        },
        onplayerror: () => {
          // Autoplay blocked or decode error — fail silently.
        },
      })
    }
    try {
      this.bgm.play()
    } catch {
      // Howler should not throw, but guard anyway.
    }
  }

  /**
   * Play a one-shot sound effect by name. Loads lazily and caches the Howl.
   * Missing audio fails silently (onloaderror swallows the failure).
   */
  playSfx(name: SfxName): void {
    let sfx = this.sfxCache.get(name)
    if (!sfx) {
      sfx = new Howl({
        src: [SFX_PATHS[name]],
        volume: SFX_VOLUME,
        html5: false,
        onloaderror: () => {
          // Missing/corrupt sfx — fail silently.
        },
        onplayerror: () => {
          // Decode/autoplay error — fail silently.
        },
      })
      this.sfxCache.set(name, sfx)
    }
    try {
      sfx.play()
    } catch {
      // Guard against unexpected throws.
    }
  }

  /**
   * Mute or unmute all audio globally via Howler.mute().
   */
  setMuted(muted: boolean): void {
    this.muted = muted
    Howler.mute(muted)
  }

  isMuted(): boolean {
    return this.muted
  }

  /**
   * Resume the WebAudio context after a user gesture (e.g. title-screen
   * Begin click). Required because browsers start AudioContext in
   * 'suspended' state until a gesture unlocks it.
   */
  resume(): void {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        // Resume can reject if context is closed — ignore.
      })
    }
  }
}

export const AudioManager = new AudioManagerClass()

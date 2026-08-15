import type { KartControls } from './game/kart'

const THROTTLE_KEYS = new Set([
  'KeyW',
  'ArrowUp',
])
const BRAKE_KEYS = new Set(['KeyS', 'ArrowDown', 'Space'])
const STEER_LEFT_KEYS = new Set(['KeyA', 'ArrowLeft'])
const STEER_RIGHT_KEYS = new Set(['KeyD', 'ArrowRight'])
const DRIFT_KEYS = new Set(['ShiftLeft', 'ShiftRight'])

export class Input {
  private keys = new Set<string>()
  private onKeyDown: (e: KeyboardEvent) => void
  private onKeyUp: (e: KeyboardEvent) => void
  private onBlur: () => void

  public wantsRestart = false
  public steerSmooth = 0

  constructor() {
    this.onKeyDown = (e) => {
      if (e.repeat) return
      if (THROTTLE_KEYS.has(e.code) || BRAKE_KEYS.has(e.code))
        e.preventDefault()
      this.keys.add(e.code)
      if (e.code === 'KeyR') this.wantsRestart = true
    }
    this.onKeyUp = (e) => this.keys.delete(e.code)
    this.onBlur = () => this.keys.clear()
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  driftHeld(): boolean {
    return this.down(DRIFT_KEYS)
  }

  anyKeyDown(): boolean {
    return this.keys.size > 0
  }

  readControls(dt: number): KartControls {
    const throttle = this.down(THROTTLE_KEYS) ? 1 : 0
    const brake = this.down(BRAKE_KEYS) ? 1 : 0
    const target = this.down(STEER_RIGHT_KEYS)
      ? 1
      : this.down(STEER_LEFT_KEYS)
        ? -1
        : 0
    const rate = 6
    const step = rate * dt
    this.steerSmooth =
      Math.abs(target - this.steerSmooth) <= step
        ? target
        : this.steerSmooth + Math.sign(target - this.steerSmooth) * step
    return { throttle, brake, steer: this.steerSmooth }
  }

  private down(codes: Set<string>): boolean {
    for (const c of codes) if (this.keys.has(c)) return true
    return false
  }
}

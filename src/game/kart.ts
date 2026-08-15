import type { Vec2 } from './types'

export interface KartState {
  pos: Vec2
  heading: number
  speed: number
}

export interface KartControls {
  throttle: number
  brake: number
  steer: number
}

export const KART_CONFIG = {
  maxSpeed: 40,
  maxReverse: 10,
  engineAccel: 28,
  brakeDecel: 55,
  reverseAccel: 8,
  coastDrag: 0.6,
  coastDragConstant: 2,
  turnRate: 1.75,
  turnRefSpeed: 15,
  highSpeedTurnFloor: 0.62,
}

// Steering authority vs speed: rises linearly to 1 at turnRefSpeed, then
// tapers toward highSpeedTurnFloor — steady, less twitchy steering at pace.
export function turnFactorFor(speed: number): number {
  const v = Math.abs(speed)
  const { turnRefSpeed: ref, maxSpeed, highSpeedTurnFloor: floor } = KART_CONFIG
  if (v <= ref) return v / ref
  const t = Math.min(1, (v - ref) / (maxSpeed - ref))
  return 1 + (floor - 1) * t
}

export interface StepOptions {
  turnMul?: number
  slide?: number
  accelMul?: number
  maxSpeedMul?: number
  /** road grade dh/ds along heading; positive = uphill. Feels like gravity. */
  slope?: number
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))

export function createKart(pos: Vec2, heading: number): KartState {
  return { pos: { x: pos.x, z: pos.z }, heading, speed: 0 }
}

export function stepKart(
  kart: KartState,
  controls: KartControls,
  dt: number,
  grip = 1,
  opts: StepOptions = {},
): void {
  const throttle = clamp(controls.throttle, 0, 1)
  const brake = clamp(controls.brake, 0, 1)
  const steer = clamp(controls.steer, -1, 1)
  const accelMul = opts.accelMul ?? 1
  const gravityAlong = -9.81 * (opts.slope ?? 0)

  let speed = kart.speed
  if (kart.speed > 0) {
    speed += throttle * KART_CONFIG.engineAccel * grip * accelMul * dt
    const coasting = 1 - throttle
    const decel =
      brake * KART_CONFIG.brakeDecel +
      (KART_CONFIG.coastDrag * speed + KART_CONFIG.coastDragConstant) * coasting
    speed -= decel * dt
    if (speed < 0) speed = 0
  } else if (kart.speed < 0) {
    speed += throttle * KART_CONFIG.engineAccel * grip * dt
    speed -= brake * KART_CONFIG.reverseAccel * grip * dt
    speed +=
      (KART_CONFIG.coastDrag * -speed + KART_CONFIG.coastDragConstant) * dt
    if (speed > 0) speed = 0
  } else if (throttle > 0) {
    speed += throttle * KART_CONFIG.engineAccel * grip * accelMul * dt
  } else if (brake > 0) {
    speed -= brake * KART_CONFIG.reverseAccel * grip * dt
  }
  if (kart.speed !== 0) speed += gravityAlong * dt

  const maxSpeed =
    KART_CONFIG.maxSpeed * (0.4 + 0.6 * grip) * (opts.maxSpeedMul ?? 1)
  speed = clamp(speed, -KART_CONFIG.maxReverse, maxSpeed)

  const speedFactor = turnFactorFor(kart.speed)
  const dir = kart.speed >= 0 ? 1 : -1
  kart.heading +=
    -steer * KART_CONFIG.turnRate * (opts.turnMul ?? 1) * speedFactor * dir * dt

  kart.speed = speed
  kart.pos.x += Math.sin(kart.heading) * kart.speed * dt
  kart.pos.z += Math.cos(kart.heading) * kart.speed * dt
  const slide = opts.slide ?? 0
  if (slide !== 0) {
    kart.pos.x += -Math.cos(kart.heading) * slide * dt
    kart.pos.z += Math.sin(kart.heading) * slide * dt
  }
}

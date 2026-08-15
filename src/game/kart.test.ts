import { describe, it, expect } from 'vitest'
import {
  createKart,
  stepKart,
  KART_CONFIG,
  type KartControls,
} from './kart'

const NEUTRAL: KartControls = { throttle: 0, brake: 0, steer: 0 }
const FULL_THROTTLE: KartControls = { throttle: 1, brake: 0, steer: 0 }

describe('createKart', () => {
  it('starts at rest at the given position and heading', () => {
    const kart = createKart({ x: 3, z: -2 }, Math.PI / 2)
    expect(kart.pos).toEqual({ x: 3, z: -2 })
    expect(kart.heading).toBeCloseTo(Math.PI / 2)
    expect(kart.speed).toBe(0)
  })
})

describe('stepKart acceleration', () => {
  it('increases speed under full throttle', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    stepKart(kart, FULL_THROTTLE, 1 / 120)
    expect(kart.speed).toBeGreaterThan(0)
  })

  it('accelerates from rest at engineAccel rate', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    stepKart(kart, FULL_THROTTLE, 1 / 120)
    expect(kart.speed).toBeCloseTo(KART_CONFIG.engineAccel * (1 / 120), 5)
  })

  it('caps speed at maxSpeed', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    for (let i = 0; i < 120 * 30; i++) stepKart(kart, FULL_THROTTLE, 1 / 120)
    expect(kart.speed).toBeLessThanOrEqual(KART_CONFIG.maxSpeed)
    expect(kart.speed).toBeCloseTo(KART_CONFIG.maxSpeed, 2)
  })

  it('clamps out-of-range inputs to [-1, 1]', () => {
    const a = createKart({ x: 0, z: 0 }, 0)
    const b = createKart({ x: 0, z: 0 }, 0)
    stepKart(a, { throttle: 5, brake: 0, steer: 0 }, 1 / 120)
    stepKart(b, FULL_THROTTLE, 1 / 120)
    expect(a.speed).toBe(b.speed)
  })

  it('reduces grip slows acceleration and top speed', () => {
    const grip = createKart({ x: 0, z: 0 }, 0)
    for (let i = 0; i < 120 * 30; i++)
      stepKart(grip, FULL_THROTTLE, 1 / 120, 0.3)
    expect(grip.speed).toBeLessThan(KART_CONFIG.maxSpeed * 0.7)
  })
})

describe('stepKart braking and coasting', () => {
  it('coasts toward zero without throttle', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = 20
    stepKart(kart, NEUTRAL, 1 / 120)
    expect(kart.speed).toBeLessThan(20)
    for (let i = 0; i < 120 * 60; i++) stepKart(kart, NEUTRAL, 1 / 120)
    expect(Math.abs(kart.speed)).toBeLessThan(0.01)
  })

  it('brakes to an exact stop without undershooting', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = 30
    let stoppedAt = -1
    for (let i = 0; i < 120; i++) {
      stepKart(kart, { throttle: 0, brake: 1, steer: 0 }, 1 / 120)
      if (kart.speed <= 0) {
        stoppedAt = i
        break
      }
    }
    expect(stoppedAt).toBeGreaterThanOrEqual(0)
    expect(kart.speed).toBe(0)
  })

  it('reverses slowly when braking from rest, up to maxReverse', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    for (let i = 0; i < 120 * 10; i++)
      stepKart(kart, { throttle: 0, brake: 1, steer: 0 }, 1 / 120)
    expect(kart.speed).toBeLessThan(0)
    expect(kart.speed).toBeGreaterThanOrEqual(-KART_CONFIG.maxReverse)
  })
})

describe('stepKart steering', () => {
  it('does not turn while stationary', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    stepKart(kart, { throttle: 0, brake: 0, steer: 1 }, 1 / 120)
    expect(kart.heading).toBe(0)
  })

  it('steering right at speed turns heading clockwise (negative)', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = KART_CONFIG.turnRefSpeed
    stepKart(kart, { throttle: 0, brake: 0, steer: 1 }, 1 / 120)
    expect(kart.heading).toBeLessThan(0)
  })

  it('steering left is mirrored', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = KART_CONFIG.turnRefSpeed
    const left = { throttle: 0, brake: 0, steer: -1 }
    const right = { throttle: 0, brake: 0, steer: 1 }
    const a = createKart({ x: 0, z: 0 }, 0)
    a.speed = kart.speed
    stepKart(kart, left, 1 / 120)
    stepKart(a, right, 1 / 120)
    expect(kart.heading).toBeCloseTo(-a.heading, 6)
  })

  it('turn rate scales up with speed until turnRefSpeed', () => {
    const slow = createKart({ x: 0, z: 0 }, 0)
    slow.speed = KART_CONFIG.turnRefSpeed / 4
    const fast = createKart({ x: 0, z: 0 }, 0)
    fast.speed = KART_CONFIG.turnRefSpeed
    stepKart(slow, { throttle: 0, brake: 0, steer: 1 }, 1 / 120)
    stepKart(fast, { throttle: 0, brake: 0, steer: 1 }, 1 / 120)
    expect(Math.abs(fast.heading)).toBeCloseTo(
      Math.abs(slow.heading) * 4,
      4,
    )
  })

  it('steering direction inverts in reverse, like a real kart', () => {
    const fwd = createKart({ x: 0, z: 0 }, 0)
    fwd.speed = 10
    const rev = createKart({ x: 0, z: 0 }, 0)
    rev.speed = -10
    stepKart(fwd, { throttle: 0, brake: 0, steer: 1 }, 1 / 120)
    stepKart(rev, { throttle: 0, brake: 0, steer: 1 }, 1 / 120)
    expect(Math.sign(fwd.heading)).not.toBe(Math.sign(rev.heading))
  })
})

describe('stepKart drift options', () => {
  it('turnMul scales the turn rate', () => {
    const plain = createKart({ x: 0, z: 0 }, 0)
    const wide = createKart({ x: 0, z: 0 }, 0)
    plain.speed = 15
    wide.speed = 15
    const c: KartControls = { throttle: 0, brake: 0, steer: 1 }
    stepKart(plain, c, 1 / 120)
    stepKart(wide, c, 1 / 120, 1, { turnMul: 2 })
    expect(wide.heading).toBeCloseTo(plain.heading * 2, 6)
  })

  it('slide moves the kart laterally: positive slide is toward local -x at heading 0', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = 10
    stepKart(kart, NEUTRAL, 1 / 2, 1, { slide: 4 })
    expect(kart.pos.x).toBeCloseTo(-2, 5)
    expect(kart.pos.z).toBeGreaterThan(0)
  })

  it('maxSpeedMul and accelMul raise the caps during boost', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = KART_CONFIG.maxSpeed
    stepKart(kart, FULL_THROTTLE, 1 / 120, 1, {
      maxSpeedMul: 1.3,
      accelMul: 2,
    })
    expect(kart.speed).toBeGreaterThan(KART_CONFIG.maxSpeed)
  })
})

describe('stepKart integration', () => {
  it('moves along the heading direction: heading 0 drives toward +z', () => {
    const kart = createKart({ x: 0, z: 0 }, 0)
    kart.speed = 10
    stepKart(kart, NEUTRAL, 1 / 120)
    expect(kart.pos.z).toBeGreaterThan(0)
    expect(kart.pos.x).toBeCloseTo(0, 6)
    const west = createKart({ x: 0, z: 0 }, -Math.PI / 2)
    west.speed = 10
    stepKart(west, NEUTRAL, 1 / 120)
    expect(west.pos.x).toBeLessThan(0)
    expect(west.pos.z).toBeCloseTo(0, 6)
  })

  it('is deterministic: identical runs produce identical states', () => {
    const steer: KartControls = { throttle: 1, brake: 0, steer: 0.4 }
    const a = createKart({ x: 5, z: -7 }, 1.2)
    const b = createKart({ x: 5, z: -7 }, 1.2)
    for (let i = 0; i < 600; i++) {
      stepKart(a, steer, 1 / 120)
      stepKart(b, steer, 1 / 120)
    }
    expect(a).toEqual(b)
  })

  it('diverges only marginally across step sizes', () => {
    const coarse = createKart({ x: 0, z: 0 }, 0.3)
    const fine = createKart({ x: 0, z: 0 }, 0.3)
    const steer: KartControls = { throttle: 1, brake: 0, steer: 0.4 }
    for (let i = 0; i < 120; i++) stepKart(coarse, steer, 1 / 120)
    for (let i = 0; i < 240; i++) stepKart(fine, steer, 1 / 240)
    expect(Math.abs(fine.pos.x - coarse.pos.x)).toBeLessThan(0.1)
    expect(Math.abs(fine.pos.z - coarse.pos.z)).toBeLessThan(0.1)
    expect(Math.abs(fine.heading - coarse.heading)).toBeLessThan(0.02)
    expect(Math.abs(fine.speed - coarse.speed)).toBeLessThan(0.1)
  })
})

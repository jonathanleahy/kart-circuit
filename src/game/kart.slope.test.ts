import { describe, it, expect } from 'vitest'
import { createKart, stepKart, type KartControls } from './kart'

const dt = 1 / 120
const NEUTRAL: KartControls = { throttle: 0, brake: 0, steer: 0 }
const FULL: KartControls = { throttle: 1, brake: 0, steer: 0 }

function coast(slope: number | undefined, seconds: number): number {
  const kart = createKart({ x: 0, z: 0 }, 0)
  kart.speed = 25
  for (let i = 0; i < seconds / dt; i++)
    stepKart(kart, NEUTRAL, dt, 1, slope === undefined ? {} : { slope })
  return kart.speed
}

describe('stepKart slope option', () => {
  it('undefined slope is identical to slope 0', () => {
    expect(coast(undefined, 2)).toBeCloseTo(coast(0, 2), 10)
  })

  it('uphill slope slows a coasting kart more than flat', () => {
    const flat = coast(0, 1)
    const uphill = coast(0.06, 1)
    expect(uphill).toBeLessThan(flat)
  })

  it('downhill slope accelerates a coasting kart', () => {
    const flat = coast(0, 1)
    const downhill = coast(-0.06, 1)
    expect(downhill).toBeGreaterThan(flat)
  })

  it('uphill accelerates more slowly than flat (gravity opposes engine)', () => {
    const timeTo = (slope: number, target: number) => {
      const k = createKart({ x: 0, z: 0 }, 0)
      for (let i = 0; i < 120 * 30; i++) {
        stepKart(k, FULL, dt, 1, { slope })
        if (k.speed >= target) return i * dt
      }
      return Infinity
    }
    expect(timeTo(0.3, 39)).toBeGreaterThan(timeTo(0, 39))
  })

  it('downhill reaches a given speed sooner than flat', () => {
    const timeTo = (slope: number, target: number) => {
      const k = createKart({ x: 0, z: 0 }, 0)
      for (let i = 0; i < 120 * 30; i++) {
        stepKart(k, FULL, dt, 1, { slope })
        if (k.speed >= target) return i * dt
      }
      return Infinity
    }
    expect(timeTo(-0.2, 30)).toBeLessThan(timeTo(0, 30))
  })
})

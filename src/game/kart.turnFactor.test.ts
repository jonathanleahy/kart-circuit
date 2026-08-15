import { describe, it, expect } from 'vitest'
import { turnFactorFor, KART_CONFIG } from './kart'

describe('turnFactorFor', () => {
  it('is zero at standstill', () => {
    expect(turnFactorFor(0)).toBe(0)
  })

  it('peaks at exactly 1 at turnRefSpeed', () => {
    expect(turnFactorFor(KART_CONFIG.turnRefSpeed)).toBeCloseTo(1, 6)
  })

  it('rises linearly below turnRefSpeed', () => {
    const half = turnFactorFor(KART_CONFIG.turnRefSpeed / 2)
    expect(half).toBeCloseTo(0.5, 6)
    const quarter = turnFactorFor(KART_CONFIG.turnRefSpeed / 4)
    expect(quarter).toBeCloseTo(0.25, 6)
  })

  it('tapers above turnRefSpeed: less steering authority at top speed', () => {
    const atMax = turnFactorFor(KART_CONFIG.maxSpeed)
    expect(atMax).toBeLessThan(1)
    expect(atMax).toBeGreaterThan(0.5)
    expect(atMax).toBeCloseTo(KART_CONFIG.highSpeedTurnFloor, 4)
  })

  it('is monotonically non-decreasing up to ref, then decreasing', () => {
    const steps = 60
    let prev = turnFactorFor(0)
    for (let i = 1; i <= steps; i++) {
      const v = (KART_CONFIG.turnRefSpeed * i) / steps
      const f = turnFactorFor(v)
      expect(f).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = f
    }
    prev = turnFactorFor(KART_CONFIG.turnRefSpeed)
    for (let i = 1; i <= steps; i++) {
      const v =
        KART_CONFIG.turnRefSpeed +
        ((KART_CONFIG.maxSpeed - KART_CONFIG.turnRefSpeed) * i) / steps
      const f = turnFactorFor(v)
      expect(f).toBeLessThanOrEqual(prev + 1e-9)
      prev = f
    }
  })

  it('is symmetric for reverse speed', () => {
    expect(turnFactorFor(-18)).toBeCloseTo(turnFactorFor(18), 8)
  })
})

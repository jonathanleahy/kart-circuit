import { describe, it, expect } from 'vitest'
import { elevationAt, gradeAt, MAX_ELEVATION } from './elevation'

const LAP_LENGTH = 900

describe('elevationAt', () => {
  it('is periodic: e(0) equals e(1)', () => {
    expect(elevationAt(0)).toBeCloseTo(elevationAt(1), 6)
  })

  it('wraps fractional and negative progress', () => {
    expect(elevationAt(0.25)).toBeCloseTo(elevationAt(1.25), 6)
    expect(elevationAt(0.25)).toBeCloseTo(elevationAt(-0.75), 6)
  })

  it('stays within the gentle amplitude bound', () => {
    for (let i = 0; i <= 200; i++) {
      const p = i / 200
      expect(Math.abs(elevationAt(p))).toBeLessThanOrEqual(MAX_ELEVATION)
    }
  })
})

describe('gradeAt', () => {
  it('matches the analytic derivative via finite differences', () => {
    const h = 1e-4
    for (const p of [0, 0.13, 0.37, 0.5, 0.71, 0.94]) {
      const numeric = (elevationAt(p + h) - elevationAt(p - h)) / (2 * h)
      expect(gradeAt(p)).toBeCloseTo(numeric, 2)
    }
  })

  it('keeps max road grade gentle over a lap', () => {
    let max = 0
    for (let i = 0; i <= 500; i++) {
      max = Math.max(max, Math.abs(gradeAt(i / 500)) / LAP_LENGTH)
    }
    expect(max).toBeLessThan(0.09)
    expect(max).toBeGreaterThan(0.01)
  })
})

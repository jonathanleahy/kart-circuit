import { describe, it, expect } from 'vitest'
import { closedCatmullRom } from './spline'

const SQUARE = [
  { x: 0, z: 0 },
  { x: 100, z: 0 },
  { x: 100, z: 100 },
  { x: 0, z: 100 },
]

describe('closedCatmullRom', () => {
  it('returns exactly ctrl * samplesPer points', () => {
    const out = closedCatmullRom(SQUARE, 10)
    expect(out).toHaveLength(40)
  })

  it('passes through every control point at segment starts', () => {
    const out = closedCatmullRom(SQUARE, 10)
    for (let i = 0; i < SQUARE.length; i++) {
      const p = out[i * 10]
      expect(p.x).toBeCloseTo(SQUARE[i].x, 5)
      expect(p.z).toBeCloseTo(SQUARE[i].z, 5)
    }
  })

  it('produces a smooth ring: adjacent samples are close together', () => {
    const out = closedCatmullRom(SQUARE, 20)
    for (let i = 0; i < out.length; i++) {
      const a = out[i]
      const b = out[(i + 1) % out.length]
      const d = Math.hypot(a.x - b.x, a.z - b.z)
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThan(10)
    }
  })

  it('throws on fewer than 3 control points', () => {
    expect(() => closedCatmullRom([{ x: 0, z: 0 }], 5)).toThrow()
    expect(() =>
      closedCatmullRom(
        [
          { x: 0, z: 0 },
          { x: 1, z: 1 },
        ],
        5,
      ),
    ).toThrow()
  })
})

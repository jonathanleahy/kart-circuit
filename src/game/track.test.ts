import { describe, it, expect } from 'vitest'
import { buildTrack, nearestOnTrack, isOnTrack, worldPosAt } from './track'
import { closedCatmullRom } from './spline'

const RING = buildTrack(
  closedCatmullRom(
    [
      { x: 0, z: 0 },
      { x: 200, z: 0 },
      { x: 200, z: 200 },
      { x: 0, z: 200 },
    ],
    16,
  ),
  10,
)

const wrapDist = (a: number, b: number) => {
  const d = Math.abs(a - b)
  return Math.min(d, 1 - d)
}

describe('buildTrack', () => {
  it('rejects tracks with fewer than 4 points', () => {
    expect(() =>
      buildTrack(
        [
          { x: 0, z: 0 },
          { x: 1, z: 0 },
          { x: 1, z: 1 },
        ],
        5,
      ),
    ).toThrow()
  })

  it('rejects non-positive half width', () => {
    expect(() =>
      buildTrack(
        [
          { x: 0, z: 0 },
          { x: 10, z: 0 },
          { x: 10, z: 10 },
          { x: 0, z: 10 },
        ],
        0,
      ),
    ).toThrow()
  })

  it('computes a positive total length', () => {
    expect(RING.totalLength).toBeGreaterThan(700)
  })
})

describe('nearestOnTrack', () => {
  it('reports near-zero lateral distance on the centerline', () => {
    const p = worldPosAt(RING, 0.125, 0)
    const r = nearestOnTrack(RING, p)
    expect(Math.abs(r.lateral)).toBeLessThan(0.01)
    expect(r.isOnTrack).toBe(true)
  })

  it('reports signed lateral distance for offset positions', () => {
    const r = nearestOnTrack(RING, worldPosAt(RING, 0.125, 6))
    expect(Math.abs(r.lateral)).toBeCloseTo(6, 1)
  })

  it('marks positions beyond half width as off track', () => {
    expect(nearestOnTrack(RING, worldPosAt(RING, 0.125, 9)).isOnTrack).toBe(true)
    expect(
      nearestOnTrack(RING, worldPosAt(RING, 0.125, 11)).isOnTrack,
    ).toBe(false)
    expect(
      nearestOnTrack(RING, worldPosAt(RING, 0.125, -11)).isOnTrack,
    ).toBe(false)
  })

  it('recovers progress all around the ring', () => {
    for (const progress of [0, 0.13, 0.25, 0.5, 0.77, 0.999]) {
      const p = worldPosAt(RING, progress, 0)
      const back = nearestOnTrack(RING, p)
      expect(wrapDist(back.progress, progress)).toBeLessThan(0.01)
    }
  })

  it('progress is at the seam just before the start line', () => {
    const r = nearestOnTrack(RING, worldPosAt(RING, 0.999, 0))
    expect(wrapDist(r.progress, 0.999)).toBeLessThan(0.01)
  })
})

describe('worldPosAt', () => {
  it('roundtrips with nearestOnTrack: progress and lateral survive', () => {
    for (const progress of [0.06, 0.13, 0.31, 0.5, 0.77, 0.94]) {
      for (const lateral of [-8, -3, 0, 4, 9]) {
        const p = worldPosAt(RING, progress, lateral)
        const back = nearestOnTrack(RING, p)
        expect(wrapDist(back.progress, progress)).toBeLessThan(0.01)
        expect(Math.abs(back.lateral - lateral)).toBeLessThan(0.5)
      }
    }
  })
})

describe('isOnTrack', () => {
  it('agrees with nearestOnTrack', () => {
    expect(isOnTrack(RING, worldPosAt(RING, 0.5, 2))).toBe(true)
    expect(isOnTrack(RING, worldPosAt(RING, 0.5, 14))).toBe(false)
    expect(isOnTrack(RING, { x: 100, z: 100 })).toBe(false)
  })
})

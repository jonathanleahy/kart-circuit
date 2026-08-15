import type { Vec2 } from './types'

export function closedCatmullRom(points: Vec2[], samplesPer: number): Vec2[] {
  if (points.length < 3) throw new Error('need at least 3 control points')
  if (samplesPer < 1) throw new Error('samplesPer must be >= 1')

  const n = points.length
  const out: Vec2[] = []
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    for (let s = 0; s < samplesPer; s++) {
      const t = s / samplesPer
      out.push(catmullRomPoint(p0, p1, p2, p3, t))
    }
  }
  return out
}

function catmullRomPoint(
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  t: number,
): Vec2 {
  const t2 = t * t
  const t3 = t2 * t
  const f = (a: Vec2, b: Vec2, c: Vec2, d: Vec2, key: 'x' | 'z') =>
    0.5 *
    (2 * b[key] +
      (-a[key] + c[key]) * t +
      (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t2 +
      (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t3)
  return {
    x: f(p0, p1, p2, p3, 'x'),
    z: f(p0, p1, p2, p3, 'z'),
  }
}

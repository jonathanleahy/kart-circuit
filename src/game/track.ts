import type { Vec2 } from './types'

export interface TrackDef {
  points: Vec2[]
  halfWidth: number
  segmentLengths: number[]
  cumulative: number[]
  totalLength: number
}

export interface TrackQuery {
  segment: number
  t: number
  lateral: number
  progress: number
  isOnTrack: boolean
  center: Vec2
}

export function buildTrack(points: Vec2[], halfWidth: number): TrackDef {
  if (points.length < 4) throw new Error('need at least 4 ring points')
  if (halfWidth <= 0) throw new Error('halfWidth must be positive')

  const n = points.length
  const segmentLengths: number[] = []
  const cumulative: number[] = []
  let total = 0
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    if (len <= 0) throw new Error('duplicate adjacent points')
    segmentLengths.push(len)
    cumulative.push(total)
    total += len
  }
  return { points, halfWidth, segmentLengths, cumulative, totalLength: total }
}

export function nearestOnTrack(track: TrackDef, pos: Vec2): TrackQuery {
  const pts = track.points
  const n = pts.length
  let bestSeg = 0
  let bestT = 0
  let bestDist2 = Infinity
  let bestLateral = 0

  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const abx = b.x - a.x
    const abz = b.z - a.z
    const len2 = abx * abx + abz * abz
    let t = ((pos.x - a.x) * abx + (pos.z - a.z) * abz) / len2
    t = Math.min(1, Math.max(0, t))
    const cx = a.x + abx * t
    const cz = a.z + abz * t
    const dx = pos.x - cx
    const dz = pos.z - cz
    const d2 = dx * dx + dz * dz
    if (d2 < bestDist2) {
      bestDist2 = d2
      bestSeg = i
      bestT = t
      const len = Math.sqrt(len2)
      const rx = -abz / len
      const rz = abx / len
      bestLateral = dx * rx + dz * rz
    }
  }

  const along = track.cumulative[bestSeg] + bestT * track.segmentLengths[bestSeg]
  const a = pts[bestSeg]
  const b = pts[(bestSeg + 1) % n]
  return {
    segment: bestSeg,
    t: bestT,
    lateral: bestLateral,
    progress: along / track.totalLength,
    isOnTrack: Math.abs(bestLateral) <= track.halfWidth,
    center: { x: a.x + (b.x - a.x) * bestT, z: a.z + (b.z - a.z) * bestT },
  }
}

export function isOnTrack(track: TrackDef, pos: Vec2): boolean {
  return nearestOnTrack(track, pos).isOnTrack
}

export function worldPosAt(
  track: TrackDef,
  progress: number,
  lateral: number,
): Vec2 {
  const p = ((progress % 1) + 1) % 1
  const target = p * track.totalLength
  const n = track.points.length
  let i = 0
  while (i < n - 1 && track.cumulative[i + 1] <= target) i++
  const segLen = track.segmentLengths[i]
  const t = segLen > 0 ? (target - track.cumulative[i]) / segLen : 0
  const a = track.points[i]
  const b = track.points[(i + 1) % n]
  const cx = a.x + (b.x - a.x) * t
  const cz = a.z + (b.z - a.z) * t
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len = Math.hypot(dx, dz)
  const rx = -dz / len
  const rz = dx / len
  return { x: cx + rx * lateral, z: cz + rz * lateral }
}

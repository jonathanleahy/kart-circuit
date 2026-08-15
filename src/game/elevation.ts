// Gentle closed-course elevation profile: a smooth periodic function of lap
// progress [0..1). Analytic derivative lets physics feel the grade without
// finite-difference noise.

const A1 = 2.6
const A2 = 1.1
const K1 = 2
const K2 = 5
const P1 = 0.8
const P2 = 2.3

export const MAX_ELEVATION = A1 + A2
export const MAX_GRADE_PER_LAP = A1 * K1 * 2 * Math.PI + A2 * K2 * 2 * Math.PI

const TAU = Math.PI * 2

export function elevationAt(progress: number): number {
  const p = progress - Math.floor(progress)
  return A1 * Math.sin(TAU * K1 * p + P1) + A2 * Math.sin(TAU * K2 * p + P2)
}

export function gradeAt(progress: number): number {
  const p = progress - Math.floor(progress)
  return (
    A1 * K1 * TAU * Math.cos(TAU * K1 * p + P1) +
    A2 * K2 * TAU * Math.cos(TAU * K2 * p + P2)
  )
}

import * as THREE from 'three'

function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  colors: string[],
  maxR: number,
): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0]
    const r = 0.5 + Math.random() * maxR
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function mottle(
  ctx: CanvasRenderingContext2D,
  size: number,
  count: number,
  color: string,
  maxR: number,
  alpha: number,
): void {
  ctx.fillStyle = color
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.6)
    const r = maxR * (0.3 + Math.random() * 0.7)
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function makeAsphaltTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#3a3a44'
  ctx.fillRect(0, 0, size, size)
  mottle(ctx, size, 26, '#464652', 90, 0.35)
  mottle(ctx, size, 22, '#30303a', 110, 0.4)
  speckle(ctx, size, 9000, ['#43434f', '#33333c', '#4a4a56'], 1.1)
  speckle(ctx, size, 1600, ['#2b2b33'], 1.7)
  speckle(ctx, size, 400, ['#565663'], 0.8)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

export function makeGrassTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#4f8f3e'
  ctx.fillRect(0, 0, size, size)
  mottle(ctx, size, 34, '#5a9c48', 120, 0.5)
  mottle(ctx, size, 30, '#46823a', 130, 0.55)
  mottle(ctx, size, 16, '#3e7434', 90, 0.5)
  speckle(ctx, size, 11000, ['#5a9c48', '#46823a', '#61a552'], 1.4)
  speckle(ctx, size, 2200, ['#3e7434'], 2.1)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(90, 90)
  return tex
}

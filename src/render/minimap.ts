import type { TrackDef } from '../game/track'
import type { Vec2 } from '../game/types'

const SIZE = 170
const PAD = 14

export class Minimap {
  private ctx: CanvasRenderingContext2D
  private cache: HTMLCanvasElement
  private scale: number
  private offX: number
  private offZ: number

  constructor(canvas: HTMLCanvasElement, track: TrackDef) {
    canvas.width = SIZE
    canvas.height = SIZE
    this.ctx = canvas.getContext('2d')!

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of track.points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z)
    }
    this.scale = (SIZE - PAD * 2) / Math.max(maxX - minX, maxZ - minZ)
    this.offX = PAD + ((SIZE - PAD * 2) - (maxX - minX) * this.scale) / 2 - minX * this.scale
    this.offZ = PAD + ((SIZE - PAD * 2) - (maxZ - minZ) * this.scale) / 2 - minZ * this.scale

    this.cache = document.createElement('canvas')
    this.cache.width = SIZE
    this.cache.height = SIZE
    const c = this.cache.getContext('2d')!
    c.lineJoin = 'round'
    c.strokeStyle = 'rgba(230, 230, 235, 0.9)'
    c.lineWidth = track.halfWidth * 2 * this.scale
    c.beginPath()
    track.points.forEach((p, i) => {
      const [x, y] = this.worldToMap(p)
      if (i === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    })
    c.closePath()
    c.stroke()
    c.strokeStyle = 'rgba(40, 44, 54, 0.55)'
    c.lineWidth = 2
    c.stroke()
  }

  private worldToMap(p: Vec2): [number, number] {
    return [p.x * this.scale + this.offX, p.z * this.scale + this.offZ]
  }

  draw(kartPos: Vec2, heading: number, nextGate: Vec2): void {
    const c = this.ctx
    c.clearRect(0, 0, SIZE, SIZE)
    c.drawImage(this.cache, 0, 0)

    const [gx, gy] = this.worldToMap(nextGate)
    c.fillStyle = '#ffb347'
    c.beginPath()
    c.arc(gx, gy, 4, 0, Math.PI * 2)
    c.fill()

    const [kx, ky] = this.worldToMap(kartPos)
    c.save()
    c.translate(kx, ky)
    c.rotate(Math.PI - heading)
    c.fillStyle = '#ff4b4b'
    c.beginPath()
    c.moveTo(0, -6)
    c.lineTo(4.5, 5)
    c.lineTo(-4.5, 5)
    c.closePath()
    c.fill()
    c.restore()
  }
}

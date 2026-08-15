import * as THREE from 'three'
import type { TrackDef } from '../game/track'
import { nearestOnTrack } from '../game/track'
import { elevationAt } from '../game/elevation'
import { createTrackMeshes } from './trackMesh'
import { createKartMesh, type KartRig } from './kartMesh'
import { makeGrassTexture } from './textures'

export interface SceneRig {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  kartRig: KartRig
  cameraTarget: THREE.Vector3
}

export const CAMERA_DIST = 8.5
export const CAMERA_HEIGHT = 4.2
export const CAMERA_LOOK_AHEAD = 6

export function createScene(track: TrackDef, canvas: HTMLCanvasElement): SceneRig {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x8eccef)
  scene.fog = new THREE.Fog(0x8eccef, 180, 520)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x446633, 1.1)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.4)
  sun.position.set(80, 140, 40)
  scene.add(sun)

  // Terrain displaced to follow the track elevation so road edges meet grass.
  const groundGeo = new THREE.PlaneGeometry(1600, 1600, 96, 96)
  groundGeo.rotateX(-Math.PI / 2)
  const pos = groundGeo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const q = nearestOnTrack(track, { x, z })
    pos.setY(i, elevationAt(q.progress) - 0.35)
  }
  groundGeo.computeVertexNormals()
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshLambertMaterial({ map: makeGrassTexture() }),
  )
  scene.add(ground)

  scene.add(createTrackMeshes(track))

  const kartRig = createKartMesh()
  scene.add(kartRig.group)

  const camera = new THREE.PerspectiveCamera(62, 1, 0.25, 900)
  const cameraTarget = new THREE.Vector3()

  return { renderer, scene, camera, kartRig, cameraTarget }
}

export function resize(rig: SceneRig): void {
  const w = rig.renderer.domElement.clientWidth || window.innerWidth
  const h = rig.renderer.domElement.clientHeight || window.innerHeight
  rig.renderer.setSize(w, h, false)
  rig.camera.aspect = w / h
  rig.camera.updateProjectionMatrix()
}

export function updateChaseCamera(
  rig: SceneRig,
  kartPos: { x: number; z: number },
  kartHeading: number,
  speed: number,
  dt: number,
  kartY = 0,
): void {
  const fx = Math.sin(kartHeading)
  const fz = Math.cos(kartHeading)
  const desiredX = kartPos.x - fx * CAMERA_DIST
  const desiredZ = kartPos.z - fz * CAMERA_DIST
  const desiredY = kartY + CAMERA_HEIGHT
  const k = 1 - Math.exp(-8 * dt)
  rig.camera.position.x += (desiredX - rig.camera.position.x) * k
  rig.camera.position.y += (desiredY - rig.camera.position.y) * k
  rig.camera.position.z += (desiredZ - rig.camera.position.z) * k

  rig.cameraTarget.x += (kartPos.x + fx * CAMERA_LOOK_AHEAD - rig.cameraTarget.x) * k
  rig.cameraTarget.y += (kartY + 1.2 - rig.cameraTarget.y) * k
  rig.cameraTarget.z += (kartPos.z + fz * CAMERA_LOOK_AHEAD - rig.cameraTarget.z) * k
  rig.camera.lookAt(rig.cameraTarget)

  const targetFov = 62 + Math.max(0, speed) * 0.45
  rig.camera.fov += (targetFov - rig.camera.fov) * k
  rig.camera.updateProjectionMatrix()
}

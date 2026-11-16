import * as THREE from 'three'

// The regulation ball (~11cm) is barely a pixel from a broadcast camera, so the mesh is
// drawn larger than life for legibility. Only the mesh scale differs from the physics body.
export const VISUAL_BALL_RADIUS = 0.34

export function createBallMesh() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(VISUAL_BALL_RADIUS, 24, 18),
    new THREE.MeshStandardMaterial({ map: buildBallTexture(), roughness: 0.45 }),
  )
  mesh.castShadow = true
  return mesh
}

function buildBallTexture() {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#181818'
  const spots = [
    [0.15, 0.3],
    [0.45, 0.2],
    [0.75, 0.32],
    [1.0, 0.22],
    [0.05, 0.65],
    [0.32, 0.75],
    [0.6, 0.68],
    [0.88, 0.78],
    [0.22, 0.05],
    [0.68, 0.02],
    [0.95, 0.55],
  ]
  for (const [fx, fy] of spots) {
    ctx.beginPath()
    ctx.arc(fx * width, fy * height, 26, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

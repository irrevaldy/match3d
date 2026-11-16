import * as THREE from 'three'
import {
  GOAL_DEPTH,
  GOAL_HEIGHT,
  GOAL_POST_RADIUS,
  GOAL_WIDTH,
  PITCH_HALF_LENGTH,
  PITCH_HALF_WIDTH,
  PITCH_LENGTH,
  PITCH_WIDTH,
} from './constants.js'

// Night-stadium scene. All stadium furniture is measured out from the pitch edge:
// ad-boards just past the touchlines, the stands' base further out, the floodlight masts
// outside the stands.

const AD_BOARD_MARGIN = 3
const AD_BOARD_HEIGHT = 1.1
const STAND_MARGIN = 22
const STAND_RAKE_LENGTH = 14
const STAND_TILT_RAD = THREE.MathUtils.degToRad(50)
const FLOODLIGHT_OFFSET = 6

/**
 * Build the stadium scene.
 *
 * @param {object} [options]
 * @param {string} [options.adBoardText] sponsor text painted on the hoardings
 * @returns {{ scene: THREE.Scene, dispose: () => void }}
 */
export function createPitchScene(options = {}) {
  const { adBoardText = 'MATCH DAY' } = options
  const disposables = []
  const track = (item) => {
    disposables.push(item)
    return item
  }

  const scene = new THREE.Scene()
  scene.background = buildSkyTexture()
  scene.fog = new THREE.Fog(0x0a1626, 80, 250)

  scene.add(new THREE.AmbientLight(0x3a4a66, 0.42))

  // Single shadow-casting key light keeps the shadow map cost to one pass; the
  // floodlights below are the visible key but cast nothing.
  const moonlight = new THREE.DirectionalLight(0xcfe0ff, 0.62)
  moonlight.position.set(30, 50, 20)
  moonlight.castShadow = true
  moonlight.shadow.mapSize.set(2048, 2048)
  moonlight.shadow.camera.left = -70
  moonlight.shadow.camera.right = 70
  moonlight.shadow.camera.top = 50
  moonlight.shadow.camera.bottom = -50
  moonlight.shadow.camera.far = 150
  scene.add(moonlight)

  addFloodlights(scene)

  // Running-track surround, wide enough that the broadcast camera never sees past its
  // edge into the void.
  const surround = new THREE.Mesh(
    track(new THREE.PlaneGeometry(260, 260)),
    track(new THREE.MeshStandardMaterial({ color: 0x9c3b23, roughness: 0.95 })),
  )
  surround.rotation.x = -Math.PI / 2
  surround.position.y = -0.02
  surround.receiveShadow = true
  scene.add(surround)

  const ground = new THREE.Mesh(
    track(new THREE.PlaneGeometry(PITCH_LENGTH, PITCH_WIDTH)),
    track(new THREE.MeshStandardMaterial({ map: buildPitchTexture(), roughness: 0.95 })),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  scene.add(buildGoal(PITCH_HALF_LENGTH, 1))
  scene.add(buildGoal(-PITCH_HALF_LENGTH, -1))

  addAdBoards(scene, adBoardText)
  addStands(scene)
  addSubsBench(scene)

  return {
    scene,
    dispose: () => {
      for (const item of disposables) item.dispose()
      disposeScene(scene)
    },
  }
}

const BENCH_SHIRT_COLORS = [0xd94f2b, 0x2b6fd9, 0xd9c02b, 0x2bd97a]

function addSubsBench(scene) {
  const group = new THREE.Group()
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.5, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.8 }),
  )
  bench.position.y = 0.25
  bench.castShadow = true
  group.add(bench)

  // Low-poly seated substitutes: no need for the full player rig since they never move.
  const seatCount = 7
  for (let i = 0; i < seatCount; i += 1) {
    const x = -4 + (i / (seatCount - 1)) * 8
    const mat = new THREE.MeshStandardMaterial({ color: BENCH_SHIRT_COLORS[i % BENCH_SHIRT_COLORS.length], roughness: 0.7 })

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 3, 6), mat)
    torso.position.set(x, 0.75, 0)
    torso.castShadow = true
    group.add(torso)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat)
    head.position.set(x, 1.1, 0)
    head.castShadow = true
    group.add(head)
  }

  group.position.set(-PITCH_LENGTH / 4, 0, -(PITCH_HALF_WIDTH + AD_BOARD_MARGIN + 3.5))
  scene.add(group)
}

function addFloodlights(scene) {
  const standHalfLength = PITCH_HALF_LENGTH + STAND_MARGIN
  const standHalfWidth = PITCH_HALF_WIDTH + STAND_MARGIN
  const mastX = standHalfLength + FLOODLIGHT_OFFSET
  const mastZ = standHalfWidth + FLOODLIGHT_OFFSET
  const mastHeight = 30

  const mastMat = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.6, metalness: 0.3 })
  const mastGeo = new THREE.CylinderGeometry(0.35, 0.45, mastHeight, 8)
  const bankGeo = new THREE.BoxGeometry(3.2, 1.8, 0.4)
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0xfff6d8,
    emissive: 0xfff6d8,
    emissiveIntensity: 1.4,
  })

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mast = new THREE.Mesh(mastGeo, mastMat)
      mast.position.set(sx * mastX, mastHeight / 2, sz * mastZ)
      scene.add(mast)

      const bank = new THREE.Mesh(bankGeo, bankMat)
      bank.position.set(sx * mastX, mastHeight, sz * mastZ)
      bank.lookAt(0, mastHeight * 0.4, 0)
      scene.add(bank)

      const target = new THREE.Object3D()
      scene.add(target)

      const light = new THREE.SpotLight(0xfff6d8, 220, 190, Math.PI / 5, 0.5, 1.2)
      light.position.copy(bank.position)
      light.target = target
      scene.add(light)
    }
  }
}

function addAdBoards(scene, adBoardText) {
  const texture = buildAdBoardTexture(adBoardText)
  const halfLen = PITCH_HALF_LENGTH + AD_BOARD_MARGIN
  const halfWid = PITCH_HALF_WIDTH + AD_BOARD_MARGIN

  const longTex = texture.clone()
  longTex.needsUpdate = true
  longTex.wrapS = THREE.RepeatWrapping
  longTex.repeat.set((PITCH_LENGTH + AD_BOARD_MARGIN * 2) / 12, 1)
  const shortTex = texture.clone()
  shortTex.needsUpdate = true
  shortTex.wrapS = THREE.RepeatWrapping
  shortTex.repeat.set((PITCH_WIDTH + AD_BOARD_MARGIN * 2) / 12, 1)

  // FrontSide only: a single plane mirrors its texture when seen from behind, so each
  // side gets a coincident pair facing opposite ways and the culler picks the right one.
  const longMat = new THREE.MeshBasicMaterial({ map: longTex, side: THREE.FrontSide })
  const shortMat = new THREE.MeshBasicMaterial({ map: shortTex, side: THREE.FrontSide })

  for (const sz of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(PITCH_LENGTH + AD_BOARD_MARGIN * 2, AD_BOARD_HEIGHT)
    addFacingPair(scene, geo, longMat, [0, AD_BOARD_HEIGHT / 2, sz * halfWid])
  }
  for (const sx of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(PITCH_WIDTH + AD_BOARD_MARGIN * 2, AD_BOARD_HEIGHT)
    addFacingPair(scene, geo, shortMat, [sx * halfLen, AD_BOARD_HEIGHT / 2, 0])
  }
}

function addFacingPair(scene, geometry, material, position) {
  const a = new THREE.Mesh(geometry, material)
  a.position.set(...position)
  a.lookAt(0, position[1], 0)
  scene.add(a)

  const b = new THREE.Mesh(geometry, material)
  b.position.set(...position)
  b.lookAt(0, position[1], 0)
  b.rotateY(Math.PI)
  scene.add(b)
}

function addStands(scene) {
  const material = new THREE.MeshStandardMaterial({
    map: buildCrowdTexture(),
    side: THREE.DoubleSide,
    roughness: 0.95,
  })

  const standHalfLength = PITCH_HALF_LENGTH + STAND_MARGIN
  const standHalfWidth = PITCH_HALF_WIDTH + STAND_MARGIN
  const topY = STAND_RAKE_LENGTH * Math.cos(STAND_TILT_RAD)
  const topOffset = STAND_RAKE_LENGTH * Math.sin(STAND_TILT_RAD)

  // Touchline stands rake away from the pitch along z.
  for (const sz of [-1, 1]) {
    const baseZ = sz * standHalfWidth
    const topZ = baseZ + sz * topOffset
    const halfLen = standHalfLength + 14
    scene.add(
      buildStandQuad([-halfLen, 0, baseZ], [halfLen, 0, baseZ], [halfLen, topY, topZ], [-halfLen, topY, topZ], material),
    )
  }

  // Goal-line stands rake away along x.
  for (const sx of [-1, 1]) {
    const baseX = sx * standHalfLength
    const topX = baseX + sx * topOffset
    const halfWid = standHalfWidth + 14
    scene.add(
      buildStandQuad([baseX, 0, -halfWid], [baseX, 0, halfWid], [topX, topY, halfWid], [topX, topY, -halfWid], material),
    )
  }
}

function buildStandQuad(p0, p1, p2, p3, material) {
  const positions = new Float32Array([...p0, ...p1, ...p2, ...p0, ...p2, ...p3])
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

function buildGoal(goalLineX, facingSign) {
  const group = new THREE.Group()
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.4 })

  const postGeo = new THREE.CylinderGeometry(GOAL_POST_RADIUS, GOAL_POST_RADIUS, GOAL_HEIGHT, 12)
  for (const z of [-GOAL_WIDTH / 2, GOAL_WIDTH / 2]) {
    const post = new THREE.Mesh(postGeo, postMat)
    post.position.set(goalLineX, GOAL_HEIGHT / 2, z)
    post.castShadow = true
    group.add(post)
  }

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(GOAL_POST_RADIUS, GOAL_POST_RADIUS, GOAL_WIDTH, 12), postMat)
  crossbar.rotation.x = Math.PI / 2
  crossbar.position.set(goalLineX, GOAL_HEIGHT, 0)
  crossbar.castShadow = true
  group.add(crossbar)

  // A wireframe net collapses into an aliased white blur when viewed edge-on, which is
  // the normal angle for a goal at the far end of the pitch. A gridded texture keeps the
  // mesh readable at any angle.
  const netMat = new THREE.MeshBasicMaterial({
    map: buildNetTexture(),
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  })

  const backNet = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_WIDTH, GOAL_HEIGHT), netMat)
  backNet.position.set(goalLineX + facingSign * GOAL_DEPTH, GOAL_HEIGHT / 2, 0)
  backNet.rotation.y = Math.PI / 2
  group.add(backNet)

  return group
}

function buildNetTexture() {
  const width = 128
  const height = 64
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 1
  const step = 8
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildPitchTexture() {
  const width = 1024
  const height = Math.round(width * (PITCH_WIDTH / PITCH_LENGTH))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)

  const stripeCount = 12
  const stripeW = width / stripeCount
  for (let i = 0; i < stripeCount; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#2f8a3c' : '#2a7d36'
    ctx.fillRect(i * stripeW, 0, stripeW, height)
  }

  const pxPerMeter = width / PITCH_LENGTH
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 3

  const margin = 2
  ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2)

  ctx.beginPath()
  ctx.moveTo(width / 2, margin)
  ctx.lineTo(width / 2, height - margin)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 9.15 * pxPerMeter, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()

  const boxDepth = 18.32 * pxPerMeter
  const boxWidth = 40.3 * pxPerMeter
  const smallBoxDepth = 5.5 * pxPerMeter
  const smallBoxWidth = 18.32 * pxPerMeter
  const cy = height / 2

  ctx.strokeRect(margin, cy - boxWidth / 2, boxDepth, boxWidth)
  ctx.strokeRect(width - margin - boxDepth, cy - boxWidth / 2, boxDepth, boxWidth)
  ctx.strokeRect(margin, cy - smallBoxWidth / 2, smallBoxDepth, smallBoxWidth)
  ctx.strokeRect(width - margin - smallBoxDepth, cy - smallBoxWidth / 2, smallBoxDepth, smallBoxWidth)

  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// Sponsor hoarding: alternating colour blocks with configurable text, standing in for the
// ad boards ringing a real stadium pitch.
function buildAdBoardTexture(text) {
  const width = 512
  const height = 64
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const colors = ['#0b3d91', '#14281a', '#8a1538']
  const blockW = width / 2
  for (let i = 0; i < 2; i += 1) {
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillRect(i * blockW, 0, blockW, height)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = 'bold 30px -apple-system, Helvetica, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2 + 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// Randomized dots standing in for a packed crowd: one texture, static geometry, no
// per-spectator meshes, but it reads as a full stand from playing distance.
function buildCrowdTexture() {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#1b2130'
  ctx.fillRect(0, 0, width, height)

  const shirtColors = ['#e8e8e8', '#d9342b', '#2b5fd9', '#f5d020', '#2a2a2a', '#8a1538', '#3f9142']
  const rows = 22
  const cols = 44
  const cellW = width / cols
  const cellH = height / rows
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (Math.random() < 0.14) continue
      const cx = c * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.4
      const cy = r * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.4
      const radius = cellW * (0.28 + Math.random() * 0.16)
      ctx.fillStyle = shirtColors[Math.floor(Math.random() * shirtColors.length)]
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(3, 1)
  return texture
}

// Flat vertical gradient as the scene background — an evening-stadium sky without the
// cost of a real skybox/HDRI.
function buildSkyTexture() {
  const width = 2
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#04070f')
  gradient.addColorStop(0.55, '#0a1626')
  gradient.addColorStop(1, '#1c3350')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function disposeScene(scene) {
  scene.traverse((object) => {
    object.geometry?.dispose?.()
    const material = object.material
    const materials = Array.isArray(material) ? material : material ? [material] : []
    for (const m of materials) {
      m.map?.dispose?.()
      m.dispose()
    }
  })
}

import type * as THREE from 'three'

// ---------------------------------------------------------------- pitch constants
export const PITCH_LENGTH: number
export const PITCH_WIDTH: number
export const PITCH_HALF_LENGTH: number
export const PITCH_HALF_WIDTH: number

export const GOAL_WIDTH: number
export const GOAL_HEIGHT: number
export const GOAL_DEPTH: number
export const GOAL_POST_RADIUS: number

export const CENTER_CIRCLE_RADIUS: number

// ---------------------------------------------------------------- players
export interface PlayerMesh {
  group: THREE.Group
  hipPivots: THREE.Group[]
  kneePivots: THREE.Group[]
  armPivots: THREE.Group[]
  torso: THREE.Mesh
  /** Height the mesh sits at when it isn't bobbing, set by the driver each frame. */
  groundY: number
  animPhase: number
  /** Phase for the goal celebration (arm pumps and jumps). */
  celebratePhase: number
}

export interface PlayerMeshOptions {
  /** Legacy team id used when no explicit shirt colour is supplied. */
  team?: 'A' | 'B'
  shirtColor?: number | string
  shortsColor?: number | string
  /** 'GK' selects the keeper shirt; anything else is treated as an outfield player. */
  role?: string
  /** Stable appearance seed; omit for random appearance. */
  seed?: number
}

export function createPlayerMesh(options?: PlayerMeshOptions): PlayerMesh

export function animatePlayerMesh(
  mesh: PlayerMesh,
  speed: number,
  dtSeconds: number,
  celebrate?: number,
): void

export function createControlledRing(): THREE.Mesh

// ---------------------------------------------------------------- ball
export const VISUAL_BALL_RADIUS: number

export function createBallMesh(): THREE.Mesh

// ---------------------------------------------------------------- camera
export class CameraRig {
  constructor(camera: THREE.PerspectiveCamera)
  /** Kick the transient push-in, used on goals. */
  boost(): void
  /** Backwards-compatible alias for boost(). */
  pulse(): void
  /**
   * @param ballX ball position along the length axis
   * @param ballZ ball position along the width axis
   * @param spread metres from the ball to the outer edge of the play
   * @param dtMs elapsed milliseconds
   */
  update(ballX: number, ballZ: number, spread: number, dtMs: number): void
}

// ---------------------------------------------------------------- stadium
export interface PitchSceneOptions {
  /** Sponsor text painted on the hoardings. */
  adBoardText?: string
}

export interface PitchSceneHandle {
  scene: THREE.Scene
  dispose: () => void
}

export function createPitchScene(options?: PitchSceneOptions): PitchSceneHandle

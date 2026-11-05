export type AppCameraRoute =
  | 'dashboard'
  | 'transit'
  | 'eod'
  | 'wealth-stats'
  | 'sheets'
  | 'welcome-calendar'
  | 'onboarding';

export interface CameraStageTransform {
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  translateX: number;
  translateY: number;
  focalGlowColor: string;
  astrolabeRotation: number;
}

/**
 * 3D Camera Background Stage perspectives inspired by Metaphor: ReFantazio & Persona 5,
 * adapted into a tactile coin-and-wallet spatial stage.
 */
export const CAMERA_STAGE_ANGLES: Record<AppCameraRoute, CameraStageTransform> = {
  dashboard: {
    rotateX: 8,
    rotateY: -6,
    rotateZ: -1,
    scale: 1.02,
    translateX: 0,
    translateY: 0,
    focalGlowColor: 'rgba(229, 184, 75, 0.16)',
    astrolabeRotation: 0,
  },
  transit: {
    rotateX: 14,
    rotateY: 12,
    rotateZ: 2,
    scale: 1.08,
    translateX: -28,
    translateY: -12,
    focalGlowColor: 'rgba(45, 212, 191, 0.18)',
    astrolabeRotation: 45,
  },
  eod: {
    rotateX: 18,
    rotateY: 0,
    rotateZ: 0,
    scale: 1.12,
    translateX: 0,
    translateY: -24,
    focalGlowColor: 'rgba(251, 146, 60, 0.18)',
    astrolabeRotation: 95,
  },
  'wealth-stats': {
    rotateX: 22,
    rotateY: -14,
    rotateZ: -3,
    scale: 1.16,
    translateX: 24,
    translateY: -18,
    focalGlowColor: 'rgba(192, 132, 252, 0.22)',
    astrolabeRotation: 160,
  },
  sheets: {
    rotateX: 10,
    rotateY: 15,
    rotateZ: 1.5,
    scale: 1.05,
    translateX: -20,
    translateY: 14,
    focalGlowColor: 'rgba(52, 211, 153, 0.16)',
    astrolabeRotation: 225,
  },
  'welcome-calendar': {
    rotateX: 24,
    rotateY: -18,
    rotateZ: -8,
    scale: 1.2,
    translateX: 15,
    translateY: -10,
    focalGlowColor: 'rgba(229, 184, 75, 0.28)',
    astrolabeRotation: 310,
  },
  onboarding: {
    rotateX: 12,
    rotateY: -10,
    rotateZ: -2,
    scale: 1.06,
    translateX: 10,
    translateY: -10,
    focalGlowColor: 'rgba(96, 165, 250, 0.18)',
    astrolabeRotation: 120,
  },
};

export const SPRING_PHYSICS = {
  cameraPan: {
    type: 'spring' as const,
    stiffness: 110,
    damping: 20,
    mass: 1.1,
  },
  slotReel: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 15,
    mass: 1.4,
  },
  morphContainer: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 26,
    mass: 0.9,
  },
  snappyButton: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 25,
  },
  walletDrop: {
    type: 'spring' as const,
    stiffness: 210,
    damping: 22,
    mass: 1.0,
  },
};

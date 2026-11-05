import React from 'react';
import { motion } from 'motion/react';
import { CAMERA_STAGE_ANGLES, SPRING_PHYSICS } from '../../lib/motion-configs';
import { useBeeblyStore } from '../../store/useBeeblyStore';

interface CameraStageProps {
  children: React.ReactNode;
}

export const CameraStage: React.FC<CameraStageProps> = ({ children }) => {
  const activeRoute = useBeeblyStore((s) => s.activeRoute);
  const isWelcomeCalendarOpen = useBeeblyStore((s) => s.isWelcomeCalendarOpen);
  const isOnboardingOpen = useBeeblyStore((s) => s.isOnboardingOpen);
  const isWealthModalOpen = useBeeblyStore((s) => s.isWealthModalOpen);
  const reducedMotion = useBeeblyStore((s) => s.user.reducedMotion);

  const effectiveCameraKey = isWelcomeCalendarOpen
    ? 'welcome-calendar'
    : isOnboardingOpen
    ? 'onboarding'
    : isWealthModalOpen
    ? 'wealth-stats'
    : activeRoute;

  const cam = CAMERA_STAGE_ANGLES[effectiveCameraKey] ?? CAMERA_STAGE_ANGLES.dashboard;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0B0F17] text-[#F4F1EA]">
      {/* Multi-layered 3D Perspective Stage */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{ perspective: '1200px' }}
        aria-hidden="true"
      >
        <motion.div
          className="absolute -inset-28 flex items-center justify-center"
          animate={
            reducedMotion
              ? { rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, x: 0, y: 0 }
              : {
                  rotateX: cam.rotateX,
                  rotateY: cam.rotateY,
                  rotateZ: cam.rotateZ,
                  scale: cam.scale,
                  x: cam.translateX,
                  y: cam.translateY,
                }
          }
          transition={SPRING_PHYSICS.cameraPan}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Radial Focal Ambient Glow */}
          <div
            className="absolute h-[760px] w-[760px] rounded-full blur-3xl transition-colors duration-700"
            style={{
              background: `radial-gradient(circle, ${cam.focalGlowColor} 0%, rgba(11,15,23,0) 70%)`,
            }}
          />

          {/* Metaphor-Inspired Geometric Astrolabe & Coin Orbit SVG */}
          <motion.svg
            viewBox="0 0 1000 1000"
            className="h-[1150px] w-[1150px] opacity-25"
            animate={
              reducedMotion
                ? { rotate: 0 }
                : { rotate: cam.astrolabeRotation }
            }
            transition={SPRING_PHYSICS.cameraPan}
          >
            <defs>
              <linearGradient id="astrolabeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E5B84B" stopOpacity="0.65" />
                <stop offset="50%" stopColor="#94A3B8" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#E5B84B" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {/* Concentric Astrolabe Rings */}
            <circle
              cx="500"
              cy="500"
              r="440"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1.2"
              strokeDasharray="8 14"
            />
            <circle
              cx="500"
              cy="500"
              r="360"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1.5"
            />
            <circle
              cx="500"
              cy="500"
              r="265"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1"
              strokeDasharray="3 9"
            />
            <circle
              cx="500"
              cy="500"
              r="165"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1.2"
            />

            {/* 6-Axis Virtue Starburst Lines */}
            {[0, 30, 60, 90, 120, 150].map((deg) => (
              <line
                key={deg}
                x1="500"
                y1="60"
                x2="500"
                y2="940"
                stroke="url(#astrolabeGold)"
                strokeWidth="0.75"
                transform={`rotate(${deg} 500 500)`}
              />
            ))}

            {/* Inscribed Hexagram */}
            <polygon
              points="500,140 811,680 189,680"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1"
            />
            <polygon
              points="500,860 811,320 189,320"
              fill="none"
              stroke="url(#astrolabeGold)"
              strokeWidth="1"
            />
          </motion.svg>

          {/* Subtle Perspective Ledger Grid */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, #E5B84B 1px, transparent 1px), linear-gradient(to bottom, #E5B84B 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </motion.div>
      </div>

      {/* Foreground Application Content */}
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
    </div>
  );
};

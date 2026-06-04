import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import { animated, useSpring } from '@react-spring/web';
import gsap from 'gsap';

export type AttentionLevel = 'urgent' | 'actionable' | 'idle';
export type AnimationFramework = 'framer-motion' | 'react-spring' | 'gsap';

export interface AccountButtonProps {
  framework: AnimationFramework;
  attention: AttentionLevel;
  onClick?: () => void;
}

const baseClassName =
  'inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 select-none';

function getAccent(attention: AttentionLevel) {
  switch (attention) {
    case 'urgent':
      return { border: 'rgba(239, 68, 68, 0.65)', glow: 'rgba(239, 68, 68, 0.55)' }; // red-500
    case 'actionable':
      return { border: 'rgba(59, 130, 246, 0.65)', glow: 'rgba(59, 130, 246, 0.50)' }; // blue-500
    case 'idle':
    default:
      return { border: 'rgba(100, 116, 139, 0.45)', glow: 'rgba(148, 163, 184, 0.18)' }; // slate
  }
}

export function AccountButton({ framework, attention, onClick }: AccountButtonProps) {
  if (framework === 'framer-motion') {
    return <AccountButtonFramer attention={attention} onClick={onClick} />;
  }
  if (framework === 'react-spring') {
    return <AccountButtonSpring attention={attention} onClick={onClick} />;
  }
  return <AccountButtonGsap attention={attention} onClick={onClick} />;
}

function AccountButtonContent({ attention }: { attention: AttentionLevel }) {
  const label = attention === 'urgent' ? 'Account (urgent)' : attention === 'actionable' ? 'Account (action)' : 'Account';
  return (
    <>
      <User size={16} className={attention === 'urgent' ? 'text-red-300' : attention === 'actionable' ? 'text-blue-300' : 'text-slate-300'} />
      <span className="whitespace-nowrap">{label}</span>
    </>
  );
}

function AccountButtonFramer({ attention, onClick }: { attention: AttentionLevel; onClick?: () => void }) {
  const accent = getAccent(attention);

  const animate = useMemo(() => {
    if (attention === 'urgent') {
      return {
        opacity: [1, 0.25, 1],
        scale: [1, 1.03, 1],
        boxShadow: [`0 0 0px ${accent.glow}`, `0 0 22px ${accent.glow}`, `0 0 0px ${accent.glow}`],
        borderColor: [accent.border, accent.border, accent.border],
      };
    }
    if (attention === 'actionable') {
      return {
        opacity: [1, 0.92, 1],
        scale: [1, 1.06, 1],
        boxShadow: [`0 0 0px ${accent.glow}`, `0 0 18px ${accent.glow}`, `0 0 0px ${accent.glow}`],
        borderColor: [accent.border, accent.border, accent.border],
      };
    }
    // idle (slow breathe)
    return {
      opacity: [1, 0.98, 1],
      scale: [1, 1.02, 1],
      boxShadow: [`0 0 0px ${accent.glow}`, `0 0 10px ${accent.glow}`, `0 0 0px ${accent.glow}`],
      borderColor: [accent.border, accent.border, accent.border],
    };
  }, [attention, accent.border, accent.glow]);

  const transition = useMemo(() => {
    if (attention === 'urgent') return { duration: 0.55, repeat: Infinity, ease: 'easeInOut' as const };
    if (attention === 'actionable') return { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };
    return { duration: 3.2, repeat: Infinity, ease: 'easeInOut' as const };
  }, [attention]);

  return (
    <motion.button type="button" className={baseClassName} animate={animate} transition={transition} onClick={onClick}>
      <AccountButtonContent attention={attention} />
    </motion.button>
  );
}

function AccountButtonSpring({ attention, onClick }: { attention: AttentionLevel; onClick?: () => void }) {
  const accent = getAccent(attention);

  const { opacityA, scaleA, glowA } = useSpring({
    from:
      attention === 'urgent'
        ? { opacityA: 1, scaleA: 1, glowA: 0 }
        : attention === 'actionable'
          ? { opacityA: 1, scaleA: 1, glowA: 0 }
          : { opacityA: 1, scaleA: 1, glowA: 0 },
    to:
      attention === 'urgent'
        ? async (next) => {
            while (true) {
              // Flash (urgent)
              // eslint-disable-next-line no-await-in-loop
              await next({ opacityA: 0.25, scaleA: 1.03, glowA: 1 });
              // eslint-disable-next-line no-await-in-loop
              await next({ opacityA: 1, scaleA: 1, glowA: 0 });
            }
          }
        : attention === 'actionable'
          ? async (next) => {
              while (true) {
                // Pulse (actionable)
                // eslint-disable-next-line no-await-in-loop
                await next({ opacityA: 0.92, scaleA: 1.06, glowA: 1 });
                // eslint-disable-next-line no-await-in-loop
                await next({ opacityA: 1, scaleA: 1, glowA: 0 });
              }
            }
          : async (next) => {
              while (true) {
                // Breathe (idle)
                // eslint-disable-next-line no-await-in-loop
                await next({ opacityA: 0.98, scaleA: 1.02, glowA: 1 });
                // eslint-disable-next-line no-await-in-loop
                await next({ opacityA: 1, scaleA: 1, glowA: 0 });
              }
            },
    config: attention === 'urgent' ? { tension: 260, friction: 14 } : attention === 'actionable' ? { tension: 180, friction: 18 } : { tension: 90, friction: 26 },
  });

  const style = useMemo(
    () => ({
      opacity: opacityA,
      transform: scaleA.to((s) => `scale(${s})`),
      borderColor: accent.border,
      boxShadow: glowA.to((g) => `0 0 ${attention === 'urgent' ? 22 : attention === 'actionable' ? 18 : 10}px rgba(0,0,0,0), 0 0 ${attention === 'urgent' ? 22 : attention === 'actionable' ? 18 : 10}px ${accent.glow}`),
    }),
    [opacityA, scaleA, glowA, accent.border, accent.glow, attention]
  );

  return (
    <animated.button type="button" className={baseClassName} style={style as any} onClick={onClick}>
      <AccountButtonContent attention={attention} />
    </animated.button>
  );
}

function AccountButtonGsap({ attention, onClick }: { attention: AttentionLevel; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const accent = getAccent(attention);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 1, scale: 1, boxShadow: 'none', borderColor: accent.border });

      if (attention === 'urgent') {
        gsap.to(el, {
          opacity: 0.25,
          scale: 1.03,
          boxShadow: `0 0 22px ${accent.glow}`,
          duration: 0.275,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
        return;
      }

      if (attention === 'actionable') {
        gsap.to(el, {
          opacity: 0.92,
          scale: 1.06,
          boxShadow: `0 0 18px ${accent.glow}`,
          duration: 0.6,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
        });
        return;
      }

      // idle (slow breathe)
      gsap.to(el, {
        opacity: 0.98,
        scale: 1.02,
        boxShadow: `0 0 10px ${accent.glow}`,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, ref);

    return () => ctx.revert();
  }, [attention, accent.border, accent.glow]);

  return (
    <button ref={ref} type="button" className={baseClassName} onClick={onClick} style={{ borderColor: accent.border }}>
      <AccountButtonContent attention={attention} />
    </button>
  );
}


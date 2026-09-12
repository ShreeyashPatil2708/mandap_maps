import { useEffect, useMemo, useState } from 'react';
import { LogoMark } from '../components/icons.jsx';

// Floating marigold-petal style dots drifting upward.
function Particles() {
  const petals = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 5 + Math.random() * 7,
        duration: 9 + Math.random() * 8,
        delay: Math.random() * 10,
        drift: (Math.random() - 0.5) * 60,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p) => (
        <span
          key={p.id}
          className="absolute bottom-[-20px] rounded-full bg-gold/70"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            '--drift': `${p.drift}px`,
            animation: `floatUp ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Firecracker-style spark bursts flashing at random spots on a loop.
function CrackerBursts({ count = 5, fast = false }) {
  const bursts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: 10 + Math.random() * 60,
        left: 8 + Math.random() * 84,
        delay: i * (fast ? 0.25 : 1.6) + Math.random() * (fast ? 0.3 : 1.2),
        scale: 0.7 + Math.random() * 0.6,
      })),
    [count, fast]
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            top: `${b.top}%`,
            left: `${b.left}%`,
            transform: `scale(${b.scale})`,
            animation: `crackerBurst ${fast ? '1.1s' : '4.5s'} ease-out ${b.delay}s infinite`,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 44 44">
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const x2 = 22 + Math.cos(angle) * 18;
              const y2 = 22 + Math.sin(angle) * 18;
              return (
                <line
                  key={i}
                  x1="22"
                  y1="22"
                  x2={x2}
                  y2={y2}
                  stroke="#C9A84C"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        </div>
      ))}
    </div>
  );
}

// Dhol (drum) icon that sways side to side as if being played.
function DholIcon({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      className="animate-[dholSway_0.8s_ease-in-out_infinite]"
      style={{ transformOrigin: '50% 80%' }}
    >
      <rect x="6" y="10" width="22" height="14" rx="3" fill="#C9A84C" />
      <ellipse cx="6" cy="17" rx="3.2" ry="7.2" fill="#FAF6F0" stroke="#6B1E2E" strokeWidth="1.5" />
      <ellipse
        cx="28"
        cy="17"
        rx="3.2"
        ry="7.2"
        fill="#FAF6F0"
        stroke="#6B1E2E"
        strokeWidth="1.5"
      />
      <line x1="9" y1="12" x2="25" y2="12" stroke="#6B1E2E" strokeWidth="1" opacity="0.5" />
      <line x1="9" y1="22" x2="25" y2="22" stroke="#6B1E2E" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// Animated illustrated backdrop: radial glow, slowly rotating ray rings, and
// a large breathing Om mark. No photo dependency.
function AnimatedBackdrop() {
  return (
    <>
      <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-[90px] animate-[glowPulse_4.5s_ease-in-out_infinite]" />
      <div className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 animate-[spinSlow_40s_linear_infinite] rounded-full border border-dashed border-gold/20" />
      <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 animate-[spinSlow_28s_linear_infinite_reverse] rounded-full border border-gold/15" />
      <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 select-none font-devanagari text-[190px] font-bold leading-none text-gold/[0.10] animate-[glowPulse_6s_ease-in-out_infinite]">
        ॐ
      </div>
    </>
  );
}

// Brief dhol + cracker loading intro shown for ~1.8s before the main splash
// content fades in.
function LoadingIntro() {
  return (
    <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-5 bg-maroon">
      <CrackerBursts count={4} fast />
      <div className="flex items-center gap-4">
        <DholIcon size={46} />
        <DholIcon size={46} />
      </div>
      <div className="font-serif text-xl text-gold animate-[glowPulse_1.2s_ease-in-out_infinite]">
        Ganpati Bappa Morya
      </div>
    </div>
  );
}

// First-visit landing screen. Shown once (App.jsx gates it behind
// localStorage) before Home. onTeam leaves the splash for /team, which is a
// real page now, so nothing returns here and the intro only ever plays once.
export default function Splash({ onEnter, onTeam }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading) return undefined;
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-between overflow-hidden bg-maroon px-gutter-lg py-14 text-center">
      <AnimatedBackdrop />
      <Particles />
      {!loading && <CrackerBursts count={5} />}

      {loading && <LoadingIntro />}

      <div
        className={`relative z-[1] flex flex-1 flex-col items-center justify-center gap-5 transition-opacity duration-500 ${
          loading ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="relative flex items-center gap-3 animate-fadeIn"
          style={{ animationDelay: '0ms' }}
        >
          <DholIcon />
          <div className="relative">
            <div className="absolute inset-[-14px] rounded-full border border-gold/40 animate-[ringPulse_2.6s_ease-out_infinite]" />
            <div
              className="absolute inset-[-14px] rounded-full border border-gold/40 animate-[ringPulse_2.6s_ease-out_infinite]"
              style={{ animationDelay: '1.3s' }}
            />
            <LogoMark size={56} />
          </div>
          <DholIcon />
        </div>

        <div className="animate-fadeIn" style={{ animationDelay: '150ms' }}>
          <div className="font-serif text-[42px] leading-tight text-light drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
            MandapMaps
          </div>
          <div className="mt-1 font-devanagari text-base text-gold/90">मंडप मॅप्स</div>
        </div>

        <div
          className="font-sans text-[13px] uppercase tracking-[3px] text-gold animate-fadeIn"
          style={{ animationDelay: '280ms' }}
        >
          Pune · Ganeshotsav 2026
        </div>

        <p
          className="mx-auto mt-2 max-w-[320px] font-sans text-[15px] leading-relaxed text-light/85 animate-fadeIn"
          style={{ animationDelay: '400ms' }}
        >
          {' '}
          A companion for finding Ganpati pandals near you, planning a darshan route between them,
          and learning the history and traditions behind Pune&apos;s most beloved Ganpatis.
        </p>
      </div>

      <div
        className={`relative z-[1] flex w-full max-w-[320px] flex-col items-center gap-4 transition-opacity duration-500 ${
          loading ? 'pointer-events-none opacity-0' : 'opacity-100 animate-fadeIn'
        }`}
        style={{ animationDelay: '520ms' }}
      >
        <button
          onClick={onEnter}
          className="group relative w-full overflow-hidden rounded-pill border-2 border-gold bg-transparent px-8 py-3.5 font-sans text-[15px] font-semibold text-gold transition-colors duration-300 hover:text-maroon"
        >
          <span className="absolute inset-0 -translate-x-full bg-gold transition-transform duration-300 group-hover:translate-x-0" />
          <span className="relative flex items-center justify-center gap-2">
            Begin the Darshan <span className="text-lg">→</span>
          </span>
        </button>
        <button
          onClick={onTeam}
          className="font-sans text-[11px] uppercase tracking-[1.5px] text-light/50 underline decoration-gold/30 underline-offset-4 transition hover:text-light/80"
        >
          Team MandapMaps
        </button>
      </div>
    </div>
  );
}

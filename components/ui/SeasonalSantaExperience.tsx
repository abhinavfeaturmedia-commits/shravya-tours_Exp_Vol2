import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, Copy, Gift, Pause, Play, Snowflake, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

/* ── Single Festive Coupon Reward (Tour Packages above ₹30,000) ── */
export interface FestiveCouponReward {
  id: string;
  badge: string;
  headline: string;
  subline: string;
  code: string;
  eligibilityRules: string[];
  perkSummary: string;
}

const FESTIVE_COUPON: FestiveCouponReward = {
  id: 'xmas-2000',
  badge: "Santa's Festive Voucher",
  headline: 'Flat ₹2,000 OFF!',
  subline: 'Valid only on Tour Packages with booking value above ₹30,000.',
  code: 'XMAS2000',
  eligibilityRules: [
    'Valid only on Tour Packages',
    'Minimum package value must be above ₹30,000 to be eligible',
  ],
  perkSummary: 'Flat ₹2,000 OFF on Tour Packages above ₹30,000 (Code: XMAS2000)',
};

function legacyCopy(text: string): boolean {
  const previousFocus = document.activeElement as HTMLElement | null;
  const field = Object.assign(document.createElement('textarea'), { value: text });
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } finally {
    field.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

/* ── 1. Full-Page Visible Crystal Snowfall Canvas ── */
interface SnowFlake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  swayAmp: number;
  swayFreq: number;
  isCrystal: boolean;
  rotation: number;
  rotSpeed: number;
}

interface FullPageCrystalSnowCanvasProps {
  enabled: boolean;
}

export const FullPageCrystalSnowCanvas: React.FC<FullPageCrystalSnowCanvasProps> = ({ enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!enabled) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const flakeCount = width < 640 ? 44 : 78;
    const flakes: SnowFlake[] = Array.from({ length: flakeCount }, (_, i) => {
      const isCrystal = i % 3 === 0;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: isCrystal ? 0.55 + Math.random() * 0.85 : 0.7 + Math.random() * 1.15,
        radius: isCrystal ? 4.2 + Math.random() * 3.4 : 2 + Math.random() * 2.6,
        alpha: 0.55 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        swayAmp: 0.35 + Math.random() * 0.65,
        swayFreq: 0.01 + Math.random() * 0.015,
        isCrystal,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.018,
      };
    });

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        pointerRef.current.x = e.clientX;
        pointerRef.current.y = e.clientY;
        pointerRef.current.active = true;
      }
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    let rafId = 0;
    let tick = 0;

    const drawCrystal = (f: SnowFlake) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      const r = f.radius;

      // Sky-blue outer stroke makes snow crystal clearly visible on light white backgrounds
      ctx.strokeStyle = `rgba(14, 165, 233, ${f.alpha * 0.68})`;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      for (let a = 0; a < 3; a++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * a);
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Crisp white inner crystal core
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, f.alpha + 0.15)})`;
      ctx.lineWidth = 1;
      for (let a = 0; a < 3; a++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * a);
        ctx.beginPath();
        ctx.moveTo(-r * 0.88, 0);
        ctx.lineTo(r * 0.88, 0);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };

    const frame = () => {
      if (document.visibilityState === 'hidden') {
        rafId = window.requestAnimationFrame(frame);
        return;
      }

      tick += 1;
      ctx.clearRect(0, 0, width, height);

      const ptr = pointerRef.current;
      const repulseRadius = 125;

      for (const f of flakes) {
        const sway = Math.sin(tick * f.swayFreq + f.phase) * f.swayAmp;

        if (ptr.active) {
          const dx = f.x - ptr.x;
          const dy = f.y - ptr.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 1 && distSq < repulseRadius * repulseRadius) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / repulseRadius) * 1.8;
            f.vx += (dx / dist) * force * 0.48 - (dy / dist) * force * 0.15;
            f.vy += (dy / dist) * force * 0.25;
          }
        }

        const targetVy = f.isCrystal ? 0.68 + f.radius * 0.05 : 0.72 + f.radius * 0.14;
        f.vx *= 0.95;
        f.vy += (targetVy - f.vy) * 0.04;

        f.x += f.vx + sway * 0.55;
        f.y += f.vy;
        f.rotation += f.rotSpeed;

        if (f.x < -16) f.x = width + 16;
        if (f.x > width + 16) f.x = -16;
        if (f.y > height + 16) {
          f.y = -16;
          f.x = Math.random() * width;
        }

        if (f.isCrystal) {
          drawCrystal(f);
        } else {
          // Frosted blue rim + bright white center so snow pops on white & dark surfaces
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius + 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${f.alpha * 0.42})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.98, f.alpha + 0.15)})`;
          ctx.fill();
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [enabled]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-[25] pointer-events-none select-none"
    />
  );
};

/* ── 2. Card Top "Snow Cap" & Hover Puff ── */
export const SeasonalSnowCap: React.FC = () => {
  const gradId = useId();
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 right-0 z-20 overflow-hidden rounded-t-2xl"
    >
      <svg
        viewBox="0 0 400 28"
        preserveAspectRatio="none"
        className="w-full h-5 sm:h-6 block drop-shadow-[0_2px_4px_rgba(14,165,233,0.22)]"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="65%" stopColor="#e0f2fe" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 L400,0 L400,14 C385,22 372,11 356,16 C338,22 325,9 305,13 C286,17 272,8 250,11 C230,14 214,6 192,10 C172,14 155,7 132,12 C110,17 95,8 74,15 C54,22 38,10 20,16 C10,19 4,16 0,14 Z"
          fill={`url(#${gradId})`}
        />
        {/* Delicate side icicles */}
        <path d="M24,14 L27,25 L30,14 Z" fill="#e0f2fe" opacity="0.9" />
        <path d="M366,14 L369,26 L372,14 Z" fill="#e0f2fe" opacity="0.9" />
      </svg>

      {/* Hover snow-puff sparkles */}
      <div className="absolute top-3 left-0 right-0 flex justify-around px-8">
        <span className="snow-puff-dot size-1.5 rounded-full bg-white shadow-sm" style={{ animationDelay: '0ms' }} />
        <span className="snow-puff-dot size-1 rounded-full bg-sky-100 shadow-sm" style={{ animationDelay: '90ms' }} />
        <span className="snow-puff-dot size-1.5 rounded-full bg-white shadow-sm" style={{ animationDelay: '45ms' }} />
        <span className="snow-puff-dot size-1 rounded-full bg-sky-100 shadow-sm" style={{ animationDelay: '130ms' }} />
      </div>
    </div>
  );
};

/* ── 3. Header Controls ("Summon Sleigh" + WCAG Pause/Play Snow & Santa) ── */
interface SeasonalFestiveToolbarProps {
  effectsEnabled: boolean;
  onToggleEffects: () => void;
  onSummonSleigh: () => void;
  onOpenGiftQuick: () => void;
}

export const SeasonalFestiveToolbar: React.FC<SeasonalFestiveToolbarProps> = ({
  effectsEnabled,
  onToggleEffects,
  onSummonSleigh,
  onOpenGiftQuick,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onSummonSleigh}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm hover:shadow-md active:scale-[0.97] transition-all"
      >
        <span aria-hidden="true">🛷</span>
        <span>Summon Santa&apos;s Sleigh</span>
      </button>

      {!effectsEnabled && (
        <button
          type="button"
          onClick={onOpenGiftQuick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-sm active:scale-[0.97] transition-all"
        >
          <Gift className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Claim ₹2,000 Gift</span>
        </button>
      )}

      {/* WCAG 2.2.2 Pause/Play control (no aria-pressed alongside dynamic Play/Pause label) */}
      <button
        type="button"
        onClick={onToggleEffects}
        aria-label={
          effectsEnabled
            ? 'Pause snowfall and Santa animations'
            : 'Play snowfall and Santa animations'
        }
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 text-xs font-bold shadow-sm active:scale-[0.97] transition-all"
      >
        <Snowflake className="size-3.5 text-sky-500 shrink-0" aria-hidden="true" />
        <span>Snow &amp; Santa: {effectsEnabled ? 'On' : 'Off'}</span>
        {effectsEnabled ? (
          <Pause className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
        ) : (
          <Play className="size-3 text-slate-400 shrink-0" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

/* ── SVG Illustrations: Walking Santa & Flying Sleigh ── */
const WalkingSantaSVG: React.FC<{ isWaving: boolean }> = ({ isWaving }) => (
  <svg viewBox="0 0 92 96" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_6px_12px_rgba(15,23,42,0.22)]" aria-hidden="true">
    {/* Gift Sack over back */}
    <ellipse cx="22" cy="54" rx="15" ry="18" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
    <path d="M16,40 Q22,33 28,40" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />

    {/* Back Leg */}
    <g className="santa-leg-back">
      <rect x="33" y="68" width="9" height="16" rx="3" fill="#b91c1c" />
      <rect x="32" y="81" width="13" height="6" rx="2.5" fill="#1e293b" />
    </g>

    {/* Front Leg */}
    <g className="santa-leg-front">
      <rect x="46" y="68" width="9" height="16" rx="3" fill="#dc2626" />
      <rect x="45" y="81" width="14" height="6" rx="2.5" fill="#0f172a" />
    </g>

    {/* Torso / Red Suit */}
    <rect x="28" y="42" width="32" height="30" rx="12" fill="#dc2626" />
    {/* White Coat Hem */}
    <rect x="26" y="67" width="36" height="6" rx="3" fill="#ffffff" />
    {/* Black Belt & Gold Buckle */}
    <rect x="28" y="55" width="32" height="5" fill="#0f172a" />
    <rect x="41" y="54" width="8" height="7" rx="1.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />

    {/* Waving / Walking Arm */}
    <g className={isWaving ? 'santa-arm-wave' : ''}>
      <path d="M54,48 L69,38" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
      <circle cx="71" cy="37" r="4.5" fill="#ffffff" />
    </g>

    {/* Head & Face */}
    <circle cx="44" cy="29" r="12" fill="#fed7aa" />
    {/* Rosy Cheek & Eyes */}
    <circle cx="49" cy="28" r="1.4" fill="#0f172a" />
    <circle cx="51" cy="31" r="2.2" fill="#fb7185" opacity="0.6" />
    {/* Fluffy Beard & Mustache */}
    <path d="M33,31 C33,45 55,46 56,31 C52,33 37,33 33,31 Z" fill="#ffffff" />
    <ellipse cx="47" cy="32" rx="6" ry="2.6" fill="#f8fafc" />

    {/* Santa Hat */}
    <path d="M31,24 C32,12 48,8 57,17 L55,24 Z" fill="#dc2626" />
    <path d="M31,22 C24,18 22,23 20,27" fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round" />
    <circle cx="19" cy="28" r="4" fill="#ffffff" />
    <rect x="30" y="21" width="27" height="5.5" rx="2.75" fill="#ffffff" />
  </svg>
);

const FlyingSleighSVG: React.FC = () => (
  <svg viewBox="0 0 220 76" className="w-48 sm:w-56 h-auto drop-shadow-[0_6px_14px_rgba(15,23,42,0.28)]" aria-hidden="true">
    {/* Reins */}
    <path d="M90,42 Q125,46 156,34" fill="none" stroke="#fbbf24" strokeWidth="1.6" strokeDasharray="3 2" />

    {/* Reindeer */}
    <g transform="translate(148, 16)">
      {/* Antlers */}
      <path d="M34,12 L38,2 M38,7 L43,4 M30,12 L27,4" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      {/* Body & Legs */}
      <ellipse cx="20" cy="28" rx="15" ry="8" fill="#92400e" />
      <path d="M10,33 L4,45 M15,34 L12,46 M26,34 L31,45 M30,32 L38,41" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      {/* Neck & Head */}
      <path d="M29,24 L35,13" stroke="#92400e" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="38" cy="14" rx="7" ry="4.5" fill="#92400e" />
      {/* Glowing Rudolph Nose */}
      <circle cx="45" cy="14" r="3" fill="#ef4444" />
      <circle cx="45" cy="14" r="5" fill="#ef4444" opacity="0.35" />
    </g>

    {/* Sleigh Runners */}
    <path d="M12,60 C26,64 78,64 96,58 C102,55 104,49 99,47" fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M26,50 L26,61 M72,50 L72,61" stroke="#fbbf24" strokeWidth="3" />

    {/* Sleigh Body */}
    <path d="M14,32 C18,52 34,54 88,52 C94,45 90,34 80,32 C68,38 36,38 14,32 Z" fill="#b91c1c" stroke="#fbbf24" strokeWidth="2" />

    {/* Gift Sack in Sleigh */}
    <circle cx="34" cy="29" r="10" fill="#15803d" />
    <rect x="24" y="25" width="8" height="8" rx="1.5" fill="#fbbf24" />

    {/* Mini Santa in Sleigh */}
    <circle cx="58" cy="25" r="7" fill="#fed7aa" />
    <path d="M51,26 C52,34 64,34 65,26 Z" fill="#ffffff" />
    <path d="M51,21 C53,12 63,11 66,20 Z" fill="#dc2626" />
    <rect x="50" y="19" width="16" height="3.5" rx="1.75" fill="#ffffff" />
    <circle cx="67" cy="16" r="2.5" fill="#ffffff" />
  </svg>
);

const GiftBoxSVG: React.FC<{ small?: boolean }> = ({ small }) => (
  <svg viewBox="0 0 48 48" className={small ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14'} aria-hidden="true">
    <rect x="6" y="18" width="36" height="24" rx="4" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
    <rect x="4" y="13" width="40" height="8" rx="3" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
    <rect x="21" y="13" width="6" height="29" fill="#fbbf24" />
    <rect x="6" y="27" width="36" height="5" fill="#fbbf24" />
    <path d="M24,13 C18,5 12,11 19,13 Z M24,13 C30,5 36,11 29,13 Z" fill="#fde68a" stroke="#d97706" strokeWidth="1.2" />
  </svg>
);

const ParachuteGiftSVG: React.FC = () => (
  <svg viewBox="0 0 64 78" className="w-14 h-16 sm:w-16 sm:h-20 drop-shadow-[0_6px_10px_rgba(15,23,42,0.22)]" aria-hidden="true">
    {/* Canopy */}
    <path d="M6,28 C6,10 58,10 58,28 Z" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
    <path d="M18,28 C20,12 28,11 32,11 C36,11 44,12 46,28 Z" fill="#ffffff" />
    <path d="M25,28 C26,13 30,11 32,11 C34,11 38,13 39,28 Z" fill="#16a34a" />
    {/* Strings */}
    <line x1="10" y1="28" x2="25" y2="48" stroke="#64748b" strokeWidth="1.2" />
    <line x1="32" y1="28" x2="32" y2="48" stroke="#64748b" strokeWidth="1.2" />
    <line x1="54" y1="28" x2="39" y2="48" stroke="#64748b" strokeWidth="1.2" />
    {/* Dangling Gift */}
    <rect x="19" y="48" width="26" height="22" rx="3.5" fill="#dc2626" stroke="#fbbf24" strokeWidth="2" />
    <rect x="29.5" y="48" width="5" height="22" fill="#fbbf24" />
    <rect x="19" y="56.5" width="26" height="4.5" fill="#fbbf24" />
  </svg>
);

/* ── 4. Walking Santa + Dropped Gift Boxes + Flying Sleigh + Gift Parachutes + Native <dialog> ── */
interface DroppedGift {
  id: number;
  xPercent: number;
  reward: FestiveCouponReward;
}

interface ParachuteDrop {
  id: number;
  xPx: number;
  reward: FestiveCouponReward;
}

interface WalkingSantaAndSleighProps {
  enabled: boolean;
  sleighTriggerKey: number;
  quickOpenKey: number;
  activeCategory: string;
  searchQuery?: string;
}

export const WalkingSantaAndSleigh: React.FC<WalkingSantaAndSleighProps> = ({
  enabled,
  sleighTriggerKey,
  quickOpenKey,
  activeCategory,
  searchQuery,
}) => {
  const santaWrapperRef = useRef<HTMLDivElement | null>(null);
  const santaSpriteRef = useRef<HTMLSpanElement | null>(null);
  const sleighWrapperRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const headingId = useId();
  const giftIdCounter = useRef(1);

  const [isWaving, setIsWaving] = useState(false);
  const [santaSpeech, setSantaSpeech] = useState<string | null>(null);
  const [droppedGifts, setDroppedGifts] = useState<DroppedGift[]>([]);
  const [parachutes, setParachutes] = useState<ParachuteDrop[]>([]);
  const [isSleighFlying, setIsSleighFlying] = useState(false);
  const [activeReward, setActiveReward] = useState<FestiveCouponReward | null>(null);

  // Copy state & VoiceOver live announcement tracker
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [liveStatus, setLiveStatus] = useState('');
  const lastAnnouncementRef = useRef('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextReward = useCallback((): FestiveCouponReward => {
    return FESTIVE_COUPON;
  }, []);

  const openRewardModal = useCallback((reward: FestiveCouponReward) => {
    setActiveReward(reward);
    setCopyState('idle');
    setLiveStatus('');
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  // Open modal immediately if user clicked static "Claim ₹2,000 Gift" when paused
  useEffect(() => {
    if (quickOpenKey === 0) return;
    openRewardModal(FESTIVE_COUPON);
  }, [quickOpenKey, openRewardModal]);

  // Progressive enhancement fallback for browsers without <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
    };
    dialog.addEventListener('close', handleClose);

    if ('closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('close', handleClose);
    }

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = dialog.open && isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (dialog.open && pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const santaPosRef = useRef<{ x: number; dir: 1 | -1; pausedUntil: number }>({
    x: 40,
    dir: 1,
    pausedUntil: 0,
  });

  const dropGiftAtCurrentSanta = useCallback(
    (speechText = 'Ho Ho Ho! Tap for ₹2,000 OFF! 🎁') => {
      const vw = Math.max(window.innerWidth, 360);
      const rawPercent = ((santaPosRef.current.x + 36) / vw) * 100;
      const clampedPercent = Math.max(8, Math.min(76, rawPercent));
      const newGift: DroppedGift = {
        id: giftIdCounter.current++,
        xPercent: clampedPercent,
        reward: nextReward(),
      };

      setDroppedGifts((prev) => [...prev.slice(-1), newGift]);
      setIsWaving(true);
      setSantaSpeech(speechText);
      santaPosRef.current.pausedUntil = performance.now() + 2000;

      window.setTimeout(() => {
        setIsWaving(false);
        setSantaSpeech(null);
      }, 2400);
    },
    [nextReward]
  );

  // Walking Santa smooth rAF loop (zero React re-renders per frame)
  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let lastTime = performance.now();
    let lastAutoDropAt = performance.now() - 10500; // First gift drops ~3.5s after mount

    const step = (now: number) => {
      const dt = Math.min(48, now - lastTime);
      lastTime = now;

      if (document.visibilityState === 'visible') {
        const vw = window.innerWidth;
        const maxX = Math.max(110, vw - 205); // Keep clear of bottom-right assistant
        const state = santaPosRef.current;

        if (now >= state.pausedUntil) {
          state.x += state.dir * (dt * 0.055); // Gentle stroll ~55px/sec
          if (state.x >= maxX) {
            state.x = maxX;
            state.dir = -1;
          } else if (state.x <= 16) {
            state.x = 16;
            state.dir = 1;
          }
        }

        if (santaWrapperRef.current) {
          santaWrapperRef.current.style.transform = `translate3d(${state.x.toFixed(1)}px, 0, 0)`;
        }
        if (santaSpriteRef.current) {
          santaSpriteRef.current.style.transform = `scaleX(${state.dir})`;
        }

        // Auto-drop a gift periodically so visitors discover the ₹2,000 gift easily
        if (now - lastAutoDropAt > 14000) {
          lastAutoDropAt = now;
          setDroppedGifts((prev) => {
            if (prev.length >= 2) return prev;
            const rawPercent = ((state.x + 36) / Math.max(vw, 360)) * 100;
            const clampedPercent = Math.max(8, Math.min(76, rawPercent));
            return [
              ...prev,
              {
                id: giftIdCounter.current++,
                xPercent: clampedPercent,
                reward: nextReward(),
              },
            ];
          });
          setIsWaving(true);
          setSantaSpeech('Ho Ho Ho! Gift dropped! 🎁');
          state.pausedUntil = now + 1700;
          window.setTimeout(() => {
            setIsWaving(false);
            setSantaSpeech(null);
          }, 2200);
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [enabled, nextReward]);

  // Launch Flying Sleigh + Gift Parachutes
  const launchSleighPass = useCallback(() => {
    if (isSleighFlying) return;
    setIsSleighFlying(true);
  }, [isSleighFlying]);

  // Trigger sleigh when header button clicked
  useEffect(() => {
    if (sleighTriggerKey === 0) return;
    if (!enabled) {
      toast.info('Turn on Snow & Santa or click Claim ₹2,000 Gift to grab your coupon!');
      return;
    }
    launchSleighPass();
  }, [sleighTriggerKey, enabled, launchSleighPass]);

  // Auto-launch sleigh shortly after visiting seasonal page & periodically (~26s)
  useEffect(() => {
    if (!enabled) {
      setIsSleighFlying(false);
      setParachutes([]);
      return;
    }

    const firstTimer = window.setTimeout(() => {
      setIsSleighFlying(true);
    }, 1800);

    const intervalId = window.setInterval(() => {
      setIsSleighFlying(true);
    }, 26000);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  // Sleigh glide rAF animation + Parachute spawning at 26%, 52%, 78%
  useEffect(() => {
    if (!isSleighFlying || !enabled) return;

    const vw = window.innerWidth;
    const startX = -250;
    const endX = vw + 80;
    const duration = 7000;
    const startTime = performance.now();
    const spawnedThresholds = new Set<number>();
    let rafId = 0;

    const spawnParachute = (xPos: number) => {
      const safeX = Math.max(24, Math.min(vw - 88, xPos));
      const newDrop: ParachuteDrop = {
        id: giftIdCounter.current++,
        xPx: safeX,
        reward: nextReward(),
      };
      setParachutes((prev) => [...prev.slice(-2), newDrop]);
      window.setTimeout(() => {
        setParachutes((prev) => prev.filter((p) => p.id !== newDrop.id));
      }, 9500);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const currentX = startX + (endX - startX) * progress;
      const arcY = Math.sin(progress * Math.PI) * -18;

      if (sleighWrapperRef.current) {
        sleighWrapperRef.current.style.transform = `translate3d(${currentX.toFixed(1)}px, ${arcY.toFixed(1)}px, 0)`;
      }

      for (const t of [0.26, 0.52, 0.78]) {
        if (progress >= t && !spawnedThresholds.has(t)) {
          spawnedThresholds.add(t);
          spawnParachute(currentX + 60);
        }
      }

      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setIsSleighFlying(false);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isSleighFlying, enabled, nextReward]);

  const handleCopyCode = async () => {
    if (!activeReward) return;
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);

    let ok = false;
    try {
      await navigator.clipboard.writeText(activeReward.code);
      ok = true;
    } catch {
      ok = legacyCopy(activeReward.code);
    }

    setCopyState(ok ? 'copied' : 'failed');
    let msg = ok ? `Copied ${activeReward.code}` : 'Copy failed';
    if (msg === lastAnnouncementRef.current) msg += '\u00A0';
    lastAnnouncementRef.current = msg;
    setLiveStatus(msg);

    if (ok) {
      toast.success(`Coupon ${activeReward.code} copied! Valid on Tour Packages above ₹30,000.`);
    }

    copyTimerRef.current = setTimeout(() => {
      setCopyState('idle');
      setLiveStatus('');
    }, 2200);
  };

  const claimUrl = activeReward
    ? `/customize?category=${encodeURIComponent(
        activeCategory === 'all' ? 'seasonal' : activeCategory
      )}${searchQuery ? `&destination=${encodeURIComponent(searchQuery)}` : ''}&perk=${encodeURIComponent(
        activeReward.perkSummary
      )}`
    : '/customize?category=seasonal';

  return (
    <>
      {/* ── Flying Sleigh & Reindeer Layer (Upper Viewport) ── */}
      {enabled && isSleighFlying && (
        <div
          ref={sleighWrapperRef}
          aria-hidden="true"
          className="fixed top-[76px] sm:top-[84px] left-0 z-[36] pointer-events-none select-none will-change-transform"
          style={{ transform: 'translate3d(-250px, 0, 0)' }}
        >
          <div className="relative flex items-center">
            <div className="hidden sm:flex items-center gap-1.5 mr-1 opacity-85">
              <span className="size-1.5 rounded-full bg-amber-300 animate-ping" />
              <span className="size-2 rounded-full bg-amber-400" />
              <span className="size-1.5 rounded-full bg-yellow-200" />
            </div>
            <FlyingSleighSVG />
          </div>
        </div>
      )}

      {/* ── Clickable Swaying Gift Parachutes ── */}
      {enabled &&
        parachutes.map((drop) => (
          <ParachuteButton
            key={drop.id}
            drop={drop}
            onCatch={(caught) => {
              setParachutes((prev) => prev.filter((p) => p.id !== caught.id));
              openRewardModal(caught.reward);
            }}
          />
        ))}

      {/* ── Dropped Bouncing Gift Boxes on Lower Edge ── */}
      {enabled &&
        droppedGifts.map((gift) => (
          <button
            key={gift.id}
            type="button"
            onClick={() => {
              setDroppedGifts((prev) => prev.filter((g) => g.id !== gift.id));
              openRewardModal(gift.reward);
            }}
            aria-label="Open Santa's ₹2,000 gift box"
            style={{ left: `${gift.xPercent}%` }}
            className="fixed bottom-4 z-[42] group flex flex-col items-center cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 rounded-2xl p-1"
          >
            <span className="mb-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md group-hover:scale-105 transition-transform">
              Open ₹2K Gift
            </span>
            <div className="festive-gift-bounce drop-shadow-[0_8px_14px_rgba(185,28,28,0.35)]">
              <GiftBoxSVG />
            </div>
          </button>
        ))}

      {/* ── Walking Santa Strolling Across Lower Screen ── */}
      {enabled && (
        <div
          ref={santaWrapperRef}
          className="fixed bottom-1 left-0 z-[41] will-change-transform"
          style={{ transform: 'translate3d(40px, 0, 0)' }}
        >
          <div className="relative">
            {santaSpeech && (
              <div
                role="status"
                className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-amber-300 text-slate-900 dark:text-amber-100 text-[11px] font-extrabold shadow-lg pointer-events-none"
              >
                {santaSpeech}
              </div>
            )}
            <button
              type="button"
              onClick={() => dropGiftAtCurrentSanta('Ho Ho Ho! Here is a ₹2,000 gift! 🎁')}
              aria-label="Tap Santa Claus to drop a ₹2,000 festive gift"
              title="Tap Santa for a ₹2,000 gift!"
              className="santa-walk-bob cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-red-500 active:scale-95 transition-transform bg-transparent border-0 p-0"
            >
              <span ref={santaSpriteRef} className="inline-block">
                <WalkingSantaSVG isWaving={isWaving} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Native Top-Layer <dialog> Coupon Reward Modal ── */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as any)}
        aria-labelledby={headingId}
        className="festive-reward-dialog"
      >
        {activeReward && (
          <div className="relative rounded-3xl bg-white dark:bg-[#131b26] border border-amber-300/60 dark:border-amber-500/30 shadow-2xl overflow-hidden text-slate-900 dark:text-white">
            {/* Festive Crimson & Gold Top Banner */}
            <div className="relative bg-gradient-to-br from-red-700 via-red-600 to-amber-600 px-6 pt-7 pb-6 text-white text-center">
              <form method="dialog">
                <button
                  type="submit"
                  value="close"
                  aria-label="Close festive reward"
                  className="absolute top-3.5 right-3.5 size-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </form>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 border border-white/25 text-amber-200 text-[11px] font-black uppercase tracking-widest mb-3">
                <Sparkles className="size-3.5 text-amber-300" aria-hidden="true" />
                <span>{activeReward.badge}</span>
              </div>

              <div className="flex justify-center mb-2">
                <GiftBoxSVG small />
              </div>

              <h1 id={headingId} className="font-display text-3xl font-bold italic tracking-tight">
                {activeReward.headline}
              </h1>
              <p className="text-xs sm:text-sm text-amber-50/95 mt-1.5 max-w-sm mx-auto leading-relaxed">
                {activeReward.subline}
              </p>
            </div>

            {/* Coupon Code & Actions */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border-2 border-dashed border-amber-400/80 dark:border-amber-500/40">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                    Festive Coupon Code
                  </p>
                  <p className="font-mono text-xl font-black tracking-wider text-slate-900 dark:text-white">
                    {activeReward.code}
                  </p>
                </div>

                <div className="relative flex items-center gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={handleCopyCode}
                    data-copied={copyState === 'copied' ? '' : undefined}
                    data-failed={copyState === 'failed' ? '' : undefined}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-colors active:scale-[0.97] ${
                      copyState === 'copied'
                        ? 'bg-emerald-600 text-white'
                        : copyState === 'failed'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-primary dark:hover:bg-amber-300'
                    }`}
                  >
                    {copyState === 'copied' ? (
                      <Check className="size-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{copyState === 'copied' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <span role="status" className="sr-only">
                    {liveStatus}
                  </span>
                </div>
              </div>

              {/* Coupon Eligibility Terms */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Eligibility Terms
                </p>
                <ul className="space-y-1">
                  {activeReward.eligibilityRules.map((rule) => (
                    <li key={rule} className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  to={claimUrl}
                  onClick={() => dialogRef.current?.close()}
                  className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-primary to-amber-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider text-center shadow-lg transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">auto_awesome</span>
                  <span>Claim on Custom Trip</span>
                </Link>
                <form method="dialog" className="sm:w-auto">
                  <button
                    type="submit"
                    value="close"
                    className="w-full py-3 px-5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                  >
                    Keep Browsing
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
};

/* ── Parachute Descent Subcomponent ── */
const ParachuteButton: React.FC<{
  drop: ParachuteDrop;
  onCatch: (drop: ParachuteDrop) => void;
}> = ({ drop, onCatch }) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 9200;
    const startY = 115;
    const endY = Math.max(340, window.innerHeight * 0.78);
    let rafId = 0;

    const descend = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const y = startY + (endY - startY) * progress;
      const swayX = Math.sin(progress * Math.PI * 4) * 22;
      if (btnRef.current) {
        btnRef.current.style.transform = `translate3d(${(drop.xPx + swayX).toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        btnRef.current.style.opacity = progress > 0.85 ? String(Math.max(0, (1 - progress) / 0.15)) : '1';
      }
      if (progress < 1) {
        rafId = window.requestAnimationFrame(descend);
      }
    };

    rafId = window.requestAnimationFrame(descend);
    return () => window.cancelAnimationFrame(rafId);
  }, [drop.xPx]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => onCatch(drop)}
      aria-label="Catch Santa's ₹2,000 parachute gift"
      title="Catch me for ₹2,000 OFF!"
      style={{ transform: `translate3d(${drop.xPx}px, 115px, 0)` }}
      className="fixed top-0 left-0 z-[43] cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 rounded-2xl p-1 bg-transparent border-0"
    >
      <div className="festive-parachute-sway flex flex-col items-center">
        <ParachuteGiftSVG />
        <span className="-mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-md whitespace-nowrap">
          Catch ₹2K!
        </span>
      </div>
    </button>
  );
};

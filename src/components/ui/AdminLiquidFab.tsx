import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Liquid } from 'liquid-gooey';

export interface AdminQuickAction {
  name: string;
  icon: string;
  path: string;
  color?: string;
  bg?: string;
  module?: string;
}

interface AdminLiquidFabProps {
  actions: AdminQuickAction[];
}

export const AdminLiquidFab: React.FC<AdminLiquidFabProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const navigate = useNavigate();
  const fabRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHoveredAction(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setHoveredAction(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Compute radial fan-out coordinates in the upper-left quadrant (90° to 180°)
  // Center of main button is at (166, 166). Satellites originate under it.
  const mappedActions = useMemo(() => {
    const total = actions.length;
    if (total === 0) return [];

    return actions.map((action, index) => {
      let x = 0;
      let y = 0;

      if (total === 1) {
        x = 0;
        y = -90;
      } else {
        // Arc from 90° (straight up) to 180° (straight left)
        const startAngle = Math.PI / 2; // 90°
        const endAngle = Math.PI;       // 180°
        const angle = startAngle + (index / (total - 1)) * (endAngle - startAngle);
        const radius = 94; // comfortable separation for organic gooey snapping
        x = Math.round(Math.cos(angle) * radius);
        y = -Math.round(Math.sin(angle) * radius);
      }

      // Default curated vibrant palette if not provided
      const defaultBgs = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
      const bg = action.bg || defaultBgs[index % defaultBgs.length];

      return {
        ...action,
        x,
        y,
        bg,
      };
    });
  }, [actions]);

  if (!actions || actions.length === 0) return null;

  return (
    <div
      ref={fabRef}
      className="fixed bottom-6 right-4 lg:right-6 z-50 select-none pointer-events-none"
      aria-label="Admin Quick Actions Menu"
    >
      <div className="relative" style={{ width: 210, height: 210 }}>
        {/* Crisp Hover Action Badge (Rendered outside SVG goo filter for crisp typography) */}
        {isOpen && (
          <div className="absolute top-2 left-2 pointer-events-none transition-all duration-200">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-bold shadow-xl border border-white/10 dark:border-slate-800/10 backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="tracking-tight">{hoveredAction || 'Quick Actions'}</span>
            </div>
          </div>
        )}

        {/* Liquid Gooey Morphing Container */}
        <div className="pointer-events-auto">
          <Liquid
            fill="#6366F1"
            blur={6}
            contrast={18}
            shadow="0 8px 24px rgba(99, 102, 241, 0.4)"
            style={{ width: 210, height: 210 }}
          >
            {/* Satellite Action Droplets */}
            {mappedActions.map((action, index) => (
              <Liquid.Item
                key={action.name}
                style={{ position: 'absolute', left: 147, top: 147 }}
                x={isOpen ? action.x : 0}
                y={isOpen ? action.y : 0}
                transition="bouncy"
                delay={index * 35}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setHoveredAction(null);
                    navigate(action.path);
                  }}
                  onMouseEnter={() => setHoveredAction(action.name)}
                  onMouseLeave={() => setHoveredAction(null)}
                  aria-label={action.name}
                  title={action.name}
                  tabIndex={isOpen ? 0 : -1}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 hover:scale-115 focus:outline-none"
                  style={{
                    backgroundColor: action.bg,
                    pointerEvents: isOpen ? 'auto' : 'none',
                  }}
                >
                  <span className="material-symbols-outlined text-[20px] select-none pointer-events-none">
                    {action.icon}
                  </span>
                </button>
              </Liquid.Item>
            ))}

            {/* Central Master Trigger Droplet */}
            <Liquid.Item style={{ position: 'absolute', left: 142, top: 142 }}>
              <button
                type="button"
                onClick={() => {
                  setIsOpen((prev) => !prev);
                  if (isOpen) setHoveredAction(null);
                }}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Close Quick Actions' : 'Open Quick Actions'}
                title="Admin Quick Actions"
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 transition-all duration-300 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 group focus:outline-none"
              >
                <span
                  className={`material-symbols-outlined text-[28px] transition-transform duration-300 ${
                    isOpen ? 'rotate-90' : 'rotate-0'
                  }`}
                >
                  {isOpen ? 'close' : 'add'}
                </span>
              </button>
            </Liquid.Item>
          </Liquid>
        </div>
      </div>
    </div>
  );
};

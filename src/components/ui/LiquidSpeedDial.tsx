import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Liquid } from 'liquid-gooey';
import { MessageCircle, Phone, Compass, X, Headphones, Sparkles } from 'lucide-react';
import { COMPANY_PHONE } from '../../lib/constants';

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  x: number;
  y: number;
  bg: string;
  onClick: () => void;
}

export const LiquidSpeedDial: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dialRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dialRef.current && !dialRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const actions: ActionItem[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp Chat',
      icon: <MessageCircle className="w-5 h-5 text-white" />,
      x: 0,
      y: -62,
      bg: '#25D366',
      onClick: () => {
        setIsOpen(false);
        window.open(
          'https://wa.me/919422030800?text=Hello%20Shrawello%20Travels,%20I%20would%20like%20to%20inquire%20about%20a%20tour%20package.',
          '_blank'
        );
      },
    },
    {
      id: 'call',
      label: 'Call Concierge',
      icon: <Phone className="w-5 h-5 text-white" />,
      x: 48,
      y: -46,
      bg: '#1D4ED8',
      onClick: () => {
        setIsOpen(false);
        window.location.href = `tel:${COMPANY_PHONE}`;
      },
    },
    {
      id: 'packages',
      label: 'Explore Tours',
      icon: <Compass className="w-5 h-5 text-white" />,
      x: 64,
      y: 0,
      bg: '#D97706',
      onClick: () => {
        setIsOpen(false);
        navigate('/packages');
      },
    },
  ];

  return (
    <div
      ref={dialRef}
      className="fixed bottom-6 left-6 z-[9990] select-none pointer-events-auto"
      aria-label="Travel Concierge Floating Menu"
    >
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Gooey Liquid Canvas & Morphing Satellites */}
        <Liquid
          fill="#C9732A"
          blur={6}
          contrast={18}
          shadow="0 8px 24px rgba(201, 115, 42, 0.45)"
          style={{ width: 140, height: 140 }}
        >
          {/* Satellite Actions */}
          {actions.map((action, index) => (
            <Liquid.Item
              key={action.id}
              style={{ position: 'absolute', left: 14, top: 78 }}
              x={isOpen ? action.x : 0}
              y={isOpen ? action.y : 0}
              transition="bouncy"
              delay={index * 35}
            >
              <button
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                title={action.label}
                tabIndex={isOpen ? 0 : -1}
                className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-110"
                style={{
                  backgroundColor: action.bg,
                  pointerEvents: isOpen ? 'auto' : 'none',
                }}
              >
                {action.icon}
              </button>
            </Liquid.Item>
          ))}

          {/* Main FAB Trigger Button */}
          <Liquid.Item style={{ position: 'absolute', left: 14, top: 78 }}>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Close Concierge Menu' : 'Open Concierge Menu'}
              title="24/7 Travel Concierge"
              className="w-12 h-12 rounded-full bg-[#C9732A] hover:bg-[#b36423] text-white flex items-center justify-center shadow-xl transition-all active:scale-95 group focus:outline-none"
            >
              {isOpen ? (
                <X className="w-6 h-6 transition-transform rotate-0 group-hover:rotate-90" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <Headphones className="w-6 h-6 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                </div>
              )}
            </button>
          </Liquid.Item>
        </Liquid>

        {/* Ambient Tooltip when closed */}
        {!isOpen && (
          <div className="absolute left-16 bottom-3.5 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-bold tracking-wide shadow-md pointer-events-none opacity-80 backdrop-blur-sm whitespace-nowrap animate-fade-in border border-slate-700/50">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Concierge</span>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ActionMenuProps {
    children: ReactNode;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ x: 0, top: 0, bottom: 0, bottomSpace: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({
                x: rect.right, 
                top: rect.top,
                bottom: rect.bottom,
                bottomSpace: window.innerHeight - rect.bottom
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <>
            <button
                ref={buttonRef}
                onClick={toggleMenu}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none flex items-center justify-center relative"
                title="Options"
            >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
            </button>

            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Automatically close the menu when any action inside is clicked
                        setIsOpen(false); 
                    }}
                    style={{
                        position: 'fixed',
                        top: coords.bottomSpace < 220 ? coords.top - 8 : coords.bottom + 8,
                        left: coords.x,
                        transform: coords.bottomSpace < 220 ? 'translate(-100%, -100%)' : 'translate(-100%, 0)'
                    }}
                    className={`w-48 rounded-xl shadow-xl bg-white dark:bg-[#1A2633] border border-slate-200 dark:border-slate-700 py-1.5 z-[99999] animate-in fade-in zoom-in-95 flex flex-col ${coords.bottomSpace < 220 ? 'origin-bottom-right' : 'origin-top-right'}`}
                >
                    {children}
                </div>,
                document.body
            )}
        </>
    );
};

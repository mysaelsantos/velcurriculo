import React, { useState, useEffect, useRef } from 'react';

interface ShowcaseCursorProps {
    visible?: boolean;
    x?: number;
    y?: number;
    clicking?: boolean;
    label?: string;
}

/**
 * Cursor virtual animado para demonstrações
 * Simula um ponteiro do mouse movendo-se pela tela
 */
const ShowcaseCursor: React.FC<ShowcaseCursorProps> = ({
    visible = true,
    x = 0,
    y = 0,
    clicking = false,
    label,
}) => {
    const [showRipple, setShowRipple] = useState(false);

    useEffect(() => {
        if (clicking) {
            setShowRipple(true);
            const timer = setTimeout(() => setShowRipple(false), 400);
            return () => clearTimeout(timer);
        }
    }, [clicking]);

    if (!visible) return null;

    return (
        <div
            className="fixed pointer-events-none z-[9999] transition-all duration-[50ms] ease-out"
            style={{
                left: x,
                top: y,
                transform: 'translate(-2px, -2px)',
            }}
        >
            {/* Cursor SVG */}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className={`drop-shadow-lg transition-transform duration-100 ${clicking ? 'scale-90' : 'scale-100'}`}
            >
                {/* Sombra */}
                <path
                    d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.89 0 1.33-1.08.71-1.71L6.21 2.5c-.63-.63-1.71-.18-1.71.71z"
                    fill="rgba(0,0,0,0.2)"
                    transform="translate(1, 1)"
                />
                {/* Cursor principal */}
                <path
                    d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.89 0 1.33-1.08.71-1.71L6.21 2.5c-.63-.63-1.71-.18-1.71.71z"
                    fill="white"
                    stroke="#1e40af"
                    strokeWidth="1.5"
                />
            </svg>

            {/* Efeito de clique (ripple) */}
            {showRipple && (
                <div className="absolute top-0 left-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30" />
                    <div className="absolute inset-2 bg-blue-500 rounded-full animate-ping opacity-50 animation-delay-100" />
                </div>
            )}

            {/* Label opcional */}
            {label && (
                <div className="absolute left-8 top-0 bg-gray-900 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
                    {label}
                </div>
            )}
        </div>
    );
};

// Hook para controlar o cursor
export const useShowcaseCursor = () => {
    const [cursorState, setCursorState] = useState({
        visible: false,
        x: 0,
        y: 0,
        clicking: false,
        label: '',
    });

    // Usar ref para acessar o estado atual sem closure stale
    const cursorStateRef = useRef(cursorState);
    cursorStateRef.current = cursorState;

    const animationRef = useRef<number | null>(null);

    const show = () => setCursorState(prev => ({ ...prev, visible: true }));
    const hide = () => setCursorState(prev => ({ ...prev, visible: false }));

    const moveTo = (x: number, y: number, duration = 500): Promise<void> => {
        return new Promise((resolve) => {
            // Usar ref para pegar o estado atual
            const startX = cursorStateRef.current.x;
            const startY = cursorStateRef.current.y;
            const startTime = performance.now();

            const animate = (time: number) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing
                const eased = 1 - Math.pow(1 - progress, 3);

                const newX = startX + (x - startX) * eased;
                const newY = startY + (y - startY) * eased;

                setCursorState(prev => ({ ...prev, x: newX, y: newY }));

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        });
    };

    const moveToElement = async (selector: string, duration = 500): Promise<void> => {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return;
        }

        const rect = element.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        await moveTo(targetX, targetY, duration);
    };

    const click = (): Promise<void> => {
        return new Promise((resolve) => {
            setCursorState(prev => ({ ...prev, clicking: true }));
            setTimeout(() => {
                setCursorState(prev => ({ ...prev, clicking: false }));
                resolve();
            }, 200);
        });
    };

    const setLabel = (label: string) => {
        setCursorState(prev => ({ ...prev, label }));
    };

    const clearLabel = () => {
        setCursorState(prev => ({ ...prev, label: '' }));
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return {
        cursorProps: cursorState,
        show,
        hide,
        moveTo,
        moveToElement,
        click,
        setLabel,
        clearLabel,
    };
};

export default ShowcaseCursor;

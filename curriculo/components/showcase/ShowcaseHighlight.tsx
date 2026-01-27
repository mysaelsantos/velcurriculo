import React, { useState, useEffect, useRef } from 'react';

interface ShowcaseHighlightProps {
    selector?: string;
    visible?: boolean;
    color?: string;
    pulse?: boolean;
    borderRadius?: number;
    padding?: number;
}

/**
 * Componente de destaque visual para elementos
 * Cria um efeito de spotlight/highlight em elementos específicos
 */
const ShowcaseHighlight: React.FC<ShowcaseHighlightProps> = ({
    selector,
    visible = false,
    color = '#3b82f6',
    pulse = true,
    borderRadius = 8,
    padding = 4,
}) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!visible || !selector) {
            setRect(null);
            return;
        }

        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`ShowcaseHighlight: Element not found: ${selector}`);
            setRect(null);
            return;
        }

        const updateRect = () => {
            const newRect = element.getBoundingClientRect();
            setRect(newRect);
        };

        updateRect();

        // Atualizar posição se a janela for redimensionada
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
        };
    }, [selector, visible]);

    if (!visible || !rect) return null;

    const boxStyle: React.CSSProperties = {
        position: 'fixed',
        left: rect.left - padding,
        top: rect.top - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        borderRadius: borderRadius,
        border: `3px solid ${color}`,
        boxShadow: `0 0 0 4px ${color}30, 0 0 20px ${color}50`,
        pointerEvents: 'none',
        zIndex: 9998,
        transition: 'all 0.3s ease-out',
    };

    return (
        <>
            {/* Overlay escuro (opcional) */}
            <div
                className="fixed inset-0 bg-black/20 pointer-events-none z-[9997] transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
            />

            {/* Box de destaque */}
            <div style={boxStyle}>
                {/* Efeito de pulse */}
                {pulse && (
                    <>
                        <div
                            className="absolute inset-0 rounded-inherit animate-ping"
                            style={{
                                borderRadius,
                                border: `2px solid ${color}`,
                                opacity: 0.5,
                                animationDuration: '1.5s',
                            }}
                        />
                        <div
                            className="absolute -inset-2 rounded-inherit animate-pulse"
                            style={{
                                borderRadius: borderRadius + 4,
                                background: `${color}15`,
                            }}
                        />
                    </>
                )}

                {/* Cantos decorativos */}
                <div
                    className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2"
                    style={{ borderColor: color }}
                />
                <div
                    className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2"
                    style={{ borderColor: color }}
                />
                <div
                    className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2"
                    style={{ borderColor: color }}
                />
                <div
                    className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2"
                    style={{ borderColor: color }}
                />
            </div>
        </>
    );
};

// Hook para controlar highlights
export const useShowcaseHighlight = () => {
    const [highlights, setHighlights] = useState<Map<string, ShowcaseHighlightProps>>(new Map());

    const show = (
        id: string,
        selector: string,
        options: Partial<ShowcaseHighlightProps> = {}
    ) => {
        setHighlights(prev => {
            const newMap = new Map(prev);
            newMap.set(id, { selector, visible: true, ...options });
            return newMap;
        });
    };

    const hide = (id: string) => {
        setHighlights(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(id);
            if (existing) {
                newMap.set(id, { ...existing, visible: false });
            }
            return newMap;
        });
    };

    const hideAll = () => {
        setHighlights(prev => {
            const newMap = new Map(prev);
            newMap.forEach((value, key) => {
                newMap.set(key, { ...value, visible: false });
            });
            return newMap;
        });
    };

    const remove = (id: string) => {
        setHighlights(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    };

    const clear = () => {
        setHighlights(new Map());
    };

    // Componente que renderiza todos os highlights
    const HighlightLayer: React.FC = () => (
        <>
            {Array.from(highlights.entries()).map(([id, props]) => (
                <ShowcaseHighlight key={id} {...props} />
            ))}
        </>
    );

    return {
        show,
        hide,
        hideAll,
        remove,
        clear,
        HighlightLayer,
    };
};

export default ShowcaseHighlight;

import { useState, useCallback, useRef } from 'react';
import { animate, EasingName } from '../showcase/easings';

interface ZoomOptions {
    duration?: number;
    easing?: EasingName;
    origin?: string;  // CSS transform-origin (e.g., 'center', 'top left')
}

interface ZoomTarget {
    scale: number;
    x?: number;
    y?: number;
}

interface ZoomReturn {
    zoomTo: (target: ZoomTarget, options?: ZoomOptions) => Promise<void>;
    zoomToElement: (selector: string, scale?: number, options?: ZoomOptions) => Promise<void>;
    reset: (options?: ZoomOptions) => Promise<void>;
    isZooming: boolean;
    cancel: () => void;
    currentZoom: ZoomTarget;
    containerStyle: React.CSSProperties;
}

const DEFAULT_OPTIONS: ZoomOptions = {
    duration: 1000,
    easing: 'easeInOutCubic',
    origin: 'center center',
};

/**
 * Hook para controle de zoom cinematográfico
 * Aplica CSS transform para zoom suave em elementos
 */
export const useZoom = (containerRef?: React.RefObject<HTMLElement>): ZoomReturn => {
    const [isZooming, setIsZooming] = useState(false);
    const [currentZoom, setCurrentZoom] = useState<ZoomTarget>({ scale: 1, x: 0, y: 0 });
    const cancelRef = useRef<(() => void) | null>(null);

    const cancel = useCallback(() => {
        if (cancelRef.current) {
            cancelRef.current();
            cancelRef.current = null;
            setIsZooming(false);
        }
    }, []);

    const zoomTo = useCallback((
        target: ZoomTarget,
        options: ZoomOptions = {}
    ): Promise<void> => {
        return new Promise((resolve) => {
            cancel();

            const opts = { ...DEFAULT_OPTIONS, ...options };
            const startZoom = { ...currentZoom };
            const endZoom = { scale: target.scale, x: target.x || 0, y: target.y || 0 };

            setIsZooming(true);

            // Animamos scale, x e y simultaneamente
            const startTime = performance.now();
            let animationId: number;

            const tick = (time: number) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / opts.duration!, 1);

                // Importar a função de easing
                const easingFn = (t: number) => {
                    // easeInOutCubic inline para evitar import circular
                    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                };

                const easedProgress = easingFn(progress);

                const newZoom: ZoomTarget = {
                    scale: startZoom.scale + (endZoom.scale - startZoom.scale) * easedProgress,
                    x: (startZoom.x || 0) + (endZoom.x - (startZoom.x || 0)) * easedProgress,
                    y: (startZoom.y || 0) + (endZoom.y - (startZoom.y || 0)) * easedProgress,
                };

                setCurrentZoom(newZoom);

                if (progress < 1) {
                    animationId = requestAnimationFrame(tick);
                } else {
                    setIsZooming(false);
                    cancelRef.current = null;
                    resolve();
                }
            };

            animationId = requestAnimationFrame(tick);
            cancelRef.current = () => cancelAnimationFrame(animationId);
        });
    }, [cancel, currentZoom]);

    const zoomToElement = useCallback((
        selector: string,
        scale: number = 1.5,
        options: ZoomOptions = {}
    ): Promise<void> => {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return Promise.resolve();
        }

        const container = containerRef?.current || document.documentElement;
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calcular o centro do elemento relativo ao container
        const elementCenterX = elementRect.left + elementRect.width / 2 - containerRect.left;
        const elementCenterY = elementRect.top + elementRect.height / 2 - containerRect.top;

        // Calcular o centro do container
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;

        // Calcular a translação necessária para centralizar o elemento
        const translateX = (containerCenterX - elementCenterX) * (scale - 1);
        const translateY = (containerCenterY - elementCenterY) * (scale - 1);

        return zoomTo({ scale, x: translateX, y: translateY }, options);
    }, [zoomTo, containerRef]);

    const reset = useCallback((options: ZoomOptions = {}): Promise<void> => {
        return zoomTo({ scale: 1, x: 0, y: 0 }, options);
    }, [zoomTo]);

    // Estilo CSS para aplicar ao container
    const containerStyle: React.CSSProperties = {
        transform: `scale(${currentZoom.scale}) translate(${currentZoom.x || 0}px, ${currentZoom.y || 0}px)`,
        transformOrigin: 'center center',
        transition: isZooming ? 'none' : undefined,
    };

    return {
        zoomTo,
        zoomToElement,
        reset,
        isZooming,
        cancel,
        currentZoom,
        containerStyle,
    };
};

export default useZoom;

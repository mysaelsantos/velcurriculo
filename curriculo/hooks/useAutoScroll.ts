import { useState, useCallback, useRef } from 'react';
import { animate, EasingName } from '../showcase/easings';

interface AutoScrollOptions {
    duration?: number;
    easing?: EasingName;
    offset?: number;
}

interface AutoScrollReturn {
    scrollTo: (target: string | number, options?: AutoScrollOptions) => Promise<void>;
    scrollToElement: (selector: string, options?: AutoScrollOptions) => Promise<void>;
    scrollToTop: (options?: AutoScrollOptions) => Promise<void>;
    scrollToBottom: (options?: AutoScrollOptions) => Promise<void>;
    scrollBy: (pixels: number, options?: AutoScrollOptions) => Promise<void>;
    isScrolling: boolean;
    cancel: () => void;
}

const DEFAULT_OPTIONS: AutoScrollOptions = {
    duration: 1500,
    easing: 'easeInOutCubic',
    offset: 0,
};

/**
 * Hook para controle de scroll automático suave
 * Útil para animações de showcase e gravação de tela
 */
export const useAutoScroll = (containerRef?: React.RefObject<HTMLElement>): AutoScrollReturn => {
    const [isScrolling, setIsScrolling] = useState(false);
    const cancelRef = useRef<(() => void) | null>(null);

    const getScrollContainer = useCallback((): HTMLElement => {
        return containerRef?.current || document.documentElement;
    }, [containerRef]);

    const cancel = useCallback(() => {
        if (cancelRef.current) {
            cancelRef.current();
            cancelRef.current = null;
            setIsScrolling(false);
        }
    }, []);

    const scrollTo = useCallback((
        target: string | number,
        options: AutoScrollOptions = {}
    ): Promise<void> => {
        return new Promise((resolve) => {
            cancel();

            const opts = { ...DEFAULT_OPTIONS, ...options };
            const container = getScrollContainer();
            const startPosition = container.scrollTop;

            let targetPosition: number;

            if (typeof target === 'number') {
                targetPosition = target;
            } else {
                const element = document.querySelector(target);
                if (!element) {
                    console.warn(`Element not found: ${target}`);
                    resolve();
                    return;
                }
                const rect = element.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                targetPosition = startPosition + rect.top - containerRect.top + (opts.offset || 0);
            }

            setIsScrolling(true);

            cancelRef.current = animate(
                startPosition,
                targetPosition,
                opts.duration!,
                opts.easing!,
                (value) => {
                    container.scrollTop = value;
                },
                () => {
                    setIsScrolling(false);
                    cancelRef.current = null;
                    resolve();
                }
            );
        });
    }, [cancel, getScrollContainer]);

    const scrollToElement = useCallback((
        selector: string,
        options: AutoScrollOptions = {}
    ): Promise<void> => {
        return scrollTo(selector, options);
    }, [scrollTo]);

    const scrollToTop = useCallback((options: AutoScrollOptions = {}): Promise<void> => {
        return scrollTo(0, options);
    }, [scrollTo]);

    const scrollToBottom = useCallback((options: AutoScrollOptions = {}): Promise<void> => {
        const container = getScrollContainer();
        const maxScroll = container.scrollHeight - container.clientHeight;
        return scrollTo(maxScroll, options);
    }, [scrollTo, getScrollContainer]);

    const scrollBy = useCallback((
        pixels: number,
        options: AutoScrollOptions = {}
    ): Promise<void> => {
        const container = getScrollContainer();
        const targetPosition = container.scrollTop + pixels;
        return scrollTo(targetPosition, options);
    }, [scrollTo, getScrollContainer]);

    return {
        scrollTo,
        scrollToElement,
        scrollToTop,
        scrollToBottom,
        scrollBy,
        isScrolling,
        cancel,
    };
};

export default useAutoScroll;

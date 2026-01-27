/**
 * Funções de Easing para animações suaves
 * Baseado em: https://easings.net/
 */

export type EasingFunction = (t: number) => number;

export const easings = {
    // Linear
    linear: (t: number) => t,

    // Ease In (Acelera)
    easeInQuad: (t: number) => t * t,
    easeInCubic: (t: number) => t * t * t,
    easeInQuart: (t: number) => t * t * t * t,
    easeInQuint: (t: number) => t * t * t * t * t,
    easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    easeInCirc: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),

    // Ease Out (Desacelera)
    easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
    easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
    easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
    easeOutQuint: (t: number) => 1 - Math.pow(1 - t, 5),
    easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeOutCirc: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),

    // Ease In Out (Acelera e Desacelera)
    easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    easeInOutQuint: (t: number) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    easeInOutExpo: (t: number) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return t < 0.5
            ? Math.pow(2, 20 * t - 10) / 2
            : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    easeInOutCirc: (t: number) => (t < 0.5
        ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
        : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),

    // Bounce
    easeOutBounce: (t: number) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },

    // Elastic
    easeOutElastic: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    // Back (Overshoots)
    easeOutBack: (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutBack: (t: number) => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },

    // Smooth (Hermite)
    smoothStep: (t: number) => t * t * (3 - 2 * t),
    smootherStep: (t: number) => t * t * t * (t * (t * 6 - 15) + 10),
};

export type EasingName = keyof typeof easings;

export const getEasing = (name: EasingName): EasingFunction => easings[name] || easings.linear;

/**
 * Anima um valor de start a end usando uma função de easing
 */
export const animate = (
    start: number,
    end: number,
    duration: number,
    easing: EasingName,
    onUpdate: (value: number) => void,
    onComplete?: () => void
): (() => void) => {
    const startTime = performance.now();
    let animationId: number;

    const tick = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = getEasing(easing)(progress);
        const currentValue = start + (end - start) * easedProgress;

        onUpdate(currentValue);

        if (progress < 1) {
            animationId = requestAnimationFrame(tick);
        } else {
            onComplete?.();
        }
    };

    animationId = requestAnimationFrame(tick);

    // Retorna função de cancelamento
    return () => cancelAnimationFrame(animationId);
};

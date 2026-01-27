/**
 * Biblioteca de animações pré-definidas para o Showcase
 * Contém funções helper para criar ações de forma mais simples
 */

import { ShowcaseAction, ShowcaseActionType } from '../hooks/useShowcaseTimeline';
import { EasingName } from './easings';

let actionIdCounter = 0;
const generateId = () => `action_${++actionIdCounter}_${Date.now()}`;

// Helper para criar ação de scroll
export const scrollTo = (
    target: string,
    options: {
        duration?: number;
        easing?: EasingName;
        offset?: number;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'scroll',
    target,
    duration: options.duration ?? 1500,
    easing: options.easing ?? 'easeInOutCubic',
    options: { offset: options.offset ?? 0 },
    label: options.label ?? `Scroll para ${target}`,
});

export const scrollToTop = (duration = 1000): ShowcaseAction => ({
    id: generateId(),
    type: 'scroll',
    value: 0,
    duration,
    easing: 'easeInOutCubic',
    label: 'Scroll para o topo',
});

export const scrollBy = (pixels: number, duration = 800): ShowcaseAction => ({
    id: generateId(),
    type: 'scroll',
    value: pixels,
    duration,
    easing: 'easeInOutCubic',
    options: { relative: true },
    label: `Scroll ${pixels > 0 ? 'para baixo' : 'para cima'} ${Math.abs(pixels)}px`,
});

// Helper para criar ação de digitação
export const typeText = (
    target: string,
    text: string,
    options: {
        speed?: number;
        humanize?: boolean;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'type',
    target,
    value: text,
    duration: text.length * (options.speed ?? 80),
    options: {
        speed: options.speed ?? 80,
        humanize: options.humanize ?? true,
    },
    label: options.label ?? `Digitar "${text.slice(0, 20)}..."`,
});

export const clearField = (target: string, duration = 500): ShowcaseAction => ({
    id: generateId(),
    type: 'type',
    target,
    value: '',
    duration,
    options: { clear: true },
    label: `Limpar campo ${target}`,
});

// Helper para criar ação de clique
export const click = (
    target: string,
    options: {
        delay?: number;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'click',
    target,
    delay: options.delay,
    duration: 300,
    label: options.label ?? `Clicar em ${target}`,
});

// Helper para criar ação de zoom
export const zoomTo = (
    target: string,
    scale: number = 1.5,
    options: {
        duration?: number;
        easing?: EasingName;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'zoom',
    target,
    value: scale,
    duration: options.duration ?? 1000,
    easing: options.easing ?? 'easeInOutCubic',
    label: options.label ?? `Zoom ${scale}x em ${target}`,
});

export const zoomReset = (duration = 800): ShowcaseAction => ({
    id: generateId(),
    type: 'zoom',
    value: 1,
    duration,
    easing: 'easeInOutCubic',
    label: 'Resetar zoom',
});

// Helper para criar ação de highlight
export const highlight = (
    target: string,
    options: {
        duration?: number;
        color?: string;
        pulse?: boolean;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'highlight',
    target,
    duration: options.duration ?? 2000,
    options: {
        color: options.color ?? '#3b82f6',
        pulse: options.pulse ?? true,
    },
    label: options.label ?? `Destacar ${target}`,
});

// Helper para criar ação de fade
export const fadeIn = (
    target: string,
    duration = 800
): ShowcaseAction => ({
    id: generateId(),
    type: 'fade',
    target,
    value: 1,
    duration,
    easing: 'easeOutCubic',
    label: `Fade in ${target}`,
});

export const fadeOut = (
    target: string,
    duration = 800
): ShowcaseAction => ({
    id: generateId(),
    type: 'fade',
    target,
    value: 0,
    duration,
    easing: 'easeInCubic',
    label: `Fade out ${target}`,
});

// Helper para criar ação de espera
export const wait = (duration: number, label?: string): ShowcaseAction => ({
    id: generateId(),
    type: 'wait',
    duration,
    label: label ?? `Aguardar ${duration}ms`,
});

// Helper para mover o cursor virtual
export const moveCursor = (
    target: string,
    options: {
        duration?: number;
        easing?: EasingName;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'moveCursor',
    target,
    duration: options.duration ?? 800,
    easing: options.easing ?? 'easeInOutCubic',
    label: options.label ?? `Mover cursor para ${target}`,
});

// Helper para executar função customizada
export const custom = (
    handler: () => void | Promise<void>,
    options: {
        duration?: number;
        label?: string;
    } = {}
): ShowcaseAction => ({
    id: generateId(),
    type: 'custom',
    duration: options.duration ?? 0,
    options: { handler },
    label: options.label ?? 'Ação customizada',
});

// Combinar múltiplas ações em uma só (paralela)
export const parallel = (
    actions: ShowcaseAction[],
    label?: string
): ShowcaseAction => ({
    id: generateId(),
    type: 'custom',
    duration: Math.max(...actions.map(a => (a.delay || 0) + (a.duration || 0))),
    options: {
        parallel: true,
        actions,
    },
    label: label ?? `${actions.length} ações em paralelo`,
});

// Criar uma sequência de preenchimento de formulário
export const fillForm = (
    fields: Array<{ selector: string; value: string; label?: string }>
): ShowcaseAction[] => {
    return fields.flatMap(field => [
        moveCursor(field.selector, { duration: 500 }),
        click(field.selector),
        wait(200),
        typeText(field.selector, field.value, { label: field.label }),
        wait(300),
    ]);
};

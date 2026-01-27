import { useState, useCallback, useRef, useEffect } from 'react';
import { EasingName } from '../showcase/easings';

// Tipos de ações disponíveis na timeline
export type ShowcaseActionType =
    | 'scroll'
    | 'type'
    | 'click'
    | 'zoom'
    | 'highlight'
    | 'fade'
    | 'wait'
    | 'moveCursor'
    | 'screenshot'
    | 'custom';

export interface ShowcaseAction {
    id: string;
    type: ShowcaseActionType;
    target?: string;           // Seletor CSS ou ID do elemento
    value?: string | number;   // Valor para ação (texto para type, pixels para scroll, etc)
    duration?: number;         // Duração em ms
    easing?: EasingName;       // Easing para animação
    delay?: number;            // Delay antes da ação
    options?: Record<string, any>; // Opções extras específicas da ação
    label?: string;            // Label para exibição no UI
    onStart?: () => void;      // Callback ao iniciar
    onComplete?: () => void;   // Callback ao completar
}

export interface ShowcaseSequence {
    id: string;
    name: string;
    description?: string;
    actions: ShowcaseAction[];
    loop?: boolean;
    autoStart?: boolean;
}

interface TimelineState {
    isPlaying: boolean;
    isPaused: boolean;
    currentIndex: number;
    totalActions: number;
    currentAction: ShowcaseAction | null;
    progress: number;          // 0-100
    elapsedTime: number;       // ms
    totalDuration: number;     // ms estimado
}

interface ShowcaseTimelineReturn {
    // Estado
    state: TimelineState;

    // Controles de playback
    play: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    reset: () => void;

    // Navegação
    goToAction: (index: number) => void;
    next: () => void;
    previous: () => void;

    // Gerenciamento de sequências
    loadSequence: (sequence: ShowcaseSequence) => void;
    currentSequence: ShowcaseSequence | null;

    // Handlers para executar ações
    registerHandler: (type: ShowcaseActionType, handler: ActionHandler) => void;
}

type ActionHandler = (action: ShowcaseAction) => Promise<void>;

/**
 * Hook principal para gerenciar a timeline de animações do Showcase
 * Orquestra todas as ações em sequência com controles de playback
 */
export const useShowcaseTimeline = (): ShowcaseTimelineReturn => {
    const [currentSequence, setCurrentSequence] = useState<ShowcaseSequence | null>(null);
    const [state, setState] = useState<TimelineState>({
        isPlaying: false,
        isPaused: false,
        currentIndex: 0,
        totalActions: 0,
        currentAction: null,
        progress: 0,
        elapsedTime: 0,
        totalDuration: 0,
    });

    const handlersRef = useRef<Map<ShowcaseActionType, ActionHandler>>(new Map());
    const abortRef = useRef<boolean>(false);
    const pauseRef = useRef<boolean>(false);
    const resumeResolveRef = useRef<(() => void) | null>(null);

    // Registrar handlers de ação
    const registerHandler = useCallback((type: ShowcaseActionType, handler: ActionHandler) => {
        handlersRef.current.set(type, handler);
    }, []);

    // Calcular duração total estimada
    const calculateTotalDuration = useCallback((sequence: ShowcaseSequence): number => {
        return sequence.actions.reduce((total, action) => {
            return total + (action.delay || 0) + (action.duration || 1000);
        }, 0);
    }, []);

    // Carregar uma nova sequência
    const loadSequence = useCallback((sequence: ShowcaseSequence) => {
        setCurrentSequence(sequence);
        setState(prev => ({
            ...prev,
            totalActions: sequence.actions.length,
            totalDuration: calculateTotalDuration(sequence),
            currentIndex: 0,
            progress: 0,
            elapsedTime: 0,
            currentAction: null,
        }));
    }, [calculateTotalDuration]);

    // Executar uma ação individual
    const executeAction = useCallback(async (action: ShowcaseAction): Promise<void> => {
        // Verificar se foi pausado
        if (pauseRef.current) {
            await new Promise<void>((resolve) => {
                resumeResolveRef.current = resolve;
            });
        }

        // Verificar se foi parado
        if (abortRef.current) return;

        // Callback de início
        action.onStart?.();

        // Delay inicial
        if (action.delay) {
            await new Promise(resolve => setTimeout(resolve, action.delay));
        }

        if (abortRef.current) return;

        // Executar handler registrado
        const handler = handlersRef.current.get(action.type);
        if (handler) {
            await handler(action);
        } else {
            // Handler padrão: apenas esperar a duração
            await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
        }

        // Callback de conclusão
        action.onComplete?.();
    }, []);

    // Executar a sequência completa
    const runSequence = useCallback(async () => {
        if (!currentSequence) return;

        abortRef.current = false;
        pauseRef.current = false;

        setState(prev => ({
            ...prev,
            isPlaying: true,
            isPaused: false,
        }));

        const startTime = Date.now();

        for (let i = state.currentIndex; i < currentSequence.actions.length; i++) {
            if (abortRef.current) break;

            const action = currentSequence.actions[i];

            setState(prev => ({
                ...prev,
                currentIndex: i,
                currentAction: action,
                progress: ((i + 1) / currentSequence.actions.length) * 100,
                elapsedTime: Date.now() - startTime,
            }));

            await executeAction(action);
        }

        // Loop se configurado
        if (currentSequence.loop && !abortRef.current) {
            setState(prev => ({ ...prev, currentIndex: 0 }));
            runSequence();
        } else {
            setState(prev => ({
                ...prev,
                isPlaying: false,
                currentAction: null,
                progress: 100,
            }));
        }
    }, [currentSequence, state.currentIndex, executeAction]);

    // Controles de playback
    const play = useCallback(() => {
        if (!currentSequence) return;
        setState(prev => ({ ...prev, currentIndex: 0, progress: 0 }));
        runSequence();
    }, [currentSequence, runSequence]);

    const pause = useCallback(() => {
        pauseRef.current = true;
        setState(prev => ({ ...prev, isPaused: true }));
    }, []);

    const resume = useCallback(() => {
        pauseRef.current = false;
        setState(prev => ({ ...prev, isPaused: false }));
        if (resumeResolveRef.current) {
            resumeResolveRef.current();
            resumeResolveRef.current = null;
        }
    }, []);

    const stop = useCallback(() => {
        abortRef.current = true;
        pauseRef.current = false;
        if (resumeResolveRef.current) {
            resumeResolveRef.current();
            resumeResolveRef.current = null;
        }
        setState(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            currentAction: null,
        }));
    }, []);

    const reset = useCallback(() => {
        stop();
        setState(prev => ({
            ...prev,
            currentIndex: 0,
            progress: 0,
            elapsedTime: 0,
        }));
    }, [stop]);

    // Navegação
    const goToAction = useCallback((index: number) => {
        if (!currentSequence || index < 0 || index >= currentSequence.actions.length) return;
        setState(prev => ({ ...prev, currentIndex: index }));
    }, [currentSequence]);

    const next = useCallback(() => {
        const { currentIndex, totalActions } = state;
        if (currentIndex < totalActions - 1) {
            goToAction(currentIndex + 1);
        }
    }, [state, goToAction]);

    const previous = useCallback(() => {
        const { currentIndex } = state;
        if (currentIndex > 0) {
            goToAction(currentIndex - 1);
        }
    }, [state, goToAction]);

    // Auto-start se configurado
    useEffect(() => {
        if (currentSequence?.autoStart) {
            play();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSequence?.id]); // Usar apenas o ID para evitar loop infinito

    return {
        state,
        play,
        pause,
        resume,
        stop,
        reset,
        goToAction,
        next,
        previous,
        loadSequence,
        currentSequence,
        registerHandler,
    };
};

export default useShowcaseTimeline;

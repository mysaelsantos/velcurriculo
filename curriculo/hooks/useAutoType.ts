import { useState, useCallback, useRef } from 'react';

interface AutoTypeOptions {
    speed?: number;          // ms entre caracteres
    pauseOnSpace?: boolean;  // pausa extra em espaços
    pauseDuration?: number;  // duração da pausa em espaços
    humanize?: boolean;      // variação aleatória na velocidade
    deleteSpeed?: number;    // velocidade ao deletar
}

interface AutoTypeReturn {
    typeIn: (element: HTMLInputElement | HTMLTextAreaElement, text: string, options?: AutoTypeOptions) => Promise<void>;
    typeInSelector: (selector: string, text: string, options?: AutoTypeOptions) => Promise<void>;
    clearField: (element: HTMLInputElement | HTMLTextAreaElement, options?: AutoTypeOptions) => Promise<void>;
    isTyping: boolean;
    cancel: () => void;
    currentText: string;
}

const DEFAULT_OPTIONS: AutoTypeOptions = {
    speed: 80,
    pauseOnSpace: true,
    pauseDuration: 150,
    humanize: true,
    deleteSpeed: 40,
};

/**
 * Hook para simular digitação automática em campos de input
 * Perfeito para demonstrações e gravações de tela
 */
export const useAutoType = (): AutoTypeReturn => {
    const [isTyping, setIsTyping] = useState(false);
    const [currentText, setCurrentText] = useState('');
    const cancelRef = useRef<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const cancel = useCallback(() => {
        cancelRef.current = true;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsTyping(false);
    }, []);

    const sleep = useCallback((ms: number): Promise<void> => {
        return new Promise((resolve) => {
            timeoutRef.current = setTimeout(resolve, ms);
        });
    }, []);

    const getHumanizedDelay = useCallback((baseSpeed: number, humanize: boolean): number => {
        if (!humanize) return baseSpeed;
        // Variação de ±30%
        const variation = baseSpeed * 0.3;
        return baseSpeed + (Math.random() * variation * 2 - variation);
    }, []);

    const typeIn = useCallback(async (
        element: HTMLInputElement | HTMLTextAreaElement,
        text: string,
        options: AutoTypeOptions = {}
    ): Promise<void> => {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        cancelRef.current = false;
        setIsTyping(true);
        setCurrentText('');

        // Focar no elemento
        element.focus();

        // Digitar caractere por caractere
        for (let i = 0; i < text.length; i++) {
            if (cancelRef.current) break;

            const char = text[i];
            const currentValue = text.slice(0, i + 1);

            // Atualizar o valor do input
            element.value = currentValue;
            setCurrentText(currentValue);

            // Disparar eventos para React/handlers
            const inputEvent = new Event('input', { bubbles: true });
            element.dispatchEvent(inputEvent);

            // Calcular delay
            let delay = getHumanizedDelay(opts.speed!, opts.humanize!);

            // Pausa extra em espaços
            if (opts.pauseOnSpace && char === ' ') {
                delay += opts.pauseDuration!;
            }

            await sleep(delay);
        }

        setIsTyping(false);
    }, [sleep, getHumanizedDelay]);

    const typeInSelector = useCallback(async (
        selector: string,
        text: string,
        options: AutoTypeOptions = {}
    ): Promise<void> => {
        const element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return;
        }
        return typeIn(element, text, options);
    }, [typeIn]);

    const clearField = useCallback(async (
        element: HTMLInputElement | HTMLTextAreaElement,
        options: AutoTypeOptions = {}
    ): Promise<void> => {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        cancelRef.current = false;
        setIsTyping(true);

        element.focus();
        const currentValue = element.value;

        // Deletar caractere por caractere (do fim para o início)
        for (let i = currentValue.length; i >= 0; i--) {
            if (cancelRef.current) break;

            const newValue = currentValue.slice(0, i);
            element.value = newValue;
            setCurrentText(newValue);

            const inputEvent = new Event('input', { bubbles: true });
            element.dispatchEvent(inputEvent);

            const delay = getHumanizedDelay(opts.deleteSpeed!, opts.humanize!);
            await sleep(delay);
        }

        setIsTyping(false);
    }, [sleep, getHumanizedDelay]);

    return {
        typeIn,
        typeInSelector,
        clearField,
        isTyping,
        cancel,
        currentText,
    };
};

export default useAutoType;

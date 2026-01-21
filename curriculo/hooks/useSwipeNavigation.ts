import { useState, useRef, useCallback, TouchEvent, MouseEvent } from 'react';

/**
 * Hook para navegação por swipe/arraste entre páginas
 * 
 * Suporta:
 * - Touch events (mobile)
 * - Mouse events (desktop)
 * - Efeito visual de arraste em tempo real
 * - Snap suave para página final
 */
const useSwipeNavigation = (
    totalPages: number,
    currentPage: number,
    setCurrentPage: (page: number) => void
) => {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const containerWidth = useRef(0);

    // Threshold mínimo (px) para considerar como swipe válido
    const SWIPE_THRESHOLD = 80;

    const handleStart = useCallback((clientX: number, width: number) => {
        setIsDragging(true);
        startX.current = clientX;
        containerWidth.current = width;
    }, []);

    const handleMove = useCallback((clientX: number) => {
        if (!isDragging) return;

        const diff = clientX - startX.current;

        // Limita o arraste nas bordas (efeito "rubber band")
        const maxOffset = containerWidth.current * 0.3;

        // Se está na primeira página e tentando ir para trás, aplica resistência
        if (currentPage === 1 && diff > 0) {
            setSwipeOffset(diff * 0.3);
        }
        // Se está na última página e tentando avançar, aplica resistência
        else if (currentPage === totalPages && diff < 0) {
            setSwipeOffset(diff * 0.3);
        }
        // Movimento normal
        else {
            setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, diff)));
        }
    }, [isDragging, currentPage, totalPages]);

    const handleEnd = useCallback(() => {
        if (!isDragging) return;

        setIsDragging(false);

        // Verifica se o swipe foi suficiente para trocar de página
        if (swipeOffset < -SWIPE_THRESHOLD && currentPage < totalPages) {
            setCurrentPage(currentPage + 1); // Próxima página
        } else if (swipeOffset > SWIPE_THRESHOLD && currentPage > 1) {
            setCurrentPage(currentPage - 1); // Página anterior
        }

        // Reseta o offset com animação
        setSwipeOffset(0);
    }, [isDragging, swipeOffset, currentPage, totalPages, setCurrentPage]);

    // Event handlers para Touch (mobile)
    const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        const rect = e.currentTarget.getBoundingClientRect();
        handleStart(touch.clientX, rect.width);
    }, [handleStart]);

    const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        handleMove(touch.clientX);
    }, [handleMove]);

    const onTouchEnd = useCallback(() => {
        handleEnd();
    }, [handleEnd]);

    // Event handlers para Mouse (desktop)
    const onMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        handleStart(e.clientX, rect.width);
    }, [handleStart]);

    const onMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        handleMove(e.clientX);
    }, [isDragging, handleMove]);

    const onMouseUp = useCallback(() => {
        handleEnd();
    }, [handleEnd]);

    const onMouseLeave = useCallback(() => {
        if (isDragging) {
            handleEnd();
        }
    }, [isDragging, handleEnd]);

    return {
        swipeOffset,
        isDragging,
        handlers: {
            onTouchStart,
            onTouchMove,
            onTouchEnd,
            onMouseDown,
            onMouseMove,
            onMouseUp,
            onMouseLeave,
        },
        // Estilo dinâmico para aplicar no container
        swipeStyle: {
            transform: `translateX(${swipeOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            cursor: isDragging ? 'grabbing' : (totalPages > 1 ? 'grab' : 'default'),
        }
    };
};

export default useSwipeNavigation;

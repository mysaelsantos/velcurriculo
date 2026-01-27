import React, { useState, useEffect, useRef } from 'react';

// Hooks do Showcase
import useShowcaseTimeline, { ShowcaseSequence, ShowcaseAction } from '../../hooks/useShowcaseTimeline';
import useAutoScroll from '../../hooks/useAutoScroll';
import useAutoType from '../../hooks/useAutoType';
import useZoom from '../../hooks/useZoom';

// Componentes do Showcase
import ShowcaseControls from './ShowcaseControls';
import ShowcaseCursor, { useShowcaseCursor } from './ShowcaseCursor';
import { useShowcaseHighlight } from './ShowcaseHighlight';
import { AppContent } from '../../App'; // Importa a aplicação real

// Sequências pré-definidas
import { sequenceList } from '../../showcase/sequences';

interface ShowcasePageProps {
    onClose?: () => void;
}

/**
 * Página principal do modo Showcase
 * Renderiza um iframe com a aplicação principal e adiciona controles de animação
 */
const ShowcasePage: React.FC<ShowcasePageProps> = ({ onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Hooks de animação
    const timeline = useShowcaseTimeline();
    const autoScroll = useAutoScroll(containerRef);
    const autoType = useAutoType();
    const zoom = useZoom(containerRef);
    const cursor = useShowcaseCursor();
    const highlight = useShowcaseHighlight();

    // Estado local
    const [isReady, setIsReady] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);

    // Registrar handlers de ação
    useEffect(() => {
        // Handler de scroll
        timeline.registerHandler('scroll', async (action: ShowcaseAction) => {
            if (typeof action.value === 'number') {
                if (action.options?.relative) {
                    await autoScroll.scrollBy(action.value, {
                        duration: action.duration,
                        easing: action.easing,
                    });
                } else {
                    await autoScroll.scrollTo(action.value, {
                        duration: action.duration,
                        easing: action.easing,
                    });
                }
            } else if (action.target) {
                await autoScroll.scrollToElement(action.target, {
                    duration: action.duration,
                    easing: action.easing,
                    offset: action.options?.offset,
                });
            }
        });

        // Handler de digitação
        timeline.registerHandler('type', async (action: ShowcaseAction) => {
            if (!action.target) return;

            if (action.options?.clear) {
                const element = document.querySelector(action.target) as HTMLInputElement;
                if (element) await autoType.clearField(element, action.options);
            } else if (typeof action.value === 'string') {
                await autoType.typeInSelector(action.target, action.value, action.options);
            }
        });

        // Handler de clique
        timeline.registerHandler('click', async (action: ShowcaseAction) => {
            if (!action.target) return;

            const element = document.querySelector(action.target) as HTMLElement;
            if (element) {
                // Mostrar animação de clique no cursor
                await cursor.click();

                // Simular clique real
                element.click();

                // Dispatch de eventos para componentes React
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                });
                element.dispatchEvent(clickEvent);
            }
        });

        // Handler de zoom
        timeline.registerHandler('zoom', async (action: ShowcaseAction) => {
            const scale = typeof action.value === 'number' ? action.value : 1;

            if (action.target) {
                await zoom.zoomToElement(action.target, scale, {
                    duration: action.duration,
                    easing: action.easing,
                });
            } else {
                await zoom.zoomTo({ scale }, {
                    duration: action.duration,
                    easing: action.easing,
                });
            }
        });

        // Handler de highlight
        timeline.registerHandler('highlight', async (action: ShowcaseAction) => {
            if (!action.target) return;

            const highlightId = `highlight_${Date.now()}`;
            highlight.show(highlightId, action.target, {
                color: action.options?.color,
                pulse: action.options?.pulse,
            });

            // Aguardar a duração e remover
            await new Promise(resolve => setTimeout(resolve, action.duration || 2000));
            highlight.hide(highlightId);

            // Dar tempo para a animação de fade out
            await new Promise(resolve => setTimeout(resolve, 300));
            highlight.remove(highlightId);
        });

        // Handler de fade
        timeline.registerHandler('fade', async (action: ShowcaseAction) => {
            if (!action.target) return;

            const element = document.querySelector(action.target) as HTMLElement;
            if (!element) return;

            const targetOpacity = typeof action.value === 'number' ? action.value : 1;
            const duration = action.duration || 800;

            element.style.transition = `opacity ${duration}ms ease-out`;
            element.style.opacity = String(targetOpacity);

            await new Promise(resolve => setTimeout(resolve, duration));
        });

        // Handler de wait
        timeline.registerHandler('wait', async (action: ShowcaseAction) => {
            await new Promise(resolve => setTimeout(resolve, action.duration || 1000));
        });

        // Handler de movimento do cursor
        timeline.registerHandler('moveCursor', async (action: ShowcaseAction) => {
            if (!action.target) return;

            cursor.show();
            await cursor.moveToElement(action.target, action.duration);
        });

        // Handler customizado
        timeline.registerHandler('custom', async (action: ShowcaseAction) => {
            if (action.options?.handler) {
                await action.options.handler();
            }

            if (action.options?.parallel && action.options?.actions) {
                await Promise.all(
                    action.options.actions.map((subAction: ShowcaseAction) => {
                        // Executar ações em paralelo (simplificado)
                        return new Promise(resolve => setTimeout(resolve, subAction.duration || 0));
                    })
                );
            }
        });
    }, [timeline, autoScroll, autoType, zoom, cursor, highlight]);

    // Atalhos de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (timeline.state.isPlaying) {
                        if (timeline.state.isPaused) {
                            timeline.resume();
                        } else {
                            timeline.pause();
                        }
                    } else {
                        timeline.play();
                    }
                    break;
                case 'Escape':
                    timeline.stop();
                    zoom.reset();
                    highlight.clear();
                    cursor.hide();
                    break;
                case 'ArrowLeft':
                    timeline.previous();
                    break;
                case 'ArrowRight':
                    timeline.next();
                    break;
                case 'KeyR':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        timeline.reset();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [timeline, zoom, highlight, cursor]);

    // Carregar sequência inicial
    useEffect(() => {
        if (sequenceList.length > 0 && !timeline.currentSequence) {
            timeline.loadSequence(sequenceList[0]);
        }
        setIsReady(true);
    }, [timeline]);

    // Fechar instruções após alguns segundos
    useEffect(() => {
        if (showInstructions) {
            const timer = setTimeout(() => setShowInstructions(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showInstructions]);

    const handleSelectSequence = (sequence: ShowcaseSequence) => {
        timeline.loadSequence(sequence);
    };

    const handleClose = () => {
        timeline.stop();
        zoom.reset();
        highlight.clear();
        cursor.hide();
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-[9990] bg-gray-100">
            {/* Container principal com zoom */}
            <div
                ref={containerRef}
                className="w-full h-full overflow-auto"
                style={zoom.containerStyle}
            >
                {/* Aqui renderizamos a Aplicação REAL */}
                <div className="min-h-screen">
                    <AppContent />
                </div>
            </div>

            {/* Cursor virtual */}
            <ShowcaseCursor {...cursor.cursorProps} />

            {/* Layer de highlights */}
            <highlight.HighlightLayer />

            {/* Controles */}
            <ShowcaseControls
                isPlaying={timeline.state.isPlaying}
                isPaused={timeline.state.isPaused}
                progress={timeline.state.progress}
                currentIndex={timeline.state.currentIndex}
                totalActions={timeline.state.totalActions}
                currentActionLabel={timeline.state.currentAction?.label}
                currentSequence={timeline.currentSequence}
                onPlay={timeline.play}
                onPause={timeline.pause}
                onResume={timeline.resume}
                onStop={timeline.stop}
                onReset={timeline.reset}
                onNext={timeline.next}
                onPrevious={timeline.previous}
                onSelectSequence={handleSelectSequence}
                onClose={handleClose}
            />

            {/* Instruções iniciais */}
            {showInstructions && !timeline.state.isPlaying && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg animate-fade-in">
                    <p className="text-sm font-medium">
                        💡 Selecione uma sequência e pressione <kbd className="px-2 py-0.5 bg-blue-500 rounded mx-1">Space</kbd> para iniciar
                    </p>
                </div>
            )}
        </div>
    );
};

export default ShowcasePage;

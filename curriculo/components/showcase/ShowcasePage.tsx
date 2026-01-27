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
    const autoScroll = useAutoScroll();
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
                {/* Aqui você pode renderizar o conteúdo da App ou usar um iframe */}
                <div className="min-h-screen">
                    {/* 
                        OPÇÃO 1: Renderizar componentes diretamente
                        Importe e renderize os componentes principais da App aqui
                        
                        OPÇÃO 2: Usar iframe (mais isolado)
                        <iframe
                            ref={iframeRef}
                            src="/"
                            className="w-full h-full border-0"
                        />
                    */}

                    {/* Placeholder - Substitua pelo conteúdo real */}
                    <div className="p-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-800 mb-4">
                            🎬 Modo Showcase
                        </h1>
                        <p className="text-gray-600 max-w-xl mx-auto mb-8">
                            Este é o modo de gravação profissional do VelCurrículo.
                            Use os controles abaixo para executar sequências de animação
                            pré-programadas para criar vídeos de marketing incríveis.
                        </p>

                        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">
                                Para ativar o Showcase completo:
                            </h2>
                            <ol className="text-left text-gray-600 space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                                    <span>Importe os componentes principais da App dentro deste container</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                                    <span>Configure os seletores CSS das sequências para corresponder aos elementos reais</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                                    <span>Use um software de gravação de tela (OBS, Loom, etc.) para capturar as animações</span>
                                </li>
                            </ol>
                        </div>

                        {/* Área de demonstração dos efeitos */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            <div
                                id="demo-card-1"
                                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
                            >
                                <h3 className="font-bold text-lg mb-2">Zoom Demo</h3>
                                <p className="text-blue-100 text-sm">Clique para testar o zoom</p>
                            </div>
                            <div
                                id="demo-card-2"
                                className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
                            >
                                <h3 className="font-bold text-lg mb-2">Highlight Demo</h3>
                                <p className="text-purple-100 text-sm">Clique para testar o destaque</p>
                            </div>
                            <div
                                id="demo-card-3"
                                className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
                            >
                                <h3 className="font-bold text-lg mb-2">Scroll Demo</h3>
                                <p className="text-green-100 text-sm">Clique para testar o scroll</p>
                            </div>
                        </div>

                        {/* Input para teste de digitação */}
                        <div className="mt-8 max-w-md mx-auto">
                            <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                                Campo para teste de digitação automática:
                            </label>
                            <input
                                id="demo-input"
                                type="text"
                                placeholder="A digitação aparecerá aqui..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                            />
                        </div>
                    </div>
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

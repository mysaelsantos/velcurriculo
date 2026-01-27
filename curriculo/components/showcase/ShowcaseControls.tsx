import React, { useState } from 'react';
import { ShowcaseSequence } from '../../hooks/useShowcaseTimeline';
import { sequenceList } from '../../showcase/sequences';

// Ícones
const Icons = {
    Play: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
    ),
    Pause: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
        </svg>
    ),
    Stop: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
    ),
    Reset: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
    ),
    SkipBack: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    SkipForward: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
        </svg>
    ),
    Settings: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    ),
    Minimize: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
    ),
    Expand: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
    ),
    ChevronDown: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
        </svg>
    ),
    Record: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8" />
        </svg>
    ),
    Close: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    ),
};

interface ShowcaseControlsProps {
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
    currentIndex: number;
    totalActions: number;
    currentActionLabel?: string;
    currentSequence: ShowcaseSequence | null;
    onPlay: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onReset: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSelectSequence: (sequence: ShowcaseSequence) => void;
    onClose?: () => void;
}

/**
 * Painel de controles flutuante para o modo Showcase
 * Permite controlar playback, selecionar sequências e monitorar progresso
 */
const ShowcaseControls: React.FC<ShowcaseControlsProps> = ({
    isPlaying,
    isPaused,
    progress,
    currentIndex,
    totalActions,
    currentActionLabel,
    currentSequence,
    onPlay,
    onPause,
    onResume,
    onStop,
    onReset,
    onNext,
    onPrevious,
    onSelectSequence,
    onClose,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showSequenceList, setShowSequenceList] = useState(false);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
            {/* Container Principal */}
            <div
                className={`bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 transition-all duration-300 ${isExpanded ? 'w-[500px]' : 'w-auto'
                    }`}
            >
                {/* Header (sempre visível) */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                        {/* Indicador de gravação */}
                        <div className={`w-3 h-3 rounded-full ${isPlaying && !isPaused ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />

                        <span className="text-white font-semibold text-sm">
                            {isPlaying ? (isPaused ? 'Pausado' : 'Gravando') : 'Showcase Mode'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        >
                            {isExpanded ? <Icons.Minimize /> : <Icons.Expand />}
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                            >
                                <Icons.Close />
                            </button>
                        )}
                    </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                    <>
                        {/* Seletor de sequência */}
                        <div className="px-4 py-3 border-b border-gray-700/30">
                            <div className="relative">
                                <button
                                    onClick={() => setShowSequenceList(!showSequenceList)}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg text-sm text-white hover:bg-gray-700 transition-colors"
                                >
                                    <span>{currentSequence?.name || 'Selecione uma sequência'}</span>
                                    <Icons.ChevronDown />
                                </button>

                                {/* Dropdown de sequências */}
                                {showSequenceList && (
                                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                                        {sequenceList.map((seq) => (
                                            <button
                                                key={seq.id}
                                                onClick={() => {
                                                    onSelectSequence(seq);
                                                    setShowSequenceList(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${currentSequence?.id === seq.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-300 hover:bg-gray-700'
                                                    }`}
                                            >
                                                <div className="font-medium">{seq.name}</div>
                                                {seq.description && (
                                                    <div className="text-xs text-gray-400 mt-0.5">{seq.description}</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Barra de progresso */}
                        <div className="px-4 py-3">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs text-gray-400 w-16">
                                    {currentIndex + 1}/{totalActions}
                                </span>
                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-400 w-16 text-right">
                                    {Math.round(progress)}%
                                </span>
                            </div>

                            {/* Label da ação atual */}
                            {currentActionLabel && (
                                <div className="text-xs text-gray-400 text-center truncate">
                                    {currentActionLabel}
                                </div>
                            )}
                        </div>

                        {/* Controles de playback */}
                        <div className="px-4 py-3 flex items-center justify-center gap-2">
                            {/* Reset */}
                            <button
                                onClick={onReset}
                                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                                title="Resetar"
                            >
                                <Icons.Reset />
                            </button>

                            {/* Previous */}
                            <button
                                onClick={onPrevious}
                                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                                title="Anterior"
                            >
                                <Icons.SkipBack />
                            </button>

                            {/* Play/Pause */}
                            {isPlaying ? (
                                isPaused ? (
                                    <button
                                        onClick={onResume}
                                        className="p-3 rounded-xl bg-green-600 hover:bg-green-500 text-white transition-colors shadow-lg shadow-green-600/30"
                                        title="Continuar"
                                    >
                                        <Icons.Play />
                                    </button>
                                ) : (
                                    <button
                                        onClick={onPause}
                                        className="p-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white transition-colors shadow-lg shadow-yellow-600/30"
                                        title="Pausar"
                                    >
                                        <Icons.Pause />
                                    </button>
                                )
                            ) : (
                                <button
                                    onClick={onPlay}
                                    disabled={!currentSequence}
                                    className={`p-3 rounded-xl transition-colors shadow-lg ${currentSequence
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        }`}
                                    title="Iniciar"
                                >
                                    <Icons.Play />
                                </button>
                            )}

                            {/* Stop */}
                            <button
                                onClick={onStop}
                                disabled={!isPlaying}
                                className={`p-2 rounded-lg transition-colors ${isPlaying
                                    ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
                                    : 'text-gray-600 cursor-not-allowed'
                                    }`}
                                title="Parar"
                            >
                                <Icons.Stop />
                            </button>

                            {/* Next */}
                            <button
                                onClick={onNext}
                                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                                title="Próximo"
                            >
                                <Icons.SkipForward />
                            </button>

                            {/* Settings */}
                            <button
                                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                                title="Configurações"
                            >
                                <Icons.Settings />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Dica de atalhos */}
            {isExpanded && !isPlaying && (
                <div className="mt-3 text-center text-xs text-gray-500">
                    <span className="px-2 py-1 bg-gray-800/50 rounded">Space</span> Play/Pause
                    <span className="mx-2">•</span>
                    <span className="px-2 py-1 bg-gray-800/50 rounded">←/→</span> Navegar
                    <span className="mx-2">•</span>
                    <span className="px-2 py-1 bg-gray-800/50 rounded">Esc</span> Parar
                </div>
            )}
        </div>
    );
};

export default ShowcaseControls;

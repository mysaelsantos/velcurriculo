import React, { useState, useEffect, useRef } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';

// --- ÍCONES (Restaurados Completamente) ---
const Icons = {
    ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
    StarFilled: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    StarOutline: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    WhatsApp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>,
    Instagram: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>,
    StarFilledSmall: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    Report: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
};

interface FeedbackHeaderProps {
    userData: { name: string; email: string };
    headerMessage?: string;
    showLogo?: boolean;
    onOpenMyResumes: () => void;
    onOpenBugReport: () => void;
}

const FeedbackHeader: React.FC<FeedbackHeaderProps> = ({ userData, headerMessage, showLogo = true, onOpenMyResumes, onOpenBugReport }) => {
    const { status, openFeedback, closeFeedback, submitFeedback } = useFeedback();

    // Estados
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [displayText, setDisplayText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    // Estado para controlar o texto "Menu" com atraso
    const [showMenuText, setShowMenuText] = useState(false);

    // REF para o Header
    const headerRef = useRef<HTMLElement>(null);

    const isFeedbackActive = status !== 'idle' && status !== 'waiting';
    // No desktop, menu aberto não expande o header (usa dropdown)
    const isHeaderExpanded = status === 'open' || (isMenuOpen && !isDesktop);

    // --- CONTROLE DE MENUS ---
    const toggleMenu = () => {
        if (status === 'open') {
            closeFeedback();
            setTimeout(() => setIsMenuOpen(true), 300);
        } else {
            setIsMenuOpen(!isMenuOpen);
        }
    };

    const toggleFeedback = () => {
        if (isMenuOpen) {
            setIsMenuOpen(false);
            setTimeout(openFeedback, 300);
        } else {
            status === 'open' ? closeFeedback() : openFeedback();
        }
    };

    const closeAll = () => {
        closeFeedback();
        setIsMenuOpen(false);
    };

    // --- ANIMAÇÃO TYPEWRITER ---
    useEffect(() => {
        if (status === 'typing') {
            const phrase1 = "Gostou do nosso...";
            const phrase2 = "Avalie nossos serviços";
            let i = 0;
            let isDeleting = false;

            const typeLoop = () => {
                if (!isDeleting && i === phrase1.length) {
                    setTimeout(() => { isDeleting = true; typeLoop(); }, 1000);
                    return;
                }
                if (isDeleting && i === 0) {
                    setTimeout(() => {
                        let j = 0;
                        const typeFinal = setInterval(() => {
                            setDisplayText(phrase2.substring(0, j + 1));
                            j++;
                            if (j === phrase2.length) clearInterval(typeFinal);
                        }, 50);
                    }, 300);
                    return;
                }
                const currentText = phrase1.substring(0, isDeleting ? i - 1 : i + 1);
                setDisplayText(currentText);
                i = isDeleting ? i - 1 : i + 1;
                const speed = isDeleting ? 25 : 50;
                setTimeout(typeLoop, speed);
            };
            typeLoop();
        } else if (status === 'prompt') {
            setDisplayText("Avalie nossos serviços");
        }
    }, [status]);

    // --- EFEITO DE DELAY NO TEXTO "MENU" ---
    useEffect(() => {
        if (isMenuOpen) {
            // Aguarda 400ms para exibir o texto "Menu"
            const timer = setTimeout(() => {
                setShowMenuText(true);
            }, 400);
            return () => clearTimeout(timer);
        } else {
            // Esconde imediatamente ao fechar
            setShowMenuText(false);
        }
    }, [isMenuOpen]);

    // --- CORREÇÃO DO CLICK OUTSIDE ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isHeaderExpanded && headerRef.current && !headerRef.current.contains(event.target as Node)) {
                closeAll();
            }
            // Fechar dropdown no desktop ao clicar fora
            if (isDesktop && isMenuOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isHeaderExpanded, isDesktop, isMenuOpen]);

    // --- DETECTAR DESKTOP (lg: breakpoint = 1024px) ---
    useEffect(() => {
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const isValid = text.trim().split(/\s+/).length >= 3 && rating > 0;

    const handleSubmit = () => {
        if (!isValid) return;
        submitFeedback({
            rating,
            text,
            author: userData.name || 'Anônimo',
            email: userData.email || 'sem-email'
        });
    };

    const headerHeight = isHeaderExpanded ? '520px' : '56px';
    const borderShape = 'rounded-[32px]';
    const containerClasses = isHeaderExpanded
        ? 'bg-white text-gray-800'
        : (status === 'thank_you' ? 'bg-green-600 text-white' : 'bg-blue-800/80 text-white backdrop-blur-lg');

    return (
        <>
            <style>{`
                @keyframes blink-hard {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
                .animate-blink-hard {
                    animation: blink-hard 1s infinite;
                }
            `}</style>

            {/* BACKDROP */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isHeaderExpanded ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={closeAll}
            />

            {/* BARRA FLUTUANTE - CÁPSULA */}
            <header
                ref={headerRef}
                className={`fixed top-6 left-6 right-6 lg:left-6 lg:right-6 ${borderShape} shadow-2xl z-50 transition-all duration-500 ease-in-out flex flex-col border border-white/10 ${containerClasses} ${isDesktop && isMenuOpen ? 'overflow-visible' : 'overflow-hidden'}`}
                style={{
                    height: headerHeight,
                    transformOrigin: 'top',
                    willChange: 'height, background-color' // Otimização para Mobile
                }}
            >
                {/* LINHA SUPERIOR */}
                <div className="flex items-center justify-between px-6 h-14 shrink-0 border-b border-white/5 relative z-10">

                    {/* ESQUERDA: Logo e Texto */}
                    <div className="flex items-center gap-2 overflow-hidden relative h-full w-full max-w-[85%]">
                        {status === 'thank_you' ? (
                            <div className="flex items-center gap-2 font-bold animate-fade-in text-white">
                                <Icons.Check /> Obrigado!
                            </div>
                        ) : (
                            <div className="flex items-center relative h-full w-full">
                                {/* LOGO */}
                                <img
                                    src="/logo-header.png"
                                    alt="Logo"
                                    className={`h-5 lg:h-6 mr-3 transition-opacity duration-200 absolute left-0 ${showLogo && !isFeedbackActive && !(isMenuOpen && !isDesktop) ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                                />

                                {/* TEXTO SAUDAÇÃO / MOTIVAÇÃO */}
                                {!isFeedbackActive && !(isMenuOpen && !isDesktop) && headerMessage && (
                                    <span className={`absolute left-0 font-poppins font-medium text-lg sm:text-xl lg:text-4xl text-white whitespace-nowrap transition-opacity duration-700 flex items-center h-full tracking-tight ${!showLogo ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                        {headerMessage}
                                    </span>
                                )}

                                {/* TÍTULO DO MENU (Com delay) - Apenas mobile */}
                                {showMenuText && !isDesktop && (
                                    <span className="absolute left-0 font-poppins font-medium text-lg sm:text-xl lg:text-4xl text-gray-800 animate-fade-in whitespace-nowrap flex items-center h-full tracking-tight z-20">
                                        Menu
                                    </span>
                                )}

                                {/* TEXTO DO FEEDBACK (Typewriter) */}
                                {isFeedbackActive && (
                                    <span className="absolute left-0 font-poppins font-medium text-lg sm:text-xl lg:text-4xl text-white animate-fade-in whitespace-nowrap flex items-center h-full tracking-tight z-20">
                                        {displayText}
                                        <span className="inline-block w-[2px] h-5 sm:h-7 lg:h-10 bg-white ml-1 animate-blink-hard align-middle"></span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DIREITA: Navegação */}
                    <nav className="relative flex items-center gap-3 -mr-2">
                        {isFeedbackActive && status !== 'thank_you' && (
                            <button
                                onClick={toggleFeedback}
                                className={`p-2 rounded-full transition-all duration-300 ${status === 'open' ? 'bg-gray-100 rotate-180 text-blue-600 shadow-sm' : 'bg-white/25 hover:bg-white/40 animate-bounce-slow text-white'}`}
                            >
                                <Icons.ChevronDown />
                            </button>
                        )}

                        {!isFeedbackActive && (
                            <div className="relative">
                                <button
                                    onClick={toggleMenu}
                                    className={`p-1.5 rounded-full transition focus:outline-none ${isMenuOpen ? 'bg-gray-100 text-gray-800 rotate-90' : 'hover:bg-white/10 text-white'}`}
                                >
                                    {isMenuOpen ? <Icons.Close /> : <Icons.Menu />}
                                </button>

                                {/* DROPDOWN DESKTOP - Mesmo estilo do menu mobile */}
                                {isMenuOpen && (
                                    <div className="hidden lg:block absolute top-14 right-0 w-64 z-50 animate-fade-in">
                                        {/* Seta conectora simples */}
                                        <div className="absolute -top-2 right-5 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-200"></div>

                                        {/* Container com mesmo estilo do site */}
                                        <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-3">

                                            {/* Botões Principais - Mesmo estilo do mobile */}
                                            <div className="flex flex-col gap-2 mb-3">
                                                <button
                                                    onClick={() => { closeAll(); onOpenMyResumes(); }}
                                                    className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors border border-gray-100"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                        <Icons.FileText />
                                                    </div>
                                                    Meus Currículos
                                                </button>

                                                <button
                                                    onClick={() => { closeAll(); setTimeout(openFeedback, 100); }}
                                                    className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors border border-gray-100"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                                                        <Icons.StarFilledSmall />
                                                    </div>
                                                    Avaliar o App
                                                </button>

                                                <button
                                                    onClick={() => { closeAll(); window.location.hash = '/meus-cupons'; }}
                                                    className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors border border-gray-100"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
                                                    </div>
                                                    Meus Cupons
                                                </button>

                                                <button
                                                    onClick={() => { closeAll(); onOpenBugReport(); }}
                                                    className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors border border-gray-100"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                                                        <Icons.Report />
                                                    </div>
                                                    Relatar Bug
                                                </button>

                                                {/* Botão Baixar App (PWA) */}
                                                <button
                                                    onClick={() => {
                                                        const deferredPrompt = (window as any).deferredPrompt;
                                                        if (deferredPrompt) {
                                                            deferredPrompt.prompt();
                                                            deferredPrompt.userChoice.then(() => {
                                                                (window as any).deferredPrompt = null;
                                                            });
                                                            closeAll();
                                                        }
                                                    }}
                                                    className={`w-full h-12 rounded-xl font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors border ${(window as any).deferredPrompt ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'}`}
                                                    disabled={!(window as any).deferredPrompt}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${(window as any).deferredPrompt ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                    </div>
                                                    {(window as any).deferredPrompt ? 'Instalar App' : 'App Instalado'}
                                                </button>
                                            </div>

                                            {/* Separador */}
                                            <div className="border-t border-gray-100 my-2"></div>

                                            {/* Links de Contato - Mesmo estilo */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-gray-400 font-medium px-1 mb-1">Contato</span>
                                                <a href="https://wa.me/5537984116034" target="_blank" rel="noopener noreferrer" onClick={closeAll}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                                                    <div className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Icons.WhatsApp /></div>
                                                    WhatsApp
                                                </a>
                                                <a href="mailto:contato@velsites.com.br" onClick={closeAll}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                                                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><Icons.Mail /></div>
                                                    E-mail
                                                </a>
                                                <a href="https://www.instagram.com/velcurriculo/" target="_blank" rel="noopener noreferrer" onClick={closeAll}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                                                    <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center"><Icons.Instagram /></div>
                                                    Instagram
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>
                </div>

                {/* --- CONTEÚDO EXPANDIDO --- */}

                {/* 1. FORMULÁRIO DE AVALIAÇÃO */}
                <div className={`absolute top-14 left-0 right-0 bottom-0 p-6 flex flex-col items-center justify-center transition-all duration-500 ${status === 'open' ? 'opacity-100 translate-y-0 delay-100 z-20' : 'opacity-0 -translate-y-4 pointer-events-none z-0'}`}>
                    <h3 className="text-xl font-poppins font-bold text-gray-800 mb-6 text-center">
                        Como foi sua experiência?
                    </h3>
                    <div className="flex gap-3 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setRating(star)} className="transform transition hover:scale-125 focus:outline-none active:scale-95">
                                {star <= rating ? <Icons.StarFilled /> : <Icons.StarOutline />}
                            </button>
                        ))}
                    </div>
                    <textarea
                        className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-2xl p-5 text-sm md:text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none h-28 mb-6 text-gray-700 placeholder-gray-400 shadow-inner transition-all"
                        placeholder="Conte-nos o que achou..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || status === 'submitting'}
                        className={`w-full max-w-md py-3.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isValid ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0' : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
                    >
                        {status === 'submitting' ? 'Enviando...' : <><Icons.Send /> Enviar Avaliação</>}
                    </button>
                </div>

                {/* 2. CONTEÚDO DO MENU - Apenas mobile */}
                <div className={`lg:hidden absolute top-14 left-0 right-0 p-4 flex flex-col transition-all duration-500 ${isMenuOpen ? 'opacity-100 translate-y-0 delay-100 z-20' : 'opacity-0 -translate-y-4 pointer-events-none z-0'}`}>

                    {/* Botões Principais - Lista Uniforme */}
                    <div className="flex flex-col gap-2 mb-3">
                        <button
                            onClick={() => { closeAll(); onOpenMyResumes(); }}
                            className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors active:scale-[0.98] border border-gray-100"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Icons.FileText />
                            </div>
                            Meus Currículos
                        </button>

                        <button
                            onClick={() => { closeAll(); setTimeout(openFeedback, 100); }}
                            className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors active:scale-[0.98] border border-gray-100"
                        >
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                                <Icons.StarFilledSmall />
                            </div>
                            Avaliar o App
                        </button>

                        <button
                            onClick={() => { closeAll(); window.location.hash = '/meus-cupons'; }}
                            className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors active:scale-[0.98] border border-gray-100"
                        >
                            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
                            </div>
                            Meus Cupons
                        </button>

                        <button
                            onClick={() => { closeAll(); onOpenBugReport(); }}
                            className="w-full h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors active:scale-[0.98] border border-gray-100"
                        >
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                                <Icons.Report />
                            </div>
                            Relatar Bug
                        </button>

                        {/* Botão Baixar App (PWA) */}
                        <button
                            onClick={() => {
                                const deferredPrompt = (window as any).deferredPrompt;
                                if (deferredPrompt) {
                                    deferredPrompt.prompt();
                                    deferredPrompt.userChoice.then(() => {
                                        (window as any).deferredPrompt = null;
                                    });
                                    closeAll();
                                }
                            }}
                            className={`w-full h-12 rounded-xl font-poppins font-medium text-sm flex items-center gap-3 px-4 transition-colors active:scale-[0.98] border ${(window as any).deferredPrompt ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'}`}
                            disabled={!(window as any).deferredPrompt}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${(window as any).deferredPrompt ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </div>
                            {(window as any).deferredPrompt ? 'Instalar App' : 'App Instalado'}
                        </button>
                    </div>

                    <div className="w-full border-t border-gray-100 my-2"></div>

                    {/* Links Sociais */}
                    <div className="flex flex-col gap-1 w-full">
                        <span className="text-xs text-gray-400 font-medium px-1 mb-1">Contato</span>
                        <a href="https://wa.me/5537984116034" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                            <div className="w-7 h-7 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Icons.WhatsApp /></div> WhatsApp
                        </a>
                        <a href="mailto:contato@velsites.com.br" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><Icons.Mail /></div> E-mail
                        </a>
                        <a href="https://www.instagram.com/velcurriculo/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">
                            <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center"><Icons.Instagram /></div> Instagram
                        </a>
                    </div>
                </div>

            </header>
        </>
    );
};

export default FeedbackHeader;

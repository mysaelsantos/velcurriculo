import React, { useState, useEffect } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';

// --- ÍCONES ---
const Icons = {
    ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
    StarFilled: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    StarOutline: () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    WhatsApp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>,
    Instagram: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
};

interface FeedbackHeaderProps {
    userData: { name: string; email: string };
    headerMessage?: string;
    showLogo?: boolean;
    onOpenMyResumes: () => void; // Nova prop para abrir os currículos
}

const FeedbackHeader: React.FC<FeedbackHeaderProps> = ({ userData, headerMessage, showLogo = true, onOpenMyResumes }) => {
    const { status, openFeedback, closeFeedback, submitFeedback } = useFeedback();
    
    // Estados
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [displayText, setDisplayText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isFeedbackActive = status !== 'idle' && status !== 'waiting';
    // O header está aberto se: O Feedback estiver open OU o Menu estiver open
    const isHeaderExpanded = status === 'open' || isMenuOpen;

    // Toggle do Menu
    const toggleMenu = () => {
        if (status === 'open') {
            closeFeedback(); // Fecha feedback se estiver aberto
            setTimeout(() => setIsMenuOpen(true), 300); // Abre menu depois
        } else {
            setIsMenuOpen(!isMenuOpen);
        }
    };

    // Toggle do Feedback
    const toggleFeedback = () => {
        if (isMenuOpen) {
            setIsMenuOpen(false); // Fecha menu se estiver aberto
            setTimeout(openFeedback, 300); // Abre feedback depois
        } else {
            status === 'open' ? closeFeedback() : openFeedback();
        }
    };

    // Fecha tudo
    const closeAll = () => {
        closeFeedback();
        setIsMenuOpen(false);
    };

    // Animação Typewriter
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

    // Fecha ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const nav = document.querySelector('header');
            if (isHeaderExpanded && nav && !nav.contains(event.target as Node)) {
                closeAll();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isHeaderExpanded]);

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

    // Altura dinâmica
    const headerHeight = isHeaderExpanded ? '440px' : '64px';
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

            {/* BARRA FLUTUANTE */}
            <header 
                className={`fixed top-6 left-6 right-6 lg:left-6 lg:right-6 ${borderShape} shadow-2xl z-50 transition-all duration-500 ease-in-out overflow-hidden flex flex-col border border-white/10 ${containerClasses}`}
                style={{ height: headerHeight, transformOrigin: 'top' }}
            >
                {/* LINHA SUPERIOR */}
                <div className="flex items-center justify-between px-6 h-16 shrink-0 border-b border-white/5 relative z-10">
                    
                    {/* ESQUERDA: Logo e Texto */}
                    <div className="flex items-center gap-2 overflow-hidden relative h-full w-full max-w-[85%]">
                        {status === 'thank_you' ? (
                            <div className="flex items-center gap-2 font-bold animate-fade-in text-white">
                                <Icons.Check /> Obrigado!
                            </div>
                        ) : (
                            <div className="flex items-center relative h-full w-full">
                                {/* LOGO (Só some se o Feedback estiver ativo. Se for Menu, logo fica) */}
                                <img 
                                    src="/logo-header.png" 
                                    alt="Logo" 
                                    className={`h-5 lg:h-6 mr-3 transition-opacity duration-500 absolute left-0 ${showLogo && !isFeedbackActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
                                />

                                {/* TEXTO SAUDAÇÃO (some no feedback ou menu aberto) */}
                                {!isFeedbackActive && !isMenuOpen && headerMessage && (
                                    <span className={`absolute left-0 font-poppins font-medium text-2xl lg:text-4xl text-white whitespace-nowrap transition-opacity duration-700 flex items-center h-full tracking-tight ${!showLogo ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                        {headerMessage}
                                    </span>
                                )}

                                {/* TÍTULO DO MENU (aparece só quando menu abre) */}
                                {isMenuOpen && (
                                    <span className="absolute left-0 font-poppins font-medium text-2xl lg:text-4xl text-gray-800 animate-fade-in whitespace-nowrap flex items-center h-full tracking-tight">
                                        Menu
                                    </span>
                                )}

                                {/* TEXTO DO FEEDBACK */}
                                {isFeedbackActive && (
                                    <span className="absolute left-0 font-poppins font-medium text-2xl lg:text-4xl text-white animate-fade-in whitespace-nowrap flex items-center h-full tracking-tight">
                                        {displayText}
                                        <span className="inline-block w-[3px] h-7 lg:h-10 bg-white ml-1 animate-blink-hard align-middle"></span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DIREITA: Navegação */}
                    <nav className="relative flex items-center gap-3">
                        {/* Botão de Feedback (Seta) */}
                        {isFeedbackActive && status !== 'thank_you' && (
                            <button 
                                onClick={toggleFeedback}
                                className={`p-2 rounded-full transition-all duration-300 ${status === 'open' ? 'bg-gray-100 rotate-180 text-blue-600 shadow-sm' : 'bg-white/25 hover:bg-white/40 animate-bounce-slow text-white'}`}
                            >
                                <Icons.ChevronDown />
                            </button>
                        )}

                        {/* Botão de Menu (Hamburguer/X) */}
                        {/* Só aparece se NÃO estivermos no modo Feedback (para não ter 2 botões conflitantes) */}
                        {!isFeedbackActive && (
                            <button 
                                onClick={toggleMenu} 
                                className={`p-1.5 rounded-full transition focus:outline-none ${isMenuOpen ? 'bg-gray-100 text-gray-800 rotate-90' : 'hover:bg-white/10 text-white'}`}
                            >
                                {isMenuOpen ? <Icons.Close /> : <Icons.Menu />}
                            </button>
                        )}
                    </nav>
                </div>

                {/* --- CONTEÚDO EXPANDIDO (GAVETA) --- */}
                
                {/* OPÇÃO 1: FORMULÁRIO DE AVALIAÇÃO */}
                <div className={`absolute top-16 left-0 right-0 bottom-0 p-6 flex flex-col items-center justify-center transition-all duration-500 ${status === 'open' ? 'opacity-100 translate-y-0 delay-100 z-20' : 'opacity-0 -translate-y-4 pointer-events-none z-0'}`}>
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

                {/* OPÇÃO 2: CONTEÚDO DO MENU */}
                <div className={`absolute top-16 left-0 right-0 bottom-0 p-6 flex flex-col items-center justify-center transition-all duration-500 ${isMenuOpen ? 'opacity-100 translate-y-0 delay-100 z-20' : 'opacity-0 -translate-y-4 pointer-events-none z-0'}`}>
                    
                    {/* Botão Meus Currículos (Destaque) */}
                    <button 
                        onClick={() => { closeAll(); onOpenMyResumes(); }}
                        className="w-full max-w-md py-4 rounded-2xl bg-blue-50 text-blue-700 font-poppins font-bold text-lg flex items-center justify-center gap-3 mb-8 hover:bg-blue-100 transition-colors shadow-sm"
                    >
                        <Icons.FileText /> Meus Currículos
                    </button>

                    <div className="w-full max-w-md border-t border-gray-100 my-2"></div>

                    {/* Links Sociais */}
                    <div className="flex flex-col gap-4 w-full max-w-md mt-6">
                        <a href="https://wa.me/5537984169386" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Icons.WhatsApp /></div> WhatsApp
                        </a>
                        <a href="mailto:contato@velsites.com.br" className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                            <div className="p-2 bg-gray-100 text-gray-600 rounded-full"><Icons.Mail /></div> E-mail
                        </a>
                        <a href="https://www.instagram.com/velsites.com.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors">
                            <div className="p-2 bg-pink-100 text-pink-600 rounded-full"><Icons.Instagram /></div> Instagram
                        </a>
                    </div>
                </div>

            </header>
        </>
    );
};

export default FeedbackHeader;

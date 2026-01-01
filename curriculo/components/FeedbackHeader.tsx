import React, { useState, useEffect } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';

// --- ÍCONES ---
const Icons = {
    ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
    StarFilled: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    StarOutline: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    WhatsApp: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
    Mail: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>,
    Instagram: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
};

interface FeedbackHeaderProps {
    userData: { name: string; email: string };
    headerMessage?: string;
    showLogo?: boolean;
}

const FeedbackHeader: React.FC<FeedbackHeaderProps> = ({ userData, headerMessage, showLogo = true }) => {
    const { status, openFeedback, closeFeedback, submitFeedback } = useFeedback();
    
    // Estados do Formulário
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [displayText, setDisplayText] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const isFeedbackActive = status !== 'idle' && status !== 'waiting';

    // Animação Typewriter
    useEffect(() => {
        if (status === 'typing') {
            const phrase1 = "Gostou do nosso...";
            const phrase2 = "Avalie nossos serviços";
            let i = 0;
            let isDeleting = false;
            
            const typeLoop = () => {
                if (!isDeleting && i === phrase1.length) {
                    setTimeout(() => { isDeleting = true; typeLoop(); }, 800);
                    return;
                }
                if (isDeleting && i === 0) {
                    let j = 0;
                    const typeFinal = setInterval(() => {
                        setDisplayText(phrase2.substring(0, j + 1));
                        j++;
                        if (j === phrase2.length) clearInterval(typeFinal);
                    }, 50);
                    return;
                }
                const currentText = phrase1.substring(0, isDeleting ? i - 1 : i + 1);
                setDisplayText(currentText);
                i = isDeleting ? i - 1 : i + 1;
                setTimeout(typeLoop, isDeleting ? 30 : 80);
            };
            typeLoop();
        } else if (status === 'prompt') {
            setDisplayText("Avalie nossos serviços");
        }
    }, [status]);

    // Click Outside Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const nav = document.querySelector('header nav');
            if (isMenuOpen && nav && !nav.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

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

    const headerHeight = status === 'open' ? '400px' : '64px';
    
    // CORRIGIDO:
    // 1. rounded-full (Pílula) quando fechado.
    // 2. rounded-3xl quando aberto (para o modal ficar bonito).
    const borderShape = status === 'open' ? 'rounded-3xl' : 'rounded-full';

    const containerClasses = status === 'open' 
        ? 'bg-white text-gray-800' 
        : (status === 'thank_you' ? 'bg-green-600 text-white' : 'bg-blue-800/80 text-white backdrop-blur-lg');

    return (
        <>
            {/* BACKDROP */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${status === 'open' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={closeFeedback}
            />

            {/* BARRA FLUTUANTE */}
            <header 
                className={`fixed top-6 left-6 right-6 lg:left-6 lg:right-6 ${borderShape} shadow-lg z-50 transition-all duration-500 ease-in-out overflow-hidden flex flex-col border border-white/10 ${containerClasses}`}
                style={{ height: headerHeight }}
            >
                {/* LINHA SUPERIOR */}
                <div className="flex items-center justify-between px-6 h-16 shrink-0 border-b border-white/5">
                    
                    {/* ESQUERDA: Logo e Texto (Partilham o mesmo espaço) */}
                    <div className="flex items-center gap-2 overflow-hidden relative h-full w-full max-w-[70%]">
                        {status === 'thank_you' ? (
                            <div className="flex items-center gap-2 font-bold animate-fade-in">
                                <Icons.Check /> Obrigado!
                            </div>
                        ) : (
                            <div className="flex items-center relative h-6 w-full">
                                {/* LOGO: Só aparece se showLogo=true E se o Feedback NÃO estiver ativo */}
                                <img 
                                    src="/logo-header.png" 
                                    alt="Logo" 
                                    className={`h-5 lg:h-6 mr-3 transition-opacity duration-500 absolute left-0 ${showLogo && !isFeedbackActive ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
                                />

                                {/* TEXTO DE SAUDAÇÃO (App): Só aparece se não estivermos em Feedback */}
                                {!isFeedbackActive && headerMessage && (
                                    <span className={`font-poppins font-medium text-sm lg:text-lg whitespace-nowrap transition-opacity duration-700 absolute left-0 ${!showLogo ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                        {headerMessage}
                                    </span>
                                )}

                                {/* TEXTO DO FEEDBACK: Aparece no mesmo lugar da logo (absolute left-0) */}
                                {isFeedbackActive && (
                                    <span className="absolute left-0 text-sm lg:text-base font-medium text-blue-300 animate-fade-in whitespace-nowrap">
                                        {displayText}
                                        <span className="animate-pulse">|</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DIREITA: Navegação */}
                    <nav className="relative flex items-center gap-3">
                        {isFeedbackActive && status !== 'thank_you' && (
                            <button 
                                onClick={status === 'open' ? closeFeedback : openFeedback}
                                className={`p-2 rounded-full transition-all duration-300 ${status === 'open' ? 'bg-gray-100 rotate-180 text-blue-600' : 'bg-white/10 hover:bg-white/20 animate-bounce-slow text-white'}`}
                            >
                                <Icons.ChevronDown />
                            </button>
                        )}

                        {!isFeedbackActive && (
                            <button 
                                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                                className="p-1.5 rounded-full hover:bg-white/10 transition focus:outline-none"
                            >
                                {isMenuOpen ? <Icons.Close /> : <Icons.Menu />}
                            </button>
                        )}

                        {/* Menu Dropdown */}
                        {isMenuOpen && !isFeedbackActive && (
                            <div className="absolute right-0 top-full mt-4 w-56 bg-white rounded-xl shadow-2xl overflow-hidden py-2 animate-fade-in-scale origin-top-right border border-gray-100 z-50 text-gray-700">
                                <a href="https://wa.me/5537984169386" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                                    <Icons.WhatsApp /> WhatsApp
                                </a>
                                <a href="mailto:contato@velsites.com.br" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                                    <Icons.Mail /> E-mail
                                </a>
                                <a href="https://www.instagram.com/velsites.com.br/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                                    <Icons.Instagram /> Instagram
                                </a>
                            </div>
                        )}
                    </nav>
                </div>

                {/* AREA EXPANDIDA (Formulário) */}
                <div className={`flex-1 p-6 flex flex-col items-center justify-center transition-opacity duration-300 delay-100 ${status === 'open' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Como foi a sua experiência?</h3>
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setRating(star)} className="transform transition hover:scale-110 focus:outline-none">
                                {star <= rating ? <Icons.StarFilled /> : <Icons.StarOutline />}
                            </button>
                        ))}
                    </div>
                    <textarea 
                        className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 mb-2 text-gray-800"
                        placeholder="Conte-nos o que achou (mínimo 3 palavras)..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <div className="w-full max-w-md flex justify-between items-center text-xs text-gray-400 mb-4">
                        <span>{text.trim() ? `${text.trim().split(/\s+/).length} palavras` : '0 palavras'}</span>
                        {!isValid && <span>Mínimo 3 palavras e 1 estrela</span>}
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={!isValid || status === 'submitting'}
                        className={`w-full max-w-md py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            isValid 
                            ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-1' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {status === 'submitting' ? 'Enviando...' : <><Icons.Send /> Enviar Avaliação</>}
                    </button>
                </div>
            </header>
        </>
    );
};

export default FeedbackHeader;

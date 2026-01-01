import React, { useState, useEffect, useRef } from 'react';
import { useFeedback } from '../contexts/FeedbackContext';

// Ícones SVG Inline para não depender de libs externas
const Icons = {
    ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
    StarFilled: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    StarOutline: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
};

interface FeedbackHeaderProps {
    userData: { name: string; email: string }; // Recebe dados do usuário para salvar
}

const FeedbackHeader: React.FC<FeedbackHeaderProps> = ({ userData }) => {
    const { status, openFeedback, closeFeedback, submitFeedback } = useFeedback();
    
    // Estados locais do formulário
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [displayText, setDisplayText] = useState(''); // Texto animado
    
    // Efeito de Digitação (Typewriter)
    useEffect(() => {
        if (status === 'typing') {
            const phrase1 = "Gostou do nosso...";
            const phrase2 = "Avalie nossos serviços";
            let i = 0;
            let isDeleting = false;
            
            const typeLoop = () => {
                // Se terminou de digitar a frase 1
                if (!isDeleting && i === phrase1.length) {
                    setTimeout(() => { isDeleting = true; typeLoop(); }, 800); // Pausa antes de apagar
                    return;
                }

                // Se terminou de apagar tudo
                if (isDeleting && i === 0) {
                    // Começa a frase 2 (final)
                    let j = 0;
                    const typeFinal = setInterval(() => {
                        setDisplayText(phrase2.substring(0, j + 1));
                        j++;
                        if (j === phrase2.length) {
                            clearInterval(typeFinal);
                            // IMPORTANTE: Aqui poderíamos chamar uma função no contexto para mudar status para 'prompt'
                            // mas vamos deixar visualmente assim por enquanto.
                        }
                    }, 50); // Velocidade frase 2
                    return;
                }

                // Lógica de digitar/apagar frase 1
                const currentText = phrase1.substring(0, isDeleting ? i - 1 : i + 1);
                setDisplayText(currentText);
                i = isDeleting ? i - 1 : i + 1;

                const speed = isDeleting ? 30 : 80; // Apagar é mais rápido
                setTimeout(typeLoop, speed);
            };

            typeLoop();
        } else if (status === 'prompt') {
            setDisplayText("Avalie nossos serviços");
        }
    }, [status]);

    // Validação: Mínimo 3 palavras
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

    // Altura dinâmica baseada no estado
    const headerHeight = status === 'open' ? '400px' : '64px'; // 64px = h-16
    const bgColor = status === 'thank_you' ? 'bg-green-600' : 'bg-white';
    const textColor = status === 'thank_you' ? 'text-white' : 'text-gray-800';

    return (
        <>
            {/* BACKDROP ESCURO (Só aparece quando aberto) */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${status === 'open' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={closeFeedback}
            />

            {/* BARRA FLUTUANTE */}
            <header 
                className={`fixed top-0 left-0 w-full ${bgColor} shadow-lg z-50 transition-all duration-500 ease-in-out overflow-hidden flex flex-col`}
                style={{ height: headerHeight }}
            >
                {/* LINHA SUPERIOR (Sempre visível) */}
                <div className="flex items-center justify-between px-6 h-16 shrink-0 border-b border-gray-100/10">
                    
                    {/* LOGO (Esquerda) */}
                    <div className="flex items-center gap-2">
                        {status === 'thank_you' ? (
                            <div className="flex items-center gap-2 font-bold text-white animate-fade-in">
                                <Icons.Check /> Obrigado pela avaliação!
                            </div>
                        ) : (
                            <>
                                <img src="/logo-header.png" alt="Logo" className="h-8" />
                                {/* TEXTO ANIMADO (Só aparece nos estados certos) */}
                                {(status === 'typing' || status === 'prompt' || status === 'open') && (
                                    <span className="ml-3 text-sm font-medium text-blue-600 border-l border-gray-200 pl-3 hidden sm:block">
                                        {displayText}
                                        <span className="animate-pulse">|</span>
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {/* BOTÃO / INDICADOR (Direita) */}
                    {status === 'idle' || status === 'waiting' ? (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ONLINE
                        </div>
                    ) : status !== 'thank_you' && (
                        <button 
                            onClick={status === 'open' ? closeFeedback : openFeedback}
                            className={`p-2 rounded-full transition-all duration-300 ${status === 'open' ? 'bg-gray-100 rotate-180' : 'bg-blue-50 hover:bg-blue-100 animate-bounce-slow'}`}
                        >
                            <div className="text-blue-600">
                                <Icons.ChevronDown />
                            </div>
                        </button>
                    )}
                </div>

                {/* CONTEÚDO DO "MODAL HÍBRIDO" (Só visível quando expandido) */}
                <div className={`flex-1 p-6 flex flex-col items-center justify-center transition-opacity duration-300 delay-100 ${status === 'open' ? 'opacity-100' : 'opacity-0'}`}>
                    
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Como foi a sua experiência?</h3>
                    
                    {/* ESTRELAS */}
                    <div className="flex gap-2 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                                key={star}
                                onClick={() => setRating(star)}
                                className="transform transition hover:scale-110 focus:outline-none"
                            >
                                {star <= rating ? <Icons.StarFilled /> : <Icons.StarOutline />}
                            </button>
                        ))}
                    </div>

                    {/* CAMPO DE TEXTO */}
                    <textarea 
                        className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 mb-2"
                        placeholder="Conte-nos o que achou (mínimo 3 palavras)..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    
                    {/* CONTADOR / DICA */}
                    <div className="w-full max-w-md flex justify-between items-center text-xs text-gray-400 mb-4">
                        <span>{text.trim() ? `${text.trim().split(/\s+/).length} palavras` : '0 palavras'}</span>
                        {!isValid && <span>Mínimo 3 palavras e 1 estrela</span>}
                    </div>

                    {/* BOTÃO ENVIAR */}
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

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Tipos
type FeedbackStatus = 'idle' | 'waiting' | 'typing' | 'prompt' | 'open' | 'submitting' | 'thank_you';

interface FeedbackContextData {
    status: FeedbackStatus;
    triggerFeedback: () => void;
    openFeedback: () => void;
    closeFeedback: () => void;
    submitFeedback: (data: { rating: number; text: string; author: string; email: string }) => Promise<void>;
}

interface FeedbackProviderProps {
    children: ReactNode;
}

// Criação do Contexto
const FeedbackContext = createContext<FeedbackContextData>({} as FeedbackContextData);

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
    const [status, setStatus] = useState<FeedbackStatus>('idle');
    const timeoutRef = useRef<any>(null);

    // Função que inicia o processo (chamada após o download)
    const triggerFeedback = useCallback(() => {
        if (status !== 'idle') return;

        setStatus('waiting');
        
        // Espera 3 segundos antes de começar a animação
        timeoutRef.current = setTimeout(() => {
            setStatus('typing');
        }, 3000);
    }, [status]);

    const openFeedback = useCallback(() => {
        setStatus('open');
    }, []);

    const closeFeedback = useCallback(() => {
        setStatus('idle');
    }, []);

    const submitFeedback = useCallback(async ({ rating, text, author, email }: any) => {
        setStatus('submitting');
        try {
            // Salva no Firebase
            await addDoc(collection(db, 'reviews'), {
                author: author || 'Anônimo',
                email: email || 'não-informado',
                rating,
                text,
                approved: false, // Requer aprovação do admin
                created_at: serverTimestamp()
            });

            setStatus('thank_you');

            // Mostra agradecimento e reseta após 5 segundos
            setTimeout(() => {
                setStatus('idle');
            }, 5000);
        } catch (error) {
            console.error("Erro ao enviar avaliação:", error);
            alert("Houve um erro ao enviar. Tente novamente.");
            setStatus('open');
        }
    }, []);

    return (
        <FeedbackContext.Provider value={{ status, triggerFeedback, openFeedback, closeFeedback, submitFeedback }}>
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback deve ser usado dentro de um FeedbackProvider');
    }
    return context;
};

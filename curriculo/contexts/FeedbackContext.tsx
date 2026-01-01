import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

type FeedbackStatus = 'idle' | 'waiting' | 'typing' | 'prompt' | 'open' | 'submitting' | 'thank_you';

interface FeedbackContextData {
    status: FeedbackStatus;
    triggerFeedback: () => void;
    openFeedback: () => void;
    closeFeedback: () => void;
    submitFeedback: (data: { rating: number; text: string; author: string; email: string }) => Promise<void>;
}

const FeedbackContext = createContext<FeedbackContextData>({} as FeedbackContextData);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<FeedbackStatus>('idle');
    const timeoutRef = useRef<any>(null);

    // Chamado quando o PDF termina de baixar
    const triggerFeedback = useCallback(() => {
        // Se já avaliou ou está ocupado, ignora (podemos melhorar essa regra depois com localStorage)
        if (status !== 'idle') return;

        setStatus('waiting');
        
        // Espera 3 segundos antes de começar a digitar
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
            // Simula envio ou envia pro Firebase
            await addDoc(collection(db, 'reviews'), {
                author,
                email,
                rating,
                text,
                approved: false,
                created_at: serverTimestamp()
            });

            setStatus('thank_you');

            // Mostra agradecimento por 5 segundos e reseta
            setTimeout(() => {
                setStatus('idle');
            }, 5000);
        } catch (error) {
            console.error("Erro ao enviar avaliação:", error);
            setStatus('prompt'); // Volta para o prompt em caso de erro
        }
    }, []);

    return (
        <FeedbackContext.Provider value={{ status, triggerFeedback, openFeedback, closeFeedback, submitFeedback }}>
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => useContext(FeedbackContext);

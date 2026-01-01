import { db } from './firebase';
import { doc, updateDoc, increment, addDoc, collection, setDoc, Timestamp, getDoc } from 'firebase/firestore';

// Referência ao documento de estatísticas gerais
const statsRef = doc(db, 'stats', 'general');

/**
 * Registra um novo visitante no site.
 * Usa um identificador diário para não contar a mesma pessoa mil vezes no mesmo dia.
 */
export const trackVisitor = async () => {
    try {
        const today = new Date().toISOString().split('T')[0]; // Ex: 2023-10-25
        const visitorKey = `visitor_${today}`;
        
        // Verifica se já contamos hoje (usando sessionStorage para ser por aba/sessão)
        if (sessionStorage.getItem(visitorKey)) return;

        // Atualiza o contador geral
        await updateDoc(statsRef, {
            active_visitors: increment(1)
        });

        // Marca que este usuário já foi contado hoje
        sessionStorage.setItem(visitorKey, 'true');

    } catch (error) {
        console.error("Erro ao rastrear visitante:", error);
    }
};

/**
 * Registra que um currículo foi gerado (PDF baixado).
 */
export const trackResumeGenerated = async () => {
    try {
        await updateDoc(statsRef, {
            total_resumes: increment(1),
            last_updated: Timestamp.now()
        });
    } catch (error) {
        console.error("Erro ao rastrear currículo:", error);
    }
};

/**
 * Registra uma venda confirmada.
 * Salva a transação detalhada e atualiza o faturamento total.
 */
export const trackSale = async (amount: number, customerName: string, paymentId: string) => {
    try {
        // 1. Salva a transação detalhada no histórico
        await addDoc(collection(db, 'transactions'), {
            amount: amount,
            customer_name: customerName,
            payment_id: paymentId,
            status: 'approved',
            payment_method: 'pix',
            created_at: Timestamp.now()
        });

        // 2. Soma o valor ao faturamento total do painel
        await updateDoc(statsRef, {
            total_revenue: increment(amount),
            last_updated: Timestamp.now()
        });

    } catch (error) {
        console.error("Erro ao rastrear venda:", error);
    }
};

import { db } from './firebase';
import { doc, updateDoc, increment, addDoc, collection, setDoc, Timestamp } from 'firebase/firestore';

// Referência ao documento geral de estatísticas
const statsRef = doc(db, 'stats', 'general');

/**
 * Registra um novo visitante.
 * Usa o sessionStorage para garantir que se a pessoa der F5, não conte duas vezes.
 */
export const trackVisitor = async () => {
    // Evita rodar fora do navegador
    if (typeof window === 'undefined') return;

    try {
        // Cria uma "chave" única para o dia de hoje (ex: visitor_2023-10-25)
        const today = new Date().toISOString().split('T')[0];
        const sessionKey = `visitor_counted_${today}`;
        
        // Se já contamos este usuário nesta sessão hoje, não faz nada
        if (sessionStorage.getItem(sessionKey)) return;

        // Se não, incrementa +1 no banco
        await updateDoc(statsRef, {
            active_visitors: increment(1)
        });

        // Marca que já foi contado
        sessionStorage.setItem(sessionKey, 'true');
        console.log("📈 [Tracker] Novo visitante contabilizado.");

    } catch (error) {
        // Silencioso: se der erro (ex: internet caiu), não atrapalha o usuário
        console.warn("[Tracker] Erro ao contar visitante (ignorado).");
    }
};

/**
 * Registra que um currículo foi gerado (PDF).
 */
export const trackResumeGenerated = async () => {
    try {
        await updateDoc(statsRef, {
            total_resumes: increment(1),
            last_updated: Timestamp.now()
        });
        console.log("📄 [Tracker] Currículo gerado contabilizado.");
    } catch (error) {
        console.warn("[Tracker] Erro ao contar currículo.");
    }
};

/**
 * Registra uma venda confirmada.
 * Salva tanto o valor total quanto o detalhe da transação.
 */
export const trackSale = async (amount: number, customerName: string, paymentId: string) => {
    try {
        // 1. Salva a transação detalhada na lista de 'transactions'
        await addDoc(collection(db, 'transactions'), {
            amount: amount,
            customer_name: customerName,
            payment_id: paymentId,
            status: 'approved',
            payment_method: 'pix',
            created_at: Timestamp.now()
        });

        // 2. Soma o dinheiro no total geral
        await updateDoc(statsRef, {
            total_revenue: increment(amount),
            last_updated: Timestamp.now()
        });
        
        console.log(`💰 [Tracker] Venda de R$${amount} registrada!`);

    } catch (error) {
        console.error("❌ [Tracker] Erro CRÍTICO ao registrar venda:", error);
    }
};

import { db } from './firebase';
import { doc, updateDoc, increment, addDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { ResumeData } from '../types';

// Referência para os totais gerais (acumulado histórico)
const statsRef = doc(db, 'stats', 'general');

// Helper para pegar a data de hoje no formato YYYY-MM-DD (Corrigido para Data Local)
const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const trackVisitor = async () => {
    if (typeof window === 'undefined') return;
    try {
        const today = getTodayStr();
        const sessionKey = `visitor_counted_${today}`;
        
        // Evita contar o mesmo visitante várias vezes no mesmo dia (F5)
        if (sessionStorage.getItem(sessionKey)) return;

        // 1. Incrementa Total Geral (Mudei para setDoc para criar se não existir)
        await setDoc(statsRef, { active_visitors: increment(1) }, { merge: true });
        
        // 2. Incrementa Stats do Dia
        const dailyRef = doc(db, 'stats_daily', today);
        await setDoc(dailyRef, { 
            date: today,
            visitors: increment(1) 
        }, { merge: true });

        sessionStorage.setItem(sessionKey, 'true');
    } catch (error) { console.warn("Tracker Error", error); }
};

// Salva o Lead e contabiliza a geração
export const trackResumeGenerated = async (data?: ResumeData) => {
    try {
        const today = getTodayStr();
        const dailyRef = doc(db, 'stats_daily', today);

        // 1. Atualiza contadores
        // Importante: setDoc com merge previne erro se o documento 'general' foi deletado
        await setDoc(statsRef, {
            total_resumes: increment(1),
            last_updated: Timestamp.now()
        }, { merge: true });

        // Contabiliza geração no dia
        await setDoc(dailyRef, { 
            date: today,
            resumes: increment(1) 
        }, { merge: true });

        // 2. Salva o LEAD com dados enriquecidos
        if (data) {
            // Extração inteligente da cidade
            let city = "Não informada";
            if (data.personalInfo.address) {
                const parts = data.personalInfo.address.split(',');
                city = parts[0].trim(); 
                if (city.includes('-')) city = city.split('-')[0].trim();
            }

            // Identifica qual modelo foi usado
            const templateUsed = data.style?.template || 'template-modern';

            await addDoc(collection(db, 'leads'), {
                name: data.personalInfo.name,
                email: data.personalInfo.email,
                phone: data.personalInfo.phone,
                age: data.personalInfo.age,
                city: city,
                jobTitle: data.personalInfo.jobTitle,
                template: templateUsed, // Novo campo para o Ranking de Modelos
                generated_at: Timestamp.now(),
                full_data_backup: JSON.stringify(data) 
            });
        }
        console.log("📄 [Tracker] Lead e Template capturados!");

    } catch (error) {
        console.warn("[Tracker] Erro ao salvar lead.", error);
    }
};

export const trackSale = async (amount: number, customerName: string, paymentId: string) => {
    try {
        const today = getTodayStr();
        const dailyRef = doc(db, 'stats_daily', today);

        // 1. Registra a transação
        await addDoc(collection(db, 'transactions'), {
            amount, customer_name: customerName, payment_id: paymentId,
            status: 'approved', payment_method: 'pix', created_at: Timestamp.now()
        });

        // 2. Atualiza totais gerais
        await setDoc(statsRef, { total_revenue: increment(amount) }, { merge: true });

        // 3. Atualiza totais do dia (Para o gráfico de faturamento diário)
        await setDoc(dailyRef, { 
            date: today,
            revenue: increment(amount),
            sales_count: increment(1)
        }, { merge: true });

    } catch (error) { console.error("Tracker Sale Error", error); }
};

// (Opcional) Função genérica para rastrear cliques em botões específicos no futuro
export const trackEvent = async (eventName: string) => {
    try {
        const today = getTodayStr();
        const dailyRef = doc(db, 'stats_daily', today);
        await setDoc(dailyRef, { 
            date: today,
            [`event_${eventName}`]: increment(1) 
        }, { merge: true });
    } catch(e) {}
};

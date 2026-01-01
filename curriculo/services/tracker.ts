import { db } from './firebase';
import { doc, updateDoc, increment, addDoc, collection, setDoc, Timestamp } from 'firebase/firestore';
import { ResumeData } from '../types';

const statsRef = doc(db, 'stats', 'general');

export const trackVisitor = async () => {
    if (typeof window === 'undefined') return;
    try {
        const today = new Date().toISOString().split('T')[0];
        const sessionKey = `visitor_counted_${today}`;
        if (sessionStorage.getItem(sessionKey)) return;

        await updateDoc(statsRef, { active_visitors: increment(1) });
        sessionStorage.setItem(sessionKey, 'true');
    } catch (error) { console.warn("Tracker Error", error); }
};

// --- NOVA FUNÇÃO: Salva os dados do usuário (Lead) ---
export const trackResumeGenerated = async (data?: ResumeData) => {
    try {
        // 1. Atualiza contadores gerais
        await updateDoc(statsRef, {
            total_resumes: increment(1),
            last_updated: Timestamp.now()
        });

        // 2. Se tiver dados, salva o LEAD (Informação valiosa)
        if (data) {
            // Tenta extrair a cidade do endereço (ex: "Rua X, Centro, São Paulo")
            let city = "Não informada";
            if (data.personalInfo.address) {
                const parts = data.personalInfo.address.split(',');
                // Pega a última parte ou penúltima, tentando achar a cidade
                city = parts[parts.length - 1].trim(); 
            }

            await addDoc(collection(db, 'leads'), {
                name: data.personalInfo.name,
                email: data.personalInfo.email,
                phone: data.personalInfo.phone,
                age: data.personalInfo.age,
                city: city,
                jobTitle: data.personalInfo.jobTitle,
                generated_at: Timestamp.now(),
                // Salva o JSON completo se quiser ver a cópia depois
                full_data_backup: JSON.stringify(data) 
            });
        }
        console.log("📄 [Tracker] Lead capturado com sucesso!");

    } catch (error) {
        console.warn("[Tracker] Erro ao salvar lead.", error);
    }
};

export const trackSale = async (amount: number, customerName: string, paymentId: string) => {
    try {
        await addDoc(collection(db, 'transactions'), {
            amount, customer_name: customerName, payment_id: paymentId,
            status: 'approved', payment_method: 'pix', created_at: Timestamp.now()
        });
        await updateDoc(statsRef, { total_revenue: increment(amount) });
    } catch (error) { console.error("Tracker Sale Error", error); }
};

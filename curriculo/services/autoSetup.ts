import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

export const runAutoSetup = async () => {
    // Proteção para não rodar durante o build
    if (typeof window === 'undefined') return;

    try {
        console.log("🔄 [AutoSetup] Verificando conexão...");
        const systemRef = doc(db, 'system', 'config');
        const systemSnap = await getDoc(systemRef);

        if (systemSnap.exists()) {
            console.log("✅ [AutoSetup] Banco conectado e pronto.");
            return;
        }

        console.log("🚀 [AutoSetup] Primeira vez detectada! Criando tabelas...");

        // 1. Cria a tabela de estatísticas
        await setDoc(doc(db, 'stats', 'general'), {
            total_resumes: 0,
            total_revenue: 0,
            active_visitors: 0,
            last_updated: Timestamp.now()
        });

        // 2. Cria a tabela de transações com um exemplo
        await addDoc(collection(db, 'transactions'), {
            customer_name: "Cliente Exemplo",
            amount: 5.00,
            status: "approved",
            payment_method: "pix",
            created_at: Timestamp.now(),
            resume_id: "demo_init"
        });

        // 3. Marca que o sistema foi instalado
        await setDoc(systemRef, {
            initialized: true,
            version: "1.0.0",
            installed_at: Timestamp.now()
        });

        console.log("✨ [AutoSetup] Sucesso! Banco configurado.");

    } catch (error) {
        console.error("❌ [AutoSetup] Erro:", error);
    }
};

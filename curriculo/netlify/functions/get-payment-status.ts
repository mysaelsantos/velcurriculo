import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";
import * as admin from "firebase-admin";

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

// --- INICIALIZAÇÃO DO FIREBASE ADMIN ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin:", error);
  }
}

const db = admin.firestore();

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método não permitido.' }) };

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro configuração MP." }) };
  }

  mercadopago.configure({ access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN! });

  const paymentId = event.queryStringParameters?.paymentId;

  if (!paymentId || isNaN(Number(paymentId))) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: 'ID inválido.' }) };
  }

  try {
    // 1. Consulta o Mercado Pago (Fonte da Verdade)
    const payment = await mercadopago.payment.get(Number(paymentId));
    let frontendStatus = 'pending';
    
    if (payment.body.status === 'approved') {
        frontendStatus = 'succeeded';

        // 2. ATUALIZAÇÃO DO BANCO DE DADOS (CRUCIAL PARA O DASHBOARD)
        // Só atualizamos se o status for aprovado para economizar leituras/escritas
        try {
            const transactionsRef = db.collection('transactions');
            const snapshot = await transactionsRef.where('paymentId', '==', String(paymentId)).limit(1).get();

            if (!snapshot.empty) {
                const docId = snapshot.docs[0].id;
                const currentStatus = snapshot.docs[0].data().status;
                
                // Evita escritas desnecessárias se já estiver pago
                if (currentStatus !== 'paid' && currentStatus !== 'approved') {
                    await transactionsRef.doc(docId).update({
                        status: 'paid',
                        approved_at: admin.firestore.FieldValue.serverTimestamp(),
                        mp_status: payment.body.status
                    });
                    console.log(`[Status] Transação ${paymentId} atualizada para PAID no banco.`);
                }
            } else {
                console.warn(`[Status] Transação ${paymentId} não encontrada no banco para atualização.`);
                // Opcional: Criar o registro se ele não existir (recuperação de falha)
            }
        } catch (dbError) {
            console.error("[Status] Erro ao atualizar banco:", dbError);
        }

    } else if (payment.body.status === 'rejected' || payment.body.status === 'cancelled') {
        frontendStatus = 'failed';
    }
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            status: frontendStatus,
            id: payment.body.id,
            date_created: payment.body.date_created
        }),
    };

  } catch (err) {
    console.error(`[Get Payment Status] Erro: ${(err as Error).message}`);
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro ao verificar status." }) };
  }
};

import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";
import { db, admin } from "./firebase-admin";

// Configurações de Origem (CORS)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

export const handler: Handler = async (event: HandlerEvent) => {
  // Configuração Padrão de Headers
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Tratamento de OPTIONS (Preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Apenas GET é permitido
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método não permitido.' }) };
  }

  // Verifica configuração do Token
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("ERRO: Token MP ausente.");
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro interno de configuração." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  const paymentId = event.queryStringParameters?.paymentId;
  const couponCode = event.queryStringParameters?.coupon;
  const userEmail = event.queryStringParameters?.email?.toLowerCase().trim();

  if (!paymentId || isNaN(Number(paymentId))) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: 'ID do pagamento inválido.' }),
    };
  }

  try {
    // Consulta APENAS o Mercado Pago
    const payment = await mercadopago.payment.get(Number(paymentId));

    let frontendStatus = 'pending';

    // Traduz o status do MP para o Site
    if (payment.body.status === 'approved') {
      frontendStatus = 'succeeded';

      // MARCAR CUPOM COMO USADO apenas quando pagamento for aprovado
      if (couponCode && userEmail) {
        try {
          const couponRef = db.collection('coupons').doc(couponCode);
          const couponSnap = await couponRef.get();

          if (couponSnap.exists) {
            const couponData = couponSnap.data();
            const usedBy = couponData?.usedBy || [];
            const maxUsesPerUser = couponData?.maxUsesPerUser || 1;

            // Contar quantas vezes o usuário já usou
            const userUsageCount = usedBy.filter((email: string) => email === userEmail).length;

            // Só incrementa se o usuário ainda não atingiu o limite
            if (userUsageCount < maxUsesPerUser) {
              await couponRef.update({
                usageCount: admin.firestore.FieldValue.increment(1),
                usedBy: admin.firestore.FieldValue.arrayUnion(userEmail)
              });
              console.log(`✅ Cupom ${couponCode} marcado como USADO por ${userEmail} (Pagamento ${paymentId} aprovado)`);
            } else {
              console.log(`⚠️ Cupom ${couponCode}: Usuário ${userEmail} já atingiu limite de usos`);
            }
          }
        } catch (couponError) {
          // Não falhar se houver erro ao atualizar cupom
          console.error('Erro ao marcar cupom como usado:', couponError);
        }
      }

    } else if (payment.body.status === 'rejected' || payment.body.status === 'cancelled') {
      frontendStatus = 'failed';
    } else if (payment.body.status === 'in_process') {
      frontendStatus = 'pending';
    }

    // Devolve a resposta limpa para o site agir
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: frontendStatus,
        id: payment.body.id,
        date_created: payment.body.date_created
      }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`[Erro Status] ${error.message}`);

    const statusCode = (error as any).status === 404 ? 404 : 500;
    return {
      statusCode: statusCode,
      headers: headers,
      body: JSON.stringify({ message: "Erro ao verificar status." }),
    };
  }
};

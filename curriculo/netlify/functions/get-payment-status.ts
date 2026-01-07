import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";

// URL permitida em produção
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

// Handler principal para verificação de status
const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 1: PORTEIRO DIGITAL (CORS)
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  // HEADERS CORS ESTRITOS
  // Permite acesso apenas se a origem for válida
  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Bloqueio de segurança
  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  // Responde rápido a requisições OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verifica se é GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método não permitido.' }) };
  }

  // Verifica configuração do Token
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("ERRO CRÍTICO: Token do Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN) ausente no .env.");
      return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro interno de configuração." }) };
  }

  // Configura a SDK do Mercado Pago
  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  const paymentId = event.queryStringParameters?.paymentId;

  // 🔒 ETAPA 2: VALIDAÇÃO FORTE
  // Garante que o ID existe e é numérico antes de chamar a API externa
  if (!paymentId || isNaN(Number(paymentId))) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: 'ID do pagamento inválido ou ausente.' }),
    };
  }

  try {
    // Busca informações do pagamento
    const payment = await mercadopago.payment.get(Number(paymentId));

    let frontendStatus = 'pending';
    
    // Mapeia os status do Mercado Pago para o que o frontend espera
    if (payment.body.status === 'approved') {
        frontendStatus = 'succeeded';
    } else if (payment.body.status === 'rejected' || payment.body.status === 'cancelled') {
        frontendStatus = 'failed';
    } else if (payment.body.status === 'in_process') {
        frontendStatus = 'pending';
    }
    
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
    console.error(`[Get Payment Status] Erro: ${error.message}`);
    
    // Diferencia erro de "Não encontrado" (404) de erros do servidor
    const statusCode = (error as any).status === 404 ? 404 : 500;
    const message = statusCode === 404 ? "Pagamento não encontrado." : "Erro ao verificar status.";

    return {
        statusCode: statusCode,
        headers: headers,
        body: JSON.stringify({ message }),
    };
  }
};

export { handler };

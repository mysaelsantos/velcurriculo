import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Método não permitido.' }) };
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro de configuração." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  const paymentId = event.queryStringParameters?.paymentId;

  if (!paymentId || isNaN(Number(paymentId))) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: 'ID inválido.' }),
    };
  }

  try {
    const payment = await mercadopago.payment.get(Number(paymentId));

    let frontendStatus = 'pending';
    
    // Mapeamento simples para o frontend entender
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
    console.error(`[Status Erro] ${error.message}`);
    
    const statusCode = (error as any).status === 404 ? 404 : 500;
    return {
        statusCode: statusCode,
        headers: headers,
        body: JSON.stringify({ message: "Erro ao verificar status." }),
    };
  }
};

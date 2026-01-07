import type { Handler, HandlerEvent } from "@netlify/functions";
// CORREÇÃO: Sintaxe de importação da V1 do MercadoPago
import mercadopago from "mercadopago";

export const handler: Handler = async (event: HandlerEvent) => {
  // Configuração de CORS para permitir requisições do frontend
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
        statusCode: 405,
        headers: headers,
        body: 'Method Not Allowed',
    };
  }

  // CORREÇÃO: Configuração da V1
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ message: "Configuração do servidor incompleta." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  const paymentId = event.queryStringParameters?.paymentId;

  // PROTEÇÃO: Verificar se o paymentId existe E se é um número válido
  if (!paymentId || typeof paymentId !== 'string' || isNaN(Number(paymentId))) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: 'Payment ID is required and must be a number.' }),
    };
  }

  try {
    // CORREÇÃO: Chamada da API da V1
    const payment = await mercadopago.payment.get(Number(paymentId));

    let frontendStatus = 'pending';
    if (payment.body.status === 'approved') { // CORREÇÃO: Acesso ao status na V1
        frontendStatus = 'succeeded';
    }
    // Adicional: Tratamento para falhas explícitas
    else if (payment.body.status === 'rejected' || payment.body.status === 'cancelled') {
        frontendStatus = 'failed';
    }
    
    return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
            status: frontendStatus,
        }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Mercado Pago Error retrieving payment status: ${error.message}`);
    
    // Tratamento para erro 404 (ID não encontrado) vs erro 500 (Erro no servidor)
    const statusCode = (error as any).status === 404 ? 404 : 500;

    return {
        statusCode: statusCode,
        headers: headers,
        body: JSON.stringify({ message: error.message }),
    };
  }
};

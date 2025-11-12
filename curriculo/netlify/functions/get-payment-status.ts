import type { Handler, HandlerEvent } from "@netlify/functions";
// CORREÇÃO: Sintaxe de importação da V1 do MercadoPago
const mercadopago = require("mercadopago");

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
        statusCode: 405,
        headers: { 'Allow': 'GET' },
        body: 'Method Not Allowed',
    };
  }

  // CORREÇÃO: Configuração da V1
  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  const paymentId = event.queryStringParameters?.paymentId;

  if (!paymentId || typeof paymentId !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Payment ID is required.' }),
    };
  }

  try {
    // CORREÇÃO: Chamada da API da V1
    const payment = await mercadopago.payment.get(Number(paymentId));

    let frontendStatus = 'pending';
    if (payment.body.status === 'approved') { // CORREÇÃO: Acesso ao status na V1
        frontendStatus = 'succeeded';
    }
    
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: frontendStatus,
        }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Mercado Pago Error retrieving payment status: ${error.message}`);
    return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: error.message }),
    };
  }
};

module.exports = { handler };

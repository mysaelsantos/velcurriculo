import type { Handler, HandlerEvent } from "@netlify/functions";
// CORREÇÃO: Alterado para a sintaxe CommonJS 'require'
const { MercadoPago } = require("mercadopago");

const client = new MercadoPago({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
        statusCode: 405,
        headers: { 'Allow': 'GET' },
        body: 'Method Not Allowed',
    };
  }

  const paymentId = event.queryStringParameters?.paymentId;

  if (!paymentId || typeof paymentId !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Payment ID is required.' }),
    };
  }

  try {
    const payment = await client.payment.get({ id: Number(paymentId) });

    let frontendStatus = 'pending';
    if (payment.status === 'approved') {
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

// CORREÇÃO: Alterado para a sintaxe CommonJS 'module.exports'
module.exports = { handler };

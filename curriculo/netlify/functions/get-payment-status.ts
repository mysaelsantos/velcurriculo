import type { Handler, HandlerEvent } from "@netlify/functions";
// --- CORREÇÃO: MUDADO PARA REQUIRE ---
const mercadopago = require("mercadopago");

// Configura o Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
        statusCode: 405,
        headers: { 'Allow': 'GET' },
        body: 'Method Not Allowed',
    };
  }

  // Mudamos o parâmetro de 'paymentIntentId' para 'paymentId'
  const paymentId = event.queryStringParameters?.paymentId;

  if (!paymentId || typeof paymentId !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Payment ID is required.' }),
    };
  }

  try {
    // Busca o pagamento na API do Mercado Pago
    const paymentResponse = await mercadopago.payment.get(paymentId);
    const payment = paymentResponse.body;

    // "Traduz" o status do Mercado Pago para o status que o frontend espera
    // O frontend espera 'succeeded'
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

// --- CORREÇÃO: MUDADO PARA MODULE.EXPORTS ---
module.exports = { handler };

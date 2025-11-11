import type { Handler, HandlerEvent } from "@netlify/functions";
// --- CORREÇÃO: Removidas as chaves {} da importação ---
const MercadoPago = require("mercadopago");

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
    // --- CORREÇÃO: Sintaxe V2 para buscar pagamento ---
    const payment = await client.payment.get({ id: Number(paymentId) });

    // "Traduz" o status do Mercado Pago para o status que o frontend espera
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

module.exports = { handler };

import type { Handler, HandlerEvent } from "@netlify/functions";
// Sintaxe de importação da V1 do MercadoPago
const mercadopago = require("mercadopago");

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: 'Method Not Allowed',
    };
  }

  // Configuração da V1
  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  try {
    const body = JSON.parse(event.body || '{}');
    const { isDiscounted } = body;
    const amount = isDiscounted ? 2.50 : 5.00;

    const payment_data = {
      transaction_amount: amount,
      description: 'Download de Currículo Profissional',
      payment_method_id: 'pix',
      date_of_expiration: new Date(Date.now() + 600000).toISOString(),
      payer: {
        email: `pagamento-${Date.now()}@velcurriculo.com`,
      },
    };

    // Chamada da API da V1
    const payment = await mercadopago.payment.create(payment_data);

    if (!payment.body.id || !payment.body.point_of_interaction?.transaction_data) {
        throw new Error('Não foi possível gerar os dados do pagamento Pix.');
    }

    const qrCodeBase64 = payment.body.point_of_interaction.transaction_data.qr_code_base64;
    const copyPasteCode = payment.body.point_of_interaction.transaction_data.qr_code;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: payment.body.id,
        // **** A CORREÇÃO ESTÁ AQUI ****
        // Adicionamos o prefixo de imagem Base64
        qrCodeUrl: `data:image/png;base64,${qrCodeBase64}`,
        copyPasteCode: copyPasteCode,
      }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Mercado Pago Error creating Pix payment: ${error.message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message }),
    };
  }
};

module.exports = { handler };

import type { Handler, HandlerEvent } from "@netlify/functions";
// --- CORREÇÃO: Removidas as chaves {} da importação ---
const MercadoPago = require("mercadopago");

const client = new MercadoPago({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { isDiscounted } = body;
    const amount = isDiscounted ? 2.50 : 5.00; // R$2,50 com desconto, R$5,00 padrão

    const payment_data = {
      transaction_amount: amount,
      description: 'Download de Currículo Profissional',
      payment_method_id: 'pix',
      // Define o tempo de expiração do PIX para 10 minutos
      date_of_expiration: new Date(Date.now() + 600000).toISOString(),
      payer: {
        // E-mail genérico, pois é obrigatório para o PIX no MP
        email: `pagamento-${Date.now()}@velcurriculo.com`,
      },
    };

    // --- CORREÇÃO: Sintaxe V2 para criar pagamento ---
    const payment = await client.payment.create({ body: payment_data });

    if (!payment.id || !payment.point_of_interaction?.transaction_data) {
        throw new Error('Não foi possível gerar os dados do pagamento Pix.');
    }

    const qrCodeBase64 = payment.point_of_interaction.transaction_data.qr_code_base64;
    const copyPasteCode = payment.point_of_interaction.transaction_data.qr_code;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: payment.id,
        // --- CORREÇÃO AQUI: Remover o prefixo duplicado ---
        // O qrCodeBase64 já vem com "data:image/png;base64,"
        qrCodeUrl: qrCodeBase64,
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

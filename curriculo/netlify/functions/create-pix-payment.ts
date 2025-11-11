import type { Handler, HandlerEvent } from "@netlify/functions";
// --- CORREÇÃO: MUDADO PARA REQUIRE ---
const mercadopago = require("mercadopago");

// Configura o Mercado Pago com o Access Token do Netlify
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
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
      // Define o tempo de expiração do PIX para 10 minutos (600 segundos)
      // O seu modal PixModal.tsx também tem um timer de 10 minutos (600 segundos)
      date_of_expiration: new Date(Date.now() + 600000).toISOString(),
      payer: {
        // Um e-mail de pagador é obrigatório para o PIX no Mercado Pago
        // Usamos um genérico já que não coletamos o e-mail do usuário antes do pagto
        email: `pagamento-${Date.now()}@velcurriculo.com`,
      },
    };

    const paymentResponse = await mercadopago.payment.create(payment_data);
    const payment = paymentResponse.body;

    if (!payment.id || !payment.point_of_interaction?.transaction_data) {
        throw new Error('Não foi possível gerar os dados do pagamento Pix.');
    }

    // O Mercado Pago retorna o QR code em Base64
    const qrCodeBase64 = payment.point_of_interaction.transaction_data.qr_code_base64;
    const copyPasteCode = payment.point_of_interaction.transaction_data.qr_code;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Renomeamos 'paymentIntentId' para 'paymentId'
        paymentId: payment.id,
        // O frontend espera uma URL, então formatamos o Base64 como uma Data URL
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

// --- CORREÇÃO: MUDADO PARA MODULE.EXPORTS ---
module.exports = { handler };

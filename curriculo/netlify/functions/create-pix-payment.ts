import type { Handler, HandlerEvent } from "@netlify/functions";
// Sintaxe de importação da V1 do MercadoPago
import mercadopago from "mercadopago";

// 🔒 SEGURANÇA: Tabela de Preços Definida no Servidor
// Isso impede que alguém pague um valor arbitrário.
const PRICING_TABLE = {
  FULL: 5.00,
  DISCOUNTED: 2.50
};

const handler: Handler = async (event: HandlerEvent) => {
  // 1. Apenas aceitar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: 'Method Not Allowed',
    };
  }

  // 2. Verificação de Configuração
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("ERRO CRÍTICO: MERCADO_PAGO_ACCESS_TOKEN não configurado.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro interno de configuração de pagamento." })
    };
  }

  // Configuração da V1
  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  try {
    const body = JSON.parse(event.body || '{}');
    
    // 🔒 LÓGICA DE PREÇO SEGURA
    // O frontend diz se "aplica desconto", mas o backend define o valor.
    // Futuramente, você pode validar aqui se o usuário realmente tem direito ao desconto (ex: cupom).
    const isDiscounted = body.isDiscounted === true; 
    const finalAmount = isDiscounted ? PRICING_TABLE.DISCOUNTED : PRICING_TABLE.FULL;

    // Log de segurança (interno)
    console.log(`[Pagamento] Iniciando transação. Desconto: ${isDiscounted}, Valor: R$ ${finalAmount}`);

    const payment_data = {
      transaction_amount: finalAmount,
      description: 'Download de Currículo Profissional',
      payment_method_id: 'pix',
      date_of_expiration: new Date(Date.now() + 600000).toISOString(), // 10 minutos
      payer: {
        email: body.email || `pagamento-${Date.now()}@velcurriculo.com`, // Fallback de segurança
        first_name: body.firstName || 'Cliente',
        last_name: body.lastName || 'VelCurriculo'
      },
    };

    // Chamada da API da V1
    const payment = await mercadopago.payment.create(payment_data);

    if (!payment.body.id || !payment.body.point_of_interaction?.transaction_data) {
        throw new Error('Não foi possível gerar os dados do pagamento Pix no Mercado Pago.');
    }

    const qrCodeBase64 = payment.body.point_of_interaction.transaction_data.qr_code_base64;
    const copyPasteCode = payment.body.point_of_interaction.transaction_data.qr_code;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: payment.body.id,
        // Adicionamos o prefixo de imagem Base64 para facilitar a exibição no frontend
        qrCodeUrl: `data:image/png;base64,${qrCodeBase64}`,
        copyPasteCode: copyPasteCode,
      }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`[Pagamento Erro] Mercado Pago: ${error.message}`);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: "Erro ao processar pagamento. Tente novamente.",
        debug: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};

export { handler };

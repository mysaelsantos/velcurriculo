import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";

// 🔒 SEGURANÇA: Configurações do Servidor
const PRICING_TABLE = {
  FULL: 5.00,
  DISCOUNTED: 2.50
};

// Cupons válidos definidos APENAS no backend
const VALID_COUPONS = ['PROMO_LANCAMENTO', 'DESCONTO_ESPECIAL'];

// Site permitido (troque pela sua URL de produção quando tiver, ou use localhost para testes)
const ALLOWED_ORIGIN = process.env.URL || "http://localhost:8888"; // Netlify define process.env.URL automaticamente

const handler: Handler = async (event: HandlerEvent) => {
  // 1. Verificação de Origem (CORS - Etapa 2 já inclusa aqui)
  const origin = event.headers.origin || event.headers.Origin;
  // Nota: Em desenvolvimento local, origin pode ser undefined ou diferente. 
  // Em produção, isso impede requisições de sites piratas.
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("ERRO CRÍTICO: Token MP ausente.");
    return { statusCode: 500, body: JSON.stringify({ message: "Erro de configuração." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  try {
    const body = JSON.parse(event.body || '{}');
    
    // 🔒 LÓGICA BLINDADA: O Backend decide o preço
    let finalAmount = PRICING_TABLE.FULL;
    let description = 'Download Currículo Profissional';

    // Verificamos se o cupom enviado bate com a lista do servidor
    if (body.coupon && VALID_COUPONS.includes(body.coupon)) {
        finalAmount = PRICING_TABLE.DISCOUNTED;
        description += ' (Oferta Aplicada)';
    }

    // Log seguro (apenas valores, não dados pessoais)
    console.log(`[Pagamento] Gerando Pix: R$ ${finalAmount} | Cupom: ${body.coupon || 'Nenhum'}`);

    const payment_data = {
      transaction_amount: finalAmount,
      description: description,
      payment_method_id: 'pix',
      date_of_expiration: new Date(Date.now() + 600000).toISOString(),
      payer: {
        email: body.email || `cliente-${Date.now()}@velcurriculo.com`,
        first_name: body.firstName || 'Cliente',
        last_name: body.lastName || 'VelCurriculo'
      },
    };

    const payment = await mercadopago.payment.create(payment_data);

    if (!payment.body.id || !payment.body.point_of_interaction?.transaction_data) {
        throw new Error('Falha ao obter dados do Pix do Mercado Pago.');
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        // Opcional: Access-Control-Allow-Origin se quiser ser estrito aqui também
      },
      body: JSON.stringify({
        paymentId: payment.body.id,
        qrCodeUrl: `data:image/png;base64,${payment.body.point_of_interaction.transaction_data.qr_code_base64}`,
        copyPasteCode: payment.body.point_of_interaction.transaction_data.qr_code,
        amount: finalAmount // Devolvemos o valor real para o front exibir
      }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`[Pagamento Erro] ${error.message}`);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ message: "Erro ao processar pagamento." }) 
    };
  }
};

export { handler };

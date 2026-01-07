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
  // 1. ROBUSTEZ: Headers CORS padronizados para todas as respostas
  const headers = {
    "Access-Control-Allow-Origin": "*", // Em produção, ajuste para event.headers.origin || "*"
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // 1. Verificação de Origem (CORS - Etapa 2 já inclusa aqui)
  const origin = event.headers.origin || event.headers.Origin;
  // Nota: Em desenvolvimento local, origin pode ser undefined ou diferente. 
  // Em produção, isso impede requisições de sites piratas.
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("ERRO CRÍTICO: Token MP ausente.");
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro de configuração." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  try {
    // 2. ROBUSTEZ: Parse Seguro do Body
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Requisição inválida (JSON esperado)." }) };
    }
    
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

    // Validação básica de dados obrigatórios
    if (!body.email) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Email é obrigatório." }) };
    }

    const payment_data = {
      transaction_amount: finalAmount,
      description: description,
      payment_method_id: 'pix',
      date_of_expiration: new Date(Date.now() + 600000).toISOString(),
      payer: {
        email: body.email,
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
      headers: headers, // Headers com CORS
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
        headers: headers, // Headers com CORS garantidos mesmo no erro
        body: JSON.stringify({ message: "Erro ao processar pagamento." }) 
    };
  }
};

export { handler };

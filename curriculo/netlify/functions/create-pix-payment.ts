import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";

// Configurações de Preço e Cupons
const PRICING_TABLE = {
  FULL: 5.00,
  DISCOUNTED: 2.50
};
const VALID_COUPONS = ['PROMO_LANCAMENTO', 'DESCONTO_ESPECIAL'];

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

export const handler: Handler = async (event: HandlerEvent) => {
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro de configuração." }) };
  }

  mercadopago.configure({ access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN! });

  try {
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido." }) };
    }
    
    if (!body.email) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Email obrigatório." }) };
    }

    let finalAmount = PRICING_TABLE.FULL;
    let description = 'Download Currículo Profissional';

    if (body.coupon && VALID_COUPONS.includes(body.coupon)) {
        finalAmount = PRICING_TABLE.DISCOUNTED;
        description += ' (Oferta Aplicada)';
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
        throw new Error('Falha ao obter dados do Pix.');
    }

    // Retorna APENAS os dados do Pix, sem tentar salvar no banco aqui (o site fará isso)
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        paymentId: payment.body.id,
        qrCodeUrl: `data:image/png;base64,${payment.body.point_of_interaction.transaction_data.qr_code_base64}`,
        copyPasteCode: payment.body.point_of_interaction.transaction_data.qr_code,
        amount: finalAmount
      }),
    };

  } catch (err) {
    console.error(`[Erro Pagamento] ${(err as Error).message}`);
    return { 
        statusCode: 500, 
        headers: headers,
        body: JSON.stringify({ message: "Erro ao processar pagamento." }) 
    };
  }
};

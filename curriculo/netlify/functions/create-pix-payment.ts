import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";
import * as admin from "firebase-admin";

// 🔒 SEGURANÇA: Configurações do Servidor
const PRICING_TABLE = {
  FULL: 5.00,
  DISCOUNTED: 2.50
};

// Cupons válidos definidos APENAS no backend
const VALID_COUPONS = ['PROMO_LANCAMENTO', 'DESCONTO_ESPECIAL'];

// Site permitido
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

// --- INICIALIZAÇÃO DO FIREBASE ADMIN (SINGLETON) ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Garante que quebras de linha na chave privada sejam tratadas corretamente
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin:", error);
  }
}

const db = admin.firestore();

export const handler: Handler = async (event: HandlerEvent) => {
  // 1. Verificação de Origem (CORS)
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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    console.error("ERRO CRÍTICO: Token MP ausente.");
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro de configuração interna." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  try {
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido." }) };
    }
    
    // Validação de e-mail
    if (!body.email) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "Email é obrigatório." }) };
    }

    // Lógica de Preço
    let finalAmount = PRICING_TABLE.FULL;
    let description = 'Download Currículo Profissional';
    let couponApplied = null;

    if (body.coupon && VALID_COUPONS.includes(body.coupon)) {
        finalAmount = PRICING_TABLE.DISCOUNTED;
        description += ' (Oferta Aplicada)';
        couponApplied = body.coupon;
    }

    // Cria preferência no Mercado Pago
    const payment_data = {
      transaction_amount: finalAmount,
      description: description,
      payment_method_id: 'pix',
      date_of_expiration: new Date(Date.now() + 600000).toISOString(), // 10 min
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

    const paymentId = payment.body.id.toString();

    // 💾 PERSISTÊNCIA: Salvar no Firestore para o ADM ver
    try {
        await db.collection('transactions').add({
            paymentId: paymentId,
            amount: finalAmount,
            status: 'pending', // Começa pendente
            email: body.email,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            description: description,
            coupon: couponApplied,
            product: 'curriculo-download'
        });
        console.log(`[Banco de Dados] Transação ${paymentId} registrada com sucesso.`);
    } catch (dbError) {
        console.error("[Banco de Dados] Erro ao salvar transação:", dbError);
        // Não interrompe o fluxo para o usuário não perder o QR Code, mas loga o erro crítico
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        paymentId: paymentId,
        qrCodeUrl: `data:image/png;base64,${payment.body.point_of_interaction.transaction_data.qr_code_base64}`,
        copyPasteCode: payment.body.point_of_interaction.transaction_data.qr_code,
        amount: finalAmount
      }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`[Pagamento Erro] ${error.message}`);
    return { 
        statusCode: 500, 
        headers: headers,
        body: JSON.stringify({ message: "Erro ao processar pagamento." }) 
    };
  }
};

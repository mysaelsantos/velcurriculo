import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";
import { db, admin } from "./firebase-admin";

// Preço base
const BASE_PRICE = 5.00;

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

// Interface do cupom no Firestore
interface CouponData {
  type: 'fixed' | 'percentage';
  value: number;
  maxUses: number;
  usageCount: number;
  isActive: boolean;
  usedBy?: string[];
}

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

    let finalAmount = BASE_PRICE;
    let description = 'Download Currículo Profissional';
    const userEmail = body.email.toLowerCase().trim();

    // Validar cupom se fornecido
    if (body.coupon && typeof body.coupon === 'string') {
      const couponCode = body.coupon.toUpperCase().trim();

      try {
        const couponRef = db.collection('coupons').doc(couponCode);
        const couponSnap = await couponRef.get();

        if (couponSnap.exists) {
          const couponData = couponSnap.data() as CouponData;

          // Verificar se o cupom está ativo
          if (couponData.isActive) {
            // Verificar limite de usos
            if (couponData.usageCount < couponData.maxUses) {
              // Verificar se o email já usou este cupom (1 uso por usuário)
              const usedBy = couponData.usedBy || [];
              if (!usedBy.includes(userEmail)) {
                // Cupom válido - calcular desconto
                let discount = 0;

                if (couponData.type === 'fixed') {
                  discount = Math.min(couponData.value, BASE_PRICE - 0.01);
                } else if (couponData.type === 'percentage') {
                  discount = BASE_PRICE * (couponData.value / 100);
                  discount = Math.min(discount, BASE_PRICE - 0.01);
                }

                finalAmount = Math.max(0.01, BASE_PRICE - discount);
                description += ` (Cupom ${couponCode} aplicado)`;

                // NÃO marcar cupom como usado aqui!
                // O cupom só será marcado como usado quando o pagamento for CONFIRMADO
                // Isso será feito em get-payment-status.ts

                console.log(`✅ Cupom ${couponCode} validado para ${userEmail}. Desconto: R$${discount.toFixed(2)} (Aguardando pagamento)`);
              } else {
                console.log(`⚠️ Cupom ${couponCode}: Email ${userEmail} já utilizou este cupom`);
              }
            } else {
              console.log(`⚠️ Cupom ${couponCode}: Limite de usos atingido`);
            }
          } else {
            console.log(`⚠️ Cupom ${couponCode}: Cupom não está ativo`);
          }
        } else {
          console.log(`⚠️ Cupom ${body.coupon}: Não encontrado`);
        }
      } catch (couponError) {
        // Se houver erro ao validar cupom (ex: Firebase não configurado), continua sem desconto
        console.error('Erro ao validar cupom:', couponError);
      }
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

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        paymentId: payment.body.id,
        qrCodeUrl: `data:image/png;base64,${payment.body.point_of_interaction.transaction_data.qr_code_base64}`,
        copyPasteCode: payment.body.point_of_interaction.transaction_data.qr_code,
        amount: finalAmount,
        // Retornar cupom e email para rastrear uso após confirmação
        couponCode: body.coupon ? body.coupon.toUpperCase().trim() : null,
        userEmail: userEmail
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

import type { Handler, HandlerEvent } from "@netlify/functions";
import mercadopago from "mercadopago";

// 🔒 SEGURANÇA: Configurações do Servidor
// (Mantemos a estrutura original)

const handler: Handler = async (event: HandlerEvent) => {
  // 1. ROBUSTEZ: Headers CORS em todas as respostas
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verificação de método
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  // CORREÇÃO: Configuração da V1
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error("ERRO CRÍTICO: Token MP ausente.");
      return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro de configuração." }) };
  }

  mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  });

  const paymentId = event.queryStringParameters?.paymentId;

  // 2. ROBUSTEZ: Validação forte do ID (evita crash da lib com NaN)
  if (!paymentId || typeof paymentId !== 'string' || isNaN(Number(paymentId))) {
    return {
      statusCode: 400,
      headers: headers,
      body: JSON.stringify({ message: 'Payment ID is required and must be a valid number.' }),
    };
  }

  try {
    // CORREÇÃO: Chamada da API da V1
    const payment = await mercadopago.payment.get(Number(paymentId));

    let frontendStatus = 'pending';
    if (payment.body.status === 'approved') { // CORREÇÃO: Acesso ao status na V1
        frontendStatus = 'succeeded';
    }
    // Adicional: Tratamento para falhas explícitas
    else if (payment.body.status === 'rejected' || payment.body.status === 'cancelled') {
        frontendStatus = 'failed';
    }
    
    return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
            status: frontendStatus,
        }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`[Pagamento Status] Erro: ${error.message}`);
    
    // Tratamento para erro 404 (ID não encontrado) vs erro 500 (Erro no servidor)
    const statusCode = (error as any).status === 404 ? 404 : 500;

    return {
        statusCode: statusCode,
        headers: headers,
        body: JSON.stringify({ message: "Erro ao verificar status do pagamento." }),
    };
  }
};

export { handler };

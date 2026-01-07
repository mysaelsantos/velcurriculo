import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Defina a URL do seu frontend em produção
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar de retry (mantida igual)
const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha API.");
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 && i < maxTries - 1) {
         await sleep(Math.pow(2, i + 1) * 1000); 
         continue;
      }
      throw new Error(`Status ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if (i < maxTries - 1) await sleep(1000);
    }
  }
  throw lastError;
};

const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 2: PORTEIRO DIGITAL (CORS)
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  // Headers estritos: responde apenas para a origem permitida
  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Bloqueio de segurança em Produção
  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     console.warn(`[analyze-pdf] Bloqueio de origem não autorizada: ${origin}`);
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  // Tratamento de OPTIONS (Pre-flight)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ message: "Chave ausente." }) };

  try {
    const { fullText } = JSON.parse(event.body || '{}');
    if (!fullText) return { statusCode: 400, headers, body: JSON.stringify({ message: "Texto vazio." }) };

    // Limpeza de caracteres de controle
    const safeText = fullText.substring(0, 30000).replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // 🔒 SEGURANÇA: Envelopamento do texto para evitar Prompt Injection
    const prompt = `
    Analise o texto delimitado por três aspas abaixo e extraia as experiências profissionais.
    Texto da Carteira de Trabalho:
    """
    ${safeText}
    """
    Retorne APENAS um JSON válido neste formato: {"experiences": [{"company": "Nome", "jobTitle": "Cargo", "location": "Cidade - UF", "startDate": "MM/AAAA", "endDate": "MM/AAAA"}]}. Se a data fim não existir, use "Atual".
    `;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }], // Enviamos tudo junto envelopado
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    };

    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    let jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonString) throw new Error("IA retornou vazio.");

    // CORREÇÃO: Extração robusta de JSON usando Regex
    // Busca pelo primeiro '{' e o último '}' para ignorar textos extras da IA
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    } else {
        // Fallback: limpeza simples caso o Regex falhe
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    return {
      statusCode: 200,
      headers: headers,
      body: jsonString,
    };

  } catch (error) {
    const err = error as Error;
    // 🔒 PRIVACIDADE: Logamos apenas a mensagem, nunca o objeto completo
    console.error("[analyze-pdf] Erro:", err.message);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ message: "Erro ao analisar PDF." }) };
  }
};

export { handler };

import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Defina a URL do seu frontend em produção
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar de retry (mantida original)
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

export const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 2: PORTEIRO DIGITAL (CORS) e ROBUSTEZ
  const origin = event.headers.origin || event.headers.Origin;
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1");

  // Headers padrão para permitir CORS em todas as respostas (erro ou sucesso)
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Verificação de origem para produção
  if (process.env.NODE_ENV !== 'development' && origin !== ALLOWED_ORIGIN && !isLocalhost) {
     // Em produção, bloqueia se a origem não for a esperada
     // return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden Access" }) };
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ message: "Chave ausente." }) };

  try {
    // 1. ROBUSTEZ: Parse seguro do corpo da requisição
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido no corpo da requisição." }) };
    }

    const { fullText } = body;
    if (!fullText) return { statusCode: 400, headers, body: JSON.stringify({ message: "Texto vazio." }) };

    // Limpeza de caracteres de controle
    // 2. SEGURANÇA: Sanitização contra Prompt Injection (substitui aspas triplas)
    const safeText = fullText
      .substring(0, 30000)
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
      .replace(/"""/g, "'''");

    // 🔒 SEGURANÇA: Envelopamento do texto
    const prompt = `
    Analise o currículo delimitado por três aspas abaixo.
    Texto do Currículo:
    """
    ${safeText}
    """
    Extraia os dados em JSON estrito seguindo esta estrutura: { "personalInfo": {...}, "summary": "...", "experiences": [...], "education": [...], "courses": [...], "languages": [...], "skills": [...] }.
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
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    } else {
        // Fallback: limpeza simples caso o Regex falhe
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    // 3. ROBUSTEZ: Validação final se é um JSON válido antes de retornar
    try {
      JSON.parse(jsonString);
    } catch (e) {
      console.error("A IA retornou um JSON inválido:", jsonString);
      throw new Error("Falha na formatação da resposta da IA.");
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

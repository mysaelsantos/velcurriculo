import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Defina a URL do seu frontend em produção
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha API");
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429 && i < maxTries - 1) {
         await sleep(Math.pow(2, i + 1) * 1000); 
         continue;
      }
      throw new Error(`Status ${response.status}`);
    } catch (e) {
      lastError = e as Error;
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

  // Se quiser ser muito estrito (cuidado em localhost):
  if (process.env.NODE_ENV !== 'development' && origin !== ALLOWED_ORIGIN && !isLocalhost) {
      // return { statusCode: 403, headers, body: "Forbidden" }; // Opcional: descomentar para bloquear
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };
  
  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ message: "Chave ausente." }) };

  try {
    // PROTEÇÃO: Parse seguro do corpo da requisição
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido no corpo da requisição." }) };
    }

    const { fullText } = body;
    if (!fullText) return { statusCode: 400, headers, body: JSON.stringify({ message: "Texto vazio." }) };

    // Limpeza de caracteres e PROTEÇÃO CONTRA PROMPT INJECTION
    // Substituímos aspas triplas (""") por aspas simples (''') para não quebrar o prompt
    const safeText = fullText
        .substring(0, 30000)
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .replace(/"""/g, "'''");

    // 🔒 SEGURANÇA: Envelopamento com aspas triplas
    const prompt = `
    Analise o currículo delimitado por três aspas abaixo.
    Texto do Currículo:
    """
    ${safeText}
    """
    Extraia os dados em JSON estrito seguindo esta estrutura: { "personalInfo": {...}, "summary": "...", "experiences": [...], "education": [...], "courses": [...], "languages": [...], "skills": [...] }.
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    };

    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    let jsonContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!jsonContent) throw new Error("IA retornou vazio");

    // BLINDAGEM: Extração robusta de JSON (ignora conversas da IA)
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonContent = jsonMatch[0];
    } else {
        // Fallback original
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    // Validação final: Garantir que é um JSON válido antes de enviar
    try {
        JSON.parse(jsonContent);
    } catch (e) {
        console.error("A IA retornou um JSON inválido:", jsonContent);
        throw new Error("Falha na formatação da resposta da IA.");
    }

    return {
      statusCode: 200,
      headers: headers, // Usando os headers com CORS
      body: jsonContent,
    };

  } catch (error) {
    const err = error as Error;
    // 🔒 PRIVACIDADE: Logamos apenas a mensagem
    console.error("[analyze-resume] Erro:", err.message);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ message: "Erro ao processar currículo." }) };
  }
};

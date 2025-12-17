import type { Handler, HandlerEvent } from "@netlify/functions";

// REMOVIDO: import fetch from 'node-fetch';

const API_KEY = process.env.GEMINI_API_KEY;
// CORREÇÃO FINAL: Usando o modelo confirmado na sua lista
const MODEL_NAME = "gemini-2.0-flash"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (response.status === 429) {
        console.warn(`Tentativa ${i + 1}/${maxTries} falhou: Erro 429 (Resource Exhausted).`);
        lastError = new Error("RESOURCE_EXHAUSTED");
        if (i < maxTries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
          await sleep(delay);
          continue; 
        }
      } else {
        console.error(`Tentativa ${i + 1} falhou com status ${response.status}.`);
        const errorBody = await response.json().catch(() => ({}));
        // @ts-ignore
        const errorMessage = errorBody.message || errorBody.error?.message || `Erro da API: ${response.statusText}`;
        lastError = new Error(errorMessage);
        break; 
      }
    } catch (fetchError) {
      console.error(`Tentativa ${i + 1} falhou com erro de rede:`, fetchError);
      lastError = fetchError as Error;
      if (i < maxTries - 1) await sleep(1000);
    }
  }
  throw lastError;
};

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  console.log(`[enhance-text] Iniciando função. Modelo: ${MODEL_NAME}`);
  if (!API_KEY) {
    console.error("[enhance-text] ERRO CRÍTICO: GEMINI_API_KEY não encontrada.");
    return { statusCode: 500, body: JSON.stringify({ message: "Configuração de servidor inválida." }) };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Prompt é obrigatório." }) };
    }

    const payload = {
      contents: [
        { role: "user", parts: [{ text: "Você é um especialista em RH. Reescreva o texto para ser profissional e impactante. Apenas o texto reescrito:" }] },
        { role: "model", parts: [{ text: "Entendido." }] },
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.9, topK: 1, topP: 1, maxOutputTokens: 2048,
      },
    };

    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error("[enhance-text] Resposta inesperada:", JSON.stringify(result));
      throw new Error("A API da IA retornou uma resposta inválida.");
    }

    const text = result.candidates[0].content.parts[0].text;
    console.log("[enhance-text] Sucesso!");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };

  } catch (error) {
    const err = error as Error;
    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        body: JSON.stringify({ message: "Muitas requisições. Tente novamente em 1 minuto." })
      };
    }
    console.error("[enhance-text] Erro:", err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message || "Falha na IA." }) };
  }
};

export { handler };

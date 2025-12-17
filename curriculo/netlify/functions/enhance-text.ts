import type { Handler, HandlerEvent } from "@netlify/functions";

// REMOVIDO: import fetch from 'node-fetch'; 
// O Node.js 18+ (padrão do Netlify) já possui 'fetch' nativo. 
// Remover isso evita erros de "require is not defined" ou conflitos de ESM/CommonJS.

const API_KEY = process.env.GEMINI_API_KEY;

// ALTERADO: Usando o modelo estável 1.5, pois o 2.0 pode estar instável ou restrito.
const MODEL_NAME = "gemini-1.5-flash"; 

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- LÓGICA DE TENTATIVAS (MANTIDA) ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      // Usando o fetch nativo global
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
// --- FIM DA LÓGICA DE TENTATIVAS ---

const handler: Handler = async (event: HandlerEvent) => {
  // 1. Verificação de Método
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. DIAGNÓSTICO DE API KEY (Novo)
  console.log(`[enhance-text] Iniciando função. Modelo: ${MODEL_NAME}`);
  if (!API_KEY) {
    console.error("[enhance-text] ERRO CRÍTICO: GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: "Configuração de servidor inválida (API Key ausente)." }) 
    };
  } else {
    // Log de segurança: mostra apenas os 4 primeiros caracteres para confirmar que leu a chave correta
    console.log(`[enhance-text] API Key carregada com sucesso. Inicia com: ${API_KEY.substring(0, 4)}...`);
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Prompt é obrigatório." }) };
    }

    const payload = {
      contents: [
        { role: "user", parts: [{ text: "Você é um especialista em RH que cria currículos. Sua tarefa é reescrever o texto fornecido para ser mais profissional e impactante. Responda apenas com o texto reescrito, sem introduções ou comentários." }] },
        { role: "model", parts: [{ text: "Entendido. Por favor, forneça o texto que devo reescrever." }] },
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.9, topK: 1, topP: 1, maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    console.log("[enhance-text] Enviando requisição para o Gemini...");

    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    
    // Verificação robusta da resposta
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error("[enhance-text] Resposta inesperada da API:", JSON.stringify(result));
      throw new Error("A API da IA retornou uma resposta em formato inesperado.");
    }

    const text = result.candidates[0].content.parts[0].text;
    console.log("[enhance-text] Sucesso! Texto gerado.");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };

  } catch (error) {
    const err = error as Error;
    
    // Tratamento de erro 429
    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        body: JSON.stringify({ message: "Muitas requisições. Por favor, tente novamente em 1 minuto." })
      };
    }

    console.error("[enhance-text] Erro final:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: err.message || "Falha ao aprimorar o texto com a IA." }) 
    };
  }
};

export { handler };

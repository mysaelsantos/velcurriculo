import type { Handler, HandlerEvent } from "@netlify/functions";

// Configuração para o modelo
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Defina a URL do seu frontend em produção
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

// 🔒 SEGURANÇA: Limite de caracteres para evitar abuso e custos altos
const MAX_INPUT_LENGTH = 2500; 

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 3) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) return response;

      // Tratamento específico para Rate Limit (Erro 429)
      if (response.status === 429) {
        console.warn(`[enhance-text] Tentativa ${i + 1}/${maxTries} falhou: 429 Resource Exhausted.`);
        lastError = new Error("RESOURCE_EXHAUSTED");
        if (i < maxTries - 1) {
          const delay = Math.pow(2, i + 1) * 1000;
          await sleep(delay);
          continue; 
        }
      } else {
        const errorBody = await response.json().catch(() => ({}));
        // @ts-ignore
        const msg = errorBody.message || errorBody.error?.message || response.statusText;
        console.error(`[enhance-text] Erro API: ${msg}`);
        lastError = new Error(msg);
        break; 
      }
    } catch (fetchError) {
      console.error(`[enhance-text] Erro de rede na tentativa ${i + 1}:`, fetchError);
      lastError = fetchError as Error;
      if (i < maxTries - 1) await sleep(1000);
    }
  }
  throw lastError;
};

export const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 2: PORTEIRO DIGITAL (CORS)
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  // Headers padrão para permitir CORS apenas para origens permitidas
  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Bloqueio de segurança para origens não autorizadas
  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
    console.warn(`[Bloqueio Enhance] Origem não permitida: ${origin}`);
    return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  if (!API_KEY) {
    console.error("[enhance-text] ERRO: Chave API não configurada.");
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro interno de configuração." }) };
  }

  try {
    // 1. ROBUSTEZ: Parse Seguro
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido." }) };
    }

    let { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "Texto para aprimoramento é obrigatório." }) };
    }

    // 🔒 SEGURANÇA: Validação de Tamanho
    if (prompt.length > MAX_INPUT_LENGTH) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ message: `O texto é muito longo (${prompt.length} caracteres). O limite é ${MAX_INPUT_LENGTH}.` }) 
      };
    }

    // 🔒 SEGURANÇA: Sanitização e Proteção contra Prompt Injection
    // Removemos caracteres de controle E substituímos aspas triplas
    const sanitizedPrompt = prompt
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .replace(/"""/g, "'''"); 
    
    // Instrução defensiva para a IA
    const userMessage = `
    Aprimore o texto abaixo para um currículo profissional.
    Texto Original:
    """
    ${sanitizedPrompt}
    """
    SAÍDA OBRIGATÓRIA: Retorne APENAS o texto aprimorado. NÃO coloque aspas, NÃO coloque prefixos como "Texto Polido:", NÃO use formatação Markdown (negrito/itálico). Apenas o texto puro.
    `;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: "Atue como um Consultor de Carreira Sênior. Sua tarefa é reescrever textos de currículos. REGRAS RÍGIDAS: (1) NÃO invente fatos; (2) Mantenha o tamanho próximo do original; (3) Use voz ativa e profissional; (4) Se o texto for ofensivo ou sem sentido, retorne o original intacto; (5) RETORNE SOMENTE O TEXTO FINAL, sem introduções, sem aspas e sem explicações." }] },
        { role: "model", parts: [{ text: "Entendido. Retornarei estritamente o texto reescrito, sem nenhum comentário ou formatação adicional." }] },
        { role: "user", parts: [{ text: userMessage }] }
      ],
      generationConfig: {
        temperature: 0.3, // Reduzido levemente para evitar criatividade na formatação
        topK: 40, 
        topP: 0.95, 
        maxOutputTokens: 2048,
      },
    };

    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    
    if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("A IA não retornou um texto válido.");
    }

    let text = result.candidates[0].content.parts[0].text;

    // Limpeza final de segurança no código (caso a IA falhe levemente)
    text = text.trim();
    // Remove aspas do início e fim se a IA insistir em colocar
    if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1);
    }
    // Remove prefixos comuns de alucinação
    text = text.replace(/^Texto Polido:\s*/i, "").replace(/^Revisão:\s*/i, "").replace(/^\*\*/, "").replace(/\*\*$/, "");

    return {
      statusCode: 200,
      headers, // Headers padronizados
      body: JSON.stringify({ text }),
    };

  } catch (error) {
    const err = error as Error;
    console.error("[enhance-text] Falha:", err.message);

    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ message: "Muitas solicitações no momento. Tente novamente em 1 minuto." })
      };
    }

    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ message: "Não foi possível processar o texto no momento." }) 
    };
  }
};

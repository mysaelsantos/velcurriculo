import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.GEMINI_API_KEY;
// REVERTIDO: Mantendo a versão original conforme solicitado
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Defina a URL do seu frontend em produção
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar de retry completa para lidar com instabilidades da API
const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha API.");
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      // Se for erro de "Muitas requisições" (429), espera um pouco mais (backoff exponencial)
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
  // 🔒 ETAPA 1: PORTEIRO DIGITAL (CORS) e CONFIGURAÇÃO
  const origin = event.headers.origin || event.headers.Origin;
  const isLocalhost = origin?.includes("localhost") || origin?.includes("127.0.0.1");

  // Headers padrão para permitir CORS em todas as respostas
  const headers = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Verificação de origem para produção (Segurança extra)
  if (process.env.NODE_ENV !== 'development' && origin !== ALLOWED_ORIGIN && !isLocalhost) {
     // Opcional: Descomentar abaixo para bloquear acessos externos rigorosamente
     // return { statusCode: 403, headers, body: JSON.stringify({ message: "Acesso Negado." }) };
  }

  // Responde imediatamente a requisições OPTIONS (pre-flight do navegador)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // Apenas aceita POST
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ message: "Chave de API não configurada." }) };

  try {
    // 🔒 ETAPA 2: PARSE E SANITIZAÇÃO
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido." }) };
    }

    const { fullText } = body;
    if (!fullText) return { statusCode: 400, headers, body: JSON.stringify({ message: "Texto do currículo vazio." }) };

    // Limpeza de segurança: remove caracteres estranhos e evita injeção de prompt
    const safeText = fullText
      .substring(0, 30000) // Limita tamanho para não estourar tokens
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove caracteres de controle
      .replace(/"""/g, "'''"); // Substitui aspas triplas para não quebrar o prompt

    // 🔒 ETAPA 3: CONSTRUÇÃO DO PROMPT
    const prompt = `
    Analise o currículo delimitado por três aspas abaixo.
    Texto do Currículo:
    """
    ${safeText}
    """
    Extraia os dados em JSON estrito seguindo esta estrutura exata: { "personalInfo": {...}, "summary": "...", "experiences": [...], "education": [...], "courses": [...], "languages": [...], "skills": [...] }.
    Não inclua blocos de código markdown (como \`\`\`json), retorne apenas o JSON cru.
    `;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    };

    // Chamada à API com Retry automático
    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    let jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonString) throw new Error("A IA retornou uma resposta vazia.");

    // Tratamento robusto para extrair apenas o JSON, caso a IA adicione texto extra
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    } else {
        // Fallback: tenta limpar crases de markdown
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    // Validação final: garante que é um JSON válido antes de enviar ao front
    try {
      JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON inválido retornado pela IA:", jsonString);
      throw new Error("A IA não gerou um JSON válido.");
    }

    return {
      statusCode: 200,
      headers: headers,
      body: jsonString,
    };

  } catch (error) {
    const err = error as Error;
    // Logamos o erro no servidor, mas retornamos mensagem genérica ao usuário
    console.error("[analyze-resume-pdf] Erro:", err.message);
    return { statusCode: 500, headers: headers, body: JSON.stringify({ message: "Erro ao processar o currículo." }) };
  }
};

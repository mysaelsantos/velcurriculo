import type { Handler, HandlerEvent } from "@netlify/functions";

// CONFIGURAÇÃO
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// URL permitida (Adicionada Segurança CORS)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar de retry (Lógica detalhada original mantida)
const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) return response;

      if (response.status === 429) {
        console.warn(`[suggest-skills] Tentativa ${i + 1}/${maxTries} falhou: 429 Resource Exhausted.`);
        lastError = new Error("RESOURCE_EXHAUSTED");
        if (i < maxTries - 1) {
          const delay = Math.pow(2, i + 1) * 1000;
          await sleep(delay);
          continue; 
        }
      } else {
        console.error(`[suggest-skills] Tentativa ${i + 1} falhou: Status ${response.status}.`);
        const errorBody = await response.json().catch(() => ({}));
        // @ts-ignore
        const msg = errorBody.message || errorBody.error?.message || response.statusText;
        lastError = new Error(msg);
        break; 
      }
    } catch (fetchError) {
      console.error(`[suggest-skills] Erro de rede na tentativa ${i + 1}:`, fetchError);
      lastError = fetchError as Error;
      if (i < maxTries - 1) await sleep(1000);
    }
  }
  throw lastError;
};

export const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 1: PORTEIRO DIGITAL (CORS)
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  // Headers de CORS dinâmicos (Permite apenas a origem correta)
  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Verificação de segurança em Produção ATIVADA
  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     console.warn(`[Bloqueio Skills] Origem não permitida: ${origin}`);
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Acesso Negado." }) };
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  
  if (!API_KEY) {
    console.error("[suggest-skills] ERRO: Chave API não configurada.");
    return { statusCode: 500, headers, body: JSON.stringify({ message: "Erro interno de configuração." }) };
  }

  try {
    // 🔒 ETAPA 2: PARSE E SANITIZAÇÃO
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON de entrada inválido." }) };
    }

    const { jobTitle, experience } = body;
    if (!jobTitle) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "O cargo (jobTitle) é obrigatório." }) };
    }

    // Função de limpeza profunda (Adicionada remoção de caracteres de controle)
    const cleanString = (str: any) => String(str)
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove caracteres invisíveis
        .replace(/"""/g, "'''"); // Evita injeção de prompt

    const safeJobTitle = cleanString(jobTitle);
    const safeExperience = experience ? cleanString(experience) : "";

    const systemPrompt = `Você é um especialista em Recrutamento e Seleção.`;
    const userPrompt = `Com base no cargo de "${safeJobTitle}" e na seguinte descrição de experiência profissional: "${safeExperience}", sugira uma lista de 8 habilidades e competências relevantes (incluindo técnicas e comportamentais). Retorne apenas a lista de habilidades, separadas por vírgula. Exemplo: Liderança, Comunicação, React, Gestão de Projetos, Proatividade, Git, Scrum, Trabalho em Equipe`;

    // Estrutura de Chat com SAFETY SETTINGS RESTAURADAS
    const payload = {
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Entendido." }] },
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048,
      },
      // Filtros de segurança originais (Restaurados)
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };
    
    // Chamada com Retry Automático
    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();

    if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
      console.error("[suggest-skills] Resposta vazia ou bloqueada:", JSON.stringify(result));
      throw new Error("A API da IA não retornou sugestões válidas.");
    }

    let skillsText = result.candidates[0].content.parts[0].text;
    
    // Limpeza da resposta da IA
    skillsText = skillsText
        .replace(/\*\*/g, '') // Remove negrito markdown
        .replace(/\*/g, '')   // Remove bullets markdown
        .replace(/\./g, '');  // Remove ponto final
    
    // Processamento do array final
    const skills = skillsText
      .split(/,|\n/) // Aceita vírgula ou nova linha como separador
      .map((skill: string) => skill.trim())
      .filter((s: string) => s.length > 2 && !s.includes(':') && !s.toLowerCase().includes('lista'));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ skills }),
    };

  } catch (error) {
    const err = error as Error;
    // Retorno amigável se a API estiver sobrecarregada
    if (err.message === "RESOURCE_EXHAUSTED" || err.message.includes("429")) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ message: "O sistema está com alta demanda. Tente novamente em alguns segundos." })
      };
    }
    
    console.error("[suggest-skills] Erro crítico:", err.message);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ message: "Não foi possível gerar sugestões no momento." }) 
    };
  }
};

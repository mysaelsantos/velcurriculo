import type { Handler, HandlerEvent } from "@netlify/functions";

// CONFIGURAÇÃO IGUAL AO ARQUIVO FUNCIONAL (enhance-text.ts)
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- LÓGICA DE TENTATIVAS (IDÊNTICA AO FUNCIONAL) ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      // Usando fetch nativo do Node 18+ (sem node-fetch)
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

const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 2: PORTEIRO DIGITAL (CORS)
  const origin = event.headers.origin || event.headers.Origin;
  // Se quiser ser muito estrito (cuidado em localhost):
  // const ALLOWED = "https://velcurriculo.com.br";
  // if (origin && !origin.includes("localhost") && origin !== ALLOWED) return { statusCode: 403, body: "Forbidden" };

  // Headers de CORS para garantir acesso
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

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
    const { jobTitle, experience } = JSON.parse(event.body || '{}');
    if (!jobTitle) {
      return { statusCode: 400, headers, body: JSON.stringify({ message: "jobTitle é obrigatório." }) };
    }

    const systemPrompt = `Você é um especialista em Recrutamento e Seleção.`;
    const userPrompt = `Com base no cargo de "${jobTitle}" e na seguinte descrição de experiência profissional: "${experience}", sugira uma lista de 8 habilidades e competências relevantes (incluindo técnicas e comportamentais). Retorne apenas a lista de habilidades, separadas por vírgula. Exemplo: Liderança, Comunicação, React, Gestão de Projetos, Proatividade, Git, Scrum, Trabalho em Equipe`;

    // ESTRUTURA IGUAL AO ENHANCE-TEXT (Chat Pattern)
    const payload = {
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Entendido." }] },
        { role: "user", parts: [{ text: userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };
    
    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();

    if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
      console.error("[suggest-skills] Resposta inválida da IA:", JSON.stringify(result));
      throw new Error("A API da IA retornou uma resposta inválida.");
    }

    let skillsText = result.candidates[0].content.parts[0].text;
    
    // BLINDAGEM: Limpeza de formatação Markdown e prefixos comuns
    skillsText = skillsText.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\./g, '');
    
    // Tratamento robusto: aceita vírgula OU quebra de linha como separador
    const skills = skillsText
      .split(/,|\n/)
      .map((skill: string) => skill.trim())
      .filter((s: string) => s.length > 0 && !s.includes(':')); // Filtra vazios e cabeçalhos como "Lista:"

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ skills }),
    };

  } catch (error) {
    const err = error as Error;
    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ message: "Ops! O sistema está sobrecarregado. Tente novamente em alguns instantes." })
      };
    }
    console.error("[suggest-skills] Erro final:", err);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ message: err.message || "Falha ao sugerir habilidades com a IA." }) 
    };
  }
};

export { handler };

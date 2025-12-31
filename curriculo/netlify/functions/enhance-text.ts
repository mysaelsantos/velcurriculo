import type { Handler, HandlerEvent } from "@netlify/functions";

// Configuração para o modelo mais estável e com maior limite de uso
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      // Usando fetch nativo do Node 18+
      const response = await fetch(url, options);
      
      if (response.ok) return response;

      if (response.status === 429) {
        console.warn(`[enhance-text] Tentativa ${i + 1}/${maxTries} falhou: 429 Resource Exhausted.`);
        lastError = new Error("RESOURCE_EXHAUSTED");
        if (i < maxTries - 1) {
          // Backoff exponencial: espera 2s, 4s, 8s...
          const delay = Math.pow(2, i + 1) * 1000;
          await sleep(delay);
          continue; 
        }
      } else {
        console.error(`[enhance-text] Tentativa ${i + 1} falhou: Status ${response.status}.`);
        const errorBody = await response.json().catch(() => ({}));
        // @ts-ignore
        const msg = errorBody.message || errorBody.error?.message || response.statusText;
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

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  console.log(`[enhance-text] Iniciando. Modelo: ${MODEL_NAME}`);
  
  if (!API_KEY) {
    console.error("[enhance-text] ERRO: Chave API não configurada.");
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno de configuração." }) };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Prompt obrigatório." }) };
    }

    const payload = {
      contents: [
        { role: "user", parts: [{ text: "Atue como um Consultor de Carreira Sênior especializado em polir currículos, tornando-os profissionais e claros sem alterar a veracidade, e siga rigorosamente estas regras: (1) Lei da Verdade: PROIBIDO adicionar dados novos não presentes no original; (2) Lei do Tamanho: o texto final deve ter no máximo 20% a mais de caracteres que o original; (3) Lei da Formatação: respeite a estrutura original (parágrafos permanecem parágrafos, listas permanecem listas); (4) Lei do Tom: use voz ativa e um tom profissional equilibrado, evitando gírias e corporatês vazio; (5) Instruções Contextuais: se for type: 'summary', melhore a narrativa destacando tempo de experiência e objetivo (pode usar 1ª pessoa), mas se for type: 'experience', substitua verbos passivos por verbos de ação e melhore a clareza das responsabilidades:" }] },
        { role: "model", parts: [{ text: "Entendido." }] },
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048,
      },
    };

    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();
    
    if (!result.candidates || !result.candidates[0]?.content?.parts?.[0]?.text) {
      console.error("[enhance-text] Resposta inválida da IA:", JSON.stringify(result));
      throw new Error("A IA não retornou um texto válido.");
    }

    const text = result.candidates[0].content.parts[0].text;
    console.log("[enhance-text] Sucesso.");

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
        body: JSON.stringify({ message: "O sistema está sobrecarregado. Tente novamente em alguns segundos." })
      };
    }
    console.error("[enhance-text] Erro final:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Não foi possível melhorar o texto agora." }) };
  }
};

export { handler };

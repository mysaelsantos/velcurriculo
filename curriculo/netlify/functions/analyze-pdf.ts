import type { Handler, HandlerEvent } from "@netlify/functions";

// Configuração para o modelo mais estável
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  console.log(`[analyze-pdf] Iniciando. Modelo: ${MODEL_NAME}`);
  if (!API_KEY) return { statusCode: 500, body: JSON.stringify({ message: "Chave ausente." }) };

  try {
    const { fullText } = JSON.parse(event.body || '{}');
    if (!fullText) return { statusCode: 400, body: JSON.stringify({ message: "Texto vazio." }) };

    // Limita o texto para evitar tokens excessivos
    const safeText = fullText.substring(0, 30000);

    const prompt = `Analise o texto desta Carteira de Trabalho e extraia as experiências profissionais. Retorne APENAS um JSON válido neste formato: {"experiences": [{"company": "Nome", "jobTitle": "Cargo", "location": "Cidade - UF", "startDate": "MM/AAAA", "endDate": "MM/AAAA"}]}. Se a data fim não existir, use "Atual".`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }, { text: `Texto PDF: ${safeText}` }] }],
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

    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    console.log("[analyze-pdf] Sucesso.");
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonString,
    };

  } catch (error) {
    console.error("[analyze-pdf] Erro:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro ao analisar PDF." }) };
  }
};

export { handler };

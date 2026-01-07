import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

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

const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 2: PORTEIRO DIGITAL (CORS)
  const origin = event.headers.origin || event.headers.Origin;
  // if (origin && !origin.includes("localhost") && origin !== "https://seu-site.com") {
  //    return { statusCode: 403, body: "Forbidden" };
  // }

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  
  if (!API_KEY) return { statusCode: 500, body: JSON.stringify({ message: "Chave ausente." }) };

  try {
    const { fullText } = JSON.parse(event.body || '{}');
    if (!fullText) return { statusCode: 400, body: JSON.stringify({ message: "Texto vazio." }) };

    // Limpeza de caracteres
    const safeText = fullText.substring(0, 30000).replace(/[\x00-\x1F\x7F-\x9F]/g, "");

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
        jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: jsonContent,
    };

  } catch (error) {
    const err = error as Error;
    // 🔒 PRIVACIDADE: Logamos apenas a mensagem
    console.error("[analyze-resume] Erro:", err.message);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro ao processar currículo." }) };
  }
};

export { handler };

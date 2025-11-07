import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenerativeAI } from "@google/genai";

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: "API key não configurada" }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { prompt } = body;

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Prompt é obrigatório" }) };
    }

    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: "Você é um especialista em RH que cria currículos. Sua tarefa é reescrever o texto fornecido para ser mais profissional e impactante. Responda apenas com o texto reescrito, sem introduções ou comentários.",
    });

    const text = result.response.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Gemini Error (enhance-text): ${error.message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export { handler };
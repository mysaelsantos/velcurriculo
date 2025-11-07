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
    const { jobTitle, experience } = body;

    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ message: "jobTitle é obrigatório" }) };
    }

    const prompt = `Com base no cargo de "${jobTitle}" e na seguinte descrição de experiência profissional: "${experience}", sugira uma lista de 8 habilidades e competências relevantes (incluindo técnicas e comportamentais). Retorne apenas a lista de habilidades, separadas por vírgula. Exemplo: Liderança, Comunicação, React, Gestão de Projetos, Proatividade, Git, Scrum, Trabalho em Equipe`;
    
    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: "Você é um especialista em RH que ajuda a montar currículos. Sua tarefa é sugerir habilidades com base nas informações fornecidas. Responda apenas com a lista de habilidades separadas por vírgula, sem introduções ou comentários.",
    });
    
    const skillsText = result.response.text().trim();
    const skills = skillsText.split(',').map(skill => skill.trim()).filter(Boolean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skills }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Gemini Error (suggest-skills): ${error.message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export { handler };
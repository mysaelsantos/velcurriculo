import type { Handler, HandlerEvent } from "@netlify/functions";

// Usar 'require' para compatibilidade com Netlify Functions
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/genai");

const MODEL_NAME = "gemini-1.0-pro";
const API_KEY = process.env.GEMINI_API_KEY;

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: "Chave da API do Gemini não configurada." }) };
  }

  try {
    const { jobTitle, experience } = JSON.parse(event.body || '{}');
    if (!jobTitle) {
      return { statusCode: 400, body: JSON.stringify({ message: "jobTitle é obrigatório." }) };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `Com base no cargo de "${jobTitle}" e na seguinte descrição de experiência profissional: "${experience}", sugira uma lista de 8 habilidades e competências relevantes (incluindo técnicas e comportamentais). Retorne apenas a lista de habilidades, separadas por vírgula. Exemplo: Liderança, Comunicação, React, Gestão de Projetos, Proatividade, Git, Scrum, Trabalho em Equipe`;

    const generationConfig = {
      temperature: 0.9,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await model.generateContent(
      [prompt],
      generationConfig,
      safetySettings
    );

    const skillsText = result.response.text();
    if (!skillsText) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: [] }),
      };
    }
    
    const skills = skillsText.split(',').map(skill => skill.trim()).filter(Boolean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills }),
    };

  } catch (error) {
    console.error("Error calling Gemini API for skill suggestion:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Falha ao sugerir habilidades com a IA." }) };
  }
};

// --- CORREÇÃO ---
// Mudar de 'export' para 'module.exports' para ser compatível com o 'require'
module.exports = { handler };

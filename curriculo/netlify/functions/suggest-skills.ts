import type { Handler, HandlerEvent } from "@netlify/functions";

// Usar 'require' (CJS)
const fetch = require('node-fetch');

// --- CORREÇÃO 1: Nome do modelo do seu projeto funcional ---
const MODEL_NAME = "gemini-2.0-flash";
const API_KEY = process.env.GEMINI_API_KEY;
// --- CORREÇÃO 2: Endpoint correto para este modelo ---
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

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

    const prompt = `Com base no cargo de "${jobTitle}" e na seguinte descrição de experiência profissional: "${experience}", sugira uma lista de 8 habilidades e competências relevantes (incluindo técnicas e comportamentais). Retorne apenas a lista de habilidades, separadas por vírgula. Exemplo: Liderança, Comunicação, React, Gestão de Projetos, Proatividade, Git, Scrum, Trabalho em Equipe`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };
    
    const apiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error("Erro da API Gemini:", errorBody);
      return { statusCode: apiResponse.status, body: JSON.stringify({ message: `Erro da API Gemini: ${errorBody}` }) };
    }
    
    const result = await apiResponse.json();

    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error("Resposta inesperada da API:", result);
      throw new Error("A API da IA retornou uma resposta inválida.");
    }

    const skillsText = result.candidates[0].content.parts[0].text;
    
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
    const errorMessage = error instanceof Error ? error.message : "Falha ao sugerir habilidades com a IA.";
    return { statusCode: 500, body: JSON.stringify({ message: errorMessage }) };
  }
};

// Usar 'module.exports' (CJS)
module.exports = { handler };

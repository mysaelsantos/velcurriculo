import type { Handler, HandlerEvent } from "@netlify/functions";

// Usar 'require' (CJS)
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;
// --- CORREÇÃO 1: Nome do modelo atualizado ---
const MODEL_NAME = "gemini-1.5-flash";
// --- CORREÇÃO 2: Endpoint revertido para v1beta ---
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: "Chave da API do Gemini não configurada." }) };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ message: "Prompt é obrigatório." }) };
    }

    // A lógica de "chat" é recriada na estrutura do payload
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: "Você é um especialista em RH que cria currículos. Sua tarefa é reescrever o texto fornecido para ser mais profissional e impactante. Responda apenas com o texto reescrito, sem introduções ou comentários." }],
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Por favor, forneça o texto que devo reescrever." }],
        },
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
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

    const text = result.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : "Falha ao aprimorar o texto com a IA.";
    return { statusCode: 500, body: JSON.stringify({ message: errorMessage }) };
  }
};

// Usar 'module.exports' (CJS)
module.exports = { handler };

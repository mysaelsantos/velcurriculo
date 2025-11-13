import type { Handler, HandlerEvent } from "@netlify/functions";
const fetch = require('node-fetch');

const MODEL_NAME = "gemini-2.0-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// --- NOVA LÓGICA DE TENTATIVAS ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, maxTries: number = 4) => {
  let lastError: Error | null = new Error("Falha ao contactar a API.");

  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      if (response.status === 429) {
        console.warn(`Tentativa ${i + 1}/${maxTries} falhou: Erro 429 (Resource Exhausted).`);
        lastError = new Error("RESOURCE_EXHAUSTED");
        if (i < maxTries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
          await sleep(delay);
          continue; 
        }
      } else {
        console.error(`Tentativa ${i + 1} falhou com status ${response.status}.`);
        const errorBody = await response.json().catch(() => ({}));
        lastError = new Error(errorBody.message || `Erro da API: ${response.statusText}`);
        break; 
      }
    } catch (fetchError) {
      console.error(`Tentativa ${i + 1} falhou com erro de rede:`, fetchError);
      lastError = fetchError as Error;
      if (i < maxTries - 1) await sleep(1000);
    }
  }
  throw lastError;
};
// --- FIM DA LÓGICA DE TENTATIVAS ---

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
        temperature: 0.9, topK: 1, topP: 1, maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };
    
    // USA O NOVO FETCH COM TENTATIVAS
    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result: any = await apiResponse.json();

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
    const err = error as Error;
    // --- MUDANÇA PRINCIPAL AQUI ---
    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        body: JSON.stringify({ message: "Ops! Prometemos que não é drama, é só um bugzinho do nosso lado. Por favor, tente novamente em 1 minuto ou atualize a página." })
      };
    }
    console.error("Error calling Gemini API for skill suggestion:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: err.message || "Falha ao sugerir habilidades com a IA." }) 
    };
  }
};

module.exports = { handler };

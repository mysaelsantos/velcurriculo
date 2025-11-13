import type { Handler, HandlerEvent } from "@netlify/functions";
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";
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
    const { fullText } = JSON.parse(event.body || '{}');
    if (!fullText) {
      return { statusCode: 400, body: JSON.stringify({ message: "Texto do PDF é obrigatório." }) };
    }

    const prompt = `Analise o seguinte texto extraído de um PDF da Carteira de Trabalho Digital e extraia todas as experiências profissionais listadas. Para cada experiência, extraia: nome da empresa (empregador), cargo (ocupação), local (município do estabelecimento), data de início (admissão) e data de fim (desligamento). Se a data de fim não for especificada ou estiver em branco, use o valor "Atual". Ignore qualquer outra informação. Retorne os dados em formato JSON, como no exemplo: {"experiences": [{"company": "EMPRESA EXEMPLO", "jobTitle": "CARGO EXEMPLO", "location": "CIDADE - UF", "startDate": "DD/MM/YYYY", "endDate": "DD/MM/YYYY"}]}`;
    const parts = [{ text: prompt }, { text: `Aqui está o texto do PDF: ${fullText}` }];
    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2, topK: 1, topP: 1, maxOutputTokens: 2048,
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

    const rawText = result.candidates[0].content.parts[0].text;
    let jsonString = rawText;

    if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
      jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    } else if (jsonString.startsWith('```') && jsonString.endsWith('```')) {
      jsonString = jsonString.substring(3, jsonString.length - 3).trim();
    }

    try {
      const parsedJson = JSON.parse(jsonString);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedJson),
      };
    } catch (parseError) {
      console.error("Failed to parse JSON from Gemini API:", parseError, "Raw string:", rawText);
      throw new Error("A IA retornou uma resposta em formato inválido.");
    }

  } catch (error) {
    const err = error as Error;
    // --- MUDANÇA PRINCIPAL AQUI ---
    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        body: JSON.stringify({ message: "Ops! Prometemos que não é drama, é só um bugzinho do nosso lado. Por favor, tente novamente em 1 minuto ou atualize a página." })
      };
    }
    console.error("Error calling Gemini API for PDF analysis:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: err.message || "Falha ao analisar o PDF com a IA." }) 
    };
  }
};

module.exports = { handler };

import type { Handler, HandlerEvent } from "@netlify/functions";
// --- REVERTIDO ---
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

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
    
    const parts = [
      { text: prompt },
      { text: `Aqui está o texto do PDF: ${fullText}` },
    ];

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
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
      return { statusCode: 500, body: JSON.stringify({ message: "A IA retornou uma resposta em formato inválido." }) };
    }

  } catch (error) {
    console.error("Error calling Gemini API for PDF analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "Falha ao analisar o PDF com a IA.";
    return { statusCode: 500, body: JSON.stringify({ message: errorMessage }) };
  }
};

// --- REVERTIDO ---
module.exports = { handler };

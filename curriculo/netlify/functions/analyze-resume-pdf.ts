import type { Handler, HandlerEvent } from "@netlify/functions";
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// O prompt da IA é a parte mais importante.
// Pedi a ele para formatar a saída exatamente como a nossa interface `ResumeData`
const createPrompt = (resumeText: string) => {
  return `Você é um assistente de RH especialista em extrair dados de currículos.
Analise o texto do currículo fornecido e retorne **apenas** um objeto JSON.

A estrutura do JSON deve seguir este formato (use \`null\` ou arrays vazios \`[]\` para campos não encontrados):
{
  "personalInfo": { "name": "string", "jobTitle": "string", "email": "string", "phone": "string", "address": "string" },
  "summary": "string",
  "experiences": [{ "jobTitle": "string", "company": "string", "location": "string", "startDate": "string", "endDate": "string", "description": "string" }],
  "education": [{ "degree": "string", "institution": "string", "startDate": "string", "endDate": "string" }],
  "courses": [{ "name": "string", "institution": "string", "completionDate": "string" }],
  "languages": [{ "language": "string", "proficiency": "string" }],
  "skills": ["string"]
}

Tente preencher o máximo de campos possível com base no texto.
Para datas, tente formatar como "Mês Ano" (ex: "Jan 2020") ou "Ano" (ex: "2020").
Não inclua \`\`\`json ou qualquer outro texto antes ou depois do objeto JSON.

Texto do Currículo para Análise:
---
${resumeText}
---
`;
};

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

    const prompt = createPrompt(fullText);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Baixa temperatura para respostas mais factuais
        topK: 1,
        topP: 1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json", // Pedindo JSON diretamente
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

    // Como pedimos JSON, podemos tentar usá-lo diretamente
    const rawText = result.candidates[0].content.parts[0].text;
    let jsonString = rawText;

    // Limpeza de segurança (caso a IA ainda envie ```json)
    if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
      jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    }

    try {
      const parsedJson = JSON.parse(jsonString);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedJson), // Re-stringifica o JSON limpo
      };
    } catch (parseError) {
      console.error("Falha ao analisar JSON da API Gemini:", parseError, "String bruta:", rawText);
      return { statusCode: 500, body: JSON.stringify({ message: "A IA retornou uma resposta em formato inválido." }) };
    }

  } catch (error) {
    console.error("Erro ao analisar currículo com IA:", error);
    const errorMessage = error instanceof Error ? error.message : "Falha ao analisar o currículo com a IA.";
    return { statusCode: 500, body: JSON.stringify({ message: errorMessage }) };
  }
};

module.exports = { handler };

import type { Handler, HandlerEvent } from "@netlify/functions";

// Usar 'require' para compatibilidade com Netlify Functions
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/genai");

const API_KEY = process.env.GEMINI_API_KEY;

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

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" }); // Usar modelo de texto

    const prompt = `Analise o seguinte texto extraído de um PDF da Carteira de Trabalho Digital e extraia todas as experiências profissionais listadas. Para cada experiência, extraia: nome da empresa (empregador), cargo (ocupação), local (município do estabelecimento), data de início (admissão) e data de fim (desligamento). Se a data de fim não for especificada ou estiver em branco, use o valor "Atual". Ignore qualquer outra informação. Retorne os dados em formato JSON, como no exemplo: {"experiences": [{"company": "EMPRESA EXEMPLO", "jobTitle": "CARGO EXEMPLO", "location": "CIDADE - UF", "startDate": "DD/MM/YYYY", "endDate": "DD/MM/YYYY"}]}`;
    
    const parts = [
      { text: prompt },
      { text: `Aqui está o texto do PDF: ${fullText}` },
    ];

    const generationConfig = {
      temperature: 0.2,
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
      parts,
      generationConfig,
      safetySettings
    );

    const rawText = result.response.text();
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
    return { statusCode: 500, body: JSON.stringify({ message: "Falha ao analisar o PDF com a IA." }) };
  }
};

// --- CORREÇÃO 2 ---
// Mudar de 'export' para 'module.exports' para ser compatível com o 'require'
module.exports = { handler };

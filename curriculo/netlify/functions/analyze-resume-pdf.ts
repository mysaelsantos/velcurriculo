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

      if (response.ok) {
        return response; // Sucesso
      }

      if (response.status === 429) {
        console.warn(`Tentativa ${i + 1}/${maxTries} falhou: Erro 429 (Resource Exhausted).`);
        lastError = new Error("RESOURCE_EXHAUSTED"); // Guarda este erro específico
        if (i < maxTries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 500; // 1s, 2s, 4s...
          await sleep(delay);
          continue; // Tenta de novo
        }
      } else {
        // Outro erro (400, 500, etc.) - Falha imediatamente
        console.error(`Tentativa ${i + 1} falhou com status ${response.status}.`);
        const errorBody = await response.json().catch(() => ({}));
        lastError = new Error(errorBody.message || `Erro da API: ${response.statusText}`);
        break; 
      }
    } catch (fetchError) {
      console.error(`Tentativa ${i + 1} falhou com erro de rede:`, fetchError);
      lastError = fetchError as Error;
      if (i < maxTries - 1) {
         await sleep(1000); // Espera 1s em caso de falha de rede
      }
    }
  }
  throw lastError; // Lança o último erro se todas as tentativas falharem
};
// --- FIM DA LÓGICA DE TENTATIVAS ---

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
        temperature: 0.1, topK: 1, topP: 1, maxOutputTokens: 8192, responseMimeType: "application/json",
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
    }

    try {
      const parsedJson = JSON.parse(jsonString);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedJson),
      };
    } catch (parseError) {
      console.error("Falha ao analisar JSON da API Gemini:", parseError, "String bruta:", rawText);
      throw new Error("A IA retornou uma resposta em formato inválido.");
    }

  } catch (error) {
    const err = error as Error;

    // --- MUDANÇA PRINCIPAL AQUI ---
    // Se o erro for o 429 (após 4 tentativas), retorna a sua mensagem personalizada
    if (err.message === "RESOURCE_EXHAUSTED") {
      return {
        statusCode: 429,
        body: JSON.stringify({ message: "Ops! Prometemos que não é drama, é só um bugzinho do nosso lado. Por favor, tente novamente em 1 minuto ou atualize a página." })
      };
    }

    // Outros erros
    console.error("Erro ao analisar currículo com IA:", err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: err.message || "Falha ao analisar o currículo com a IA." }) 
    };
  }
};

module.exports = { handler };

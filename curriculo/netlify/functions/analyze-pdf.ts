import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from "@google/genai";

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
    const { fullText } = body;

    if (!fullText) {
      return { statusCode: 400, body: JSON.stringify({ message: "Texto do PDF é obrigatório" }) };
    }

    const prompt = `Analise o seguinte texto extraído de um PDF da Carteira de Trabalho Digital e extraia todas as experiências profissionais listadas. Para cada experiência, extraia: nome da empresa (empregador), cargo (ocupação), local (município do estabelecimento), data de início (admissão) e data de fim (desligamento). Se a data de fim não for especificada ou estiver em branco, use o valor "Atual". Ignore qualquer outra informação. Retorne os dados em formato JSON, seguindo o schema fornecido.`;
    
    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            experiences: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  company: { type: "STRING", description: "Nome da empresa (Empregador)" },
                  jobTitle: { type: "STRING", description: "Cargo ocupado (Ocupação)" },
                  location: { type: "STRING", description: "Município do estabelecimento. Ex: SÃO PAULO - SP" },
                  startDate: { type: "STRING", description: "Data de início do contrato (Admissão - DD/MM/YYYY)" },
                  endDate: { type: "STRING", description: "Data de fim do contrato (Desligamento - DD/MM/YYYY) ou 'Atual'" }
                },
                required: ["company", "jobTitle", "location", "startDate", "endDate"],
              },
            },
          },
        } as GenerationConfig['responseSchema']
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, { text: fullText }] }],
    });

    // O Gemini com JSON schema já retorna o JSON direto
    const jsonResult = JSON.parse(result.response.text());
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonResult),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Gemini Error (analyze-pdf): ${error.message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export { handler };
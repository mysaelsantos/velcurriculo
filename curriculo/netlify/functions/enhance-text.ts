import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const handler: Handler = async (event) => {
  // Tratamento de CORS para requisições OPTIONS (pre-flight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    const { text, type } = JSON.parse(event.body || '{}');

    if (!text) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Text is required' }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // --- CONSTRUÇÃO DO PROMPT "SUPER SEGURO" ---
    
    // Instruções Específicas baseadas no tipo de campo
    let specificInstruction = '';
    
    if (type === 'summary') {
      specificInstruction = `
        - CONTEXTO: Este é um RESUMO PROFISSIONAL.
        - INSTRUÇÃO: Escreva em primeira pessoa (ex: "Sou...", "Atuo...").
        - FOCO: Destaque a senioridade e o objetivo principal de forma fluida.
      `;
    } else if (type === 'experience') {
      specificInstruction = `
        - CONTEXTO: Esta é uma descrição de EXPERIÊNCIA PROFISSIONAL.
        - INSTRUÇÃO: Use voz ativa (ex: "Gerenciei", "Desenvolvi", "Liderei").
        - PROIBIÇÃO: NÃO transforme texto corrido em bullet points se o original for um parágrafo. Mantenha o formato original.
      `;
    } else {
      // Fallback para outros campos (educação, etc)
      specificInstruction = `
        - CONTEXTO: Texto geral de currículo.
        - INSTRUÇÃO: Melhore a clareza e formalidade.
      `;
    }

    const prompt = `
      Você é um Consultor de Carreira Sênior especializado em revisão de currículos.
      Sua tarefa é POLIR o texto fornecido pelo usuário.

      AS 4 LEIS DE FERRO (OBEDEÇA RIGOROSAMENTE):
      1. LEI DA VERDADE: É ESTRITAMENTE PROIBIDO adicionar fatos, números, ferramentas, empresas ou cargos que não estejam no texto original. Trabalhe APENAS com o que o usuário forneceu.
      2. LEI DO TAMANHO: O texto final deve ter NO MÁXIMO 20% a mais de caracteres que o original. Seja conciso e direto.
      3. LEI DO TOM: Use um tom "Profissional Equilibrado". Nem robótico, nem vendedor demais. Evite clichês vazios (ex: "vestir a camisa", "sinergia").
      4. LEI DA FORMATAÇÃO: Devolva APENAS o texto revisado. Sem aspas, sem introduções ("Aqui está...").

      ${specificInstruction}

      TEXTO ORIGINAL DO USUÁRIO:
      "${text}"

      VERSÃO OTIMIZADA:
    `;

    // Configuração para evitar criatividade excessiva (Temperature mais baixa)
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Baixa temperatura para ser mais fiel e menos "alucinado"
        maxOutputTokens: 500, // Limite forçado de tokens
      },
    });

    const response = await result.response;
    const enhancedText = response.text().trim();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ enhancedText }),
    };
  } catch (error) {
    console.error('Error enhancing text:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to enhance text' }),
    };
  }
};

export { handler };

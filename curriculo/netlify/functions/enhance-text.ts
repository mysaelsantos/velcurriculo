import { Handler } from '@netlify/functions';

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

    // --- CONSTRUÇÃO DO PROMPT "SUPER SEGURO" ---
    
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

    // --- CHAMADA DIRETA À API (SEM BIBLIOTECA) ---
    // Usamos o modelo gemini-1.5-flash que é rápido e eficiente para texto
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.3, // Baixa criatividade para evitar alucinação
                maxOutputTokens: 500
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extração segura da resposta
    const enhancedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ enhancedText }),
    };
  } catch (error) {
    console.error('Error enhancing text:', error);
    // Em caso de erro, devolvemos o texto original para não quebrar a experiência do usuário
    const originalText = JSON.parse(event.body || '{}').text || '';
    return {
      statusCode: 200, // Retornamos 200 para o frontend não travar
      headers: corsHeaders,
      body: JSON.stringify({ enhancedText: originalText, error: 'AI processing failed' }),
    };
  }
};

export { handler };

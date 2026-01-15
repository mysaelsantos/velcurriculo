import type { Handler, HandlerEvent } from "@netlify/functions";

const API_KEY = process.env.GEMINI_API_KEY;
// ATUALIZADO: Usando sufixo '-latest' para garantir que o endpoint encontre o modelo
const MODEL_NAME = "gemini-1.5-flash-latest"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

// Defina a URL do seu frontend em produção (sem barra no final)
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "https://velcurriculo.com.br";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar de retry completa para lidar com instabilidades da API
const fetchWithRetry = async (url: string, options: any, maxTries: number = 3) => {
  let lastError: Error | null = new Error("Falha API.");
  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Tratamento específico para erros comuns
      if (!response.ok) {
        if (response.status === 404) {
             // Se der 404, não adianta tentar de novo, o modelo não existe nessa URL
             throw new Error(`Modelo IA não encontrado (404). Verifique o MODEL_NAME: ${MODEL_NAME}`);
        }
        if (response.status === 403) {
             throw new Error(`Erro de Permissão (403). Verifique a API KEY.`);
        }
        if (response.status === 429 && i < maxTries - 1) {
           // Backoff exponencial para erro de limite
           await sleep(Math.pow(2, i + 1) * 1000); 
           continue;
        }
        throw new Error(`Status ${response.status} - ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      // Se for 404 ou 403, interrompe o loop de retry imediatamente
      if (lastError.message.includes("404") || lastError.message.includes("403")) break;
      if (i < maxTries - 1) await sleep(1000);
    }
  }
  throw lastError;
};

export const handler: Handler = async (event: HandlerEvent) => {
  // 🔒 ETAPA 1: PORTEIRO DIGITAL (CORS) e CONFIGURAÇÃO
  const origin = event.headers.origin || event.headers.Origin || "";
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
  const isAllowed = origin === ALLOWED_ORIGIN || isLocalhost;

  // Headers padrão para permitir CORS apenas se a origem for permitida
  const headers = {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Verificação de origem para produção (Segurança extra ATIVADA)
  if (process.env.NODE_ENV !== 'development' && !isAllowed) {
     return { statusCode: 403, headers, body: JSON.stringify({ message: "Acesso Negado." }) };
  }

  // Responde imediatamente a requisições OPTIONS (pre-flight do navegador)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // Apenas aceita POST
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  if (!API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ message: "Chave de API não configurada no servidor." }) };

  try {
    // 🔒 ETAPA 2: PARSE E SANITIZAÇÃO
    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: "JSON inválido." }) };
    }

    // Agora recebemos 'payload' (dado) e 'mimeType' (tipo)
    const { payload, mimeType } = body;

    if (!payload) return { statusCode: 400, headers, body: JSON.stringify({ message: "Conteúdo para análise vazio." }) };

    // 🔒 ETAPA 3: CONSTRUÇÃO DO PROMPT E PAYLOAD
    
    const systemInstruction = `
    Você é um especialista em extração de dados de currículos (Parsing). 
    Sua tarefa é analisar o conteúdo fornecido (que pode ser Texto de PDF/Word ou uma Imagem de currículo) e extrair os dados para um JSON estrito.
    
    REGRAS DE OURO (Siga rigorosamente):
    1. DATAS: Normalize SEMPRE para o formato "AAAA" (ex: "2023") ou "MM/AAAA" (ex: "01/2023"). Se encontrar termos como "Atualmente", "Presente", "Agora", converta para a string "Atual".
    2. TELEFONE: Extraia apenas números válidos. Se houver fixo e celular, priorize o celular/WhatsApp. Remova rótulos como "Tel:", "Cel:".
    3. SKILLS: Liste apenas competências técnicas explicitas ou inferidas com alta certeza (ex: Ferramentas, Linguagens, Softwares). Não invente soft skills genéricas se não estiverem claras.
    4. RESUMO: Se não houver resumo claro, crie um texto profissional e breve (max 3 linhas) em primeira pessoa baseado nas experiências listadas.
    5. CAMPOS VAZIOS: Se não encontrar a informação, use string vazia "" ou array vazio []. NÃO use null ou undefined.

    ESTRUTURA JSON ALVO (Respeite as chaves):
    {
      "personalInfo": {
        "name": "Nome Completo",
        "jobTitle": "Cargo Principal ou Área de Atuação",
        "email": "email@exemplo.com",
        "phone": "(XX) XXXXX-XXXX",
        "address": "Cidade, Estado",
        "age": "",
        "maritalStatus": "",
        "cnh": "",
        "linkedin": "url completa ou vazio",
        "profilePicture": "" 
      },
      "summary": "Texto do resumo profissional...",
      "experiences": [
        { "id": "gerar_timestamp_unico_aqui", "jobTitle": "", "company": "", "location": "", "startDate": "", "endDate": "", "description": "" }
      ],
      "education": [
        { "id": "gerar_timestamp_unico_aqui", "degree": "", "institution": "", "startDate": "", "endDate": "" }
      ],
      "courses": [
        { "id": "gerar_timestamp_unico_aqui", "name": "", "institution": "", "completionDate": "" }
      ],
      "languages": [
        { "id": "gerar_timestamp_unico_aqui", "language": "", "proficiency": "Básico | Intermediário | Avançado | Fluente" }
      ],
      "skills": ["Skill 1", "Skill 2", "Skill 3"]
    }
    
    Retorne APENAS o JSON puro, sem blocos de código markdown (sem \`\`\`json).
    `;

    // Monta o objeto de conteúdo para a API do Google Gemini
    let contentsPart;

    if (mimeType === 'text/plain') {
        // Modo Texto (PDF extraído ou DOCX)
        // Limpeza de segurança básica no texto
        const safeText = payload.substring(0, 30000).replace(/[\x00-\x1F\x7F-\x9F]/g, "");
        contentsPart = { text: `${systemInstruction}\n\nCURRÍCULO PARA ANÁLISE:\n"""\n${safeText}\n"""` };
    } else {
        // Modo Visão (Imagem Base64)
        // Enviamos a instrução como texto e a imagem como inlineData
        contentsPart = [
            { text: systemInstruction },
            { inlineData: { mimeType: mimeType, data: payload } }
        ];
    }
    
    const apiPayload = {
      contents: [{ parts: Array.isArray(contentsPart) ? contentsPart : [contentsPart] }],
      generationConfig: { 
          temperature: 0.2, // Baixa criatividade para evitar alucinações
          responseMimeType: "application/json" 
      },
    };

    // Chamada à API com Retry automático e tratamento de erro
    const apiResponse = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload)
    });

    const result: any = await apiResponse.json();
    let jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!jsonString) throw new Error("A IA retornou uma resposta vazia.");

    // Tratamento robusto para extrair apenas o JSON
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonString = jsonMatch[0];
    } else {
        // Fallback: tenta limpar crases de markdown
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    // Validação final: garante que é um JSON válido
    try {
      JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON inválido retornado pela IA (amostra):", jsonString.substring(0, 50) + "...");
      throw new Error("A IA não gerou um JSON estruturado corretamente.");
    }

    return {
      statusCode: 200,
      headers: headers,
      body: jsonString,
    };

  } catch (error) {
    const err = error as Error;
    // Logamos o erro no servidor, mas retornamos mensagem genérica ao usuário para não vazar detalhes
    console.error("[analyze-resume-pdf] Erro:", err.message);
    
    // Se for erro de API KEY ou 404, retornamos 500
    return { 
        statusCode: 500, 
        headers: headers, 
        body: JSON.stringify({ message: "Erro ao processar o currículo com a IA. Tente novamente mais tarde." }) 
    };
  }
};

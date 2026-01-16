// Este arquivo agora usa a biblioteca instalada localmente para maior estabilidade.
// Ele conecta com as Funções Netlify para proteger as chaves de API.

import type { ResumeData } from '../types';
// Importação direta da biblioteca (requer 'pdfjs-dist' no package.json)
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import mammoth from 'mammoth';

// Configuração do Worker usando CDN para garantir compatibilidade exata de versão
// Isso evita o erro de "Version Mismatch" ou "Fake Worker" sem precisar de arquivos locais na pasta public.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

// Função segura para lidar com respostas
async function handleResponse(response: Response, context: string) {
  if (!response.ok) {
    let errorMessage = 'Erro desconhecido';
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error?.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    // 🔒 PRIVACIDADE: Logamos apenas a mensagem de erro, não o objeto completo que poderia conter dados sensíveis
    console.error(`[${context}] Falha na requisição: ${errorMessage}`);
    throw new Error(errorMessage || 'Falha na comunicação com o servidor.');
  }
  return response.json();
}

export const enhanceText = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/enhance-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await handleResponse(response, 'enhanceText');
    return data.text;
  } catch (error) {
    // Repassa o erro limpo para a UI
    throw error;
  }
};

export const suggestSkills = async (jobTitle: string, experience: string): Promise<string[]> => {
  if (!jobTitle.trim()) {
    return [];
  }

  try {
    const response = await fetch('/.netlify/functions/suggest-skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle, experience }),
    });
    const data = await handleResponse(response, 'suggestSkills');
    return data.skills;
  } catch (error) {
    throw error;
  }
};

// --- FUNÇÕES UTILITÁRIAS DE EXTRAÇÃO E COMPRESSÃO ---

// 1. Extração de PDF (Mantida e Otimizada)
const extractTextFromPDF = async (file: File): Promise<string> => {
  const reader = new FileReader();
  const fileReadPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const arrayBuffer = await fileReadPromise;
  
  // Carrega o documento usando a lib importada
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';

  // SEGURANÇA: Limite de páginas para evitar travamento em arquivos grandes
  const MAX_PAGES = 6; 
  const pagesToProcess = Math.min(pdf.numPages, MAX_PAGES);

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
};

// 2. Extração de DOCX (Nova)
const extractTextFromDocx = async (file: File): Promise<string> => {
    const reader = new FileReader();
    const fileReadPromise = new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    const arrayBuffer = await fileReadPromise;
    try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value; // O texto bruto extraído
    } catch (error) {
        console.error("Erro ao ler DOCX:", error);
        throw new Error("Não foi possível ler o arquivo Word. Tente salvar como PDF.");
    }
};

// 3. Compressão de Imagem e Conversão para Base64 (Nova)
const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024; // Largura suficiente para ler texto, pequena o bastante para API
                const scaleSize = MAX_WIDTH / img.width;
                const newWidth = MAX_WIDTH;
                const newHeight = img.height * scaleSize;

                canvas.width = newWidth;
                canvas.height = newHeight;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Falha ao processar imagem no navegador."));
                    return;
                }
                
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // Retorna apenas a parte Base64 (remove o prefixo 'data:image/jpeg;base64,')
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Qualidade 80%
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

// --- FUNÇÃO PRINCIPAL UNIFICADA ---

export const analyzeResumePDF = async (file: File): Promise<Partial<ResumeData>> => {
  try {
    let payload: string = "";
    let mimeType: string = "text/plain"; // Default para texto extraído (PDF/DOCX)

    // ESTRATÉGIA DE EXTRAÇÃO BASEADA NO TIPO
    if (file.type === "application/pdf") {
        // PDF: Extraímos texto localmente para economizar tokens e bytes
        payload = await extractTextFromPDF(file);
        mimeType = "text/plain";
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        // DOCX: Extraímos texto via Mammoth
        payload = await extractTextFromDocx(file);
        mimeType = "text/plain";
    } else if (file.type.startsWith("image/")) {
        // IMAGEM: Comprimimos e enviamos Base64 para a IA ver
        payload = await compressImage(file);
        mimeType = file.type; // ex: image/jpeg, image/png
    } else {
        throw new Error("Formato de arquivo não suportado.");
    }

    // Envia para o Backend Multimodal
    const response = await fetch('/.netlify/functions/analyze-resume-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          payload, 
          mimeType 
      }),
    });

    const data = await handleResponse(response, 'analyzeResumePDF');
    return data as Partial<ResumeData>;

  } catch (error) {
    console.error("Erro ao analisar arquivo:", error);
    throw error;
  }
};

// Esta função antiga pode ser mantida para compatibilidade ou refatorada futuramente
// Por enquanto, vamos deixá-la usando a lógica de PDF padrão
export const analyzeWorkExperiencePDF = async (file: File): Promise<{company: string, jobTitle: string, location: string, startDate: string, endDate: string}[]> => {
  try {
    // Reutiliza a lógica principal para pegar tudo e extrair só experiencias
    // (Poderíamos otimizar criando endpoint especifico, mas para MVP isso funciona)
    const fullData = await analyzeResumePDF(file);
    return fullData.experiences || [];
  } catch (error) {
    console.error("Erro ao analisar experiência (detalhes ocultos por segurança).");
    throw error;
  }
};

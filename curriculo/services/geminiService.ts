// Este arquivo agora usa a biblioteca instalada localmente para maior estabilidade.
// Ele conecta com as Funções Netlify para proteger as chaves de API.

import type { ResumeData } from '../types';
// Importação direta da biblioteca (requer 'pdfjs-dist' no package.json)
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker usando CDN confiável (JsDelivr) para a versão exata 4.4.168
// Isso evita erros de "versão incompatível" e garante que o processamento não trave a tela.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

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

// Função reutilizável para extração de texto
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

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
};

export const analyzeWorkExperiencePDF = async (file: File): Promise<{company: string, jobTitle: string, location: string, startDate: string, endDate: string}[]> => {
  try {
    const fullText = await extractTextFromPDF(file);

    const response = await fetch('/.netlify/functions/analyze-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullText }),
    });
    const data = await handleResponse(response, 'analyzeWorkExperiencePDF');
    return data.experiences || [];
  } catch (error) {
    console.error("Erro ao analisar PDF de experiência (detalhes ocultos por segurança).");
    throw error;
  }
};

export const analyzeResumePDF = async (file: File): Promise<Partial<ResumeData>> => {
  try {
    const fullText = await extractTextFromPDF(file);

    const response = await fetch('/.netlify/functions/analyze-resume-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullText }),
    });
    const data = await handleResponse(response, 'analyzeResumePDF');
    return data as Partial<ResumeData>;
  } catch (error) {
    console.error("Erro ao analisar currículo em PDF (detalhes ocultos por segurança).");
    throw error;
  }
};

// Este arquivo agora chama NOSSAS Funções Netlify, e não mais a API do Google diretamente.
// Isso mantém nossa chave de API segura no backend.

// **** 1. CORREÇÃO: Caminho de importação corrigido de './types' para '../types' ****
import type { ResumeData } from '../types';

declare const pdfjsLib: any;

// Função helper para lidar com respostas de fetch
async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(errorBody.message || 'Falha na requisição para a IA.');
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
    const data = await handleResponse(response);
    return data.text;
  } catch (error) {
    console.error("Error calling enhance-text function:", error);
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
    const data = await handleResponse(response);
    return data.skills;
  } catch (error) {
    console.error("Error calling suggest-skills function:", error);
    throw error;
  }
};

export const analyzeWorkExperiencePDF = async (file: File): Promise<{company: string, jobTitle: string, location: string, startDate: string, endDate: string}[]> => {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error("A biblioteca pdf.js não está carregada.");
  }

  // 1. A extração de texto do PDF continua no frontend
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

  const reader = new FileReader();
  const fileReadPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const arrayBuffer = await fileReadPromise;
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  // 2. Enviamos o *texto extraído* para nossa função de backend
  try {
    const response = await fetch('/.netlify/functions/analyze-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullText }), // Enviando apenas o texto
    });
    const data = await handleResponse(response);
    return data.experiences || [];
  } catch (error) {
    console.error("Error calling analyze-pdf function:", error);
    throw error;
  }
};

// Esta função lê o PDF no frontend e chama nossa nova função de backend.
export const analyzeResumePDF = async (file: File): Promise<Partial<ResumeData>> => {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error("A biblioteca pdf.js não está carregada.");
  }

  // 1. Extração de texto (igual à função analyzeWorkExperiencePDF)
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

  const reader = new FileReader();
  const fileReadPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const arrayBuffer = await fileReadPromise;
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  // 2. Envia o texto para a *nova* função de backend
  try {
    const response = await fetch('/.netlify/functions/analyze-resume-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullText }),
    });
    const data = await handleResponse(response);
    return data as Partial<ResumeData>;
  } catch (error) {
    console.error("Error calling analyze-resume-pdf function:", error);
    throw error;
  }
};

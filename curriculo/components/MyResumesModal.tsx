import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Clock, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import { ResumeData } from '../types';

export interface MyResumesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (resume: ResumeData) => void;
}

interface SavedResume {
  id: string;
  name: string;
  date: string;
  data: ResumeData;
}

export default function MyResumesModal({ isOpen, onClose, onLoad }: MyResumesModalProps) {
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadResumes();
      setExpandedId(null);
      // Bloqueia o scroll da página de fundo quando o modal abre
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadResumes = () => {
    const resumes: SavedResume[] = [];
    
    // Varredura mais inteligente: Tenta ler tudo e verifica se é um currículo válido
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const rawData = localStorage.getItem(key);
          if (!rawData) continue;

          // Verifica se é JSON antes de tentar parsear
          if (rawData.startsWith('{') || rawData.startsWith('[')) {
            const data = JSON.parse(rawData);
            
            // Verifica se tem a estrutura mínima de um currículo
            if (data && data.personalInfo && (data.personalInfo.fullName || data.personalInfo.email)) {
              
              // Tenta extrair a data do ID ou usa a data atual
              let dateStr = new Date().toLocaleDateString('pt-BR');
              try {
                if (key.includes('_')) {
                   const timestamp = parseInt(key.split('_').pop() || '0');
                   if (timestamp > 1000000000000) { // Validação básica de timestamp
                     dateStr = new Date(timestamp).toLocaleDateString('pt-BR');
                   }
                }
              } catch (err) {
                // Mantém data atual se falhar
              }

              resumes.push({
                id: key,
                name: data.personalInfo.fullName || 'Currículo Sem Nome',
                date: dateStr,
                data: data
              });
            }
          }
        } catch (e) {
          // Ignora itens que não são JSON ou currículos
          continue;
        }
      }
    }
    
    // Ordenar: Tenta priorizar os mais recentes baseado no ID (se for timestamp)
    resumes.sort((a, b) => {
        // Tenta extrair timestamp do final da string
        const timeA = parseInt(a.id.match(/\d+$/)?.[0] || '0');
        const timeB = parseInt(b.id.match(/\d+$/)?.[0] || '0');
        return timeB - timeA;
    });
    
    setSavedResumes(resumes);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este currículo?')) {
      localStorage.removeItem(id);
      loadResumes();
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleLoad = (resume: SavedResume) => {
    onLoad(resume.data);
    onClose();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    // Z-INDEX 9999 para garantir que cobre o Header
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop Escuro */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Container do Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Meus Currículos</h2>
            <p className="text-gray-500 text-sm mt-0.5">Histórico de versões salvas</p>
          </div>
        </div>

        {/* Lista de Conteúdo */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
          {savedResumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhum currículo encontrado</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Preencha seus dados e clique em "Salvar" para criar um histórico aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedResumes.map((resume) => {
                const isExpanded = expandedId === resume.id;
                
                return (
                  <div 
                    key={resume.id} 
                    className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
                      isExpanded 
                        ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' 
                        : 'border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    <button
                      onClick={() => toggleExpand(resume.id)}
                      className="w-full flex items-center justify-between p-4 text-left outline-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>
                            {resume.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {resume.date}
                          </div>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} 
                      />
                    </button>

                    {/* Área Expandida (Accordion) */}
                    <div 
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="p-4 pt-0 flex gap-3 mt-2 border-t border-gray-50 bg-gray-50/50">
                          <button
                            onClick={() => handleLoad(resume)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            Carregar
                          </button>
                          
                          <button
                            onClick={(e) => handleDelete(e, resume.id)}
                            className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-100 py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé Integrado (Sem o retângulo isolado) */}
        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

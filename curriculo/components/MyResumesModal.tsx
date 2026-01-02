import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Clock, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import { ResumeData } from '../types';

interface MyResumesModalProps {
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

export function MyResumesModal({ isOpen, onClose, onLoad }: MyResumesModalProps) {
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadResumes();
      setExpandedId(null); // Reseta a expansão ao abrir
    }
  }, [isOpen]);

  const loadResumes = () => {
    const resumes: SavedResume[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('velcurriculo_resume_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          resumes.push({
            id: key,
            name: data.personalInfo?.fullName || 'Currículo Sem Nome',
            date: new Date(parseInt(key.split('_')[2] || Date.now().toString())).toLocaleDateString('pt-BR'),
            data: data
          });
        } catch (e) {
          console.error('Erro ao ler currículo:', e);
        }
      }
    }
    // Ordenar por data (mais recente primeiro)
    resumes.sort((a, b) => {
        const timeA = parseInt(a.id.split('_')[2] || '0');
        const timeB = parseInt(b.id.split('_')[2] || '0');
        return timeB - timeA;
    });
    setSavedResumes(resumes);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Previne expandir/fechar ao deletar
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
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Identidade Visual Azul */}
        <div className="bg-blue-600 p-6">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Meus Currículos</h2>
              <p className="text-blue-100 text-sm opacity-90">Gerencie seus currículos salvos</p>
            </div>
          </div>
        </div>

        {/* Lista de Currículos */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {savedResumes.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum currículo salvo encontrado.</p>
              <p className="text-sm mt-1">Seus currículos salvos aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedResumes.map((resume) => {
                const isExpanded = expandedId === resume.id;
                
                return (
                  <div 
                    key={resume.id} 
                    className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                      isExpanded 
                        ? 'border-blue-500 shadow-md bg-blue-50/30' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Cabeçalho do Item (Clicável) */}
                    <button
                      onClick={() => toggleExpand(resume.id)}
                      className="w-full flex items-center justify-between p-4 text-left outline-none focus:outline-none"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>
                            {resume.name}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Salvo em {resume.date}</span>
                          </div>
                        </div>
                      </div>
                      
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} 
                      />
                    </button>

                    {/* Área Expandida (Opções) */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 pt-0 flex items-center gap-3 border-t border-blue-100/50 mt-2 bg-white/50">
                        <button
                          onClick={() => handleLoad(resume)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                        >
                          <Check className="w-4 h-4" />
                          Carregar
                        </button>
                        
                        <button
                          onClick={(e) => handleDelete(e, resume.id)}
                          className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 py-2.5 px-4 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
                          title="Excluir currículo"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé com botão Voltar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors shadow-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

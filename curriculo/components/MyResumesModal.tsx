import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Clock, ChevronDown, Check } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Limpo (Padrão) */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Meus Currículos</h2>
            <p className="text-gray-500 text-sm mt-1">Selecione um currículo para carregar</p>
          </div>
          {/* Botão X removido conforme solicitado */}
        </div>

        {/* Lista de Currículos */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
          {savedResumes.length === 0 ? (
            <div className="text-center py-10">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium">Nenhum currículo salvo</h3>
              <p className="text-gray-500 text-sm mt-1">Seus currículos salvos aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedResumes.map((resume) => {
                const isExpanded = expandedId === resume.id;
                
                return (
                  <div 
                    key={resume.id} 
                    className={`bg-white border rounded-lg transition-all duration-200 ${
                      isExpanded ? 'border-blue-500 shadow-md ring-1 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <button
                      onClick={() => toggleExpand(resume.id)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{resume.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {resume.date}
                          </div>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} 
                      />
                    </button>

                    {/* Área Expandida */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-4 pt-0 flex gap-3 border-t border-gray-50 mt-1">
                        <button
                          onClick={() => handleLoad(resume)}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Carregar
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, resume.id)}
                          className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-sm font-medium flex items-center gap-2"
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

        {/* Rodapé com botão Voltar Padrão */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

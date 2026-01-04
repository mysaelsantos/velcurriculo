import React, { useState, useEffect } from 'react';
import { Trash2, FileText, Clock, ChevronDown, Check, ArrowLeft, Download } from 'lucide-react';
import { ResumeData } from '../types';

interface SavedResume {
  id: string; // Pode ser o ID antigo ou o savedAt
  name: string;
  date: string;
  data: ResumeData;
  isLegacy?: boolean; // Identifica se é um currículo antigo
}

interface MyResumesModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Mantemos compatibilidade com o App.tsx atual, mas usamos lógica interna prioritariamente
  resumes?: any[]; 
  onEdit: (id: string) => void;
  onDownload: (data: ResumeData) => void;
  onDelete: (id: string) => void;
}

export default function MyResumesModal({ 
  isOpen, 
  onClose, 
  onEdit,
  onDownload
}: MyResumesModalProps) {
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // --- LÓGICA DE VARREDURA (RESTAURADA) ---
  const loadResumes = () => {
    const foundResumes: SavedResume[] = [];
    
    // 1. Varre o LocalStorage inteiro (Recupera arquivos antigos e novos)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Verifica se é um arquivo de currículo (antigo ou novo)
      if (key && (key.startsWith('resume_') || key === 'savedResumes')) {
        try {
          const rawData = localStorage.getItem(key);
          if (!rawData) continue;

          // CASO 1: Lista Nova (Array 'savedResumes')
          if (key === 'savedResumes') {
            const list = JSON.parse(rawData);
            if (Array.isArray(list)) {
              list.forEach((item: any) => {
                foundResumes.push({
                  id: item.savedAt || `new_${Date.now()}_${Math.random()}`,
                  name: item.personalInfo?.name || 'Currículo Sem Nome',
                  date: item.savedAt ? new Date(item.savedAt).toLocaleDateString('pt-BR') : 'Data desconhecida',
                  data: item,
                  isLegacy: false
                });
              });
            }
          } 
          // CASO 2: Arquivo Antigo (Objeto solto 'resume_...')
          else {
            const data = JSON.parse(rawData);
            // Validação básica para garantir que é um currículo
            if (data && data.personalInfo) {
              let dateStr = new Date().toLocaleDateString('pt-BR');
              // Tenta extrair data do timestamp no ID (ex: resume_1767...)
              if (key.includes('_')) {
                 const ts = parseInt(key.split('_')[1]);
                 if (!isNaN(ts)) dateStr = new Date(ts).toLocaleDateString('pt-BR');
              }
              
              foundResumes.push({
                id: key, 
                name: data.personalInfo.name || 'Currículo Antigo',
                date: dateStr,
                data: data,
                isLegacy: true
              });
            }
          }
        } catch (e) {
          console.error("Erro ao ler item:", key, e);
        }
      }
    }
    
    // Remove duplicatas e ordena pelo mais recente
    // Usamos um Map para garantir que IDs únicos sejam preservados
    const uniqueResumes = Array.from(new Map(foundResumes.map(item => [item.id, item])).values());
    
    uniqueResumes.sort((a, b) => {
        // Tenta ordenar por data/ID decrescente
        // Para legacy, o ID tem timestamp. Para novos, o ID é uma data ISO ou timestamp.
        const getTime = (id: string) => {
            if(id.startsWith('resume_')) return parseInt(id.split('_')[1]) || 0;
            return new Date(id).getTime() || 0;
        };
        return getTime(b.id) - getTime(a.id);
    });

    setSavedResumes(uniqueResumes);
  };

  useEffect(() => {
    if (isOpen) {
      loadResumes();
      setExpandedId(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // --- AÇÕES ---

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este currículo?')) {
      // Se for legado, deleta a chave direta
      if (id.startsWith('resume_')) {
          localStorage.removeItem(id);
      } else {
          // Se for da lista nova, filtra e salva
          const storedList = localStorage.getItem('savedResumes');
          if (storedList) {
              const list = JSON.parse(storedList);
              const newList = list.filter((r: any) => r.savedAt !== id);
              localStorage.setItem('savedResumes', JSON.stringify(newList));
          }
      }

      loadResumes(); // Recarrega a lista visualmente
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleEdit = (resume: SavedResume) => {
    // ESTE É O TRUQUE: 
    // O App.tsx espera editar algo que esteja na lista 'savedResumes'.
    // Se tentarmos editar um currículo antigo (legacy), o App.tsx não vai achá-lo pelo ID.
    // Então, se for legacy, nós "migramos" ele para o sistema novo agora mesmo.

    if (resume.isLegacy) {
        // 1. Cria formato novo
        const newSavedAt = new Date().toISOString();
        const migratedResume = { ...resume.data, savedAt: newSavedAt };
        
        // 2. Salva na lista nova
        const storedList = localStorage.getItem('savedResumes');
        const list = storedList ? JSON.parse(storedList) : [];
        list.push(migratedResume);
        localStorage.setItem('savedResumes', JSON.stringify(list));
        
        // 3. (Opcional) Remove o antigo para não duplicar? 
        // Melhor não remover automaticamente por segurança.
        
        // 4. Manda o App editar o ID novo
        onEdit(newSavedAt);
    } else {
        // Se já é novo, só manda editar
        onEdit(resume.id);
    }
    
    onClose();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    // Z-INDEX 9999 (Garante que fica sobre tudo, inclusive o Header novo)
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Meus Currículos</h2>
            <p className="text-gray-500 text-sm mt-0.5">Histórico de versões salvas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
             <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Lista */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
          {savedResumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhum currículo encontrado</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Seus currículos salvos aparecerão aqui.
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
                        <div className="min-w-0">
                          <p className={`font-semibold text-sm truncate pr-2 ${isExpanded ? 'text-blue-700' : 'text-gray-800'}`}>
                            {resume.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {resume.date}
                            {resume.isLegacy && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded">Antigo</span>}
                          </div>
                        </div>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} 
                      />
                    </button>

                    {/* Área Expandida */}
                    {isExpanded && (
                      <div className="border-t border-gray-50 bg-gray-50/50 p-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => handleEdit(resume)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors shadow-sm"
                            >
                                <Check className="w-4 h-4" />
                                Carregar / Editar
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onDownload(resume.data)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Baixar PDF
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, resume.id)}
                                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-100 py-2.5 px-4 rounded-lg font-medium text-sm transition-all"
                                    title="Excluir Permanentemente"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import type { ResumeData } from '../types';

interface SavedResume extends ResumeData {
  savedAt: string;
}

interface MyResumesModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: SavedResume[];
  onEdit: (savedAt: string) => void;
  onDownload: (resumeData: ResumeData) => Promise<void>;
  onDelete: (savedAt: string) => void;
}

const MyResumesModal: React.FC<MyResumesModalProps> = ({ isOpen, onClose, resumes, onEdit, onDownload, onDelete }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  const handleDownload = async (resume: SavedResume) => {
    setDownloadingId(resume.savedAt);
    try {
        await onDownload(resume);
        setDownloadedIds(prev => new Set(prev).add(resume.savedAt));
    } catch (error) {
        console.error("Download failed from modal:", error);
        alert("Ocorreu um erro ao baixar o currículo.");
    } finally {
        setDownloadingId(null);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Meus Currículos Salvos</h3>
        <div className="overflow-y-auto pr-2 -mr-2">
          {resumes.length > 0 ? (
            <div className="space-y-3">
              {resumes.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).map(resume => {
                const isDownloading = downloadingId === resume.savedAt;
                const hasBeenDownloaded = downloadedIds.has(resume.savedAt);
                return (
                    <div key={resume.savedAt} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100" onClick={() => setExpandedId(expandedId === resume.savedAt ? null : resume.savedAt)}>
                        <div>
                        <p className="font-semibold text-gray-800">{resume.personalInfo.name || 'Currículo Sem Nome'}</p>
                        <p className="text-sm text-gray-500">
                            Salvo em: {new Date(resume.savedAt).toLocaleString('pt-BR')}
                        </p>
                        </div>
                        <svg className={`w-5 h-5 text-gray-500 transition-transform ${expandedId === resume.savedAt ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    {expandedId === resume.savedAt && (
                        <div className="p-4 border-t bg-white flex flex-col items-center gap-3">
                            <div className="w-full flex flex-col sm:flex-row gap-3">
                                <button 
                                    onClick={() => handleDownload(resume)} 
                                    disabled={isDownloading}
                                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                                    {isDownloading ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    )}
                                    {isDownloading ? 'Baixando...' : (hasBeenDownloaded ? 'Baixar Novamente' : 'Baixar (Grátis)')}
                                </button>
                                <button onClick={() => onEdit(resume.savedAt)} className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                    Editar
                                </button>
                            </div>
                            <button onClick={() => onDelete(resume.savedAt)} className="text-gray-400 hover:text-red-500 p-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                    )}
                    </div>
                )})}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">Você ainda não tem currículos salvos.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyResumesModal;

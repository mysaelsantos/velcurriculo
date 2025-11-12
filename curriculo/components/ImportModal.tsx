import React, { useState, useRef } from 'react';
import type { ResumeData } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: ();
  onImport: (file: File) => Promise<void>;
  onStartFromScratch: () => void;
  isAnalyzing: boolean;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, onStartFromScratch, isAnalyzing }) => {
  const [step, setStep] = useState<'choice' | 'upload'>('choice');
  const [resumePdf, setResumePdf] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setResumePdf(e.target.files[0]);
    }
  };

  const handleImportClick = async () => {
    if (resumePdf) {
      await onImport(resumePdf);
      // O modal será fechado pelo App.tsx em caso de sucesso
    }
  };

  const handleStartFromScratchClick = () => {
    onStartFromScratch();
    // Reseta o modal para o estado inicial para a próxima vez
    setTimeout(() => setStep('choice'), 300);
  };

  const handleClose = () => {
    onClose();
    // Reseta o modal para o estado inicial para a próxima vez
    setTimeout(() => setStep('choice'), 300);
  };

  const renderContent = () => {
    if (isAnalyzing) {
      return (
        <div className="text-center flex flex-col items-center justify-center h-full min-h-[300px]">
          <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <h3 className="text-2xl font-bold text-gray-800 mt-6">Analisando seu currículo...</h3>
          <p className="text-gray-600 mt-2 max-w-xs">A IA está lendo as informações. Isso pode levar alguns segundos.</p>
        </div>
      );
    }

    if (step === 'upload') {
      return (
        <>
          <h3 className="text-xl font-semibold text-center text-gray-800">Importar Currículo</h3>
          <p className="text-center text-gray-600 mt-2 mb-4">Anexe seu currículo em PDF para preenchimento automático.</p>
          
          <label 
            htmlFor="resume-pdf-upload" 
            className="mt-4 flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-indigo-50/50 hover:bg-indigo-100/50"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {resumePdf ? (
                <p className="font-semibold text-indigo-700">{resumePdf.name}</p>
              ) : (
                <>
                  <p className="mb-2 text-sm text-gray-600"><span className="font-semibold text-indigo-600">Clique para selecionar</span></p>
                  <p className="text-xs text-gray-500">Apenas arquivos PDF</p>
                </>
              )}
            </div>
          </label>
          <input 
            type="file" 
            id="resume-pdf-upload" 
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <button 
            type="button" 
            onClick={handleImportClick}
            disabled={!resumePdf}
            className="mt-6 w-full btn-primary text-white font-semibold py-2 px-4 rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-line"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
            Analisar PDF
          </button>
          
          <button 
            type="button" 
            onClick={() => { setStep('choice'); setResumePdf(null); }}
            className="mt-3 w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-full hover:bg-gray-300 transition-colors"
          >
            Voltar
          </button>
        </>
      );
    }

    // Default: step 'choice'
    return (
      <>
        <h3 className="text-xl font-semibold text-center text-gray-800">Como você prefere começar?</h3>
        <p className="text-center text-gray-600 mt-2 mb-6">Você pode importar um currículo existente ou preencher um novo do zero.</p>
        
        <button 
          type="button" 
          onClick={() => setStep('upload')}
          className="w-full btn-primary text-white font-semibold py-3 px-4 rounded-full transition-all flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          Importar e Preencher com IA
        </button>
        
        <button 
          type="button" 
          onClick={handleStartFromScratchClick}
          className="mt-3 w-full bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-full hover:bg-gray-300 transition-colors"
        >
          Começar do Zero
        </button>
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative transition-all duration-300">
        {!isAnalyzing && (
          <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default ImportModal;

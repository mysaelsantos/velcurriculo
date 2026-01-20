import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Sparkles, PenTool, X, ChevronLeft, FileType } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  onStartFromScratch: () => void;
  isAnalyzing: boolean;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, onStartFromScratch, isAnalyzing }) => {
  const [step, setStep] = useState<'choice' | 'upload'>('choice');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reseta o estado ao fechar
  const handleClose = () => {
    onClose();
    setTimeout(() => setStep('choice'), 300);
  };

  const handleStartFromScratch = () => {
    onStartFromScratch();
    setTimeout(() => setStep('choice'), 300);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validação básica de tipo
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/jpeg',
      'image/png'
    ];

    // Aceita se estiver na lista ou se começar com image/ (para cobrir jpg, png, webp...)
    if (validTypes.includes(file.type) || file.type.startsWith('image/')) {
      await onImport(file);
    } else {
      alert("Formato não suportado. Por favor use PDF, Word (.docx) ou Imagem (JPG/PNG).");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop com Blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={!isAnalyzing ? handleClose : undefined}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-scale">

        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          {step === 'upload' && !isAnalyzing ? (
            <button
              onClick={() => setStep('choice')}
              className="text-gray-500 hover:text-blue-600 flex items-center text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </button>
          ) : (
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {isAnalyzing ? 'Processando' : 'Novo Currículo'}
            </span>
          )}

          {!isAnalyzing && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="p-8">

          {isAnalyzing ? (
            // ESTADO: ANALISANDO
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">A IA está trabalhando...</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                  Estamos lendo seu arquivo e organizando suas informações. Isso leva apenas alguns segundos.
                </p>
              </div>
              <div className="flex gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                <FileType className="w-4 h-4" />
                <span>Extraindo Textos & Imagens</span>
              </div>
            </div>
          ) : step === 'choice' ? (
            // ESTADO: ESCOLHA INICIAL
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Como você prefere começar?</h2>
                <p className="text-gray-500">Escolha a melhor forma de preencher o seu currículo profissional.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {/* Opção 1: Importar (Destaque) */}
                <button
                  onClick={() => setStep('upload')}
                  className="group relative flex md:flex-col items-center md:justify-center p-4 md:p-6 border-2 border-blue-100 bg-blue-50/50 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 text-left md:text-center w-full"
                >
                  <div className="hidden md:block absolute md:top-3 md:right-3">
                    <span className="bg-blue-600 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full uppercase tracking-wide">Recomendado</span>
                  </div>

                  {/* Ícone: Menor no mobile, margem direita no mobile */}
                  <div className="shrink-0 w-10 h-10 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-sm mr-4 md:mr-0 md:mb-4 group-hover:scale-110 transition-transform text-blue-600">
                    <Sparkles className="w-5 h-5 md:w-8 md:h-8" />
                  </div>

                  {/* Texto: Flex grow para ocupar espaço */}
                  <div className="flex-1">
                    <div className="md:hidden mb-1">
                      <span className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Recomendado</span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-0.5 md:mb-2 leading-tight">Importar com IA</h3>
                    <p className="text-xs md:text-sm text-gray-600 leading-snug md:leading-relaxed">
                      Envie seu currículo em <b>PDF, Word ou Foto</b>.
                    </p>
                  </div>
                </button>

                {/* Opção 2: Manual */}
                <button
                  onClick={handleStartFromScratch}
                  className="group flex md:flex-col items-center md:justify-center p-4 md:p-6 border-2 border-transparent bg-gray-50 rounded-xl hover:border-gray-300 hover:bg-white hover:shadow-md transition-all duration-300 text-left md:text-center w-full"
                >
                  <div className="shrink-0 w-10 h-10 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-sm mr-4 md:mr-0 md:mb-4 group-hover:scale-110 transition-transform text-gray-600">
                    <PenTool className="w-5 h-5 md:w-8 md:h-8" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-800 mb-0.5 md:mb-2 leading-tight">Começar do Zero</h3>
                    <p className="text-xs md:text-sm text-gray-600 leading-snug md:leading-relaxed">
                      Preencher dados manualmente.
                    </p>
                  </div>
                </button>
              </div>
            </div>

          ) : (
            // ESTADO: UPLOAD (Drag & Drop)
            <div className="space-y-6 animate-fade-in-scale">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">Envie seu arquivo</h2>
                <p className="text-gray-500 mt-1">Nossa IA aceita PDF, DOCX (Word) ou Fotos legíveis.</p>
              </div>

              <div
                className={`relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer overflow-hidden
                  ${dragActive
                    ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                    : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,image/*"
                />

                <div className="flex flex-col items-center space-y-4 p-6 pointer-events-none">
                  <div className={`p-4 rounded-full bg-white shadow-sm transition-transform ${dragActive ? 'scale-110' : ''}`}>
                    {dragActive ? <Upload className="w-8 h-8 text-blue-600 animate-bounce" /> : <Upload className="w-8 h-8 text-gray-400" />}
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700">
                      {dragActive ? "Solte o arquivo aqui" : "Clique ou arraste seu arquivo"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      PDF, Word ou Imagem (Máx 10MB)
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2 opacity-60">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      <FileText className="w-3 h-3" /> PDF / DOCX
                    </div>
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      <ImageIcon className="w-3 h-3" /> JPG / PNG
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-center text-gray-400">
                Seus dados estão seguros e são processados apenas para gerar o currículo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;

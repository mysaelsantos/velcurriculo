import React from 'react';

interface ContinueProgressModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

const ContinueProgressModal: React.FC<ContinueProgressModalProps> = ({ isOpen, onContinue, onStartNew }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      {/* Correção do Bug:
          Substituído 'transform transition-all' por 'animate-fade-in-scale'.
          Isso garante que o modal surja do centro (scale 0.95 -> 1) sem deslizar lateralmente.
      */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-fade-in-scale flex flex-col items-center text-center">
        
        {/* Ícone de Destaque */}
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>

        {/* Título e Texto Curto */}
        <h3 className="text-xl font-bold text-gray-800 mb-2">
            Continuar de onde parou?
        </h3>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Encontrei um currículo em produção! Vamos continuar de onde parou ou começamos um novo?
        </p>

        {/* Botões */}
        <div className="w-full space-y-3">
            <button
              onClick={onContinue}
              className="w-full btn-primary text-white font-semibold py-3 px-4 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              Continuar editando
            </button>
            
            <button
              onClick={onStartNew}
              className="w-full bg-white text-gray-500 hover:text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors hover:bg-gray-50 text-sm"
            >
              Começar do zero
            </button>
        </div>

      </div>
    </div>
  );
};

export default ContinueProgressModal;

import React from 'react';

interface ContinueProgressModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

const ContinueProgressModal: React.FC<ContinueProgressModalProps> = ({ isOpen, onContinue, onStartNew }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
            <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3 className="text-xl font-bold">Currículo em Andamento</h3>
            <p className="text-blue-100 text-sm mt-1">Encontrámos dados não guardados.</p>
        </div>

        {/* Corpo */}
        <div className="p-6 text-center">
          <p className="text-gray-600 mb-6">
            Parece que fechou a janela enquanto editava o seu currículo. Gostaria de recuperar o progresso de onde parou ou começar um novo?
          </p>

          <div className="space-y-3">
            <button
              onClick={onContinue}
              // Ícone corrigido para uma seta à direita
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              Continuar Editando
            </button>
            
            <button
              onClick={onStartNew}
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Começar do Zero
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinueProgressModal;

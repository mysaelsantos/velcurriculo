import React from 'react';

interface ContinueProgressModalProps {
  isOpen: boolean;
  onContinue: () => void; // Função para continuar o progresso
  onStartNew: () => void; // Função para começar do zero
}

const ContinueProgressModal: React.FC<ContinueProgressModalProps> = ({ isOpen, onContinue, onStartNew }) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative transition-all duration-300 animate-fade-in-scale">
        
        {/* Este modal não tem botão "X" de fechar, pois o usuário precisa tomar uma decisão. */}

        <h3 className="text-xl font-semibold text-center text-gray-800">Progresso Encontrado</h3>
        <p className="text-center text-gray-600 mt-2 mb-6">
          Vimos que você não terminou seu currículo. Deseja continuar de onde parou ou começar um novo?
        </p>
        
        {/* Botão 1: Continuar (Ação Principal, Azul) */}
        <button 
          type="button" 
          onClick={onContinue}
          className="w-full btn-primary text-white font-semibold py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Continuar de onde parei
        </button>
        
        {/* Botão 2: Começar do Zero (Ação Secundária, Cinza) */}
        <button 
          type="button" 
          onClick={onStartNew}
          className="mt-3 w-full bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-full hover:bg-gray-300 transition-colors"
        >
          Começar do Zero
        </button>
      </div>
    </div>
  );
};

export default ContinueProgressModal;

import React, { useState, useEffect, useRef } from 'react';

// Declaramos a biblioteca global do QRCode que já existe no seu index.html
declare const QRCode: any;

interface PixPaymentData {
  qrCodeUrl: string;
  copyPasteCode: string;
  paymentId: string;
}

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PixPaymentData;
  onPaymentSuccess: () => void;
  isTestMode?: boolean;
  amount: number;
}

type PaymentStatus = 'pending' | 'success' | 'expired' | 'error';

const PixModal: React.FC<PixModalProps> = ({ isOpen, onClose, paymentData, onPaymentSuccess, isTestMode = false, amount }) => {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [isCopied, setIsCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos
  const [localQrCodeUrl, setLocalQrCodeUrl] = useState<string | null>(null); // Estado para o QR gerado com nível H
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPaymentStatus = async () => {
    try {
      const backendUrl = `/.netlify/functions/get-payment-status?paymentId=${paymentData.paymentId}`;
      
      const response = await fetch(backendUrl);
      const data = await response.json();
      if (data.status === 'succeeded') {
        setStatus('success');
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
       if (intervalRef.current) clearInterval(intervalRef.current);
      setStatus('error');
    }
  };

  // Efeito para gerar o QR Code localmente com Correção de Erro ALTA (H)
  useEffect(() => {
    const generateHighResQR = async () => {
        // Se não tivermos o código ou a lib não carregou, não faz nada (usa o padrão)
        if (!paymentData.copyPasteCode || typeof QRCode === 'undefined') {
             setLocalQrCodeUrl(null);
             return;
        }

        try {
            // Gera o QR Code com nível H (permite até 30% de cobertura/danos)
            const url = await QRCode.toDataURL(paymentData.copyPasteCode, {
                errorCorrectionLevel: 'H', 
                margin: 1,
                width: 300,
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                }
            });
            setLocalQrCodeUrl(url);
        } catch (error) {
            console.error("Failed to generate client-side QR:", error);
            setLocalQrCodeUrl(null);
        }
    };

    if (isOpen && status === 'pending') {
        generateHighResQR();
    }
  }, [paymentData.copyPasteCode, isOpen, status]);
  
  // Efeito para sucesso do pagamento
  useEffect(() => {
    if (status === 'success') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Aumentado para 5 segundos para usuário ver a confirmação
        setTimeout(() => {
            onPaymentSuccess();
        }, 5000);
    }
  }, [status, onPaymentSuccess]); 

  // Efeito para controlar o timer e polling de status
  useEffect(() => {
    if (isTestMode && isOpen) {
        console.log("PixModal is in Test Mode. Simulating success in 8 seconds.");
        const testTimer = setTimeout(() => {
            setStatus('success');
        }, 8000);
        return () => clearTimeout(testTimer);
    }

    if (isOpen && status === 'pending' && !isTestMode) {
      intervalRef.current = setInterval(checkPaymentStatus, 3000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isOpen, status, paymentData.paymentId, isTestMode]);

  // Timer de contagem regressiva
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen && timeLeft > 0 && status === 'pending') {
        timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && status === 'pending') {
        setStatus('expired');
        if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => clearTimeout(timer);
  }, [isOpen, timeLeft, status]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(paymentData.copyPasteCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const renderContent = () => {
    switch(status) {
        case 'success':
            return (
                <div className="text-center flex flex-col items-center justify-center h-full min-h-[480px]">
                    <div className="flex items-center justify-center bg-green-100 rounded-full w-24 h-24 animate-bounce">
                       <svg className="w-16 h-16 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                       </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-6">Pagamento Confirmado!</h3>
                    <p className="text-gray-600 mt-2">Seu download iniciará automaticamente em breve.</p>
                    
                    <button 
                        onClick={onClose} 
                        className="mt-6 w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-full hover:bg-gray-300 transition-colors"
                    >
                        Voltar
                    </button>
                </div>
            );
        case 'expired':
            return (
                <div className="text-center flex flex-col items-center justify-center h-full min-h-[480px]">
                     <div className="flex items-center justify-center bg-yellow-100 rounded-full w-24 h-24">
                        <svg className="w-14 h-14 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-6">Código Pix Expirado</h3>
                    <p className="text-gray-600 mt-2 max-w-xs">O tempo para pagamento acabou. Por favor, gere um novo código.</p>
                    <div className="flex flex-col gap-3 mt-6 w-full">
                        <button onClick={onClose} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            Gerar Novo Código
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
                            Voltar
                        </button>
                    </div>
                </div>
            );
        case 'error':
             return (
                <div className="text-center flex flex-col items-center justify-center h-full min-h-[480px]">
                    <div className="flex items-center justify-center bg-red-100 rounded-full w-24 h-24">
                        <svg className="w-14 h-14 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                     </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-6">Erro no Pagamento</h3>
                    <p className="text-gray-600 mt-2 max-w-xs">Não foi possível verificar o pagamento. Tente novamente.</p>
                    
                    <div className="flex flex-col gap-3 mt-6 w-full">
                        <button onClick={onClose} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            Tentar Novamente
                        </button>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
                            Voltar
                        </button>
                    </div>
                </div>
            );
        case 'pending':
        default:
            const formattedAmount = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(amount);

            return (
                <>
                    <h3 className="text-xl font-semibold text-center text-gray-800">Pague com Pix para Baixar</h3>
                    
                    <p className="text-3xl font-bold text-center mt-2 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {formattedAmount}
                    </p>

                    <div className="p-4 border rounded-xl bg-gray-50 flex justify-center items-center shadow-inner mt-2 mb-4">
                        {/* Container Relativo para o QR Code + Logo */}
                        <div className="relative inline-block w-48 h-48">
                            {/* QR Code (Usa o local gerado com nível H se disponível, senão usa o padrão) */}
                            <img 
                                src={localQrCodeUrl || paymentData.qrCodeUrl} 
                                alt="QR Code Pix" 
                                className="w-full h-full object-contain mix-blend-multiply" 
                            />
                            
                            {/* Logo Centralizado (Overlay) SEM BACKGROUND */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-16 h-16">
                                <img 
                                    src="/vel-qr-pix.png" 
                                    alt="Logo Pix" 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        // Se a imagem falhar, esconde o container do logo
                                        (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full space-y-2 mb-4">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between">
                            <span>Pix Copia e Cola</span>
                            <span className="text-blue-600 text-[10px] font-normal cursor-pointer hover:underline" onClick={handleCopy}>clique para copiar</span>
                        </label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                readOnly 
                                value={paymentData.copyPasteCode} 
                                className="w-full bg-gray-100 border border-gray-200 rounded-lg py-2.5 pl-3 pr-24 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                            />
                            <button 
                                onClick={handleCopy} 
                                className={`absolute right-1 top-1 bottom-1 px-3 rounded-md text-xs font-bold transition-all duration-200 shadow-sm ${
                                    isCopied 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {isCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 text-center pb-2">
                        <div className="flex justify-center items-center gap-2 mb-2">
                           <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <p className="text-gray-600 font-medium text-sm">Aguardando confirmação...</p>
                        </div>
                         <p className="text-xs text-gray-400">Expira em: <span className="font-mono font-medium text-gray-600">{minutes}:{seconds}</span></p>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="mt-2 w-full text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors p-2"
                    >
                        Cancelar
                    </button>
                </>
            );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative transition-all duration-300 transform scale-100">
        {renderContent()}
      </div>
    </div>
  );
};

export default PixModal;

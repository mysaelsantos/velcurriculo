import React, { useState, useEffect, useRef } from 'react';

interface PixPaymentData {
  qrCodeUrl: string;
  copyPasteCode: string;
  paymentIntentId: string;
}

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PixPaymentData;
  onPaymentSuccess: () => void;
  isTestMode?: boolean;
}

type PaymentStatus = 'pending' | 'success' | 'expired' | 'error';

const PixModal: React.FC<PixModalProps> = ({ isOpen, onClose, paymentData, onPaymentSuccess, isTestMode = false }) => {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [isCopied, setIsCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPaymentStatus = async () => {
    try {
      const backendUrl = `/.netlify/functions/get-payment-status?paymentIntentId=${paymentData.paymentIntentId}`;
      
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
  
  // biome-ignore lint/correctness/useExhaustiveDependencies: This effect should only run when the status changes to 'success'
  useEffect(() => {
    if (status === 'success') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => {
            onPaymentSuccess();
        }, 3000);
    }
  }, [status]);


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
  }, [isOpen, status, paymentData.paymentIntentId, isTestMode]);

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
                <div className="text-center flex flex-col items-center justify-center h-[480px]">
                    <div className="flex items-center justify-center bg-green-100 rounded-full w-24 h-24">
                       <svg className="w-16 h-16 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                       </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-6">Pagamento Aprovado!</h3>
                    <p className="text-gray-600 mt-2">Seu download começará em instantes...</p>
                </div>
            );
        case 'expired':
            return (
                <div className="text-center flex flex-col items-center justify-center h-[480px]">
                     <div className="flex items-center justify-center bg-yellow-100 rounded-full w-24 h-24">
                        <svg className="w-14 h-14 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-6">Código Pix Expirado</h3>
                    <p className="text-gray-600 mt-2 max-w-xs">O tempo para pagamento acabou. Por favor, feche esta janela e tente novamente para gerar um novo código.</p>
                </div>
            );
        case 'error':
             return (
                <div className="text-center flex flex-col items-center justify-center h-[480px]">
                    <div className="flex items-center justify-center bg-red-100 rounded-full w-24 h-24">
                        <svg className="w-14 h-14 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                     </div>
                    <h3 className="text-2xl font-bold text-gray-800 mt-6">Ocorreu um Erro</h3>
                    <p className="text-gray-600 mt-2 max-w-xs">Não foi possível verificar o pagamento. Por favor, tente novamente mais tarde.</p>
                </div>
            );
        case 'pending':
        default:
            return (
                <>
                    <h3 className="text-xl font-semibold text-center text-gray-800">Pague com Pix para Baixar</h3>
                    <div className="my-4 p-4 border rounded-lg bg-gray-50 flex justify-center">
                        <img src={paymentData.qrCodeUrl} alt="QR Code Pix" className="w-48 h-48" />
                    </div>
                    <p className="text-center text-sm text-gray-500 mb-2">Ou use o Pix Copia e Cola:</p>
                    <div className="relative">
                        <input type="text" readOnly value={paymentData.copyPasteCode} className="w-full bg-gray-100 border-gray-300 rounded-lg p-3 text-sm text-gray-700 pr-24" />
                        <button onClick={handleCopy} className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-md hover:bg-blue-700 transition-colors">
                            {isCopied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                    <div className="mt-6 text-center">
                        <div className="flex justify-center items-center gap-2">
                           <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <p className="text-gray-700 font-medium">Aguardando confirmação de pagamento...</p>
                        </div>
                         <p className="text-sm text-gray-500 mt-2">O código expira em: <span className="font-bold text-gray-800">{minutes}:{seconds}</span></p>
                    </div>
                </>
            );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative transition-all duration-300">
        {status === 'pending' && (
            <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default PixModal;
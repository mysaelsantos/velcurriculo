import React, { useState, useEffect, useRef } from 'react';

// Necessário para gerar o QR Code com nível de correção 'H' (Alto) para suportar o logo
declare const QRCode: any;

interface PixPaymentData {
    qrCodeUrl: string;
    copyPasteCode: string;
    paymentId: string;
    couponCode?: string | null;
    userEmail?: string | null;
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

const STORAGE_KEY = '@velcurriculo:pix_session_v1';
const PIX_EXPIRATION_TIME = 600; // 10 minutos em segundos

const PixModal: React.FC<PixModalProps> = ({ isOpen, onClose, paymentData, onPaymentSuccess, isTestMode = false, amount }) => {
    // Estado inicial
    const [activePaymentData, setActivePaymentData] = useState<PixPaymentData>(paymentData);
    const [status, setStatus] = useState<PaymentStatus>('pending');
    const [isCopied, setIsCopied] = useState(false);

    // Timers e Controle
    const [timeLeft, setTimeLeft] = useState(PIX_EXPIRATION_TIME);
    const [creationTime, setCreationTime] = useState<number>(Date.now());
    const [localQrCodeUrl, setLocalQrCodeUrl] = useState<string | null>(null);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasCheckedOnMount = useRef(false); // Evita verificação dupla desnecessária

    // --- FUNÇÕES DE ARMAZENAMENTO (Sobrervivem ao Refresh) ---

    const clearSession = () => {
        localStorage.removeItem(STORAGE_KEY);
    };

    const saveSession = (data: PixPaymentData, timestamp: number) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            data: data,
            timestamp: timestamp,
            couponCode: data.couponCode || null,
            userEmail: data.userEmail || null
        }));
    };

    // --- AÇÃO CRÍTICA: VERIFICAR STATUS NO BANCO ---
    const checkPaymentStatus = async (currentId: string, coupon?: string | null, email?: string | null) => {
        try {
            // Construir URL com parâmetros de cupom se existirem
            let backendUrl = `/.netlify/functions/get-payment-status?paymentId=${currentId}`;
            if (coupon) {
                backendUrl += `&coupon=${encodeURIComponent(coupon)}`;
            }
            if (email) {
                backendUrl += `&email=${encodeURIComponent(email)}`;
            }

            const response = await fetch(backendUrl);
            const data = await response.json();

            if (data.status === 'succeeded') {
                setStatus('success');
                return true;
            }
            return false;
        } catch (error) {
            console.error("Erro ao verificar pagamento:", error);
            return false;
        }
    };

    // --- LÓGICA DE RESTAURAÇÃO (O Cérebro do Modal) ---
    useEffect(() => {
        if (isOpen) {
            const savedSession = localStorage.getItem(STORAGE_KEY);
            const now = Date.now();
            let sessionRestored = false;

            if (savedSession) {
                try {
                    const parsedSession = JSON.parse(savedSession);

                    // Calcula quanto tempo passou REALMENTE (mesmo com navegador fechado)
                    const elapsedSeconds = Math.floor((now - parsedSession.timestamp) / 1000);
                    const remaining = PIX_EXPIRATION_TIME - elapsedSeconds;

                    // Se ainda resta tempo OU se passou pouco tempo (damos 2 min de tolerância para checar se pagou)
                    if (remaining > -120) {
                        console.log(`Sessão restaurada. Criada há ${elapsedSeconds}s.`);

                        // 1. Restaura os dados visuais
                        setActivePaymentData(parsedSession.data);
                        setCreationTime(parsedSession.timestamp);

                        if (remaining > 0) {
                            setTimeLeft(remaining);
                        } else {
                            setTimeLeft(0);
                            // Se o tempo acabou mas estamos na tolerância, não mostra expirado ainda,
                            // pois vamos checar o pagamento abaixo.
                        }

                        sessionRestored = true;

                        // 2. CHECK IMEDIATO: O usuário pagou enquanto estava fora?
                        if (!hasCheckedOnMount.current && status !== 'success') {
                            hasCheckedOnMount.current = true;
                            checkPaymentStatus(
                                parsedSession.data.paymentId,
                                parsedSession.couponCode || parsedSession.data.couponCode,
                                parsedSession.userEmail || parsedSession.data.userEmail
                            ).then(paid => {
                                if (!paid && remaining <= 0) {
                                    // Se não pagou e o tempo acabou de verdade, aí sim expira
                                    setStatus('expired');
                                    clearSession();
                                }
                            });
                        }
                    } else {
                        // Sessão muito antiga
                        clearSession();
                    }
                } catch (e) {
                    console.error("Erro ao ler sessão:", e);
                    clearSession();
                }
            }

            // Se não havia sessão válida salva, usamos os dados novos que vieram do App
            if (!sessionRestored) {
                // Só sobrescreve se for um ID diferente
                if (paymentData.paymentId !== activePaymentData.paymentId || !savedSession) {
                    const newTimestamp = Date.now();
                    setActivePaymentData(paymentData);
                    setCreationTime(newTimestamp);
                    setTimeLeft(PIX_EXPIRATION_TIME);
                    saveSession(paymentData, newTimestamp);
                    setStatus('pending');
                    hasCheckedOnMount.current = false; // Reset para permitir checks futuros
                }
            }
        }
    }, [isOpen, paymentData.paymentId]);

    // --- TIMER VISUAL ---
    useEffect(() => {
        if (!isOpen || status !== 'pending') return;

        const timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - creationTime) / 1000);
            const remaining = PIX_EXPIRATION_TIME - elapsed;

            if (remaining <= 0) {
                setTimeLeft(0);
                // Antes de mostrar "Expirado", fazemos uma ÚLTIMA checagem
                // Vai que ele pagou no último segundo?
                checkPaymentStatus(
                    activePaymentData.paymentId,
                    activePaymentData.couponCode,
                    activePaymentData.userEmail
                ).then(paid => {
                    if (!paid) {
                        setStatus('expired');
                        clearSession();
                        clearInterval(timerInterval);
                    }
                });
            } else {
                setTimeLeft(remaining);
            }
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [isOpen, status, creationTime, activePaymentData.paymentId]);

    // --- LOOP DE VERIFICAÇÃO (Polling) ---
    useEffect(() => {
        // Modo de teste
        if (isTestMode && isOpen && status === 'pending') {
            const testTimer = setTimeout(() => setStatus('success'), 8000);
            return () => clearTimeout(testTimer);
        }

        // Loop normal (verifica a cada 3s)
        if (isOpen && status === 'pending' && !isTestMode) {
            intervalRef.current = setInterval(() => {
                checkPaymentStatus(
                    activePaymentData.paymentId,
                    activePaymentData.couponCode,
                    activePaymentData.userEmail
                );
            }, 3000);

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [isOpen, status, activePaymentData.paymentId, isTestMode]);

    // --- TRATAMENTO DE SUCESSO ---
    useEffect(() => {
        if (status === 'success') {
            if (intervalRef.current) clearInterval(intervalRef.current);
            clearSession(); // Pode limpar a sessão agora
            setTimeout(() => {
                onPaymentSuccess();
            }, 3000); // Reduzi para 3s para ser mais ágil
        }
    }, [status, onPaymentSuccess]);

    // --- GERAÇÃO DO QR CODE LOCAL ---
    useEffect(() => {
        const generateHighResQR = async () => {
            if (!activePaymentData.copyPasteCode || typeof QRCode === 'undefined') {
                setLocalQrCodeUrl(null);
                return;
            }
            try {
                const url = await QRCode.toDataURL(activePaymentData.copyPasteCode, {
                    errorCorrectionLevel: 'H',
                    margin: 0,
                    width: 300,
                    color: { dark: "#000000", light: "#ffffff" }
                });
                setLocalQrCodeUrl(url);
            } catch (error) {
                setLocalQrCodeUrl(null);
            }
        };
        if (isOpen && status === 'pending') generateHighResQR();
    }, [activePaymentData.copyPasteCode, isOpen, status]);

    const handleCopy = () => {
        navigator.clipboard.writeText(activePaymentData.copyPasteCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Botão Voltar (Apenas fecha visualmente, MANTÉM sessão)
    const handleCloseVisualOnly = () => {
        onClose();
    };

    // Botão Cancelar/Novo (Limpa sessão)
    const handleDiscardAndClose = () => {
        clearSession();
        onClose();
    };

    if (!isOpen) return null;

    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');

    const renderContent = () => {
        switch (status) {
            case 'success':
                return (
                    <div className="text-center flex flex-col items-center justify-center h-full min-h-[480px]">
                        <div className="flex items-center justify-center bg-green-100 rounded-full w-24 h-24">
                            <svg className="w-16 h-16 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mt-6">Pagamento Confirmado!</h3>
                        <p className="text-gray-600 mt-2">Seu download iniciará automaticamente em breve.</p>
                        <button onClick={handleDiscardAndClose} className="mt-6 w-full bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl hover:bg-gray-300 transition-colors">Fechar</button>
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
                            <button onClick={handleDiscardAndClose} className="bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors">Gerar Novo Código</button>
                            <button onClick={handleDiscardAndClose} className="text-gray-500 hover:text-gray-700 font-medium py-2">Voltar</button>
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
                        <p className="text-gray-600 mt-2 max-w-xs">Não foi possível verificar o pagamento.</p>
                        <div className="flex flex-col gap-3 mt-6 w-full">
                            <button onClick={handleDiscardAndClose} className="bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors">Tentar Novamente</button>
                            <button onClick={handleDiscardAndClose} className="text-gray-500 hover:text-gray-700 font-medium py-2">Voltar</button>
                        </div>
                    </div>
                );
            case 'pending':
            default:
                const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
                return (
                    <>
                        <h3 className="text-xl font-semibold text-center text-gray-800">Pague com Pix para Baixar</h3>
                        <p className="text-3xl font-bold text-center mt-2 mb-2 gradient-text">{formattedAmount}</p>
                        <div className="p-4 border rounded-xl bg-gray-50 flex justify-center shadow-inner">
                            <div className="relative w-48 h-48">
                                <img src={localQrCodeUrl || activePaymentData.qrCodeUrl} alt="QR Code Pix" className="w-full h-full object-contain" />
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center">
                                    <img src="/vel-qr-pix.png" alt="Logo Pix" className="w-full h-full object-contain" />
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-sm text-gray-500 mb-2 mt-4">Ou use o Pix Copia e Cola:</p>
                        <div className="relative">
                            <input type="text" readOnly value={activePaymentData.copyPasteCode} className="w-full bg-gray-100 border-gray-300 rounded-xl p-3 text-base text-gray-700 pr-24 outline-none focus:ring-2 focus:ring-blue-500" />
                            <button onClick={handleCopy} className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors">
                                {isCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                        <div className="mt-6 text-center">
                            <div className="flex justify-center items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p className="text-gray-700 font-medium">Aguardando confirmação...</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">O código expira em: <span className="font-bold text-gray-800">{minutes}:{seconds}</span></p>
                        </div>

                        <button
                            onClick={handleCloseVisualOnly}
                            className="mt-6 w-full bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-full hover:bg-gray-300 transition-colors"
                        >
                            Voltar
                        </button>
                    </>
                );
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative transition-all duration-300 animate-fade-in-scale">
                {renderContent()}
            </div>
        </div>
    );
};

export default PixModal;

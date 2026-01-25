import React, { useState } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// === ÍCONES SVG (Estilo do Site Principal) ===
const Icons = {
    Spinner: () => (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    ),
    Copy: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    ),
    Check: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    ChevronDown: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
        </svg>
    ),
    Users: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    ),
    DollarSign: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
    ),
    Wallet: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
        </svg>
    ),
    Calendar: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    ),
    AlertCircle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
    ),
    CheckCircle: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
    ),
    ArrowLeft: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
    ),
    Link: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
    ),
    Clock: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    ),
};

// === INTERFACES ===
interface CouponData {
    code: string;
    pin: string;
    usageCount: number;
    maxUses: number;
    commissionPerUse: number;
    totalWithdrawn: number;
    isActive: boolean;
}

interface WithdrawRequest {
    id: string;
    couponCode: string;
    requestedAt: Timestamp;
    amount: number;
    pixKey: string;
    status: 'pending' | 'paid' | 'rejected';
}

// === COMPONENTE FAQ ===
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 flex justify-between items-center text-left group"
            >
                <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{question}</span>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                <p className="text-gray-600 text-sm leading-relaxed">{answer}</p>
            </div>
        </div>
    );
};

// === TELA DE LOADING (Igual ao site principal) ===
const LoadingScreen = () => (
    <div className="fixed inset-0 w-screen h-[100dvh] z-[200] bg-white flex items-center justify-center">
        <div className="flex flex-col items-center justify-center m-auto animate-fade-in-scale px-4">
            <img src="/logo-azul.png" alt="Vel Currículo" className="w-48 md:w-56 mx-auto mb-2 object-contain" />
            <p className="text-gray-500 font-medium text-sm md:text-base text-center leading-relaxed">
                Feito para quem precisa de <br /> resultados
            </p>
        </div>
        <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400 text-xs font-medium">Carregando painel...</p>
        </div>
    </div>
);

// === COMPONENTE PRINCIPAL ===
const MyCouponsPage: React.FC = () => {
    // Estados
    const [couponCode, setCouponCode] = useState('');
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [couponData, setCouponData] = useState<CouponData | null>(null);
    const [pixKey, setPixKey] = useState('');
    const [isRequestingSaque, setIsRequestingSaque] = useState(false);
    const [saqueMessage, setSaqueMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);
    const [copied, setCopied] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    React.useEffect(() => {
        setTimeout(() => setPageLoading(false), 1200);
    }, []);

    // Variáveis calculadas
    const isFriday = new Date().getDay() === 5;
    const totalEarnings = couponData ? (couponData.usageCount * (couponData.commissionPerUse || 1)) : 0;
    const totalWithdrawn = couponData?.totalWithdrawn || 0;
    const availableBalance = totalEarnings - totalWithdrawn;
    const pendingWithdraw = withdrawRequests.filter(w => w.status === 'pending').reduce((sum: number, w: WithdrawRequest) => sum + w.amount, 0);

    // Funções
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const cleanCode = couponCode.toUpperCase().trim();
            const couponRef = doc(db, 'coupons', cleanCode);
            const couponSnap = await getDoc(couponRef);

            if (!couponSnap.exists()) throw new Error('Cupom não encontrado.');
            const data = couponSnap.data() as CouponData;
            if (!data.pin) throw new Error('Este cupom não possui acesso de afiliado.');
            if (data.pin !== pin) throw new Error('PIN incorreto.');

            setCouponData({ ...data, code: cleanCode });
            setIsAuthenticated(true);
            await loadWithdrawRequests(cleanCode);
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadWithdrawRequests = async (code: string) => {
        try {
            const q = query(collection(db, 'withdrawRequests'), where('couponCode', '==', code), orderBy('requestedAt', 'desc'));
            const snapshot = await getDocs(q);
            setWithdrawRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawRequest)));
        } catch (err) {
            console.error('Erro ao carregar saques:', err);
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCouponData(null);
        setCouponCode('');
        setPin('');
        setWithdrawRequests([]);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`https://velcurriculo.com.br?cupom=${couponData?.code}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRequestWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaqueMessage(null);
        if (!isFriday) return setSaqueMessage({ type: 'error', text: 'Saques só podem ser solicitados às sextas-feiras.' });
        if (availableBalance < 5) return setSaqueMessage({ type: 'error', text: 'Valor mínimo para saque: R$ 5,00.' });
        if (pendingWithdraw > 0) return setSaqueMessage({ type: 'error', text: 'Você já possui um saque pendente.' });
        if (!pixKey.trim()) return setSaqueMessage({ type: 'error', text: 'Informe sua chave PIX.' });

        setIsRequestingSaque(true);
        try {
            await addDoc(collection(db, 'withdrawRequests'), {
                couponCode: couponData?.code,
                requestedAt: Timestamp.now(),
                amount: availableBalance,
                pixKey: pixKey.trim(),
                status: 'pending'
            });
            setSaqueMessage({ type: 'success', text: `Solicitação de R$ ${availableBalance.toFixed(2)} enviada!` });
            setPixKey('');
            if (couponData?.code) await loadWithdrawRequests(couponData.code);
        } catch {
            setSaqueMessage({ type: 'error', text: 'Erro ao solicitar saque. Tente novamente.' });
        } finally {
            setIsRequestingSaque(false);
        }
    };

    const formatStatus = (status: string) => {
        const map: Record<string, { text: string; bg: string; text_color: string }> = {
            pending: { text: 'Pendente', bg: 'bg-yellow-100', text_color: 'text-yellow-700' },
            paid: { text: 'Pago', bg: 'bg-green-100', text_color: 'text-green-700' },
            rejected: { text: 'Rejeitado', bg: 'bg-red-100', text_color: 'text-red-700' },
        };
        return map[status] || { text: status, bg: 'bg-gray-100', text_color: 'text-gray-700' };
    };

    const faqData = [
        { question: "Como funciona o programa de afiliados?", answer: "Compartilhe seu cupom de desconto. Cada vez que alguém usar seu cupom para baixar um currículo pago, você recebe R$ 1,00 de comissão." },
        { question: "Quando posso solicitar um saque?", answer: "Saques podem ser solicitados apenas às sextas-feiras. O pagamento é processado em até 1 dia útil via PIX." },
        { question: "Qual o valor mínimo para saque?", answer: "O valor mínimo é R$ 5,00, equivalente a 5 usos válidos do seu cupom." },
        { question: "Como recebo meu pagamento?", answer: "O pagamento é feito exclusivamente via PIX. Informe sua chave (CPF, telefone, e-mail ou aleatória) ao solicitar o saque." },
    ];

    // Loading inicial
    if (pageLoading) return <LoadingScreen />;

    // ====================== TELA DE LOGIN ======================
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col font-poppins">
                {/* Header simples */}
                <header className="py-6 px-4">
                    <div className="max-w-md mx-auto flex items-center justify-between">
                        <a href="#/" className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium">
                            <Icons.ArrowLeft />
                            <span>Voltar ao site</span>
                        </a>
                    </div>
                </header>

                {/* Conteúdo central */}
                <main className="flex-1 flex items-center justify-center px-4 pb-16">
                    <div className="w-full max-w-sm">
                        {/* Logo e título */}
                        <div className="text-center mb-8">
                            <img src="/logo-azul.png" alt="Vel Currículo" className="h-12 mx-auto mb-6" />
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                                Área do <span className="gradient-text">Afiliado</span>
                            </h1>
                            <p className="text-gray-500">Acompanhe suas comissões e solicite saques</p>
                        </div>

                        {/* Card de login */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Código do Cupom
                                    </label>
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Ex: JOAO10"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase font-mono tracking-wider text-center text-lg transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        PIN de Acesso
                                    </label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="••••"
                                        maxLength={4}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-center text-2xl tracking-[0.5em] font-mono transition-all"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                                        <Icons.AlertCircle />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <><Icons.Spinner /> Verificando...</> : 'Acessar Painel'}
                                </button>
                            </form>
                        </div>

                        {/* Link de contato */}
                        <p className="text-center text-sm text-gray-500 mt-6">
                            Não tem um cupom?{' '}
                            <a
                                href="https://wa.me/5537984116034"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                            >
                                Fale conosco
                            </a>
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // ====================== DASHBOARD DO AFILIADO ======================
    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 font-poppins">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
                    <img src="/logo-azul.png" alt="Vel Currículo" className="h-8" />
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-1.5 rounded-full">
                            {couponData?.code}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors"
                        >
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

                {/* Saldo Disponível - Card Principal */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Icons.Wallet />
                        </div>
                        <span className="font-medium text-blue-100">Disponível para saque</span>
                    </div>
                    <p className="text-4xl md:text-5xl font-bold mb-1">
                        R$ {availableBalance.toFixed(2).replace('.', ',')}
                    </p>
                    {totalWithdrawn > 0 && (
                        <p className="text-blue-200 text-sm">Já sacado: R$ {totalWithdrawn.toFixed(2).replace('.', ',')}</p>
                    )}
                </div>

                {/* Cards de Métricas */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                        <div className="flex items-center gap-2 text-blue-500 mb-2">
                            <Icons.Users />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{couponData?.usageCount || 0}</p>
                        <p className="text-sm text-gray-500">Usos do cupom</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                        <div className="flex items-center gap-2 text-green-500 mb-2">
                            <Icons.DollarSign />
                        </div>
                        <p className="text-2xl font-bold text-gray-800">R$ {totalEarnings.toFixed(2).replace('.', ',')}</p>
                        <p className="text-sm text-gray-500">Total ganho</p>
                    </div>
                </div>

                {/* Link de compartilhamento */}
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-700 font-semibold mb-3">
                        <Icons.Link />
                        <span>Seu link de indicação</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={`velcurriculo.com.br?cupom=${couponData?.code}`}
                            readOnly
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 text-sm truncate"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {copied ? <><Icons.Check /> Copiado!</> : <><Icons.Copy /> Copiar</>}
                        </button>
                    </div>
                </div>

                {/* Solicitar Saque */}
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Solicitar Saque</h3>

                    {/* Alertas informativos */}
                    <div className="space-y-2 mb-4">
                        {!isFriday && (
                            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <span className="text-amber-500"><Icons.Calendar /></span>
                                <p className="text-amber-700 text-sm">Saques disponíveis apenas às <strong>sextas-feiras</strong></p>
                            </div>
                        )}

                        {availableBalance < 5 && availableBalance >= 0 && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <span className="text-blue-500"><Icons.AlertCircle /></span>
                                <p className="text-blue-700 text-sm">Mínimo R$ 5,00 — Faltam <strong>{Math.max(0, 5 - (couponData?.usageCount || 0))} usos</strong></p>
                            </div>
                        )}

                        {pendingWithdraw > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                                <span className="text-orange-500"><Icons.Clock /></span>
                                <p className="text-orange-700 text-sm">Saque de <strong>R$ {pendingWithdraw.toFixed(2).replace('.', ',')}</strong> em processamento</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleRequestWithdraw} className="space-y-3">
                        <input
                            type="text"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="Sua chave PIX (CPF, telefone, e-mail...)"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0}
                        />

                        {saqueMessage && (
                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${saqueMessage.type === 'success'
                                    ? 'bg-green-50 border border-green-100 text-green-700'
                                    : 'bg-red-50 border border-red-100 text-red-700'
                                }`}>
                                {saqueMessage.type === 'success' ? <Icons.CheckCircle /> : <Icons.AlertCircle />}
                                <span>{saqueMessage.text}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0 || isRequestingSaque}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isRequestingSaque
                                ? <><Icons.Spinner /> Solicitando...</>
                                : `Solicitar R$ ${availableBalance.toFixed(2).replace('.', ',')}`
                            }
                        </button>
                    </form>
                </div>

                {/* Histórico de Saques */}
                {withdrawRequests.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">Histórico de Saques</h3>
                        <div className="space-y-3">
                            {withdrawRequests.slice(0, 5).map((req) => {
                                const status = formatStatus(req.status);
                                return (
                                    <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-bold text-gray-800">R$ {req.amount.toFixed(2).replace('.', ',')}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Icons.Clock />
                                                {req.requestedAt?.toDate?.()?.toLocaleDateString('pt-BR') || '-'}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.bg} ${status.text_color}`}>
                                            {status.text}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Como Funciona */}
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-6">Como funciona</h3>
                    <div className="space-y-4">
                        {[
                            { step: 1, title: 'Compartilhe seu link', desc: 'Envie para amigos que precisam de um currículo profissional.' },
                            { step: 2, title: 'Eles ganham desconto', desc: 'Seu cupom oferece um desconto exclusivo para novos usuários.' },
                            { step: 3, title: 'Você ganha comissão', desc: 'A cada uso válido, você recebe R$ 1,00 de comissão.' },
                            { step: 4, title: 'Saque via PIX', desc: 'Às sextas-feiras, solicite o saque do seu saldo.' },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-4 group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 transition-transform group-hover:scale-110 shadow-lg ${item.step === 1
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {item.step}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800">{item.title}</h4>
                                    <p className="text-gray-500 text-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-2">Dúvidas Frequentes</h3>
                    <div>
                        {faqData.map((item, i) => (
                            <FAQItem key={i} question={item.question} answer={item.answer} />
                        ))}
                    </div>
                </div>

                {/* Regras */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Regras do Programa</h3>
                    <ul className="space-y-2 text-gray-600 text-sm">
                        {[
                            'Comissão de R$ 1,00 por uso válido (pagamento confirmado)',
                            'Saques disponíveis apenas às sextas-feiras',
                            'Valor mínimo para saque: R$ 5,00',
                            'Pagamento via PIX em até 1 dia útil',
                            'Proibido o auto-uso do próprio cupom',
                        ].map((rule, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5"><Icons.CheckCircle /></span>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center border-t border-gray-100 mt-8">
                <a href="#/" className="text-blue-600 hover:underline text-sm font-medium flex items-center justify-center gap-2">
                    <Icons.ArrowLeft />
                    Voltar para o site
                </a>
                <p className="mt-3 text-gray-400 text-xs">VelCurrículo © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
};

export default MyCouponsPage;

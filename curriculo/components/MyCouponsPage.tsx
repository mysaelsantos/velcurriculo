import React, { useState } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// === ÍCONES SVG ===
const Icons = {
    Spinner: () => (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    ),
    Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
    Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
    CheckCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    Link2: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
    Gift: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>,
    Share2: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
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

// === FAQ ITEM ===
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex justify-between items-center text-left group">
                <span className="font-medium text-gray-700 text-sm group-hover:text-blue-600 transition-colors">{question}</span>
                <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}><Icons.ChevronDown /></span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                <p className="text-gray-500 text-sm leading-relaxed">{answer}</p>
            </div>
        </div>
    );
};

// === LOADING SCREEN ===
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
            <p className="text-gray-400 text-xs font-medium">Carregando...</p>
        </div>
    </div>
);

// === COMPONENTE PRINCIPAL ===
const MyCouponsPage: React.FC = () => {
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
        setTimeout(() => setPageLoading(false), 1000);
    }, []);

    const isFriday = new Date().getDay() === 5;
    const totalEarnings = couponData ? (couponData.usageCount * (couponData.commissionPerUse || 1)) : 0;
    const totalWithdrawn = couponData?.totalWithdrawn || 0;
    const availableBalance = totalEarnings - totalWithdrawn;
    const pendingWithdraw = withdrawRequests.filter(w => w.status === 'pending').reduce((sum: number, w: WithdrawRequest) => sum + w.amount, 0);

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
        } catch (err) { console.error('Erro ao carregar saques:', err); }
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
        if (!isFriday) return setSaqueMessage({ type: 'error', text: 'Saques disponíveis apenas às sextas-feiras.' });
        if (availableBalance < 5) return setSaqueMessage({ type: 'error', text: 'Valor mínimo: R$ 5,00.' });
        if (pendingWithdraw > 0) return setSaqueMessage({ type: 'error', text: 'Você já possui saque pendente.' });
        if (!pixKey.trim()) return setSaqueMessage({ type: 'error', text: 'Informe sua chave PIX.' });
        setIsRequestingSaque(true);
        try {
            await addDoc(collection(db, 'withdrawRequests'), {
                couponCode: couponData?.code, requestedAt: Timestamp.now(), amount: availableBalance, pixKey: pixKey.trim(), status: 'pending'
            });
            setSaqueMessage({ type: 'success', text: `Saque de R$ ${availableBalance.toFixed(2).replace('.', ',')} solicitado!` });
            setPixKey('');
            if (couponData?.code) await loadWithdrawRequests(couponData.code);
        } catch { setSaqueMessage({ type: 'error', text: 'Erro. Tente novamente.' }); }
        finally { setIsRequestingSaque(false); }
    };

    const formatStatus = (status: string) => {
        const map: Record<string, { text: string; classes: string }> = {
            pending: { text: 'Pendente', classes: 'bg-amber-100 text-amber-700' },
            paid: { text: 'Pago', classes: 'bg-green-100 text-green-700' },
            rejected: { text: 'Rejeitado', classes: 'bg-red-100 text-red-700' },
        };
        return map[status] || { text: status, classes: 'bg-gray-100 text-gray-700' };
    };

    if (pageLoading) return <LoadingScreen />;

    // ====================== TELA DE LOGIN ======================
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 font-poppins flex flex-col">
                {/* Header Flutuante */}
                <header className="fixed top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-50">
                    <div className="bg-blue-800/90 backdrop-blur-lg rounded-full shadow-2xl px-5 py-3 flex items-center justify-between max-w-lg mx-auto border border-white/10">
                        <img src="/logo-header.png" alt="Vel Currículo" className="h-5" />
                        <a href="#/" className="text-blue-200 hover:text-white text-sm font-medium transition-colors">
                            Voltar ao site
                        </a>
                    </div>
                </header>

                {/* Conteúdo */}
                <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-8">
                    <div className="w-full max-w-md">
                        {/* Hero */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
                                <Icons.Gift />
                                Programa de Afiliados
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                                Ganhe dinheiro <br /><span className="gradient-text">indicando</span>
                            </h1>
                            <p className="text-gray-500 text-base">
                                Acesse seu painel e acompanhe suas comissões
                            </p>
                        </div>

                        {/* Card de Login */}
                        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100/50">
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Seu Cupom
                                    </label>
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="SEUCUPOM"
                                        className="w-full h-14 px-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none uppercase font-mono font-bold text-lg text-center tracking-widest transition-all placeholder:text-gray-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        PIN de 4 dígitos
                                    </label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="••••"
                                        maxLength={4}
                                        className="w-full h-14 px-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none text-center text-2xl tracking-[0.75em] font-mono transition-all placeholder:text-gray-300 placeholder:tracking-[0.3em]"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center font-medium">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <><Icons.Spinner /> Entrando...</> : 'Acessar meu painel'}
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                <p className="text-gray-400 text-sm">
                                    Quer se tornar afiliado?{' '}
                                    <a href="https://wa.me/5537984116034" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">
                                        Fale conosco
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ====================== DASHBOARD ======================
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white font-poppins">
            {/* Header Flutuante (igual ao site principal) */}
            <header className="fixed top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-50">
                <div className="bg-blue-800/90 backdrop-blur-lg rounded-full shadow-2xl px-5 py-3 flex items-center justify-between max-w-2xl mx-auto border border-white/10">
                    <img src="/logo-header.png" alt="Vel Currículo" className="h-5" />
                    <div className="flex items-center gap-3">
                        <span className="text-white font-bold text-sm">{couponData?.code}</span>
                        <button onClick={handleLogout} className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-medium transition-colors">
                            <Icons.Logout />
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-24 pb-12 space-y-5">

                {/* Card Principal - Saldo */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-2xl shadow-blue-500/25 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-blue-200 mb-1">
                            <Icons.Wallet />
                            <span className="text-sm font-medium">Disponível para saque</span>
                        </div>
                        <p className="text-5xl font-bold tracking-tight">
                            R$ {availableBalance.toFixed(2).replace('.', ',')}
                        </p>
                        {totalWithdrawn > 0 && (
                            <p className="text-blue-200 text-sm mt-2">Total sacado: R$ {totalWithdrawn.toFixed(2).replace('.', ',')}</p>
                        )}
                    </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        <div className="text-blue-500 mb-3"><Icons.Users /></div>
                        <p className="text-3xl font-bold text-gray-800">{couponData?.usageCount || 0}</p>
                        <p className="text-gray-500 text-sm">Indicações</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        <div className="text-green-500 mb-3"><Icons.TrendingUp /></div>
                        <p className="text-3xl font-bold text-gray-800">R$ {totalEarnings.toFixed(0)}</p>
                        <p className="text-gray-500 text-sm">Total ganho</p>
                    </div>
                </div>

                {/* Link de Compartilhamento */}
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80">
                    <div className="flex items-center gap-2 text-gray-700 font-semibold mb-4">
                        <Icons.Link2 />
                        <span>Seu link exclusivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                            <p className="text-gray-600 text-sm truncate font-mono">
                                velcurriculo.com.br?cupom={couponData?.code}
                            </p>
                        </div>
                        <button
                            onClick={handleCopyLink}
                            className={`shrink-0 h-12 px-4 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {copied ? <Icons.Check /> : <Icons.Copy />}
                            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                    </div>
                </div>

                {/* Solicitar Saque */}
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80">
                    <div className="flex items-center gap-2 text-gray-700 font-semibold mb-4">
                        <Icons.Wallet />
                        <span>Solicitar saque</span>
                    </div>

                    {!isFriday && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl mb-4">
                            <span className="text-amber-500"><Icons.Calendar /></span>
                            <p className="text-amber-700 text-sm">Saques apenas às <strong>sextas-feiras</strong></p>
                        </div>
                    )}

                    {availableBalance < 5 && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl mb-4">
                            <span className="text-blue-500"><Icons.Info /></span>
                            <p className="text-blue-700 text-sm">Mínimo R$ 5,00 — Faltam <strong>{Math.max(0, 5 - (couponData?.usageCount || 0))} indicações</strong></p>
                        </div>
                    )}

                    {pendingWithdraw > 0 && (
                        <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl mb-4">
                            <span className="text-orange-500"><Icons.Clock /></span>
                            <p className="text-orange-700 text-sm">Saque de R$ {pendingWithdraw.toFixed(2).replace('.', ',')} em processamento</p>
                        </div>
                    )}

                    <form onSubmit={handleRequestWithdraw} className="space-y-3">
                        <input
                            type="text"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="Chave PIX (CPF, e-mail, telefone...)"
                            className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-700 placeholder-gray-400 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0}
                        />

                        {saqueMessage && (
                            <div className={`flex items-center gap-2 p-4 rounded-xl text-sm ${saqueMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {saqueMessage.type === 'success' ? <Icons.CheckCircle /> : <Icons.Info />}
                                <span>{saqueMessage.text}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0 || isRequestingSaque}
                            className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isRequestingSaque ? <><Icons.Spinner /> Solicitando...</> : `Solicitar R$ ${availableBalance.toFixed(2).replace('.', ',')}`}
                        </button>
                    </form>
                </div>

                {/* Histórico */}
                {withdrawRequests.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80">
                        <h3 className="font-semibold text-gray-700 mb-4">Histórico de saques</h3>
                        <div className="space-y-2">
                            {withdrawRequests.slice(0, 5).map((req) => {
                                const status = formatStatus(req.status);
                                return (
                                    <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div>
                                            <p className="font-bold text-gray-800">R$ {req.amount.toFixed(2).replace('.', ',')}</p>
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Icons.Clock />
                                                {req.requestedAt?.toDate?.()?.toLocaleDateString('pt-BR') || '-'}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.classes}`}>{status.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Como Funciona - Versão Detalhada */}
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80">
                    <h3 className="font-semibold text-gray-700 mb-6">Como funciona</h3>
                    <div className="space-y-5">
                        {[
                            { step: 1, title: 'Compartilhe seu link', desc: 'Envie para amigos que precisam de um currículo profissional.', active: true },
                            { step: 2, title: 'Eles ganham desconto', desc: 'Seu cupom oferece um desconto exclusivo para novos usuários.' },
                            { step: 3, title: 'Você ganha comissão', desc: 'A cada uso válido, você recebe R$ 1,00 de comissão.' },
                            { step: 4, title: 'Saque via PIX', desc: 'Às sextas-feiras, solicite o saque do seu saldo disponível.' },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-4 group">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 transition-transform group-hover:scale-110 shadow-lg ${item.active
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:border-blue-300'
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

                {/* FAQ Completo */}
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100/80">
                    <h3 className="font-semibold text-gray-700 mb-2">Dúvidas frequentes</h3>
                    {[
                        { question: "Como funciona o programa de afiliados?", answer: "Compartilhe seu cupom de desconto. Cada vez que alguém usar seu cupom para baixar um currículo pago, você recebe R$ 1,00 de comissão." },
                        { question: "Quando posso solicitar um saque?", answer: "Saques podem ser solicitados apenas às sextas-feiras. O pagamento é processado em até 1 dia útil via PIX." },
                        { question: "Qual o valor mínimo para saque?", answer: "O valor mínimo é R$ 5,00, equivalente a 5 usos válidos do seu cupom." },
                        { question: "Como recebo meu pagamento?", answer: "O pagamento é feito exclusivamente via PIX. Informe sua chave (CPF, telefone, e-mail ou aleatória) ao solicitar o saque." },
                    ].map((item, i) => <FAQItem key={i} question={item.question} answer={item.answer} />)}
                </div>

                {/* Regras do Programa */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-4">Regras do programa</h3>
                    <ul className="space-y-3">
                        {[
                            'Comissão de R$ 1,00 por uso válido (pagamento confirmado)',
                            'Saques disponíveis apenas às sextas-feiras',
                            'Valor mínimo para saque: R$ 5,00',
                            'Pagamento via PIX em até 1 dia útil',
                            'Proibido o auto-uso do próprio cupom',
                        ].map((rule, i) => (
                            <li key={i} className="flex items-start gap-3 text-gray-600 text-sm">
                                <span className="text-green-500 mt-0.5 shrink-0"><Icons.CheckCircle /></span>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center border-t border-gray-100 mt-4">
                <a href="#/" className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Voltar ao site
                </a>
                <p className="mt-3 text-gray-400 text-xs">VelCurrículo © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
};

export default MyCouponsPage;

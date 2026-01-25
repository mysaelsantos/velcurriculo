import React, { useState } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// === ÍCONES ===
const Icons = {
    Loading: () => (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    ),
    Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>,
    Ticket: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>,
    Money: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
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
    type: 'fixed' | 'percentage';
    value: number;
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
        <div className="border-b border-blue-700/30 last:border-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex justify-between items-center text-left">
                <span className="font-medium text-white text-sm">{question}</span>
                <span className={`text-blue-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}><Icons.ChevronDown /></span>
            </button>
            {isOpen && <p className="pb-4 text-blue-200 text-sm leading-relaxed">{answer}</p>}
        </div>
    );
};

// === TELA DE LOADING ===
const LoadingScreen = () => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <img src="/logo-azul.png" alt="Vel Currículo" className="h-10 mb-6 animate-pulse" />
        <Icons.Loading />
        <p className="text-blue-300 mt-4 text-sm">Carregando...</p>
    </div>
);

// === COMPONENTE PRINCIPAL ===
const MyCouponsPage: React.FC = () => {
    // Estados de autenticação
    const [couponCode, setCouponCode] = useState('');
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Estado do cupom
    const [couponData, setCouponData] = useState<CouponData | null>(null);

    // Estados para saque
    const [pixKey, setPixKey] = useState('');
    const [isRequestingSaque, setIsRequestingSaque] = useState(false);
    const [saqueMessage, setSaqueMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);

    // Estados UI
    const [copied, setCopied] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Simula loading inicial
    React.useEffect(() => {
        setTimeout(() => setPageLoading(false), 800);
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
            setSaqueMessage({ type: 'success', text: `Solicitação de R$ ${availableBalance.toFixed(2)} enviada com sucesso!` });
            setPixKey('');
            if (couponData?.code) await loadWithdrawRequests(couponData.code);
        } catch {
            setSaqueMessage({ type: 'error', text: 'Erro ao solicitar saque. Tente novamente.' });
        } finally {
            setIsRequestingSaque(false);
        }
    };

    const formatStatus = (status: string) => {
        const map: Record<string, { text: string; color: string }> = {
            pending: { text: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400' },
            paid: { text: 'Pago', color: 'bg-green-500/20 text-green-400' },
            rejected: { text: 'Rejeitado', color: 'bg-red-500/20 text-red-400' },
        };
        return map[status] || { text: status, color: 'bg-gray-500/20 text-gray-400' };
    };

    const faqData = [
        { question: "Como funciona o programa?", answer: "Compartilhe seu cupom de desconto. Cada vez que alguém usar seu cupom para baixar um currículo, você ganha R$ 1,00 de comissão." },
        { question: "Quando posso solicitar saque?", answer: "Saques podem ser solicitados apenas às sextas-feiras. O pagamento é processado em até 1 dia útil." },
        { question: "Qual o valor mínimo para saque?", answer: "O valor mínimo é R$ 5,00, o que equivale a 5 usos do seu cupom." },
        { question: "Como recebo meu pagamento?", answer: "O pagamento é feito exclusivamente via PIX. Informe sua chave (CPF, telefone, e-mail ou aleatória) ao solicitar." },
    ];

    // Loading inicial
    if (pageLoading) return <LoadingScreen />;

    // ====================== TELA DE LOGIN ======================
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-poppins">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden">
                    {/* Barra superior azul */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-700"></div>

                    {/* Logo e Título */}
                    <div className="text-center mb-6 pt-2">
                        <img src="/logo-azul.png" alt="Vel Currículo" className="h-10 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-gray-800">Área do Afiliado</h1>
                        <p className="text-gray-400 text-sm mt-1">Acompanhe suas comissões e saques</p>
                    </div>

                    {/* Formulário */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Código do Cupom</label>
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="Ex: JOAO10"
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none uppercase font-mono tracking-wider text-center text-lg bg-gray-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">PIN de Acesso</label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="****"
                                maxLength={4}
                                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-center text-2xl tracking-[0.5em] font-mono bg-gray-50"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-800 text-white font-bold py-3.5 rounded-xl hover:bg-blue-900 transition disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <><Icons.Loading /> Verificando...</> : 'Acessar Painel'}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        Não tem um cupom?{' '}
                        <a href="https://wa.me/5537984116034" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                            Fale conosco
                        </a>
                    </p>
                </div>
            </div>
        );
    }

    // ====================== DASHBOARD DO AFILIADO ======================
    return (
        <div className="min-h-screen bg-slate-900 font-poppins">
            {/* Header */}
            <header className="bg-blue-900 sticky top-0 z-50 shadow-lg">
                <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
                    <img src="/logo-header.png" alt="Vel Currículo" className="h-5" />
                    <div className="flex items-center gap-3">
                        <span className="text-blue-200 text-sm font-medium">{couponData?.code}</span>
                        <button onClick={handleLogout} className="p-2 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition">
                            <Icons.Logout />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
                {/* Cards de Métricas */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-300"><Icons.Users /></span>
                            <span className="text-xs text-blue-300 font-medium">Total de Usos</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{couponData?.usageCount || 0}</p>
                    </div>

                    <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-400"><Icons.Money /></span>
                            <span className="text-xs text-blue-300 font-medium">Total Ganho</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">R$ {totalEarnings.toFixed(2)}</p>
                    </div>
                </div>

                {/* Saldo Disponível */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 shadow-lg">
                    <p className="text-blue-200 text-sm font-medium">Disponível para Saque</p>
                    <p className="text-4xl font-bold text-white mt-1">R$ {availableBalance.toFixed(2)}</p>
                    {totalWithdrawn > 0 && (
                        <p className="text-blue-200 text-xs mt-2">Total já sacado: R$ {totalWithdrawn.toFixed(2)}</p>
                    )}
                </div>

                {/* Link de Compartilhamento */}
                <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                    <p className="text-blue-200 text-sm font-medium mb-3">🔗 Seu Link de Compartilhamento</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={`velcurriculo.com.br?cupom=${couponData?.code}`}
                            readOnly
                            className="flex-1 bg-blue-900/50 border border-blue-600/30 rounded-lg px-3 py-2.5 text-white text-sm truncate"
                        />
                        <button
                            onClick={handleCopyLink}
                            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'
                                }`}
                        >
                            {copied ? <><Icons.Check /> Copiado</> : <><Icons.Copy /> Copiar</>}
                        </button>
                    </div>
                </div>

                {/* Solicitar Saque */}
                <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                    <p className="text-white font-bold mb-3">💸 Solicitar Saque</p>

                    {!isFriday && (
                        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-3">
                            <span className="text-yellow-400"><Icons.Calendar /></span>
                            <p className="text-yellow-300 text-sm">Saques apenas às <strong>sextas-feiras</strong></p>
                        </div>
                    )}

                    {availableBalance < 5 && availableBalance >= 0 && (
                        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3">
                            <span className="text-blue-300"><Icons.Ticket /></span>
                            <p className="text-blue-200 text-sm">Mínimo R$ 5,00 — Faltam <strong>{Math.max(0, 5 - (couponData?.usageCount || 0))} usos</strong></p>
                        </div>
                    )}

                    {pendingWithdraw > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl mb-3">
                            <span className="text-orange-400"><Icons.Clock /></span>
                            <p className="text-orange-300 text-sm">Saque de <strong>R$ {pendingWithdraw.toFixed(2)}</strong> pendente</p>
                        </div>
                    )}

                    <form onSubmit={handleRequestWithdraw} className="space-y-3">
                        <input
                            type="text"
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            placeholder="Sua chave PIX (CPF, telefone, e-mail...)"
                            className="w-full bg-blue-900/50 border border-blue-600/30 rounded-xl px-4 py-3 text-white placeholder-blue-400 text-sm outline-none focus:border-blue-400"
                            disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0}
                        />

                        {saqueMessage && (
                            <div className={`p-3 rounded-xl text-sm text-center font-medium ${saqueMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {saqueMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0 || isRequestingSaque}
                            className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isRequestingSaque ? <><Icons.Loading /> Solicitando...</> : `Solicitar R$ ${availableBalance.toFixed(2)}`}
                        </button>
                    </form>
                </div>

                {/* Histórico de Saques */}
                {withdrawRequests.length > 0 && (
                    <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                        <p className="text-white font-bold mb-3">📋 Histórico de Saques</p>
                        <div className="space-y-2">
                            {withdrawRequests.slice(0, 5).map((req) => {
                                const status = formatStatus(req.status);
                                return (
                                    <div key={req.id} className="flex items-center justify-between p-3 bg-blue-900/40 rounded-xl">
                                        <div>
                                            <p className="font-bold text-white">R$ {req.amount.toFixed(2)}</p>
                                            <p className="text-xs text-blue-300">{req.requestedAt?.toDate?.()?.toLocaleDateString('pt-BR') || '-'}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Como Funciona */}
                <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                    <p className="text-white font-bold mb-4">📖 Como Funciona</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { emoji: '1️⃣', text: 'Compartilhe seu link' },
                            { emoji: '2️⃣', text: 'Ganhe R$ 1 por uso' },
                            { emoji: '3️⃣', text: 'Saque às sextas' },
                            { emoji: '4️⃣', text: 'Receba via PIX' },
                        ].map((step, i) => (
                            <div key={i} className="text-center p-3 bg-blue-900/40 rounded-xl">
                                <span className="text-2xl">{step.emoji}</span>
                                <p className="text-xs text-blue-200 mt-1">{step.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FAQ */}
                <div className="bg-blue-800/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-700/30">
                    <p className="text-white font-bold mb-2">❓ Dúvidas Frequentes</p>
                    {faqData.map((item, i) => <FAQItem key={i} question={item.question} answer={item.answer} />)}
                </div>

                {/* Regras */}
                <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                    <p className="text-white font-bold mb-3">📜 Regras</p>
                    <ul className="space-y-2 text-slate-300 text-xs">
                        {[
                            'R$ 1,00 por uso válido (pagamento confirmado)',
                            'Saques apenas às sextas-feiras',
                            'Mínimo para saque: R$ 5,00',
                            'Pagamento via PIX em até 1 dia útil',
                            'Proibido auto-uso do cupom',
                        ].map((rule, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-xs text-blue-400">
                <a href="#/" className="hover:underline">← Voltar para o site</a>
                <p className="mt-2 text-slate-500">VelCurrículo © {new Date().getFullYear()}</p>
            </footer>
        </div>
    );
};

export default MyCouponsPage;

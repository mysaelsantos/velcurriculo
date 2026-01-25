import React, { useState } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

// Interface para dados do cupom
interface CouponData {
    code: string;
    pin: string;
    usageCount: number;
    maxUses: number;
    commissionPerUse: number;
    totalWithdrawn: number;
    isActive: boolean;
    usedBy: string[];
    type: 'fixed' | 'percentage';
    value: number;
}

// Interface para solicitação de saque
interface WithdrawRequest {
    id: string;
    couponCode: string;
    requestedAt: Timestamp;
    amount: number;
    pixKey: string;
    status: 'pending' | 'paid' | 'rejected';
    paidAt?: Timestamp;
}

// Componente de FAQ Item
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-4 px-2 flex justify-between items-center text-left hover:bg-gray-50 transition rounded-lg"
            >
                <span className="font-medium text-gray-700">{question}</span>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && (
                <div className="px-2 pb-4 text-gray-600 text-sm leading-relaxed">
                    {answer}
                </div>
            )}
        </div>
    );
};

const MyCouponsPage: React.FC = () => {
    // Estados de autenticação
    const [couponCode, setCouponCode] = useState('');
    const [pin, setPin] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Estado do cupom autenticado
    const [couponData, setCouponData] = useState<CouponData | null>(null);

    // Estados para saque
    const [pixKey, setPixKey] = useState('');
    const [isRequestingSaque, setIsRequestingSaque] = useState(false);
    const [saqueError, setSaqueError] = useState('');
    const [saqueSuccess, setSaqueSuccess] = useState('');
    const [withdrawRequests, setWithdrawRequests] = useState<WithdrawRequest[]>([]);

    // Estado para copiar link
    const [copied, setCopied] = useState(false);

    // Verifica se é sexta-feira
    const isFriday = new Date().getDay() === 5;

    // Calcula valores
    const totalEarnings = couponData ? (couponData.usageCount * (couponData.commissionPerUse || 1)) : 0;
    const totalWithdrawn = couponData?.totalWithdrawn || 0;
    const availableBalance = totalEarnings - totalWithdrawn;
    const pendingWithdraw = withdrawRequests.filter(w => w.status === 'pending').reduce((acc, w) => acc + w.amount, 0);

    // Função de login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const cleanCode = couponCode.toUpperCase().trim();
            const couponRef = doc(db, 'coupons', cleanCode);
            const couponSnap = await getDoc(couponRef);

            if (!couponSnap.exists()) {
                throw new Error('Cupom não encontrado');
            }

            const data = couponSnap.data() as CouponData;

            if (!data.pin) {
                throw new Error('Este cupom não possui acesso ao painel de afiliados');
            }

            if (data.pin !== pin) {
                throw new Error('PIN incorreto');
            }

            setCouponData(data);
            setIsAuthenticated(true);

            // Carregar solicitações de saque
            await loadWithdrawRequests(cleanCode);

        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setIsLoading(false);
        }
    };

    // Carrega solicitações de saque
    const loadWithdrawRequests = async (code: string) => {
        try {
            const withdrawRef = collection(db, 'withdrawRequests');
            const q = query(
                withdrawRef,
                where('couponCode', '==', code),
                orderBy('requestedAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as WithdrawRequest[];
            setWithdrawRequests(requests);
        } catch (err) {
            console.error('Erro ao carregar saques:', err);
        }
    };

    // Função de logout
    const handleLogout = () => {
        setIsAuthenticated(false);
        setCouponData(null);
        setCouponCode('');
        setPin('');
        setWithdrawRequests([]);
    };

    // Função de solicitar saque
    const handleRequestWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaqueError('');
        setSaqueSuccess('');

        if (!isFriday) {
            setSaqueError('Saques só podem ser solicitados às sextas-feiras.');
            return;
        }

        if (availableBalance < 5) {
            setSaqueError('Valor mínimo para saque: R$ 5,00 (precisa de pelo menos 5 usos do cupom).');
            return;
        }

        if (pendingWithdraw > 0) {
            setSaqueError('Você já possui uma solicitação de saque pendente.');
            return;
        }

        if (!pixKey.trim()) {
            setSaqueError('Informe sua chave PIX.');
            return;
        }

        setIsRequestingSaque(true);

        try {
            await addDoc(collection(db, 'withdrawRequests'), {
                couponCode: couponData?.code,
                requestedAt: Timestamp.now(),
                amount: availableBalance,
                pixKey: pixKey.trim(),
                status: 'pending'
            });

            setSaqueSuccess(`Solicitação de R$ ${availableBalance.toFixed(2)} enviada com sucesso! Você receberá em até 1 dia útil.`);
            setPixKey('');

            // Recarrega lista de saques
            if (couponData?.code) {
                await loadWithdrawRequests(couponData.code);
            }
        } catch (err: any) {
            setSaqueError('Erro ao solicitar saque. Tente novamente.');
        } finally {
            setIsRequestingSaque(false);
        }
    };

    // Função de copiar link
    const handleCopyLink = () => {
        const link = `https://velcurriculo.com.br?cupom=${couponData?.code}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Formata status do saque
    const formatStatus = (status: string) => {
        switch (status) {
            case 'pending': return { text: 'Pendente', color: 'text-yellow-600 bg-yellow-100' };
            case 'paid': return { text: 'Pago', color: 'text-green-600 bg-green-100' };
            case 'rejected': return { text: 'Rejeitado', color: 'text-red-600 bg-red-100' };
            default: return { text: status, color: 'text-gray-600 bg-gray-100' };
        }
    };

    // FAQ Data
    const faqData = [
        {
            question: "Como funciona o programa de afiliados?",
            answer: "Você compartilha seu cupom de desconto com amigos e conhecidos. Cada vez que alguém usa seu cupom para baixar um currículo, você ganha R$ 1,00 de comissão."
        },
        {
            question: "Quando posso solicitar meu saque?",
            answer: "Saques podem ser solicitados apenas às sextas-feiras. O pagamento é processado em até 1 dia útil após a solicitação."
        },
        {
            question: "Qual o valor mínimo para saque?",
            answer: "O valor mínimo para saque é R$ 5,00, o que equivale a 5 usos do seu cupom."
        },
        {
            question: "Como recebo meu pagamento?",
            answer: "O pagamento é feito exclusivamente via PIX. Ao solicitar o saque, informe sua chave PIX (CPF, telefone, e-mail ou chave aleatória)."
        },
        {
            question: "Posso ter mais de um cupom?",
            answer: "Não. Cada afiliado possui um único cupom exclusivo com seu PIN de acesso."
        },
        {
            question: "O uso do cupom é rastreado automaticamente?",
            answer: "Sim! Cada uso válido (pagamento confirmado) é contabilizado automaticamente no seu painel."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <a href="#/" className="flex items-center gap-2">
                        <span className="text-2xl">🎟️</span>
                        <span className="font-bold text-gray-800">Meus Cupons</span>
                    </a>
                    {isAuthenticated && (
                        <button
                            onClick={handleLogout}
                            className="text-sm text-gray-500 hover:text-gray-700 transition"
                        >
                            Sair
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {!isAuthenticated ? (
                    // TELA DE LOGIN
                    <div className="max-w-md mx-auto">
                        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-4xl">🔐</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-800 mb-2">Área do Afiliado</h1>
                                <p className="text-gray-500">Acesse seu painel para acompanhar suas comissões</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Código do Cupom
                                    </label>
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Ex: JOAO10"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase font-mono tracking-wider"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        PIN de Acesso
                                    </label>
                                    <input
                                        type="password"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="****"
                                        maxLength={4}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-2xl tracking-[0.5em] font-mono"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
                                >
                                    {isLoading ? 'Verificando...' : 'Acessar Painel'}
                                </button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                                <p className="text-sm text-gray-500">
                                    Não tem um cupom de afiliado?{' '}
                                    <a href="https://wa.me/5537984116034" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        Entre em contato
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // DASHBOARD DO AFILIADO
                    <div className="space-y-6">
                        {/* Cards de Métricas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">📊</span>
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">Total de Usos</span>
                                </div>
                                <p className="text-3xl font-bold text-gray-800">{couponData?.usageCount || 0}</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">💰</span>
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">Total Ganho</span>
                                </div>
                                <p className="text-3xl font-bold text-green-600">R$ {totalEarnings.toFixed(2)}</p>
                            </div>

                            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">💳</span>
                                    </div>
                                    <span className="text-sm text-gray-500 font-medium">Disponível para Saque</span>
                                </div>
                                <p className="text-3xl font-bold text-purple-600">R$ {availableBalance.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Link de Compartilhamento */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                            <h3 className="font-bold text-lg mb-2">🔗 Seu Link de Compartilhamento</h3>
                            <p className="text-blue-100 text-sm mb-4">
                                Compartilhe este link para ganhar R$ 1,00 por cada uso!
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={`velcurriculo.com.br?cupom=${couponData?.code}`}
                                    readOnly
                                    className="flex-1 bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 backdrop-blur-sm"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className={`px-4 py-2 rounded-lg font-bold transition ${copied
                                        ? 'bg-green-400 text-green-900'
                                        : 'bg-white text-blue-600 hover:bg-blue-50'
                                        }`}
                                >
                                    {copied ? '✓ Copiado!' : 'Copiar'}
                                </button>
                            </div>
                        </div>

                        {/* Solicitar Saque */}
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">💸 Solicitar Saque</h3>

                            {!isFriday && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4 flex items-start gap-3">
                                    <span className="text-2xl">📅</span>
                                    <div>
                                        <p className="font-medium text-yellow-800">Saques disponíveis apenas às sextas-feiras</p>
                                        <p className="text-sm text-yellow-600">Volte na próxima sexta para solicitar seu saque.</p>
                                    </div>
                                </div>
                            )}

                            {availableBalance < 5 && (
                                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4 flex items-start gap-3">
                                    <span className="text-2xl">🎯</span>
                                    <div>
                                        <p className="font-medium text-gray-700">Valor mínimo não atingido</p>
                                        <p className="text-sm text-gray-500">
                                            Você precisa de pelo menos R$ 5,00 (5 usos) para solicitar um saque.
                                            Faltam {Math.max(0, 5 - (couponData?.usageCount || 0))} usos!
                                        </p>
                                    </div>
                                </div>
                            )}

                            {pendingWithdraw > 0 && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4 flex items-start gap-3">
                                    <span className="text-2xl">⏳</span>
                                    <div>
                                        <p className="font-medium text-blue-800">Saque pendente</p>
                                        <p className="text-sm text-blue-600">
                                            Você já possui uma solicitação de R$ {pendingWithdraw.toFixed(2)} aguardando pagamento.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleRequestWithdraw} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sua Chave PIX
                                    </label>
                                    <input
                                        type="text"
                                        value={pixKey}
                                        onChange={(e) => setPixKey(e.target.value)}
                                        placeholder="CPF, telefone, e-mail ou chave aleatória"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                        disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0}
                                    />
                                </div>

                                {saqueError && (
                                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                        {saqueError}
                                    </div>
                                )}

                                {saqueSuccess && (
                                    <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                                        {saqueSuccess}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!isFriday || availableBalance < 5 || pendingWithdraw > 0 || isRequestingSaque}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRequestingSaque ? 'Solicitando...' : `Solicitar Saque de R$ ${availableBalance.toFixed(2)}`}
                                </button>
                            </form>
                        </div>

                        {/* Histórico de Saques */}
                        {withdrawRequests.length > 0 && (
                            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                                <h3 className="font-bold text-lg text-gray-800 mb-4">📋 Histórico de Saques</h3>
                                <div className="space-y-3">
                                    {withdrawRequests.map((request) => {
                                        const status = formatStatus(request.status);
                                        return (
                                            <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                                <div>
                                                    <p className="font-bold text-gray-800">R$ {request.amount.toFixed(2)}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {request.requestedAt?.toDate?.().toLocaleDateString('pt-BR') || 'Data não disponível'}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Como Funciona */}
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">📋 Como Funciona</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl">1️⃣</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Compartilhe seu cupom com amigos e conhecidos</p>
                                </div>
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl">2️⃣</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Cada pessoa que usar ganha desconto e você ganha R$ 1,00</p>
                                </div>
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl">3️⃣</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Toda sexta-feira você pode solicitar seu saque</p>
                                </div>
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-2xl">4️⃣</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Receba via PIX em até 1 dia útil</p>
                                </div>
                            </div>
                        </div>

                        {/* FAQ */}
                        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">❓ Perguntas Frequentes</h3>
                            <div className="divide-y divide-gray-100">
                                {faqData.map((item, index) => (
                                    <FAQItem key={index} question={item.question} answer={item.answer} />
                                ))}
                            </div>
                        </div>

                        {/* Regras do Programa */}
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg">
                            <h3 className="font-bold text-lg mb-4">📜 Regras do Programa</h3>
                            <ul className="space-y-2 text-gray-300 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400">✓</span>
                                    Comissão de R$ 1,00 por cada uso válido (pagamento confirmado)
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400">✓</span>
                                    Saques disponíveis apenas às sextas-feiras
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400">✓</span>
                                    Valor mínimo para saque: R$ 5,00
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400">✓</span>
                                    Pagamento em até 1 dia útil via PIX
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400">✓</span>
                                    Não é permitido auto-uso do cupom
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400">✓</span>
                                    Reservamos o direito de cancelar cupons com uso fraudulento
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 mt-12 py-6">
                <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
                    <p>VelCurrículo © {new Date().getFullYear()} - Programa de Afiliados</p>
                    <p className="mt-1">
                        <a href="#/" className="text-blue-600 hover:underline">Voltar para o site</a>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default MyCouponsPage;

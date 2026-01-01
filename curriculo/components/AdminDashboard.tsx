import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- COMPONENTES VISUAIS (ICONES) ---
const Icons = {
    Wallet: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Dados do Dashboard
    const [stats, setStats] = useState<any>({ total_revenue: 0, total_resumes: 0, active_visitors: 0 });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    // 1. Verifica se está logado
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Busca dados em Tempo Real (Só se estiver logado)
    useEffect(() => {
        if (!user) return;

        // A. Estatísticas Gerais
        const unsubStats = onSnapshot(doc(db, 'stats', 'general'), (doc) => {
            if (doc.exists()) setStats(doc.data());
        });

        // B. Últimas Transações
        const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(20));
        const unsubTrans = onSnapshot(q, (snapshot) => {
            const transList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(transList);

            // C. Prepara dados para o Gráfico (Agrupa por dia)
            const grouped = new Map();
            transList.forEach((t: any) => {
                // @ts-ignore
                const date = t.created_at?.toDate ? format(t.created_at.toDate(), 'dd/MM') : 'Hoje';
                const current = grouped.get(date) || 0;
                grouped.set(date, current + t.amount);
            });
            
            // Converte Map para Array e inverte para o gráfico ficar cronológico
            const chart = Array.from(grouped, ([name, value]) => ({ name, value })).reverse();
            setChartData(chart);
        });

        return () => {
            unsubStats();
            unsubTrans();
        };
    }, [user]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError('Senha ou email incorretos.');
        }
    };

    const handleLogout = () => signOut(auth);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Carregando painel...</div>;

    // --- TELA DE LOGIN ---
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-poppins">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                    <div className="text-center mb-8">
                        <img src="/logo-azul.png" alt="Vel Currículo" className="h-10 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Acesso Administrativo</h2>
                        <p className="text-gray-500 text-sm">Entre para gerenciar o sistema</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
                        
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                                placeholder="admin@velcurriculo.com.br"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Senha</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-700/30">
                            Entrar no Painel
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- TELA DO DASHBOARD ---
    return (
        <div className="min-h-screen bg-gray-50 font-poppins text-gray-800">
            {/* Header / Sidebar Mobile */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo-azul.png" alt="Logo" className="h-8" />
                        <span className="hidden md:inline text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">ADMIN</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 hidden md:block">{user.email}</span>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition">
                            <Icons.LogOut /> Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                
                {/* 1. KPIs (Indicadores) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Card Receita */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">Receita Total</p>
                            <h3 className="text-3xl font-bold text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.total_revenue || 0)}
                            </h3>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-full"><Icons.Wallet /></div>
                    </div>

                    {/* Card Currículos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">Currículos Gerados</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.total_resumes || 0}</h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full"><Icons.FileText /></div>
                    </div>

                    {/* Card Visitantes */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">Visitantes Totais</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.active_visitors || 0}</h3>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-full"><Icons.Users /></div>
                    </div>
                </div>

                {/* 2. Gráficos e Tabelas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Gráfico de Receita Recente */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h4 className="font-bold text-lg mb-6">Tendência de Receita (Últimos dias)</h4>
                        <div className="h-64 w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                                        <Tooltip 
                                            cursor={{fill: '#f3f4f6'}}
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                        />
                                        <Bar dataKey="value" fill="#002e9e" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                    Ainda sem dados suficientes para gráfico.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lista de Últimas Transações */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <h4 className="font-bold text-lg mb-4">Últimas Vendas (Pix)</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                                        <th className="font-medium py-3">DATA</th>
                                        <th className="font-medium py-3">CLIENTE</th>
                                        <th className="font-medium py-3 text-right">VALOR</th>
                                        <th className="font-medium py-3 text-center">STATUS</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {transactions.length === 0 ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">Nenhuma venda registrada ainda.</td></tr>
                                    ) : (
                                        transactions.map((t) => (
                                            <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                                                <td className="py-3 text-gray-500">
                                                    {/* @ts-ignore */}
                                                    {t.created_at?.toDate ? format(t.created_at.toDate(), 'dd/MM HH:mm') : '-'}
                                                </td>
                                                <td className="py-3 font-medium text-gray-800">{t.customer_name}</td>
                                                <td className="py-3 text-right font-bold text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                                                </td>
                                                <td className="py-3 text-center">
                                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                                                        Aprovado
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- ÍCONES (Lucide React style) ---
const Icons = {
    Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Money: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    File: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
    LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
};

const COLORS = ['#002e9e', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'financial'>('overview');
    
    // Estados de Dados
    const [stats, setStats] = useState<any>({});
    const [leads, setLeads] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    
    // Estados de Gráficos processados
    const [cityData, setCityData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);

    // Estados de Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // --- CARREGAMENTO DE DADOS ---
    useEffect(() => {
        if (!user) return;

        // 1. Estatísticas Gerais
        onSnapshot(doc(db, 'stats', 'general'), (doc) => {
            if (doc.exists()) setStats(doc.data());
        });

        // 2. Leads (Usuários) - Busca os últimos 50
        const leadsQuery = query(collection(db, 'leads'), orderBy('generated_at', 'desc'), limit(50));
        onSnapshot(leadsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeads(data);
            processDemographics(data);
        });

        // 3. Transações Financeiras
        const transQuery = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(50));
        onSnapshot(transQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(data);
            processRevenueChart(data);
        });

    }, [user]);

    // --- PROCESSAMENTO DE DADOS PARA GRÁFICOS ---
    const processDemographics = (data: any[]) => {
        // Cidades
        const cities: Record<string, number> = {};
        // Idades
        const ages = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };

        data.forEach(lead => {
            // Conta Cidades
            const city = lead.city || 'Desconhecido';
            cities[city] = (cities[city] || 0) + 1;

            // Conta Idades
            const age = parseInt(lead.age);
            if (age) {
                if (age >= 18 && age <= 24) ages['18-24']++;
                else if (age >= 25 && age <= 34) ages['25-34']++;
                else if (age >= 35 && age <= 44) ages['35-44']++;
                else if (age >= 45) ages['45+']++;
            }
        });

        // Formata para o Recharts
        const cityChart = Object.keys(cities)
            .map(key => ({ name: key, value: cities[key] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        const ageChart = Object.keys(ages).map(key => ({ name: key, value: ages[key as keyof typeof ages] }));

        setCityData(cityChart);
        setAgeData(ageChart);
    };

    const processRevenueChart = (data: any[]) => {
        const grouped: Record<string, number> = {};
        data.forEach(t => {
            // @ts-ignore
            const date = t.created_at?.toDate ? format(t.created_at.toDate(), 'dd/MM') : 'N/A';
            grouped[date] = (grouped[date] || 0) + t.amount;
        });
        const chart = Object.keys(grouped).map(key => ({ name: key, value: grouped[key] })).reverse();
        setRevenueData(chart);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch (err) { setError('Acesso negado.'); }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-poppins">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                    <img src="/logo-azul.png" alt="Vel" className="h-12 mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-gray-800 mb-1">Painel Administrativo</h2>
                    <p className="text-gray-500 text-sm mb-6">Controle total da sua operação</p>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
                        <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-600" />
                        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-600" />
                        <button className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDERIZAÇÃO DO PAINEL ---
    return (
        <div className="flex h-screen bg-gray-100 font-poppins overflow-hidden">
            
            {/* SIDEBAR */}
            <aside className="w-20 lg:w-64 bg-blue-900 text-white flex flex-col shadow-xl z-20">
                <div className="h-20 flex items-center justify-center border-b border-blue-800">
                    <img src="/logo-header.png" alt="Logo" className="h-8 hidden lg:block" />
                    <span className="lg:hidden font-bold text-xl">V</span>
                </div>
                
                <nav className="flex-1 py-6 space-y-2 px-3">
                    <SidebarButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Icons.Dashboard />} label="Visão Geral" />
                    <SidebarButton active={activeTab === 'leads'} onClick={() => setActiveTab('leads')} icon={<Icons.Users />} label="Leads & Usuários" />
                    <SidebarButton active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} icon={<Icons.Money />} label="Financeiro" />
                </nav>

                <div className="p-4 border-t border-blue-800">
                    <button onClick={() => signOut(auth)} className="flex items-center gap-3 text-blue-200 hover:text-white transition w-full p-2 rounded-lg hover:bg-blue-800">
                        <Icons.LogOut /> <span className="hidden lg:inline">Sair</span>
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="flex-1 overflow-y-auto">
                {/* Header Mobile/Desktop */}
                <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 sticky top-0 z-10">
                    <h1 className="text-xl font-bold text-gray-800 capitalize">{activeTab.replace('_', ' ')}</h1>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm text-gray-500">Sistema Operacional</span>
                    </div>
                </header>

                <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
                    
                    {/* --- TAB: VISÃO GERAL --- */}
                    {activeTab === 'overview' && (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <KPICard title="Faturamento Total" value={stats.total_revenue} isCurrency icon={<Icons.Money />} color="emerald" />
                                <KPICard title="Currículos Gerados" value={stats.total_resumes} icon={<Icons.File />} color="blue" />
                                <KPICard title="Visitantes Ativos" value={stats.active_visitors} icon={<Icons.Users />} color="purple" />
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <ChartCard title="Crescimento de Vendas (Diário)">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={revenueData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                                            <YAxis tick={{fontSize: 12}} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#002e9e" strokeWidth={3} dot={{r: 4}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </ChartCard>

                                <ChartCard title="Top 5 Cidades (Origem dos Usuários)">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={cityData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#002e9e" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                            </div>
                        </>
                    )}

                    {/* --- TAB: LEADS (USUÁRIOS) --- */}
                    {activeTab === 'leads' && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                <ChartCard title="Perfil Etário">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie data={ageData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                                {ageData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                                <div className="lg:col-span-2 bg-gradient-to-r from-blue-800 to-blue-600 rounded-xl p-6 text-white flex flex-col justify-center shadow-lg">
                                    <h3 className="text-2xl font-bold mb-2">Base de Talentos</h3>
                                    <p className="opacity-90 mb-4">Você já coletou dados de {leads.length} profissionais.</p>
                                    <div className="flex gap-4">
                                        <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
                                            <span className="block text-2xl font-bold">{cityData.length}</span>
                                            <span className="text-xs opacity-75">Cidades Diferentes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h3 className="font-bold text-gray-700">Últimos Leads Capturados</h3>
                                    <span className="text-xs text-gray-500">Mostrando últimos 50</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-3">Nome / Email</th>
                                                <th className="px-6 py-3">Idade</th>
                                                <th className="px-6 py-3">Cargo Alvo</th>
                                                <th className="px-6 py-3">Cidade</th>
                                                <th className="px-6 py-3">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {leads.map((lead) => (
                                                <tr key={lead.id} className="hover:bg-blue-50/50 transition cursor-default">
                                                    <td className="px-6 py-3">
                                                        <div className="font-semibold text-gray-800">{lead.name}</div>
                                                        <div className="text-xs text-gray-500">{lead.email}</div>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600">{lead.age || '-'} anos</td>
                                                    <td className="px-6 py-3">
                                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                                            {lead.jobTitle || 'Geral'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600">{lead.city || 'N/A'}</td>
                                                    <td className="px-6 py-3 text-gray-400 text-xs">
                                                        {/* @ts-ignore */}
                                                        {lead.generated_at?.toDate ? format(lead.generated_at.toDate(), 'dd/MM HH:mm') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {leads.length === 0 && (
                                                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum dado coletado ainda. Gere um currículo para testar.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TAB: FINANCEIRO --- */}
                    {activeTab === 'financial' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                             <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-700">Histórico de Pix</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Data</th>
                                            <th className="px-6 py-3">Cliente</th>
                                            <th className="px-6 py-3 text-right">Valor</th>
                                            <th className="px-6 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 text-gray-500">
                                                    {/* @ts-ignore */}
                                                    {t.created_at?.toDate ? format(t.created_at.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                                                </td>
                                                <td className="px-6 py-3 font-medium">{t.customer_name}</td>
                                                <td className="px-6 py-3 text-right font-bold text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                                                </td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- SUB-COMPONENTES PARA ORGANIZAÇÃO ---

const SidebarButton = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all duration-200 ${
            active ? 'bg-blue-700 text-white shadow-lg translate-x-1' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
        }`}
    >
        {icon}
        <span className="font-medium hidden lg:inline">{label}</span>
    </button>
);

const KPICard = ({ title, value, icon, color, isCurrency }: any) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 border-${color}-500 flex items-center justify-between hover:shadow-md transition`}>
        <div>
            <p className="text-gray-500 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800">
                {isCurrency 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
                    : (value || 0)
                }
            </h3>
        </div>
        <div className={`bg-${color}-50 p-3 rounded-full text-${color}-600`}>
            {icon}
        </div>
    </div>
);

const ChartCard = ({ title, children }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h4 className="font-bold text-gray-700 mb-6">{title}</h4>
        {children}
    </div>
);

export default AdminDashboard;

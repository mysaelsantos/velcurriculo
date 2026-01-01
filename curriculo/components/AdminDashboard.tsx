import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// @ts-ignore
import { toPng } from 'html-to-image';
// @ts-ignore
import { jsPDF } from 'jspdf';
import ResumePreview from './ResumePreview'; // Importamos para o Preview real

// --- ÍCONES ---
const Icons = {
    Grid: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
    Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
    Star: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    MessageSquare: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
};

const COLORS = ['#002e9e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'analytics' | 'reviews'>('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    // Dados
    const [stats, setStats] = useState<any>({});
    const [leads, setLeads] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    
    // Estados de Gráficos processados
    const [cityData, setCityData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);

    // Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Modal & Preview
    const [selectedResume, setSelectedResume] = useState<any | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // Fetch Data
    useEffect(() => {
        if (!user) return;

        // Stats
        onSnapshot(doc(db, 'stats', 'general'), (doc) => {
            if (doc.exists()) setStats(doc.data());
        });

        // Leads (Currículos)
        const leadsQuery = query(collection(db, 'leads'), orderBy('generated_at', 'desc'), limit(50));
        onSnapshot(leadsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeads(data);
            processAnalytics(data);
        });

        // Transações
        const transQuery = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(50));
        onSnapshot(transQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processRevenue(data);
        });

        // Avaliações (Nova Secção)
        const reviewsQuery = query(collection(db, 'reviews'), orderBy('created_at', 'desc'), limit(50));
        onSnapshot(reviewsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReviews(data);
        });

    }, [user]);

    const processAnalytics = (data: any[]) => {
        const cities: Record<string, number> = {};
        const ages = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };

        data.forEach(item => {
            const city = item.city || 'Desconhecido';
            cities[city] = (cities[city] || 0) + 1;

            const age = parseInt(item.age);
            if (age) {
                if (age >= 18 && age <= 24) ages['18-24']++;
                else if (age >= 25 && age <= 34) ages['25-34']++;
                else if (age >= 35 && age <= 44) ages['35-44']++;
                else if (age >= 45) ages['45+']++;
            }
        });

        setCityData(Object.keys(cities).map(k => ({ name: k, value: cities[k] })).sort((a,b) => b.value - a.value).slice(0,5));
        setAgeData(Object.keys(ages).map(k => ({ name: k, value: ages[k as keyof typeof ages] })));
    };

    const processRevenue = (data: any[]) => {
        const grouped: Record<string, number> = {};
        data.forEach(t => {
            // @ts-ignore
            const date = t.created_at?.toDate ? format(t.created_at.toDate(), 'dd/MM') : 'N/A';
            grouped[date] = (grouped[date] || 0) + t.amount;
        });
        setRevenueData(Object.keys(grouped).map(k => ({ name: k, value: grouped[k] })).reverse());
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch (err) { setError('Credenciais inválidas.'); }
    };

    const getResumeDetails = (lead: any) => {
        try {
            if (lead.full_data_backup) {
                return JSON.parse(lead.full_data_backup);
            }
            return null;
        } catch (e) { return null; }
    };

    // --- FUNÇÃO PARA GERAR PDF PELO ADMIN ---
    const handleDownloadPDF = async () => {
        if (!previewContainerRef.current) return;
        setIsGeneratingPdf(true);

        try {
            await document.fonts.ready;
            // Pega o elemento do currículo renderizado no modal
            const resumeElement = previewContainerRef.current.querySelector('.resume-preview-container') as HTMLElement;
            
            if (!resumeElement) throw new Error("Currículo não encontrado");

            // Força tamanho A4 para captura
            const originalStyle = resumeElement.style.cssText;
            resumeElement.style.width = '794px';
            resumeElement.style.height = '1123px';
            resumeElement.style.transform = 'scale(1)';
            resumeElement.style.margin = '0';

            const imgData = await toPng(resumeElement, {
                quality: 0.95,
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            // Restaura estilo
            resumeElement.style.cssText = originalStyle;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            const fileName = `curriculo-${selectedResume.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            pdf.save(fileName);

        } catch (err) {
            console.error(err);
            alert("Erro ao gerar PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const toggleReviewStatus = async (id: string, currentStatus: boolean) => {
        const ref = doc(db, 'reviews', id);
        await updateDoc(ref, { approved: !currentStatus });
    };

    const deleteReview = async (id: string) => {
        if (confirm('Tem a certeza?')) {
            await deleteDoc(doc(db, 'reviews', id));
        }
    };

    // --- TELA DE LOGIN ---
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-poppins">
                <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-700"></div>
                    <div className="text-center mb-8">
                        <img src="/logo-azul.png" alt="Vel" className="h-10 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
                        <p className="text-gray-400 text-sm">Painel de Controle Vel Currículo</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Senha</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition" />
                        </div>
                        <button className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition-transform transform active:scale-95 shadow-lg shadow-blue-900/20">
                            Entrar
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- DASHBOARD LAYOUT ---
    return (
        <div className="flex h-screen bg-gray-50 font-poppins overflow-hidden">
            
            {/* SIDEBAR RECOLHÍVEL */}
            <aside 
                className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-[#002e9e] text-white flex flex-col transition-all duration-300 ease-in-out shadow-xl z-30 relative`}
            >
                <div className="h-20 flex items-center justify-center border-b border-white/10 relative">
                    {sidebarCollapsed ? (
                        <span className="font-bold text-2xl">V</span>
                    ) : (
                        <img src="/logo-header.png" alt="Logo" className="h-7" />
                    )}
                    <button 
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="absolute -right-3 top-8 bg-blue-600 text-white p-1 rounded-full shadow-md hover:bg-blue-500 transition border border-white"
                    >
                        {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
                    </button>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Icons.Grid />} label="Visão Geral" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'resumes'} onClick={() => setActiveTab('resumes')} icon={<Icons.FileText />} label="Currículos Gerados" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} icon={<Icons.MessageSquare />} label="Avaliações" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Icons.TrendingUp />} label="Análises & Dados" />
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button onClick={() => signOut(auth)} className={`flex items-center gap-3 w-full p-2 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        <Icons.LogOut />
                        {!sidebarCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL */}
            <main className="flex-1 overflow-y-auto relative">
                <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
                    <h1 className="text-xl font-bold text-gray-800">
                        {activeTab === 'overview' && 'Painel de Controle'}
                        {activeTab === 'resumes' && 'Currículos Gerados'}
                        {activeTab === 'reviews' && 'Gestão de Avaliações'}
                        {activeTab === 'analytics' && 'Inteligência de Dados'}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            ONLINE
                        </div>
                    </div>
                </header>

                <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-8">

                    {/* === ABA VISÃO GERAL === */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-fade-in-scale">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard title="Faturamento Total" value={stats.total_revenue} isMoney icon={<Icons.TrendingUp />} color="bg-emerald-500" />
                                <StatCard title="Currículos Criados" value={stats.total_resumes} icon={<Icons.FileText />} color="bg-blue-500" />
                                <StatCard title="Visitantes Únicos" value={stats.active_visitors} icon={<Icons.Users />} color="bg-purple-500" />
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-700 mb-6">Receita em Tempo Real</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#002e9e" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#002e9e" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={val => `R$${val}`}/>
                                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                            <Area type="monotone" dataKey="value" stroke="#002e9e" fillOpacity={1} fill="url(#colorRev)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === ABA CURRÍCULOS GERADOS === */}
                    {activeTab === 'resumes' && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-scale">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">Histórico de Gerações</h3>
                                    <p className="text-sm text-gray-500">Visualize e baixe os currículos dos usuários.</p>
                                </div>
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">
                                    {leads.length} Registros
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4">Candidato</th>
                                            <th className="px-6 py-4">Cargo Alvo</th>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {leads.map((lead) => (
                                            <tr key={lead.id} className="hover:bg-blue-50/30 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-800">{lead.name}</div>
                                                    <div className="text-xs text-gray-400">{lead.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                                        {lead.jobTitle || 'Geral'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {/* @ts-ignore */}
                                                    {lead.generated_at?.toDate ? format(lead.generated_at.toDate(), 'dd MMM HH:mm', { locale: ptBR }) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => setSelectedResume(lead)}
                                                        className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition flex items-center gap-2 mx-auto"
                                                    >
                                                        <Icons.Eye /> Visualizar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* === ABA AVALIAÇÕES (NOVA) === */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-6 animate-fade-in-scale">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 {reviews.length === 0 && (
                                     <div className="col-span-full bg-blue-50 p-8 rounded-xl text-center text-blue-800 border border-blue-100">
                                         <Icons.MessageSquare />
                                         <p className="mt-2 font-medium">Ainda não existem avaliações registradas.</p>
                                         <p className="text-sm opacity-70">Assim que os usuários avaliarem no site, aparecerão aqui.</p>
                                     </div>
                                 )}
                                 {reviews.map(review => (
                                     <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                         <div>
                                             <div className="flex justify-between items-start mb-3">
                                                 <div className="flex text-yellow-400">
                                                     {[...Array(5)].map((_, i) => (
                                                         <Icons.Star key={i} />
                                                     ))}
                                                 </div>
                                                 <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${review.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                     {review.approved ? 'Aprovado' : 'Pendente'}
                                                 </span>
                                             </div>
                                             <p className="text-gray-600 text-sm italic mb-4">"{review.text}"</p>
                                         </div>
                                         <div className="border-t border-gray-100 pt-3">
                                             <p className="font-bold text-gray-800 text-sm">{review.author}</p>
                                             <div className="flex gap-2 mt-3">
                                                 <button 
                                                    onClick={() => toggleReviewStatus(review.id, review.approved)}
                                                    className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition ${review.approved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                                 >
                                                     {review.approved ? 'Ocultar' : <><Icons.Check /> Aprovar</>}
                                                 </button>
                                                 <button 
                                                    onClick={() => deleteReview(review.id)}
                                                    className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition"
                                                 >
                                                     <Icons.Trash />
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* === ABA ANALYTICS === */}
                    {activeTab === 'analytics' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-scale">
                             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-700 mb-6">Top Cidades</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={cityData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                                            <Tooltip cursor={{fill: '#f8fafc'}} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-700 mb-6">Faixa Etária</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={ageData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                {ageData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* === MODAL DE PREVIEW E DOWNLOAD === */}
            {selectedResume && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedResume(null)}></div>
                    
                    <div className="relative w-full max-w-3xl bg-gray-100 h-full shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header do Modal */}
                        <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{selectedResume.name}</h2>
                                <p className="text-xs text-gray-500">Visualização Administrativa</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleDownloadPDF}
                                    disabled={isGeneratingPdf}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                                >
                                    {isGeneratingPdf ? 'Gerando...' : <><Icons.Download /> Baixar PDF</>}
                                </button>
                                <button onClick={() => setSelectedResume(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                    <Icons.X />
                                </button>
                            </div>
                        </div>

                        {/* Área de Preview */}
                        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
                            <div className="bg-white shadow-2xl origin-top transform scale-75 md:scale-90 lg:scale-100 transition-transform duration-300" style={{ width: '794px', minHeight: '1123px' }} ref={previewContainerRef}>
                                {(() => {
                                    const details = getResumeDetails(selectedResume);
                                    if (details) {
                                        return <ResumePreview data={details} isDemoMode={false} isFirstPage={true} isMeasurement={false} />;
                                    }
                                    return <div className="p-10 text-center text-gray-500">Dados do currículo não encontrados ou corrompidos.</div>;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTES AUXILIARES ---
const SidebarItem = ({ collapsed, active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group relative ${
            active 
                ? 'bg-white text-blue-900 shadow-lg font-semibold' 
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? label : ''}
    >
        <div className={`${active ? 'text-blue-700' : 'text-current'}`}>{icon}</div>
        {!collapsed && <span>{label}</span>}
        {collapsed && active && <div className="absolute right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
    </button>
);

const StatCard = ({ title, value, icon, color, isMoney }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow group">
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                {isMoney 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
                    : (value || 0)
                }
            </h3>
        </div>
        <div className={`w-12 h-12 ${color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-opacity-30`}>
            {icon}
        </div>
    </div>
);

export default AdminDashboard;

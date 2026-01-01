import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
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
import ResumePreview, { QR_CONFIG } from './ResumePreview';

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
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
};

const COLORS = ['#002e9e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'analytics' | 'reviews'>('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // NOVO: Controle do menu mobile
    
    // Dados
    const [stats, setStats] = useState<any>({});
    const [leads, setLeads] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    
    // Gráficos
    const [cityData, setCityData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);

    // Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // --- ESTADOS DE PAGINAÇÃO E PREVIEW ---
    const [selectedResume, setSelectedResume] = useState<any | null>(null);
    const [paginatedPages, setPaginatedPages] = useState<any[]>([]); 
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // Refs
    const measurementContainerRef = useRef<HTMLDivElement | null>(null);
    const measurementRootRef = useRef<any>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, []);

    // 1. INICIALIZA O MOTOR DE MEDIÇÃO OCULTO
    useEffect(() => {
        const measurementNode = document.createElement('div');
        measurementNode.style.position = 'absolute';
        measurementNode.style.left = '-9999px';
        measurementNode.style.top = '0px';
        measurementNode.style.zIndex = '-1';
        measurementNode.style.width = '794px'; 
        measurementNode.className = "font-sans text-gray-900 antialiased leading-normal text-base";
        document.body.appendChild(measurementNode);
        
        measurementContainerRef.current = measurementNode;
        measurementRootRef.current = ReactDOM.createRoot(measurementNode);
    
        return () => {
            setTimeout(() => {
                measurementRootRef.current?.unmount();
                if (document.body.contains(measurementNode)) {
                    document.body.removeChild(measurementNode);
                }
                measurementContainerRef.current = null;
            }, 0);
        };
    }, []);

    // 2. CÁLCULO DE PAGINAÇÃO
    const calculatePagination = useCallback(async (dataToPaginate: any) => {
        const container = measurementContainerRef.current;
        if (!container) return;

        measurementRootRef.current.render(
            <ResumePreview data={dataToPaginate} isDemoMode={false} isFirstPage={true} isMeasurement={true} />
        );

        await new Promise(resolve => setTimeout(resolve, 300));

        const previewEl = container.firstChild as HTMLElement;
        if (!previewEl) {
            setPaginatedPages([dataToPaginate]);
            setIsPreviewReady(true);
            return;
        }

        const A4_HEIGHT = 1123; 
        const MARGIN_BOTTOM = 50; 
        const templateKey = dataToPaginate.style.template || 'template-modern';
        // @ts-ignore
        const qrConfig = QR_CONFIG.positions[templateKey] || QR_CONFIG.positions['template-modern'];
        // @ts-ignore
        const currentSpacerDims = qrConfig.overrideSpacer || QR_CONFIG.spacer;
        const qrHeight = currentSpacerDims.height;
        const qrPadding = qrConfig.safetyPadding !== undefined ? qrConfig.safetyPadding : 40; 
        const dangerZoneStart = A4_HEIGHT - qrConfig.bottom - qrHeight - qrPadding;

        const headerEl = previewEl.querySelector('header') as HTMLElement;
        const mainEl = previewEl.querySelector('main') as HTMLElement;
        
        const getElementHeight = (element: HTMLElement) => {
            if (!element) return 0;
            const style = window.getComputedStyle(element);
            return element.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
        };

        const headerHeight = getElementHeight(headerEl);
        const mainMarginTop = parseFloat(window.getComputedStyle(mainEl).marginTop) || 0;

        interface ContentBlock { id: string; type: string; data: any; height: number; }
        const blocks: ContentBlock[] = [];

        const extractBlocks = (sectionId: string, dataKey: string, listId?: string) => {
            const sectionEl = previewEl.querySelector(`#${sectionId}`) as HTMLElement;
            if (!sectionEl) return;

            const titleEl = sectionEl.querySelector('.section-title') as HTMLElement;
            if (titleEl) {
                blocks.push({ id: `${dataKey}-title`, type: dataKey, data: null, height: getElementHeight(titleEl) + 10 });
            }

            if (dataKey === 'summary') {
                const summaryEl = sectionEl.querySelector('#resume-summary') as HTMLElement;
                if (summaryEl) blocks.push({ id: 'summary-text', type: 'summary', data: dataToPaginate.summary, height: getElementHeight(summaryEl) });
            } else if (listId) {
                const listContainer = sectionEl.querySelector(`#${listId}`);
                if (!listContainer) return;
                const items = Array.from(listContainer.children) as HTMLElement[];
                const dataList = dataToPaginate[dataKey] as any[];
                items.forEach((itemEl, index) => {
                    if (dataList[index]) blocks.push({ id: dataList[index].id, type: dataKey, data: dataList[index], height: getElementHeight(itemEl) });
                });
            } else if (dataKey === 'skills' || dataKey === 'languages') {
                const contentDiv = sectionEl.querySelector(dataKey === 'skills' ? '#resume-skills' : '#resume-languages-list') as HTMLElement;
                if(contentDiv) blocks.push({ id: `${dataKey}-block`, type: dataKey, data: dataToPaginate[dataKey], height: getElementHeight(contentDiv) });
            }
        };

        if (dataToPaginate.summary) extractBlocks('summary-section', 'summary');
        if (dataToPaginate.experiences?.length > 0) extractBlocks('experience-section', 'experiences', 'resume-experience-list');
        if (dataToPaginate.education?.length > 0) extractBlocks('education-section', 'education', 'resume-education-list');
        if (dataToPaginate.courses?.length > 0) extractBlocks('courses-section', 'courses', 'resume-courses-list');
        if (dataToPaginate.languages?.length > 0) extractBlocks('languages-section', 'languages');
        if (dataToPaginate.skills?.length > 0) extractBlocks('skills-section', 'skills');

        const pages: any[] = [];
        let currentPageData: any = { personalInfo: dataToPaginate.personalInfo, style: dataToPaginate.style, experiences: [], education: [], courses: [], languages: [], skills: [], qrCodeOffsets: {} };
        let currentY = 50 + headerHeight + mainMarginTop;
        let currentPageIndex = 0;

        const createNewPage = () => {
            pages.push(currentPageData);
            currentPageData = { style: dataToPaginate.style, experiences: [], education: [], courses: [], languages: [], skills: [], qrCodeOffsets: {} };
            currentPageIndex++;
            currentY = 50 + 30; 
        };

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const hasQr = (dataToPaginate.style.showQRCode || dataToPaginate.style.showLinkedinQr);
            const overlapsDangerZone = currentPageIndex === 0 && hasQr && (currentY + block.height > dangerZoneStart);
            let effectiveHeight = block.height;

            if (overlapsDangerZone) {
                const distToDanger = dangerZoneStart - currentY;
                const spacerMargin = distToDanger > 0 ? distToDanger : 0;
                currentPageData.qrCodeOffsets[block.id] = spacerMargin; 
                effectiveHeight = Math.max(block.height * 1.4, 20); 
            }

            const available = (A4_HEIGHT - MARGIN_BOTTOM) - currentY;

            if (block.id.endsWith('-title')) {
                const nextBlock = blocks[i+1];
                const nextItemHeight = nextBlock ? nextBlock.height : 40; 
                if (available < (effectiveHeight + nextItemHeight)) {
                    createNewPage();
                    effectiveHeight = block.height; 
                }
                currentY += effectiveHeight;
                continue; 
            }

            if (effectiveHeight > available) {
                createNewPage();
                effectiveHeight = block.height;
                if (block.type === 'summary') currentPageData.summary = block.data;
                else if (['skills', 'languages'].includes(block.type)) currentPageData[block.type] = block.data;
                else (currentPageData[block.type] as any[]).push(block.data);
                currentY += effectiveHeight;
            } else {
                if (block.type === 'summary') currentPageData.summary = block.data;
                else if (['skills', 'languages'].includes(block.type)) currentPageData[block.type] = block.data;
                else (currentPageData[block.type] as any[]).push(block.data);
                currentY += effectiveHeight;
            }
        }

        if (Object.keys(currentPageData).length > 0) pages.push(currentPageData);
        
        const finalPages = pages.filter(p => p.summary || (p.experiences && p.experiences.length > 0) || (p.education && p.education.length > 0) || (p.courses && p.courses.length > 0) || (p.skills && p.skills.length > 0) || (p.personalInfo && pages.indexOf(p) === 0));

        setPaginatedPages(finalPages);
        setIsPreviewReady(true);
    }, []);

    // 3. SELECIONA CURRÍCULO
    useEffect(() => {
        if (selectedResume && selectedResume.full_data_backup) {
            setIsPreviewReady(false);
            try {
                const parsedData = JSON.parse(selectedResume.full_data_backup);
                calculatePagination(parsedData);
            } catch (e) {
                console.error("Erro ao fazer parse dos dados", e);
                setIsPreviewReady(true);
            }
        }
    }, [selectedResume, calculatePagination]);

    // Busca Dados do Banco
    useEffect(() => {
        if (!user) return;
        onSnapshot(doc(db, 'stats', 'general'), (doc) => { if (doc.exists()) setStats(doc.data()); });
        const leadsQuery = query(collection(db, 'leads'), orderBy('generated_at', 'desc'), limit(50));
        onSnapshot(leadsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeads(data);
            processAnalytics(data);
        });
        const transQuery = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(50));
        onSnapshot(transQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processRevenue(data);
        });
        const reviewsQuery = query(collection(db, 'reviews'), orderBy('created_at', 'desc'), limit(50));
        onSnapshot(reviewsQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReviews(data);
        });
    }, [user]);

    // Processamento Gráfico
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

    const handleDownloadPDF = async () => {
        if (!previewContainerRef.current) return;
        setIsGeneratingPdf(true);

        try {
            await document.fonts.ready;
            const pages = Array.from(previewContainerRef.current.querySelectorAll('.resume-page')) as HTMLElement[];
            if (pages.length === 0) throw new Error("Nenhuma página encontrada.");

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            for (let i = 0; i < pages.length; i++) {
                const pageEl = pages[i];
                const originalStyle = pageEl.style.cssText;
                
                pageEl.style.width = '794px';
                pageEl.style.height = '1123px';
                pageEl.style.minHeight = '1123px';
                pageEl.style.transform = 'none';
                pageEl.style.margin = '0';
                pageEl.style.marginBottom = '0'; 

                const imgData = await toPng(pageEl, { 
                    quality: 0.95, 
                    pixelRatio: 2, 
                    backgroundColor: '#ffffff', 
                    width: 794, 
                    height: 1123,
                    useCORS: true, 
                    cacheBust: true 
                });

                pageEl.style.cssText = originalStyle;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            }

            const fileName = `curriculo-${selectedResume.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            pdf.save(fileName);

        } catch (err) {
            console.error("Erro no PDF:", err);
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
        if (confirm('Tem a certeza?')) { await deleteDoc(doc(db, 'reviews', id)); }
    };

    // Componente Interno para o Conteúdo da Sidebar (para reuso no Mobile e Desktop)
    const SidebarContent = ({ collapsed, mobile }: any) => (
        <>
            <div className={`h-20 flex items-center justify-center border-b border-white/10 relative ${mobile ? 'px-6 justify-between' : ''}`}>
                 <div className="flex items-center gap-3">
                    {collapsed ? <span className="font-bold text-2xl">V</span> : <img src="/logo-header.png" alt="Logo" className="h-7" />}
                 </div>
                 {/* Botão de fechar no mobile */}
                 {mobile && (
                     <button onClick={() => setMobileMenuOpen(false)} className="text-white">
                         <Icons.X />
                     </button>
                 )}
                 {/* Botão de colapsar no desktop */}
                 {!mobile && (
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-8 bg-blue-600 text-white p-1 rounded-full shadow-md hover:bg-blue-500 transition border border-white">
                        {sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}
                    </button>
                 )}
            </div>
            <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                <SidebarItem collapsed={collapsed} active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} icon={<Icons.Grid />} label="Visão Geral" />
                <SidebarItem collapsed={collapsed} active={activeTab === 'resumes'} onClick={() => { setActiveTab('resumes'); setMobileMenuOpen(false); }} icon={<Icons.FileText />} label="Currículos Gerados" />
                <SidebarItem collapsed={collapsed} active={activeTab === 'reviews'} onClick={() => { setActiveTab('reviews'); setMobileMenuOpen(false); }} icon={<Icons.MessageSquare />} label="Avaliações" />
                <SidebarItem collapsed={collapsed} active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }} icon={<Icons.TrendingUp />} label="Análises & Dados" />
            </nav>
            <div className="p-4 border-t border-white/10">
                <button onClick={() => signOut(auth)} className={`flex items-center gap-3 w-full p-2 rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white transition ${collapsed ? 'justify-center' : ''}`}>
                    <Icons.LogOut />
                    {!collapsed && <span>Sair</span>}
                </button>
            </div>
        </>
    );

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-poppins">
                <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-700"></div>
                    <div className="text-center mb-8">
                        <img src="/logo-azul.png" alt="Vel" className="h-10 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
                        <p className="text-gray-400 text-sm">Painel de Controle Vel Currículo</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" />
                        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" />
                        <button className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Entrar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 font-poppins overflow-hidden">
            
            {/* === SIDEBAR DESKTOP === */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-[#002e9e] text-white hidden lg:flex flex-col transition-all duration-300 ease-in-out shadow-xl z-30 relative`}>
                <SidebarContent collapsed={sidebarCollapsed} mobile={false} />
            </aside>

            {/* === SIDEBAR MOBILE (DRAWER) === */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[300px] bg-[#002e9e] text-white shadow-2xl flex flex-col animate-slide-in-left">
                         <SidebarContent collapsed={false} mobile={true} />
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto relative w-full">
                {/* === HEADER RESPONSIVO === */}
                <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        {/* Botão Menu Mobile */}
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-600 p-1">
                            <Icons.Menu />
                        </button>
                        <h1 className="text-lg lg:text-xl font-bold text-gray-800 truncate max-w-[200px] lg:max-w-none">
                            {activeTab === 'overview' && 'Painel de Controle'}
                            {activeTab === 'resumes' && 'Currículos Gerados'}
                            {activeTab === 'reviews' && 'Avaliações'}
                            {activeTab === 'analytics' && 'Dados'}
                        </h1>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-2 whitespace-nowrap">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> 
                        <span className="hidden sm:inline">ONLINE</span>
                    </div>
                </header>

                <div className="p-4 lg:p-10 max-w-[1600px] mx-auto space-y-6 lg:space-y-8 pb-20">
                    {activeTab === 'overview' && (
                        <div className="space-y-6 lg:space-y-8 animate-fade-in-scale">
                            {/* Stats Grid Responsivo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                                <StatCard title="Faturamento Total" value={stats.total_revenue} isMoney icon={<Icons.TrendingUp />} color="bg-emerald-500" />
                                <StatCard title="Currículos Criados" value={stats.total_resumes} icon={<Icons.FileText />} color="bg-blue-500" />
                                <StatCard title="Visitantes Únicos" value={stats.active_visitors} icon={<Icons.Users />} color="bg-purple-500" />
                            </div>
                            <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-700 mb-6">Receita em Tempo Real</h3>
                                <div className="h-[250px] lg:h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revenueData}>
                                            <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#002e9e" stopOpacity={0.2}/><stop offset="95%" stopColor="#002e9e" stopOpacity={0}/></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                            <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={val => `R$${val}`}/>
                                            <Tooltip />
                                            <Area type="monotone" dataKey="value" stroke="#002e9e" fillOpacity={1} fill="url(#colorRev)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'resumes' && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-scale">
                            <div className="p-4 lg:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <h3 className="font-bold text-lg text-gray-800">Histórico de Gerações</h3>
                                <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">{leads.length} Registros</span>
                            </div>
                            {/* Tabela com Scroll Horizontal no Mobile */}
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left text-sm min-w-[600px]">
                                    <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                                        <tr><th className="px-6 py-4">Candidato</th><th className="px-6 py-4">Cargo Alvo</th><th className="px-6 py-4">Data</th><th className="px-6 py-4 text-center">Ações</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {leads.map((lead) => (
                                            <tr key={lead.id} className="hover:bg-blue-50/30 transition group">
                                                <td className="px-6 py-4"><div className="font-semibold text-gray-800">{lead.name}</div><div className="text-xs text-gray-400">{lead.email}</div></td>
                                                <td className="px-6 py-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium border border-gray-200">{lead.jobTitle || 'Geral'}</span></td>
                                                <td className="px-6 py-4 text-gray-500">{/* @ts-ignore */}{lead.generated_at?.toDate ? format(lead.generated_at.toDate(), 'dd MMM HH:mm', { locale: ptBR }) : '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => setSelectedResume(lead)} className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm transition flex items-center gap-2 mx-auto"><Icons.Eye /> <span className="hidden sm:inline">Visualizar</span></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reviews' && (
                        <div className="space-y-6 animate-fade-in-scale">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                 {reviews.length === 0 && <div className="col-span-full bg-blue-50 p-8 rounded-xl text-center text-blue-800 border border-blue-100"><Icons.MessageSquare /><p className="mt-2 font-medium">Ainda não existem avaliações.</p></div>}
                                 {reviews.map(review => (
                                     <div key={review.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                         <div>
                                             <div className="flex justify-between items-start mb-3">
                                                 <div className="flex text-yellow-400">{[...Array(5)].map((_, i) => <Icons.Star key={i} />)}</div>
                                                 <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${review.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{review.approved ? 'Aprovado' : 'Pendente'}</span>
                                             </div>
                                             <p className="text-gray-600 text-sm italic mb-4">"{review.text}"</p>
                                         </div>
                                         <div className="border-t border-gray-100 pt-3">
                                             <p className="font-bold text-gray-800 text-sm">{review.author}</p>
                                             <div className="flex gap-2 mt-3">
                                                 <button onClick={() => toggleReviewStatus(review.id, review.approved)} className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition ${review.approved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>{review.approved ? 'Ocultar' : <><Icons.Check /> Aprovar</>}</button>
                                                 <button onClick={() => deleteReview(review.id)} className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition"><Icons.Trash /></button>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-scale">
                             <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-700 mb-6">Top Cidades</h3><div className="h-[250px] lg:h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={cityData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} /></BarChart></ResponsiveContainer></div></div>
                             <div className="bg-white p-4 lg:p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-700 mb-6">Faixa Etária</h3><div className="h-[250px] lg:h-[300px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ageData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">{ageData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} iconSize={10} /></PieChart></ResponsiveContainer></div></div>
                        </div>
                    )}
                </div>
            </main>

            {/* === MODAL DE PREVIEW E DOWNLOAD === */}
            {selectedResume && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedResume(null)}></div>
                    {/* Modal agora é full-width no mobile */}
                    <div className="relative w-full lg:max-w-3xl bg-gray-100 h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="bg-white p-3 lg:p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center z-10 gap-3">
                            <div className="text-center sm:text-left"><h2 className="text-base lg:text-lg font-bold text-gray-800">{selectedResume.name}</h2><p className="text-xs text-gray-500">Visualização Administrativa</p></div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={handleDownloadPDF} disabled={isGeneratingPdf || !isPreviewReady} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50">
                                    {isGeneratingPdf ? 'Gerando...' : <><Icons.Download /> <span className="sm:hidden">PDF</span><span className="hidden sm:inline">Baixar PDF</span></>}
                                </button>
                                <button onClick={() => setSelectedResume(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Icons.X /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 lg:p-4 flex flex-col items-center gap-4 bg-gray-200/50" ref={previewContainerRef}>
                            {!isPreviewReady ? (
                                <div className="mt-10 flex flex-col items-center text-gray-400">
                                    <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <p className="text-sm">Calculando páginas...</p>
                                </div>
                            ) : (
                                paginatedPages.map((page, index) => (
                                    <div key={index} className="bg-white shadow-xl resume-page" style={{ width: '794px', minHeight: '1123px', transform: 'scale(0.7)', transformOrigin: 'top center', marginBottom: '-315px' }}>
                                        <ResumePreview data={page} isDemoMode={false} isFirstPage={index === 0} isMeasurement={false} hideEmptySections={paginatedPages.length > 1} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarItem = ({ collapsed, active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group relative ${active ? 'bg-white text-blue-900 shadow-lg font-semibold' : 'text-blue-100 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`} title={collapsed ? label : ''}>
        <div className={`${active ? 'text-blue-700' : 'text-current'}`}>{icon}</div>{(!collapsed || onClick) && <span>{label}</span>}
    </button>
);

const StatCard = ({ title, value, icon, color, isMoney }: any) => (
    <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow group">
        <div>
            <p className="text-gray-500 text-[10px] lg:text-xs font-bold uppercase tracking-wide mb-1">{title}</p>
            <h3 className="text-xl lg:text-2xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors">{isMoney ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0) : (value || 0)}</h3>
        </div>
        <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-opacity-30`}>{icon}</div>
    </div>
);

export default AdminDashboard;

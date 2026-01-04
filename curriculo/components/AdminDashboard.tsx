import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { format, subDays, isAfter, isBefore, endOfDay, startOfDay, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
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
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Filter: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Target: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    DollarSign: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
};

const COLORS = ['#002e9e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'analytics' | 'reviews'>('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    
    // --- FILTROS DE DATA ---
    const [dateRange, setDateRange] = useState({ 
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), // Padrão: Últimos 30 dias
        end: format(new Date(), 'yyyy-MM-dd') 
    });
    const [datePreset, setDatePreset] = useState<'7d' | '30d' | 'month' | 'custom'>('30d');

    // --- DADOS DO FIREBASE ---
    const [dailyStats, setDailyStats] = useState<any[]>([]); // Visitantes diários (Novo sistema)
    const [leads, setLeads] = useState<any[]>([]); // Leads brutos (Dados antigos e novos)
    const [transactions, setTransactions] = useState<any[]>([]); // Transações (Dados antigos e novos)
    const [reviews, setReviews] = useState<any[]>([]);
    
    // --- DADOS PROCESSADOS (KPIs) ---
    const [kpis, setKpis] = useState({
        revenue: 0,
        resumes: 0,
        visitors: 0,
        conversionRate: 0,
        avgTicket: 0,
        salesCount: 0
    });

    // --- GRÁFICOS ---
    const [dailyChartData, setDailyChartData] = useState<any[]>([]);
    const [cityData, setCityData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [jobData, setJobData] = useState<any[]>([]); // Top Cargos
    const [templateData, setTemplateData] = useState<any[]>([]); // Ranking Templates
    const [funnelData, setFunnelData] = useState<any[]>([]); // Funil de Vendas
    const [revenueData, setRevenueData] = useState<any[]>([]); 

    // Login & Preview States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [selectedResume, setSelectedResume] = useState<any | null>(null);
    const [paginatedPages, setPaginatedPages] = useState<any[]>([]); 
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isPreviewReady, setIsPreviewReady] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.7);
    const measurementContainerRef = useRef<HTMLDivElement | null>(null);
    const measurementRootRef = useRef<any>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { const u = onAuthStateChanged(auth, setUser); return () => u(); }, []);

    // 0. FETCH DE DADOS ROBUSTO
    useEffect(() => {
        if (!user) return;

        // 1. Puxar Leads (Aumentado limite para pegar histórico)
        const leadsQ = query(collection(db, 'leads'), orderBy('generated_at', 'desc'), limit(500));
        onSnapshot(leadsQ, (snap) => {
            setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 2. Puxar Transações (Vendas Antigas e Novas)
        const transQ = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(500));
        onSnapshot(transQ, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Puxar Daily Stats (Novo, apenas visitantes por enquanto)
        const dailyQ = query(collection(db, 'stats_daily'), orderBy('date', 'asc'));
        onSnapshot(dailyQ, (snap) => {
            setDailyStats(snap.docs.map(d => d.data()));
        });

        // 4. Reviews
        onSnapshot(query(collection(db, 'reviews'), orderBy('created_at', 'desc'), limit(50)), (snap) => {
            setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

    }, [user]);

    // 1. PROCESSADOR MESTRE DE DADOS (KPIs e Gráficos Inteligentes)
    useEffect(() => {
        processAllData();
    }, [leads, dailyStats, transactions, dateRange]);

    const processAllData = () => {
        const start = startOfDay(parseISO(dateRange.start));
        const end = endOfDay(parseISO(dateRange.end));

        // --- FILTRAGEM INTELIGENTE (Usa dados brutos para garantir histórico) ---
        
        // Leads no período
        const filteredLeads = leads.filter(lead => {
            if (!lead.generated_at) return false;
            // @ts-ignore
            const d = lead.generated_at.toDate ? lead.generated_at.toDate() : new Date(lead.generated_at.seconds * 1000);
            return isAfter(d, start) && isBefore(d, end);
        });

        // Vendas no período
        const filteredTrans = transactions.filter(t => {
            if (!t.created_at) return false;
            // @ts-ignore
            const d = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at.seconds * 1000);
            return isAfter(d, start) && isBefore(d, end);
        });

        // Visitantes (Mistura stats_daily novo com estimativa ou 0 para antigo)
        const filteredDailyVisitors = dailyStats.filter(day => {
            const d = parseISO(day.date);
            return (isAfter(d, start) || day.date === dateRange.start) && (isBefore(d, end) || day.date === dateRange.end);
        });

        // --- C. CALCULAR KPIs ---
        // Agora somamos das coleções brutas, garantindo que o passado não zere
        const totalRev = filteredTrans.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalSales = filteredTrans.length;
        const totalRes = filteredLeads.length;
        // Visitantes: Somamos do daily (novo). Infelizmente o passado de visitantes não existe por dia, então será baixo em períodos antigos.
        const totalVis = filteredDailyVisitors.reduce((acc, curr) => acc + (curr.visitors || 0), 0);

        setKpis({
            revenue: totalRev,
            salesCount: totalSales,
            visitors: totalVis, // Visitantes podem parecer baixos no filtro de 30 dias pois só começamos a contar hoje
            resumes: totalRes,
            conversionRate: totalVis > 0 ? (totalSales / totalVis) * 100 : (totalRes > 0 ? (totalSales/totalRes)*10 : 0), // Fallback inteligente
            avgTicket: totalSales > 0 ? (totalRev / totalSales) : 0
        });

        // --- D. PREPARAR GRÁFICO DE TENDÊNCIA (RECONSTRUÇÃO HISTÓRICA) ---
        // Criamos um array com todos os dias do intervalo para preencher lacunas
        const daysInterval = eachDayOfInterval({ start, end });
        
        const chartData = daysInterval.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            
            // Busca dados reais brutos para esse dia
            const leadsCount = leads.filter(l => {
                // @ts-ignore
                const d = l.generated_at?.toDate ? l.generated_at.toDate() : new Date(l.generated_at.seconds * 1000);
                return isSameDay(d, day);
            }).length;

            const salesCount = transactions.filter(t => {
                // @ts-ignore
                const d = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at.seconds * 1000);
                return isSameDay(d, day);
            }).length;

            // Busca visitantes do novo sistema (será 0 para dias antes de hoje)
            const dailyStat = dailyStats.find(ds => ds.date === dayStr);
            
            return {
                date: format(day, 'dd/MM'),
                visitantes: dailyStat?.visitors || 0,
                curriculos: leadsCount,
                vendas: salesCount
            };
        });
        setDailyChartData(chartData);

        // --- E. GRÁFICOS DE ANÁLISE ---
        const cities: Record<string, number> = {};
        const jobs: Record<string, number> = {};
        const templates: Record<string, number> = {};
        const ages: any = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };

        filteredLeads.forEach(lead => {
            // Cidades
            let city = lead.city || 'Desconhecido';
            if (lead.full_data_backup) { 
                try {
                    const b = JSON.parse(lead.full_data_backup);
                    if (b.personalInfo?.address) {
                        let c = b.personalInfo.address.split(',')[0].trim();
                        if (c.includes('-')) c = c.split('-')[0].trim();
                        if (c) city = c;
                    }
                } catch(e){}
            }
            cities[city] = (cities[city] || 0) + 1;

            // Cargos
            const job = lead.jobTitle ? lead.jobTitle.trim() : 'Geral';
            jobs[job] = (jobs[job] || 0) + 1;

            // Templates
            const tpl = lead.template || 'template-modern';
            const tplName = tpl.replace('template-', '').charAt(0).toUpperCase() + tpl.slice(10); 
            templates[tplName] = (templates[tplName] || 0) + 1;

            // Idades
            const age = parseInt(lead.age);
            if (age) {
                if (age >= 18 && age <= 24) ages['18-24']++;
                else if (age >= 25 && age <= 34) ages['25-34']++;
                else if (age >= 35 && age <= 44) ages['35-44']++;
                else if (age >= 45) ages['45+']++;
            }
        });

        setCityData(Object.entries(cities).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value).slice(0, 5));
        setJobData(Object.entries(jobs).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value).slice(0, 8));
        setTemplateData(Object.entries(templates).map(([k, v]) => ({ name: k, value: v })));
        setAgeData(Object.entries(ages).map(([k, v]) => ({ name: k, value: v })));

        // Funil
        setFunnelData([
            { name: 'Visitantes', value: totalVis, fill: '#3b82f6' },
            { name: 'Leads (Currículos)', value: totalRes, fill: '#8b5cf6' },
            { name: 'Vendas Confirmadas', value: totalSales, fill: '#10b981' }
        ]);
        
        // Revenue antigo (Legacy support)
        const groupedRev: Record<string, number> = {};
        filteredTrans.forEach(t => {
             // @ts-ignore
             const d = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at.seconds * 1000);
             const dateStr = format(d, 'dd/MM');
             groupedRev[dateStr] = (groupedRev[dateStr] || 0) + t.amount;
        });
        setRevenueData(Object.keys(groupedRev).map(k => ({ name: k, value: groupedRev[k] })).reverse());
    };

    const handlePresetChange = (preset: '7d' | '30d' | 'month' | 'custom') => {
        setDatePreset(preset);
        const today = new Date();
        let start = new Date();
        
        if (preset === '7d') start = subDays(today, 7);
        if (preset === '30d') start = subDays(today, 30);
        if (preset === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1);

        if (preset !== 'custom') {
            setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') });
        }
    };

    // UTILS
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const targetScale = Math.min(0.7, (width - 40) / 794);
            setPreviewScale(targetScale);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                if (document.body.contains(measurementNode)) document.body.removeChild(measurementNode);
                measurementContainerRef.current = null;
            }, 0);
        };
    }, []);

    // --- LÓGICA DE PAGINAÇÃO COMPLETA ---
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

    const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError('Credenciais inválidas.'); } };
    
    // --- GERAR PDF COMPLETO ---
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

    const toggleReviewStatus = async (id: string, currentStatus: boolean) => { await updateDoc(doc(db, 'reviews', id), { approved: !currentStatus }); };
    const deleteReview = async (id: string) => { if (confirm('Tem a certeza?')) await deleteDoc(doc(db, 'reviews', id)); };
    
    // LOGIN SCREEN
    if (!user) { return ( <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-poppins"> <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden"> <div className="absolute top-0 left-0 w-full h-2 bg-blue-700"></div> <div className="text-center mb-8"> <img src="/logo-azul.png" alt="Vel" className="h-10 mx-auto mb-4" /> <h2 className="text-2xl font-bold text-gray-800">Painel Inteligente</h2> <p className="text-gray-400 text-sm">Vel Currículo Business Intelligence</p> </div> <form onSubmit={handleLogin} className="space-y-5"> {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center font-medium">{error}</div>} <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" /> <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" /> <button className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Acessar Dashboard</button> </form> </div> </div> ); }

    // --- RENDERIZAÇÃO DO PAINEL PRINCIPAL ---
    return (
        <div className="flex h-screen bg-gray-50 font-poppins overflow-hidden">
            <style>{` .animate-slide-in-left { animation: slideInLeft 0.3s ease-out forwards; } @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } } .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } `}</style>

            {/* SIDEBAR */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-[#002e9e] text-white hidden lg:flex flex-col transition-all duration-300 shadow-xl z-30 relative`}>
                <div className="h-20 flex items-center justify-center border-b border-white/10 relative">
                    {sidebarCollapsed ? <span className="font-bold text-2xl">V</span> : <img src="/logo-header.png" alt="Logo" className="h-7" />}
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-8 bg-blue-600 text-white p-1 rounded-full border border-white shadow-sm hover:scale-110 transition">{sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}</button>
                </div>
                <nav className="flex-1 py-6 px-3 space-y-2">
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Icons.Grid />} label="Visão Geral" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'resumes'} onClick={() => setActiveTab('resumes')} icon={<Icons.FileText />} label="Leads & Currículos" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Icons.TrendingUp />} label="Business Intelligence" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} icon={<Icons.MessageSquare />} label="Avaliações" />
                </nav>
                <div className="p-4 border-t border-white/10"><button onClick={() => signOut(auth)} className={`flex items-center gap-3 w-full p-2 rounded-lg text-blue-200 hover:bg-blue-800 transition ${sidebarCollapsed ? 'justify-center' : ''}`}><Icons.LogOut /> {!sidebarCollapsed && <span>Sair</span>}</button></div>
            </aside>

            {/* MOBILE MENU */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#002e9e] text-white shadow-2xl flex flex-col animate-slide-in-left">
                        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10"><img src="/logo-header.png" className="h-6" /><button onClick={() => setMobileMenuOpen(false)}><Icons.X /></button></div>
                        <nav className="p-4 space-y-2">
                            <SidebarItem collapsed={false} active={activeTab === 'overview'} onClick={() => {setActiveTab('overview'); setMobileMenuOpen(false)}} icon={<Icons.Grid />} label="Visão Geral" />
                            <SidebarItem collapsed={false} active={activeTab === 'resumes'} onClick={() => {setActiveTab('resumes'); setMobileMenuOpen(false)}} icon={<Icons.FileText />} label="Leads" />
                            <SidebarItem collapsed={false} active={activeTab === 'analytics'} onClick={() => {setActiveTab('analytics'); setMobileMenuOpen(false)}} icon={<Icons.TrendingUp />} label="BI & Dados" />
                        </nav>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto w-full">
                {/* TOP HEADER COM FILTRO DE DATAS */}
                <header className="bg-white h-auto lg:h-20 border-b border-gray-200 flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 sticky top-0 z-20 shadow-sm py-3 lg:py-0 gap-3">
                    <div className="flex items-center gap-3 w-full lg:w-auto">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-600"><Icons.Menu /></button>
                        <h1 className="text-xl font-bold text-gray-800">Dashboard Gerencial</h1>
                    </div>

                    {/* BARRA DE FILTROS INTELIGENTE */}
                    <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                        <button onClick={() => handlePresetChange('7d')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${datePreset === '7d' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>7 Dias</button>
                        <button onClick={() => handlePresetChange('30d')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${datePreset === '30d' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>30 Dias</button>
                        <button onClick={() => handlePresetChange('month')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${datePreset === 'month' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>Este Mês</button>
                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                        <div className="flex items-center gap-2">
                            <input type="date" value={dateRange.start} onChange={e => {setDateRange({...dateRange, start: e.target.value}); setDatePreset('custom')}} className="text-xs border-none bg-transparent p-0 w-24 focus:ring-0 text-gray-600 font-medium" />
                            <span className="text-gray-400 text-xs">até</span>
                            <input type="date" value={dateRange.end} onChange={e => {setDateRange({...dateRange, end: e.target.value}); setDatePreset('custom')}} className="text-xs border-none bg-transparent p-0 w-24 focus:ring-0 text-gray-600 font-medium" />
                        </div>
                    </div>
                </header>

                <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
                    
                    {/* VISÃO GERAL (OVERVIEW) */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* LINHA 1: KPIS ESTRATÉGICOS */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KpiCard title="Faturamento" value={kpis.revenue} isMoney icon={<Icons.DollarSign />} color="bg-emerald-500" sub="No período selecionado" />
                                <KpiCard title="Vendas" value={kpis.salesCount} icon={<Icons.Check />} color="bg-blue-500" sub={`Conv: ${kpis.conversionRate.toFixed(1)}%`} />
                                <KpiCard title="Ticket Médio" value={kpis.avgTicket} isMoney icon={<Icons.Target />} color="bg-purple-500" sub="Por cliente" />
                                <KpiCard title="Novos Leads" value={kpis.resumes} icon={<Icons.Users />} color="bg-orange-500" sub={`Visitantes: ${kpis.visitors}`} />
                            </div>

                            {/* LINHA 2: GRÁFICOS PRINCIPAIS */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Gráfico de Tendência (Misto) */}
                                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><Icons.TrendingUp /> Tendência de Tráfego e Vendas</h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={dailyChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" hide />
                                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" hide />
                                                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey="visitantes" name="Visitantes (Novo)" fill="#e2e8f0" barSize={20} radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="left" type="monotone" dataKey="curriculos" name="Leads" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                                <Line yAxisId="right" type="monotone" dataKey="vendas" name="Vendas" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Funil de Conversão */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><Icons.Filter /> Funil de Conversão</h3>
                                    <div className="h-[300px] flex flex-col justify-center gap-4">
                                        {funnelData.map((step, idx) => (
                                            <div key={step.name} className="relative group">
                                                <div className="flex justify-between text-sm font-medium mb-1 text-gray-600">
                                                    <span>{step.name}</span>
                                                    <span className="font-bold">{step.value}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    {/* Lógica segura: Se Visitors for 0, usa o próximo passo como base para não quebrar o visual */}
                                                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(step.value / (funnelData[0].value || step.value || 1)) * 100}%`, backgroundColor: step.fill }}></div>
                                                </div>
                                                {idx > 0 && <div className="text-right text-[10px] text-gray-400 mt-1">
                                                    {funnelData[idx-1].value > 0 ? ((step.value / funnelData[idx-1].value) * 100).toFixed(1) : 0}% conversão
                                                </div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB BI & ANALYTICS AVANÇADO */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Top Cargos (Word Cloud Style List) */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4">Cargos Mais Procurados</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {jobData.map((job, idx) => (
                                            <span key={idx} className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100" style={{ fontSize: `${Math.max(0.7, Math.min(1.2, 1 + (job.value / 10)))}rem`, opacity: 1 - (idx * 0.05) }}>
                                                {job.name} <span className="text-blue-400 ml-1">{job.value}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Preferência de Templates */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4">Modelos Favoritos</h3>
                                    <div className="h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={templateData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {templateData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="bottom" height={36} iconSize={10}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Top Cidades */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4">Top Cidades</h3>
                                    <div className="space-y-3">
                                        {cityData.map((city, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600 flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-500">{idx + 1}</span> {city.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${(city.value / cityData[0].value) * 100}%`}}></div></div>
                                                    <span className="text-xs font-bold text-gray-700">{city.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB RESUMES / LEADS */}
                    {activeTab === 'resumes' && (
                        <div className="animate-fade-in space-y-4">
                             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Base de Leads Filtrada</h3>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">{leads.length} Registros Totais</span>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                                            <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Cargo</th><th className="px-6 py-4">Modelo</th><th className="px-6 py-4">Data</th><th className="px-6 py-4">Ação</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {leads.slice(0, 50).map((lead) => (
                                                <tr key={lead.id} className="hover:bg-blue-50/30 transition">
                                                    <td className="px-6 py-4 font-medium text-gray-800">{lead.name}<div className="text-xs text-gray-400 font-normal">{lead.email}</div></td>
                                                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{lead.jobTitle || 'Geral'}</span></td>
                                                    <td className="px-6 py-4 text-xs text-gray-500">{lead.template?.replace('template-', '') || '-'}</td>
                                                    {/* @ts-ignore */}
                                                    <td className="px-6 py-4 text-gray-500">{lead.generated_at?.toDate ? format(lead.generated_at.toDate(), 'dd/MM/yy HH:mm') : '-'}</td>
                                                    <td className="px-6 py-4"><button onClick={() => setSelectedResume(lead)} className="text-blue-600 hover:text-blue-800 font-bold text-xs">Ver Currículo</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL DE PREVIEW (Mantido Igual) */}
            {selectedResume && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedResume(null)}></div>
                    <div className="relative w-full lg:max-w-3xl bg-gray-100 h-full shadow-2xl flex flex-col animate-slide-in-left">
                        <div className="bg-white p-3 border-b flex justify-between items-center z-10">
                            <div><h2 className="font-bold">{selectedResume.name}</h2></div>
                            <div className="flex gap-2"><button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">{isGeneratingPdf ? 'Gerando...' : <><Icons.Download /> Baixar PDF</>}</button><button onClick={() => setSelectedResume(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded"><Icons.X /></button></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4 bg-gray-200/50" ref={previewContainerRef}>
                            {!isPreviewReady ? <div className="mt-10">Carregando...</div> : paginatedPages.map((page, index) => <div key={index} className="bg-white shadow-xl resume-page" style={{ width: '794px', minHeight: '1123px', transform: `scale(${previewScale})`, transformOrigin: 'top center', marginBottom: `${-(1123 * (1 - previewScale)) + 20}px` }}><ResumePreview data={page} isDemoMode={false} isFirstPage={index === 0} isMeasurement={false} hideEmptySections={paginatedPages.length > 1} /></div>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarItem = ({ collapsed, active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group relative ${active ? 'bg-white text-blue-900 shadow-lg font-semibold' : 'text-blue-100 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`} title={collapsed ? label : ''}>
        <div className={`${active ? 'text-blue-700' : 'text-current'}`}>{icon}</div>{!collapsed && <span className="animate-fade-in">{label}</span>}
    </button>
);

const KpiCard = ({ title, value, icon, color, isMoney, sub }: any) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
            <div className={`w-10 h-10 ${color} text-white rounded-lg flex items-center justify-center shadow-md`}>{icon}</div>
            {sub && <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">{sub}</span>}
        </div>
        <div>
            <p className="text-gray-500 text-xs font-bold uppercase">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{isMoney ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0) : (value || 0)}</h3>
        </div>
    </div>
);

export default AdminDashboard;

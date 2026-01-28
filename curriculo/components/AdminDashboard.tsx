import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit, updateDoc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { format, subDays, isAfter, isBefore, endOfDay, startOfDay, parseISO, eachDayOfInterval, isSameDay, sub } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

import ResumePreview, { QR_CONFIG } from './ResumePreview';

// --- ÍCONES ---
const Icons = {
    Grid: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
    TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    TrendingDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>,
    LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>,
    ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>,
    Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>,
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>,
    MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    Star: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    MessageSquare: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
    Filter: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
    Target: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
    DollarSign: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    Ticket: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    ThumbsUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" /></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    Coins: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"></circle><path d="M18.09 10.37A6 6 0 1 1 10.34 18"></path><path d="M7 6h1v4"></path><path d="m16.71 13.88.7.71-2.82 2.82"></path></svg>,
    Bell: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>,
    Percent: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"></line><circle cx="6.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>,
    Bug: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" /></svg>
};

const COLORS = ['#002e9e', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'resumes' | 'analytics' | 'reviews' | 'coupons' | 'bugs'>('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // --- FILTROS DE DATA ---
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), // Padrão: Últimos 30 dias
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | 'month' | 'custom'>('30d');

    // --- DADOS DO FIREBASE ---
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [coupons, setCoupons] = useState<any[]>([]);
    const [bugReports, setBugReports] = useState<any[]>([]);

    // --- DADOS PROCESSADOS (KPIs) ---
    const [kpis, setKpis] = useState({
        revenue: 0,
        resumes: 0,
        visitors: 0,
        conversionRate: 0,
        avgTicket: 0,
        salesCount: 0
    });

    // KPIs de Comparação (Growth)
    const [growth, setGrowth] = useState({
        revenue: 0,
        resumes: 0,
        visitors: 0,
        salesCount: 0
    });

    // --- GRÁFICOS ---
    const [dailyChartData, setDailyChartData] = useState<any[]>([]);
    const [cityData, setCityData] = useState<any[]>([]);
    const [ageData, setAgeData] = useState<any[]>([]);
    const [jobData, setJobData] = useState<any[]>([]);
    const [templateData, setTemplateData] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [peakHourData, setPeakHourData] = useState<any[]>([]);

    // --- ESTATISTICAS DE REVIEWS (NOVO) ---
    const [reviewStats, setReviewStats] = useState({
        total: 0,
        avgRating: 0,
        pending: 0,
        distribution: [] as any[],
        timeline: [] as any[]
    });

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

    // --- ESTADOS DO FORM DE CUPOM ---
    const [newCoupon, setNewCoupon] = useState({ code: '', type: 'fixed', value: '', maxUses: '', maxUsesPerUser: '1', pin: '' });
    const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any | null>(null);

    // --- SISTEMA DE NOTIFICAÇÕES ---
    const [notifications, setNotifications] = useState<{ id: string; type: 'sale' | 'lead' | 'coupon' | 'review'; message: string; time: Date; read: boolean }[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => { const u = onAuthStateChanged(auth, setUser); return () => u(); }, []);

    // 0. FETCH DE DADOS ROBUSTO
    useEffect(() => {
        if (!user) return;

        const leadsQ = query(collection(db, 'leads'), orderBy('generated_at', 'desc'), limit(1000));
        onSnapshot(leadsQ, (snap) => setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        const transQ = query(collection(db, 'transactions'), orderBy('created_at', 'desc'), limit(1000));
        onSnapshot(transQ, (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        const dailyQ = query(collection(db, 'stats_daily'), orderBy('date', 'asc'));
        onSnapshot(dailyQ, (snap) => setDailyStats(snap.docs.map(d => d.data())));

        // Buscar reviews (limite maior para cálculo de estatísticas)
        onSnapshot(query(collection(db, 'reviews'), orderBy('created_at', 'desc'), limit(200)), (snap) => {
            setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        onSnapshot(query(collection(db, 'coupons'), orderBy('createdAt', 'desc')), (snap) => {
            setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Buscar bug reports
        onSnapshot(query(collection(db, 'bugReports'), orderBy('createdAt', 'desc'), limit(200)), (snap) => {
            setBugReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

    }, [user]);

    // 1. PROCESSADOR MESTRE DE DADOS
    useEffect(() => {
        processAllData();
        processReviewData();
    }, [leads, dailyStats, transactions, dateRange, reviews]);

    const processReviewData = () => {
        if (reviews.length === 0) return;

        const total = reviews.length;
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avgRating = total > 0 ? sum / total : 0;
        const pending = reviews.filter(r => !r.approved).length;

        // Distribuição de Estrelas
        const dist = [0, 0, 0, 0, 0];
        reviews.forEach(r => {
            if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
        });
        const distData = dist.map((count, i) => ({ stars: i + 1, count })).reverse();

        // Timeline (Volume por Data)
        const timelineMap: Record<string, number> = {};
        reviews.forEach(r => {
            // @ts-ignore
            const d = r.created_at?.toDate ? r.created_at.toDate() : new Date(r.created_at?.seconds * 1000);
            if (d) {
                const dateKey = format(d, 'dd/MM');
                timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
            }
        });
        const timelineData = Object.entries(timelineMap).map(([date, count]) => ({ date, count })).reverse().slice(0, 14).reverse();

        setReviewStats({
            total,
            avgRating,
            pending,
            distribution: distData,
            timeline: timelineData
        });
    };

    const processAllData = () => {
        const start = startOfDay(parseISO(dateRange.start));
        const end = endOfDay(parseISO(dateRange.end));

        // --- FILTRO DO PERÍODO ATUAL ---
        const filteredLeads = leads.filter(lead => {
            if (!lead.generated_at) return false;
            // @ts-ignore
            const d = lead.generated_at.toDate ? lead.generated_at.toDate() : new Date(lead.generated_at.seconds * 1000);
            return isAfter(d, start) && isBefore(d, end);
        });

        const filteredTrans = transactions.filter(t => {
            if (!t.created_at) return false;
            // @ts-ignore
            const d = t.created_at.toDate ? t.created_at.toDate() : new Date(t.created_at.seconds * 1000);
            return isAfter(d, start) && isBefore(d, end);
        });

        const filteredDailyVisitors = dailyStats.filter(day => {
            const d = parseISO(day.date);
            return (isAfter(d, start) || day.date === dateRange.start) && (isBefore(d, end) || day.date === dateRange.end);
        });

        // --- CALCULO KPIs ATUAIS ---
        const totalRev = filteredTrans.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalSales = filteredTrans.length;
        const totalRes = filteredLeads.length;
        const totalVis = filteredDailyVisitors.reduce((acc, curr) => acc + (curr.visitors || 0), 0);

        // --- LOGICA DE COMPARAÇÃO (PERÍODO ANTERIOR) ---
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);

        const prevLeads = leads.filter(l => {
            // @ts-ignore
            const d = l.generated_at?.toDate ? l.generated_at.toDate() : new Date(l.generated_at.seconds * 1000);
            return isAfter(d, prevStart) && isBefore(d, prevEnd);
        }).length;

        const prevTrans = transactions.filter(t => {
            // @ts-ignore
            const d = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at.seconds * 1000);
            return isAfter(d, prevStart) && isBefore(d, prevEnd);
        });
        const prevRev = prevTrans.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const prevSales = prevTrans.length;

        // Calculo de % de crescimento
        const calcGrowth = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        setKpis({
            revenue: totalRev,
            salesCount: totalSales,
            visitors: totalVis,
            resumes: totalRes,
            conversionRate: totalVis > 0 ? (totalSales / totalVis) * 100 : (totalRes > 0 ? (totalSales / totalRes) * 10 : 0),
            avgTicket: totalSales > 0 ? (totalRev / totalSales) : 0
        });

        setGrowth({
            revenue: calcGrowth(totalRev, prevRev),
            resumes: calcGrowth(totalRes, prevLeads),
            salesCount: calcGrowth(totalSales, prevSales),
            visitors: 0
        });

        // --- CHART: DAILY ACTIVITY ---
        const daysInterval = eachDayOfInterval({ start, end });
        const chartData = daysInterval.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
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
            const dailyStat = dailyStats.find(ds => ds.date === dayStr);
            return {
                date: format(day, 'dd/MM'),
                visitantes: dailyStat?.visitors || 0,
                curriculos: leadsCount,
                vendas: salesCount
            };
        });
        setDailyChartData(chartData);

        // --- CHART: TEMPLATES & OTHERS ---
        const cities: Record<string, number> = {};
        const jobs: Record<string, number> = {};
        const templates: Record<string, number> = {};
        const ages: any = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };
        const hourCounts: number[] = new Array(24).fill(0);

        filteredLeads.forEach(lead => {
            let city = lead.city || 'Desconhecido';
            if (lead.full_data_backup) {
                try {
                    const b = JSON.parse(lead.full_data_backup);
                    if (b.personalInfo?.address) {
                        let c = b.personalInfo.address.split(',')[0].trim();
                        if (c.includes('-')) c = c.split('-')[0].trim();
                        if (c) city = c;
                    }
                } catch (e) { }
            }
            cities[city] = (cities[city] || 0) + 1;

            const job = lead.jobTitle ? lead.jobTitle.trim() : 'Geral';
            jobs[job] = (jobs[job] || 0) + 1;

            const tpl = lead.template || 'template-modern';
            const cleanTpl = tpl.replace('template-', '');
            const tplName = cleanTpl.charAt(0).toUpperCase() + cleanTpl.slice(1);
            templates[tplName] = (templates[tplName] || 0) + 1;

            const age = parseInt(lead.age);
            if (age) {
                if (age >= 18 && age <= 24) ages['18-24']++;
                else if (age >= 25 && age <= 34) ages['25-34']++;
                else if (age >= 35 && age <= 44) ages['35-44']++;
                else if (age >= 45) ages['45+']++;
            }

            // @ts-ignore
            const d = lead.generated_at?.toDate ? lead.generated_at.toDate() : new Date(lead.generated_at.seconds * 1000);
            const hour = d.getHours();
            hourCounts[hour]++;
        });

        setCityData(Object.entries(cities).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 5));
        setJobData(Object.entries(jobs).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 8));
        setTemplateData(Object.entries(templates).map(([k, v]) => ({ name: k, value: v })));
        setAgeData(Object.entries(ages).map(([k, v]) => ({ name: k, value: v })));

        setPeakHourData(hourCounts.map((count, hour) => ({ hour: `${hour}h`, count: count })));

        setFunnelData([
            { name: 'Visitantes', value: totalVis, fill: '#3b82f6' },
            { name: 'Leads (Currículos)', value: totalRes, fill: '#8b5cf6' },
            { name: 'Vendas Confirmadas', value: totalSales, fill: '#10b981' }
        ]);

        const groupedRev: Record<string, number> = {};
        filteredTrans.forEach(t => {
            // @ts-ignore
            const d = t.created_at?.toDate ? t.created_at.toDate() : new Date(t.created_at.seconds * 1000);
            const dateStr = format(d, 'dd/MM');
            groupedRev[dateStr] = (groupedRev[dateStr] || 0) + t.amount;
        });
        setRevenueData(Object.keys(groupedRev).map(k => ({ name: k, value: groupedRev[k] })).reverse());
    };

    const handlePresetChange = (preset: 'today' | '7d' | '30d' | 'month' | 'custom') => {
        setDatePreset(preset);
        const today = new Date();
        let start = new Date();

        if (preset === 'today') start = today;
        if (preset === '7d') start = subDays(today, 7);
        if (preset === '30d') start = subDays(today, 30);
        if (preset === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1);

        if (preset !== 'custom') {
            setDateRange({ start: format(start, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') });
        }
    };

    // --- FUNÇÕES DE CUPONS ---
    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreatingCoupon(true);
        try {
            const cleanCode = newCoupon.code.trim().toUpperCase();
            if (!cleanCode || !newCoupon.value) throw new Error("Preencha os campos obrigatórios");
            const val = parseFloat(newCoupon.value);
            if (isNaN(val) || val <= 0) throw new Error("Valor inválido");
            if (newCoupon.type === 'percentage' && val > 100) throw new Error("Porcentagem não pode ser maior que 100");

            // Validar PIN
            const pinValue = newCoupon.pin.trim();
            if (pinValue && (!/^\d{4}$/.test(pinValue))) {
                throw new Error("PIN deve ter exatamente 4 dígitos numéricos");
            }

            await setDoc(doc(db, 'coupons', cleanCode), {
                code: cleanCode,
                type: newCoupon.type,
                value: val,
                maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : 9999,
                maxUsesPerUser: newCoupon.maxUsesPerUser ? parseInt(newCoupon.maxUsesPerUser) : 1,
                usageCount: 0,
                isActive: true,
                createdAt: Timestamp.now(),
                usedBy: [],
                pin: pinValue || '',
                commissionPerUse: 1.00,
                totalWithdrawn: 0
            });
            setNewCoupon({ code: '', type: 'fixed', value: '', maxUses: '', maxUsesPerUser: '1', pin: '' });
            alert("Cupom criado com sucesso!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsCreatingCoupon(false);
        }
    };

    const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
        await updateDoc(doc(db, 'coupons', id), { isActive: !currentStatus });
    };

    const deleteCoupon = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.")) {
            await deleteDoc(doc(db, 'coupons', id));
        }
    };

    const handleEditCoupon = (coupon: any) => {
        setEditingCoupon(coupon);
        setNewCoupon({
            code: coupon.code,
            type: coupon.type,
            value: coupon.value.toString(),
            maxUses: coupon.maxUses?.toString() || '',
            maxUsesPerUser: coupon.maxUsesPerUser?.toString() || '1',
            pin: coupon.pin || ''
        });
    };

    const handleUpdateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCoupon) return;
        setIsCreatingCoupon(true);
        try {
            const val = parseFloat(newCoupon.value);
            if (isNaN(val) || val <= 0) throw new Error("Valor inválido");
            if (newCoupon.type === 'percentage' && val > 100) throw new Error("Porcentagem não pode ser maior que 100");

            // Validar PIN
            const pinValue = newCoupon.pin.trim();
            if (pinValue && (!/^\d{4}$/.test(pinValue))) {
                throw new Error("PIN deve ter exatamente 4 dígitos numéricos");
            }

            await updateDoc(doc(db, 'coupons', editingCoupon.id), {
                type: newCoupon.type,
                value: val,
                maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : 9999,
                maxUsesPerUser: newCoupon.maxUsesPerUser ? parseInt(newCoupon.maxUsesPerUser) : 1,
                pin: pinValue || ''
            });
            setNewCoupon({ code: '', type: 'fixed', value: '', maxUses: '', maxUsesPerUser: '1', pin: '' });
            setEditingCoupon(null);
            alert("Cupom atualizado com sucesso!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsCreatingCoupon(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingCoupon(null);
        setNewCoupon({ code: '', type: 'fixed', value: '', maxUses: '', maxUsesPerUser: '1', pin: '' });
    };

    // Função para atualizar status de bugs
    const handleUpdateBugStatus = async (bugId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'bugReports', bugId), { status: newStatus });
        } catch (error) {
            console.error("Erro ao atualizar status do bug:", error);
        }
    };

    // UTILS & PDF GENERATION
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
                if (contentDiv) blocks.push({ id: `${dataKey}-block`, type: dataKey, data: dataToPaginate[dataKey], height: getElementHeight(contentDiv) });
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
                const nextBlock = blocks[i + 1];
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

    useEffect(() => {
        if (selectedResume) {
            setIsPreviewReady(false);
            let dataToProcess = { ...selectedResume };
            if (selectedResume.full_data_backup) {
                try {
                    const parsed = JSON.parse(selectedResume.full_data_backup);
                    dataToProcess = { ...selectedResume, ...parsed };
                    if (parsed.personalInfo) {
                        dataToProcess = parsed;
                        dataToProcess.id = selectedResume.id;
                    }
                } catch (e) {
                    console.error("Erro ao processar backup do currículo:", e);
                }
            }
            if (!dataToProcess.style) dataToProcess.style = { template: 'template-modern', color: '#000000', showQRCode: false };
            if (!dataToProcess.personalInfo) {
                dataToProcess.personalInfo = {
                    name: selectedResume.name || '',
                    jobTitle: selectedResume.jobTitle || '',
                    email: selectedResume.email || '',
                    phone: selectedResume.phone || '',
                    address: selectedResume.city || '',
                    age: '', maritalStatus: '', cnh: '', profilePicture: ''
                };
            }
            calculatePagination(dataToProcess);
        }
    }, [selectedResume, calculatePagination]);


    const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError('Credenciais inválidas.'); } };

    // --- CORREÇÃO APLICADA: Configuração de PDF "Limpa" ---
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

                // Configuração "segura": sem useCORS e cacheBust
                // Isso evita que a biblioteca tente re-baixar coisas que já estão no DOM (como nossa imagem Base64)
                const imgData = await toPng(pageEl, {
                    quality: 0.95,
                    pixelRatio: 2,
                    backgroundColor: '#ffffff',
                    width: 794,
                    height: 1123
                    // REMOVIDO: useCORS: true 
                    // REMOVIDO: cacheBust: true
                });

                pageEl.style.cssText = originalStyle;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
            }

            const fileName = `curriculo-${selectedResume.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            pdf.save(fileName);

        } catch (err: any) {
            console.error("Erro no PDF:", err);
            // Mensagem detalhada para sabermos o que realmente aconteceu
            alert(`Erro ao gerar PDF: ${err.message || err}`);
        } finally {
            setIsGeneratingPdf(false);
        }
    };
    // --------------------------------------------------------

    const toggleReviewStatus = async (id: string, currentStatus: boolean) => { await updateDoc(doc(db, 'reviews', id), { approved: !currentStatus }); };
    const deleteReview = async (id: string) => { if (confirm('Tem a certeza?')) await deleteDoc(doc(db, 'reviews', id)); };

    // LOGIN SCREEN
    if (!user) { return (<div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-poppins"> <div className="bg-white p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-sm relative overflow-hidden"> <div className="absolute top-0 left-0 w-full h-2 bg-blue-700"></div> <div className="text-center mb-8"> <img src="/logo-azul.png" alt="Vel" className="h-10 mx-auto mb-4" /> <h2 className="text-2xl font-bold text-gray-800">Painel Inteligente</h2> <p className="text-gray-400 text-sm">Vel Currículo Business Intelligence</p> </div> <form onSubmit={handleLogin} className="space-y-5"> {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center font-medium">{error}</div>} <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" /> <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600" /> <button className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-900 transition">Acessar Dashboard</button> </form> </div> </div>); }

    return (
        <div className="flex h-screen bg-gray-50 font-poppins overflow-hidden">
            <style>{` .animate-slide-in-left { animation: slideInLeft 0.3s ease-out forwards; } @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } } .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; } `}</style>

            {/* SIDEBAR MODERNIZADA */}
            <aside className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-[#002e9e] to-[#001d6e] text-white hidden lg:flex flex-col transition-all duration-300 shadow-2xl z-30 relative`}>
                {/* Logo */}
                <div className="h-20 flex items-center justify-center border-b border-white/10 relative">
                    {sidebarCollapsed ? <span className="font-bold text-2xl bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center">V</span> : <img src="/logo-header.png" alt="Logo" className="h-7" />}
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="absolute -right-3 top-8 bg-blue-500 text-white p-1.5 rounded-full border-2 border-white shadow-lg hover:scale-110 hover:bg-blue-400 transition-all">{sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronLeft />}</button>
                </div>

                {/* Menu Principal */}
                <nav className="flex-1 py-6 px-3 space-y-1">
                    {!sidebarCollapsed && <p className="text-[10px] uppercase tracking-widest text-blue-300/60 font-bold px-3 mb-3">Menu</p>}
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Icons.Grid />} label="Visão Geral" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'resumes'} onClick={() => setActiveTab('resumes')} icon={<Icons.FileText />} label="Leads & Currículos" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Icons.TrendingUp />} label="Business Intelligence" />

                    {!sidebarCollapsed && <div className="h-px bg-white/10 my-4"></div>}
                    {!sidebarCollapsed && <p className="text-[10px] uppercase tracking-widest text-blue-300/60 font-bold px-3 mb-3">Gestão</p>}
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} icon={<Icons.MessageSquare />} label="Avaliações" badge={reviewStats.pending > 0 ? reviewStats.pending : undefined} />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} icon={<Icons.Ticket />} label="Cupons & Promoções" />
                    <SidebarItem collapsed={sidebarCollapsed} active={activeTab === 'bugs'} onClick={() => setActiveTab('bugs')} icon={<Icons.Bug />} label="Bugs Reportados" badge={bugReports.filter(b => b.status === 'pending').length > 0 ? bugReports.filter(b => b.status === 'pending').length : undefined} />
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-white/10 bg-white/5">
                    <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-bold text-lg shadow-lg">
                            A
                        </div>
                        {!sidebarCollapsed && (
                            <div className="flex-1">
                                <p className="font-semibold text-sm">Administrador</p>
                                <p className="text-xs text-blue-200/70">admin@velcurriculo.com</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => signOut(auth)} className={`flex items-center gap-3 w-full p-2.5 mt-3 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}>
                        <Icons.LogOut /> {!sidebarCollapsed && <span className="text-sm">Sair da conta</span>}
                    </button>
                </div>
            </aside>

            {/* MOBILE MENU */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#002e9e] text-white shadow-2xl flex flex-col animate-slide-in-left">
                        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10"><img src="/logo-header.png" className="h-6" /><button onClick={() => setMobileMenuOpen(false)}><Icons.X /></button></div>
                        <nav className="p-4 space-y-2">
                            <SidebarItem collapsed={false} active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false) }} icon={<Icons.Grid />} label="Visão Geral" />
                            <SidebarItem collapsed={false} active={activeTab === 'resumes'} onClick={() => { setActiveTab('resumes'); setMobileMenuOpen(false) }} icon={<Icons.FileText />} label="Leads" />
                            <SidebarItem collapsed={false} active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false) }} icon={<Icons.TrendingUp />} label="BI & Dados" />
                            <SidebarItem collapsed={false} active={activeTab === 'reviews'} onClick={() => { setActiveTab('reviews'); setMobileMenuOpen(false) }} icon={<Icons.MessageSquare />} label="Avaliações" />
                            <SidebarItem collapsed={false} active={activeTab === 'coupons'} onClick={() => { setActiveTab('coupons'); setMobileMenuOpen(false) }} icon={<Icons.Ticket />} label="Cupons" />
                            <SidebarItem collapsed={false} active={activeTab === 'bugs'} onClick={() => { setActiveTab('bugs'); setMobileMenuOpen(false) }} icon={<Icons.Bug />} label="Bugs" />
                        </nav>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto w-full bg-slate-50">
                {/* TOP HEADER COM NOTIFICAÇÕES */}
                <header className="bg-white h-auto border-b border-gray-200 flex flex-col md:flex-row items-center justify-between px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm/50 gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden text-gray-600 hover:bg-gray-100 p-2 rounded-md"><Icons.Menu /></button>
                        <h1 className="text-xl font-bold text-gray-800">Dashboard Gerencial</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Filtros de Data */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 p-1.5 rounded-xl border border-gray-200/60 shadow-inner">
                            <div className="flex bg-white rounded-lg shadow-sm p-0.5">
                                <button onClick={() => handlePresetChange('today')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${datePreset === 'today' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>Hoje</button>
                                <button onClick={() => handlePresetChange('7d')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${datePreset === '7d' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>7D</button>
                                <button onClick={() => handlePresetChange('30d')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${datePreset === '30d' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>30D</button>
                                <button onClick={() => handlePresetChange('month')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${datePreset === 'month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>Mês</button>
                            </div>

                            <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-3">
                                <input type="date" value={dateRange.start} onChange={e => { setDateRange({ ...dateRange, start: e.target.value }); setDatePreset('custom') }} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-600 font-medium focus:ring-1 focus:ring-blue-500 outline-none" />
                                <span className="text-gray-400 text-xs font-medium">até</span>
                                <input type="date" value={dateRange.end} onChange={e => { setDateRange({ ...dateRange, end: e.target.value }); setDatePreset('custom') }} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-600 font-medium focus:ring-1 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        {/* Botão de Notificações */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 hover:text-gray-800"
                            >
                                <Icons.Bell />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                        {notifications.filter(n => !n.read).length}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown de Notificações */}
                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
                                        <h3 className="font-bold text-gray-800">Notificações</h3>
                                        {notifications.length > 0 && (
                                            <button onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                                Marcar todas como lidas
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400">
                                                <Icons.Bell />
                                                <p className="mt-2 text-sm">Nenhuma notificação</p>
                                            </div>
                                        ) : (
                                            notifications.slice(0, 5).map((notif) => (
                                                <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${notif.type === 'sale' ? 'bg-green-500' :
                                                            notif.type === 'lead' ? 'bg-blue-500' :
                                                                notif.type === 'coupon' ? 'bg-purple-500' : 'bg-yellow-500'
                                                            }`}>
                                                            {notif.type === 'sale' ? <Icons.DollarSign /> :
                                                                notif.type === 'lead' ? <Icons.Users /> :
                                                                    notif.type === 'coupon' ? <Icons.Ticket /> : <Icons.Star />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm text-gray-800 font-medium">{notif.message}</p>
                                                            <p className="text-xs text-gray-400 mt-1">Àgora mesmo</p>
                                                        </div>
                                                        {!notif.read && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">

                    {/* VISÃO GERAL (OVERVIEW) */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <KpiCard title="Faturamento" value={kpis.revenue} isMoney icon={<Icons.DollarSign />} color="bg-emerald-500" growth={growth.revenue} />
                                <KpiCard title="Vendas" value={kpis.salesCount} icon={<Icons.Check />} color="bg-blue-500" sub={`Conv: ${kpis.conversionRate.toFixed(1)}%`} growth={growth.salesCount} />
                                <KpiCard title="Ticket Médio" value={kpis.avgTicket} isMoney icon={<Icons.Target />} color="bg-purple-500" sub="Por cliente" />
                                <KpiCard title="Novos Leads" value={kpis.resumes} icon={<Icons.Users />} color="bg-orange-500" sub={`Visitantes: ${kpis.visitors}`} growth={growth.resumes} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                    <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><Icons.TrendingUp /> Tendência de Tráfego e Vendas</h3>
                                    <div className="h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={dailyChartData}>
                                                <defs>
                                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis yAxisId="left" orientation="left" stroke="#94a3b8" hide />
                                                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" hide />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                                                <Legend iconType="circle" />
                                                <Area yAxisId="left" type="monotone" dataKey="visitantes" name="Visitantes" fill="url(#colorVisits)" stroke="#3b82f6" strokeWidth={2} />
                                                <Bar yAxisId="left" dataKey="curriculos" name="Leads Criados" fill="#8b5cf6" barSize={12} radius={[4, 4, 0, 0]} />
                                                <Line yAxisId="right" type="monotone" dataKey="vendas" name="Vendas Confirmadas" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5 flex flex-col">
                                    <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2"><Icons.Filter /> Funil de Conversão</h3>
                                    <div className="flex-1 flex flex-col justify-center gap-6">
                                        {funnelData.map((step, idx) => (
                                            <div key={step.name} className="relative group">
                                                <div className="flex justify-between text-sm font-medium mb-2 text-gray-600">
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: step.fill }}></span>
                                                        {step.name}
                                                    </span>
                                                    <span className="font-bold text-gray-800">{step.value}</span>
                                                </div>
                                                <div className="w-full bg-gray-50 rounded-full h-3 overflow-hidden shadow-inner">
                                                    <div className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" style={{ width: `${(step.value / (funnelData[0].value || step.value || 1)) * 100}%`, backgroundColor: step.fill }}>
                                                        <div className="absolute inset-0 bg-white/20"></div>
                                                    </div>
                                                </div>
                                                {idx > 0 && <div className="text-right text-[11px] font-bold text-gray-400 mt-1">
                                                    {funnelData[idx - 1].value > 0 ? ((step.value / funnelData[idx - 1].value) * 100).toFixed(1) : 0}% de conversão
                                                </div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {/* TEMPLATES FAVORITOS (CORRIGIDO) */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                    <h3 className="font-bold text-gray-700 mb-4">Modelos Favoritos</h3>
                                    <div className="h-[250px] relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={templateData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                                    {templateData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend verticalAlign="bottom" height={36} iconSize={10} formatter={(value, entry: any) => <span className="text-xs text-gray-500 font-medium ml-1">{value} ({entry.payload.value})</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <span className="block text-2xl font-bold text-gray-800">{templateData.reduce((a, b) => a + b.value, 0)}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Gerados</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CARGOS EM ALTA */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                        <Icons.Target /> Cargos em Alta
                                    </h3>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {jobData.map((job, idx) => (
                                            <div key={idx} className="group">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-gray-700 flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${idx < 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            #{idx + 1}
                                                        </span>
                                                        {job.name}
                                                    </span>
                                                    <span className="font-bold text-gray-900">{job.value}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${(job.value / (jobData[0]?.value || 1)) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* NOVO: HORÁRIOS DE PICO */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Icons.Clock /> Horários de Pico</h3>
                                    <p className="text-xs text-gray-400 mb-4">Volume de criação de currículos por hora do dia.</p>
                                    <div className="h-[200px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={peakHourData}>
                                                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                                                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* TOP CIDADES (WIDE) */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                <h3 className="font-bold text-gray-700 mb-6">Geolocalização dos Usuários</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    {cityData.map((city, idx) => (
                                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-800 text-sm">{city.name}</h4>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(city.value / cityData[0].value) * 100}%` }}></div>
                                                </div>
                                            </div>
                                            <span className="font-bold text-gray-600">{city.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

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
                                                    <td className="px-6 py-4 text-xs text-gray-500 capitalize">{lead.template ? lead.template.replace('template-', '') : '-'}</td>
                                                    {/* @ts-ignore */}
                                                    <td className="px-6 py-4 text-gray-500">{lead.generated_at?.toDate ? format(lead.generated_at.toDate(), 'dd/MM/yy HH:mm') : '-'}</td>
                                                    <td className="px-6 py-4"><button onClick={() => setSelectedResume(lead)} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Ver Currículo</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🔥 TAB DE AVALIAÇÕES RENOVADA */}
                    {activeTab === 'reviews' && (
                        <div className="animate-fade-in space-y-6">

                            {/* DASHBOARD DE REPUTAÇÃO */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* CARD PRINCIPAL: NOTA MÉDIA */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5 flex flex-col items-center justify-center text-center">
                                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Nota Geral</h4>
                                    <div className="text-5xl font-bold text-gray-800 mb-2">{reviewStats.avgRating.toFixed(1)}</div>
                                    <div className="flex gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map(s => <div key={s} className={s <= Math.round(reviewStats.avgRating) ? "text-yellow-400" : "text-gray-200"}><Icons.Star /></div>)}
                                    </div>
                                    <p className="text-xs text-gray-400">{reviewStats.total} avaliações totais</p>
                                </div>

                                {/* GRÁFICO: DISTRIBUIÇÃO */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Distribuição de Notas</h4>
                                    <div className="h-[120px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart layout="vertical" data={reviewStats.distribution}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="stars" type="category" width={20} tickFormatter={val => `${val}★`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                <Bar dataKey="count" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={10} background={{ fill: '#f1f5f9' }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* GRÁFICO: TIMELINE */}
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-blue-900/5">
                                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Novas Avaliações</h4>
                                    <div className="h-[120px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={reviewStats.timeline}>
                                                <defs>
                                                    <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="url(#colorReviews)" strokeWidth={2} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-center text-gray-400 mt-2">Últimos 14 dias com atividade</p>
                                </div>
                            </div>

                            {/* CABEÇALHO DA LISTA */}
                            <div className="flex items-center justify-between mt-8">
                                <h3 className="font-bold text-gray-700 text-xl flex items-center gap-2"><Icons.MessageSquare /> Feed de Depoimentos</h3>
                                <div className="flex gap-2">
                                    {reviewStats.pending > 0 && (
                                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 animate-pulse">
                                            {reviewStats.pending} Pendentes de Aprovação
                                        </span>
                                    )}
                                </div>
                            </div>

                            {reviews.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-xl border border-gray-200 text-gray-400">
                                    <Icons.MessageSquare />
                                    <p className="mt-2">Nenhuma avaliação encontrada.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {reviews.map((review) => (
                                        <div key={review.id} className={`bg-white p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${review.approved ? 'border-gray-100 shadow-sm' : 'border-yellow-300 shadow-md ring-1 ring-yellow-100 bg-yellow-50/10'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${review.approved ? 'bg-blue-50 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                        {review.author ? review.author.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 leading-tight text-sm">{review.author || 'Anônimo'}</h4>
                                                        <div className="flex items-center mt-1 text-xs">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <div key={star} className={star <= review.rating ? "text-yellow-400" : "text-gray-200"}>
                                                                    <Icons.Star />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                {review.approved ? (
                                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-green-200">Visível</span>
                                                ) : (
                                                    <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-yellow-200">Pendente</span>
                                                )}
                                            </div>

                                            <p className="text-gray-600 text-sm mb-6 italic min-h-[60px] line-clamp-3">"{review.text}"</p>

                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {review.created_at?.toDate ? format(review.created_at.toDate(), "dd/MM/yyyy") : 'Data desconhecida'}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => toggleReviewStatus(review.id, review.approved)} className={`p-2 rounded-lg transition-colors ${review.approved ? 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-600' : 'bg-green-600 text-white hover:bg-green-700 shadow-sm shadow-green-200'}`} title={review.approved ? "Ocultar Depoimento" : "Aprovar Depoimento"}>
                                                        {review.approved ? <Icons.X /> : <Icons.Check />}
                                                    </button>
                                                    <button onClick={() => deleteReview(review.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Excluir Permanentemente">
                                                        <Icons.Trash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 🔥 TAB DE CUPONS */}
                    {activeTab === 'coupons' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-700 text-xl">Gestão de Cupons & Promoções</h3>
                                    <p className="text-sm text-gray-500">Crie códigos promocionais para impulsionar vendas.</p>
                                </div>
                                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                    <span className="text-sm text-blue-800 font-bold">{coupons.filter(c => c.isActive).length} Cupons Ativos</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Formulário de Criação/Edição */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Icons.Ticket /> {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
                                    </h4>
                                    <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Código do Cupom</label>
                                            <input
                                                type="text"
                                                placeholder="EX: PROMO10"
                                                value={newCoupon.code}
                                                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                                className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono tracking-wider ${editingCoupon ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                required
                                                disabled={!!editingCoupon}
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {editingCoupon ? 'O código não pode ser alterado.' : 'O cliente usará este código exato.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tipo</label>
                                                <select value={newCoupon.type} onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                                    <option value="fixed">Valor Fixo (R$)</option>
                                                    <option value="percentage">Porcentagem (%)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Valor</label>
                                                <input type="number" placeholder={newCoupon.type === 'fixed' ? '2.50' : '10'} value={newCoupon.value} onChange={e => setNewCoupon({ ...newCoupon, value: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required step="0.01" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Limite Total de Usos</label>
                                                <input type="number" placeholder="Ex: 100" value={newCoupon.maxUses} onChange={e => setNewCoupon({ ...newCoupon, maxUses: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                <p className="text-[10px] text-gray-400 mt-1">Quantas vezes no total pode ser usado.</p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Usos por Usuário</label>
                                                <input type="number" placeholder="1" value={newCoupon.maxUsesPerUser} onChange={e => setNewCoupon({ ...newCoupon, maxUsesPerUser: e.target.value })} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min="1" />
                                                <p className="text-[10px] text-gray-400 mt-1">Quantas vezes o mesmo usuário pode usar.</p>
                                            </div>
                                        </div>

                                        {/* Campo PIN para Afiliados */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1 uppercase flex items-center gap-1"><Icons.Lock /> PIN do Afiliado (Opcional)</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: 1234"
                                                value={newCoupon.pin}
                                                onChange={e => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                    setNewCoupon({ ...newCoupon, pin: value });
                                                }}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest text-center text-lg"
                                                maxLength={4}
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                PIN de 4 dígitos para o afiliado acessar a página "Meus Cupons" e acompanhar comissões.
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            {editingCoupon && (
                                                <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition">
                                                    Cancelar
                                                </button>
                                            )}
                                            <button type="submit" disabled={isCreatingCoupon} className={`${editingCoupon ? 'flex-1' : 'w-full'} bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex justify-center`}>
                                                {isCreatingCoupon ? (editingCoupon ? 'Salvando...' : 'Criando...') : (editingCoupon ? 'Salvar Alterações' : 'Criar Cupom')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Lista de Cupons */}
                                <div className="lg:col-span-2 space-y-4">
                                    {coupons.length === 0 ? (
                                        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                            <p className="text-gray-400">Nenhum cupom criado ainda.</p>
                                        </div>
                                    ) : (
                                        coupons.map((coupon) => (
                                            <div key={coupon.id} className={`bg-white p-4 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-4 transition-all ${coupon.isActive ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-60 bg-gray-50'}`}>
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        %
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-lg tracking-wide">{coupon.code}</h4>
                                                        <p className="text-sm text-gray-500">
                                                            {coupon.type === 'fixed' ? `Desconto de R$ ${parseFloat(coupon.value).toFixed(2)}` : `Desconto de ${coupon.value}%`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                                    <div className="text-center">
                                                        <span className="block text-xs text-gray-400 font-bold uppercase">Usos</span>
                                                        <span className="font-bold text-gray-700">{coupon.usageCount} <span className="text-gray-300 font-normal">/ {coupon.maxUses}</span></span>
                                                    </div>

                                                    <div className="text-center">
                                                        <span className="block text-xs text-gray-400 font-bold uppercase">Por Usuário</span>
                                                        <span className="font-bold text-gray-700">{coupon.maxUsesPerUser || 1}x</span>
                                                    </div>

                                                    {coupon.pin && (
                                                        <div className="text-center">
                                                            <span className="block text-xs text-gray-400 font-bold uppercase flex items-center gap-1 justify-center"><Icons.Lock /> PIN</span>
                                                            <span className="font-bold text-blue-600 font-mono tracking-wider">{coupon.pin}</span>
                                                        </div>
                                                    )}

                                                    <div className="text-center">
                                                        <span className="block text-xs text-gray-400 font-bold uppercase flex items-center gap-1 justify-center"><Icons.Coins /> Comissão</span>
                                                        <span className="font-bold text-green-600">R$ {((coupon.usageCount || 0) * (coupon.commissionPerUse || 1)).toFixed(2)}</span>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleCouponStatus(coupon.id, coupon.isActive)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${coupon.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                                        >
                                                            {coupon.isActive ? 'ATIVO' : 'PAUSADO'}
                                                        </button>
                                                        <button onClick={() => handleEditCoupon(coupon)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Editar cupom">
                                                            <Icons.Edit />
                                                        </button>
                                                        <button onClick={() => deleteCoupon(coupon.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition" title="Excluir cupom">
                                                            <Icons.Trash />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🐛 TAB DE BUGS REPORTADOS */}
                    {activeTab === 'bugs' && (
                        <div className="animate-fade-in space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-700 text-xl">Bugs Reportados</h3>
                                    <p className="text-sm text-gray-500">Gerencie os bugs reportados pelos usuários.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                                        <span className="text-sm text-yellow-800 font-bold">{bugReports.filter(b => b.status === 'pending').length} Pendentes</span>
                                    </div>
                                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                                        <span className="text-sm text-green-800 font-bold">{bugReports.filter(b => b.status === 'resolved').length} Resolvidos</span>
                                    </div>
                                </div>
                            </div>

                            {bugReports.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                    <Icons.Bug />
                                    <p className="text-gray-400 mt-4">Nenhum bug reportado ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {bugReports.map((bug) => (
                                        <div key={bug.id} className={`bg-white p-5 rounded-xl border shadow-sm transition-all ${bug.status === 'pending' ? 'border-yellow-200' : bug.status === 'resolved' ? 'border-green-200' : 'border-gray-200'}`}>
                                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bug.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : bug.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            <Icons.Bug />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">{bug.userName || 'Usuário Anônimo'}</p>
                                                            <p className="text-xs text-gray-400">{bug.userEmail || 'sem-email'}</p>
                                                        </div>
                                                        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${bug.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : bug.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {bug.status === 'pending' ? 'Pendente' : bug.status === 'resolved' ? 'Resolvido' : bug.status}
                                                        </span>
                                                    </div>
                                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.description}</p>
                                                    </div>
                                                    {bug.images && bug.images.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {bug.images.map((img: string, idx: number) => (
                                                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition">
                                                                    <img src={img} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                                                        <span>📅 {bug.createdAt?.toDate?.()?.toLocaleString('pt-BR') || 'Data não disponível'}</span>
                                                        <span className="truncate max-w-[300px]">🔗 {bug.url || 'URL não disponível'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 min-w-[140px]">
                                                    {bug.status === 'pending' && (
                                                        <button onClick={() => handleUpdateBugStatus(bug.id, 'resolved')} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition">
                                                            ✓ Marcar Resolvido
                                                        </button>
                                                    )}
                                                    {bug.status === 'resolved' && (
                                                        <button onClick={() => handleUpdateBugStatus(bug.id, 'pending')} className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600 transition">
                                                            ↺ Reabrir
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL DE PREVIEW */}
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

const SidebarItem = ({ collapsed, active, onClick, icon, label, badge }: any) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200 group relative ${active ? 'bg-white text-blue-900 shadow-lg font-semibold' : 'text-blue-100 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center' : ''}`} title={collapsed ? label : ''}>
        <div className={`${active ? 'text-blue-700' : 'text-current'}`}>{icon}</div>
        {!collapsed && <span className="animate-fade-in flex-1 text-left">{label}</span>}
        {badge && (
            <span className={`${collapsed ? 'absolute -top-1 -right-1' : ''} min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                {badge}
            </span>
        )}
    </button>
);

const KpiCard = ({ title, value, icon, color, isMoney, sub, growth }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-lg shadow-blue-900/5 border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
        <div className="flex justify-between items-start mb-3">
            <div className={`w-12 h-12 ${color} text-white rounded-xl flex items-center justify-center shadow-md shadow-opacity-20`}>{icon}</div>
            {growth !== undefined && growth !== 0 && (
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${growth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {growth > 0 ? <Icons.TrendingUp /> : <Icons.TrendingDown />}
                    <span className="ml-1">{Math.abs(growth).toFixed(0)}%</span>
                </div>
            )}
        </div>
        <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{isMoney ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0) : (value || 0)}</h3>
            {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
        </div>
    </div>
);

export default AdminDashboard;

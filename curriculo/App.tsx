import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore
import { toJpeg } from 'html-to-image';
// @ts-ignore
import { jsPDF } from 'jspdf';
import ResumeForm from './components/ResumeForm';
// IMPORTANTE: Importamos QR_CONFIG e usamos 'any' para o ref para evitar errosx de tipagem
import ResumePreview, { QR_CONFIG } from './components/ResumePreview';
import PixModal from './components/PixModal';
import MyResumesModal from './components/MyResumesModal';
import ContinueProgressModal from './components/ContinueProgressModal';
import ImportModal from './components/ImportModal';
import type { ResumeData, PageData } from './types';
// SERVIÇOS DO FIREBASE E TRACKER
import { runAutoSetup } from './services/autoSetup';
import { trackVisitor, trackResumeGenerated, trackSale } from './services/tracker';
import { analyzeResumePDF } from './services/geminiService';
import { db } from './services/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
// IMPORTA O PAINEL ADMINISTRATIVO
import AdminDashboard from './components/AdminDashboard';
import Hero3DCard from './components/Hero3DCard';
// IMPORTA O NOVO HEADER E CONTEXTO
import { FeedbackProvider, useFeedback } from './contexts/FeedbackContext';
import FeedbackHeader from './components/FeedbackHeader';
// HOOK DE NAVEGAÇÃO POR SWIPE
import useSwipeNavigation from './hooks/useSwipeNavigation';
// IMPORTA A PÁGINA DE AFILIADOS
import MyCouponsPage from './components/MyCouponsPage';
import ErrorBoundary from './components/ErrorBoundary';

interface SavedResume extends ResumeData {
    savedAt: string;
}

// Chave para persistência da sessão PIX (Mesma usada no PixModal)
const PIX_SESSION_KEY = '@velcurriculo:pix_session_v1';

// DADOS DE DEMONSTRAÇÃO COMPLETOS
const DEMO_DATA: ResumeData = {
    personalInfo: {
        name: "Marcos Mj Santos",
        jobTitle: "Desenvolvedor Full Stack & Criador de Soluções",
        email: "marcos@velsites.com.br",
        phone: "(37) 9 8411-6034",
        address: "Nova Serrana, Romeu Duarte",
        age: "22",
        maritalStatus: "Casado(a)",
        cnh: "A+B",
        linkedin: "https://www.linkedin.com/in/marcos-mj-santos-aa696a233",
        profilePicture: "/perfil.png"
    },
    summary: "Desenvolvedor Full Stack. Transformo ideias em projetos que comunicam de verdade. Especialista no ecossistema React, TypeScript e arquitetura Serverless. Aos 22 anos, uno agilidade técnica e visão de produto, com foco em criar experiências de usuário fluidas, sistemas escaláveis e soluções que geram valor real para o usuário final.",
    experiences: [
        {
            id: "1767032047032",
            jobTitle: "Fundador & Desenvolvedor Lead",
            company: "Vel Sites / VelCurrículo",
            location: "Nova Serrana, MG",
            startDate: "Jan 2023",
            endDate: "Atual",
            description: "Fundador e desenvolvedor responsável pela criação da plataforma VelCurrículo. Atuo do início ao fim do projeto, cuidando da estrutura do sistema, integrações externas e da experiência do usuário, com foco em soluções simples, funcionais e que resolvem problemas reais."
        },
        {
            id: "1767032148023",
            jobTitle: "Desenvolvedor Front-End Pleno",
            company: "Tech Solutions (Remoto)",
            location: "Divinópolis, MG",
            startDate: "Mar 2021",
            endDate: "Dez 2022",
            description: "Desenvolvedor Front-End atuando no desenvolvimento e manutenção de interfaces para sistemas de gestão (ERP), com foco em usabilidade e clareza. Participei da modernização de sistemas antigos, padronização visual dos projetos e trabalho colaborativo em equipe ágil."
        },
        {
            id: "1767032304188",
            jobTitle: "Freelancer Full Stack",
            company: "Autônomo ",
            location: "Minas Gerais",
            startDate: "Jan 2020",
            endDate: "Fev 2021",
            description: "Atuação como desenvolvedor freelancer, criando sites e lojas virtuais para pequenos negócios. Cuido desde a parte técnica até a entrega final, com atenção à performance, presença online e soluções simples para facilitar o contato com clientes."
        }
    ],
    education: [
        {
            id: "1767032767322",
            degree: "Análise e Desenvolvimento de Sistemas",
            institution: "Faculdade Tecnológica",
            startDate: "2020",
            endDate: "2024"
        }
    ],
    courses: [
        {
            id: "1767032486343",
            name: "Arquitetura de Software e Cloud Computing",
            institution: "AWS Training",
            completionDate: "2024"
        },
        {
            id: "1767102359574",
            name: "Domínio de React, Redux e Next.js",
            institution: "Code Academy",
            completionDate: "2023"
        },
        {
            id: "1767102374315",
            name: "Integrações de API e Microsserviços",
            institution: "Alura",
            completionDate: "2022"
        },
        {
            id: "1767102385192",
            name: "UX/UI Design para Desenvolvedores",
            institution: "Origamid",
            completionDate: "2021"
        }
    ],
    languages: [
        {
            id: "1767102453063",
            language: "Português",
            proficiency: "Fluente"
        },
        {
            id: "1767102464734",
            language: "Inglês",
            proficiency: "Avançado"
        }
    ],
    skills: [
        "Comunicação Efetiva",
        "Atendimento Ao Cliente",
        "Gestão De Tempo",
        "Proatividade",
        "Organização",
        "Liderança",
        "Pacote Office",
        "Excel Avançado"
    ],
    style: {
        template: "template-modern",
        color: "#002e9e",
        showQRCode: true,
        showLinkedinQr: true
    }
};

const INITIAL_DATA: ResumeData = {
    personalInfo: { name: '', jobTitle: '', email: '', phone: '', address: '', age: '', maritalStatus: '', cnh: '', linkedin: '', profilePicture: '' },
    summary: '',
    experiences: [],
    education: [],
    courses: [],
    languages: [],
    skills: [],
    style: { template: 'template-modern', color: '#002e9e', showQRCode: true, showLinkedinQr: true }
};

// ATUALIZADO: Traduções PT-PT para PT-BR nos depoimentos
const ALL_TESTIMONIALS = [
    { text: '"Ferramenta incrível! Consegui criar um currículo super profissional em 10 minutos. A ajuda da IA para o resumo foi a cereja no topo do bolo."', author: '- Mariana S. - Marketing Digital' },
    { text: '"Para quem está começando a carreira, como eu, este site é uma mão na roda. Templates limpos e muito fáceis de usar. 10/10!"', author: '- João P. - Estudante' },
    { text: '"Finalmente um gerador de currículos que não tenta me vender um plano premium a cada clique. Gratuito e de alta qualidade. Recomendo!"', author: '- Carlos F. - Desenvolvedor Jr.' },
    { text: '"O design minimalista era exatamente o que eu procurava. Consegui a minha primeira entrevista com o currículo que fiz aqui."', author: '- Ana L. - Designer Gráfica' },
    { text: '"A funcionalidade de IA para melhorar as descrições é fantástica. Economiza muito tempo e o resultado fica muito mais profissional."', author: '- Ricardo G. - Gerente de Projetos' },
    { text: '"Usei a ferramenta para atualizar o meu currículo antigo e a diferença é notória. A interface é super intuitiva e o resultado final é excelente."', author: '- Sofia B. - Advogada' },
    { text: '"Como assistente administrativo, precisava de algo rápido e profissional. Este site entregou tudo! A IA ajudou a organizar minhas tarefas de forma clara."', author: '- Lucas M. - Assistente Administrativo' },
    { text: '"Trabalho como caixa e não sabia como montar um currículo. Foi tudo muito fácil e o resultado ficou ótimo, bem mais do que eu esperava."', author: '- Camila R. - Operadora de Caixa' },
    { text: '"Simplesmente o melhor que já usei. Em poucos passos, meu currículo de \'ajudante geral\' ficou com cara de especialista. Muito obrigado!"', author: '- Fernando T. - Ajudante Geral' },
    { text: '"Estava procurando o meu primeiro emprego e não tinha experiência para listar. As sugestões de habilidades e o editor de resumo foram essenciais!"', author: '- Beatriz C. - Jovem Aprendiz' },
    { text: '"O QR Code para o WhatsApp é um diferencial genial. Moderno e prático, recebi elogios na entrevista por causa disso."', author: '- Tiago A. - Vendedor' },
    { text: '"A variedade de templates é ótima. Encontrei um que se encaixava perfeitamente com a minha área de atuação. Recomendo a todos os colegas."', author: '- Letícia N. - Recepcionista' }
];

const shuffleArray = <T,>(array: T[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// Componente de Animação de Digitação para o Mockup
const TypingAnimationMockup: React.FC = () => {
    const names = ['Maria Silva', 'João Santos', 'Ana Costa', 'Pedro Oliveira', 'Carla Mendes'];
    const [currentNameIndex, setCurrentNameIndex] = React.useState(0);
    const [displayedText, setDisplayedText] = React.useState('');
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [showCursor, setShowCursor] = React.useState(true);

    React.useEffect(() => {
        const cursorInterval = setInterval(() => setShowCursor(prev => !prev), 530);
        return () => clearInterval(cursorInterval);
    }, []);

    React.useEffect(() => {
        const currentName = names[currentNameIndex];
        let timeout: NodeJS.Timeout;

        if (!isDeleting && displayedText === currentName) {
            timeout = setTimeout(() => setIsDeleting(true), 2000);
        } else if (isDeleting && displayedText === '') {
            setIsDeleting(false);
            setCurrentNameIndex((prev) => (prev + 1) % names.length);
        } else {
            const speed = isDeleting ? 50 : 100;
            timeout = setTimeout(() => {
                setDisplayedText(prev =>
                    isDeleting
                        ? prev.slice(0, -1)
                        : currentName.slice(0, prev.length + 1)
                );
            }, speed);
        }

        return () => clearTimeout(timeout);
    }, [displayedText, isDeleting, currentNameIndex]);

    return (
        <span className="text-sm text-gray-700 font-medium">
            {displayedText}
            <span className={`inline-block w-0.5 h-4 bg-blue-500 ml-0.5 align-middle ${showCursor ? 'opacity-100' : 'opacity-0'}`}></span>
        </span>
    );
};

// Componente de Destaques com Animação de Scroll Reveal
const HighlightsSection: React.FC = () => {
    const highlights = [
        {
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
            ),
            title: "3 Templates",
            subtitle: "Modelos Profissionais",
            color: "blue",
            animClass: "animate-fade-in-up"
        },
        {
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ),
            title: "IA Integrada",
            subtitle: "Textos Otimizados",
            color: "green",
            animClass: "animate-fade-in-up-delay-1"
        },
        {
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            title: "PDF Premium",
            subtitle: "Exportação em Alta Qualidade",
            color: "purple",
            animClass: "animate-fade-in-up-delay-2"
        }
    ];

    const colorClasses: Record<string, { bg: string; iconBg: string }> = {
        blue: { bg: 'bg-white', iconBg: 'bg-blue-50 text-blue-600' },
        green: { bg: 'bg-white', iconBg: 'bg-green-50 text-green-600' },
        purple: { bg: 'bg-white', iconBg: 'bg-purple-50 text-purple-600' }
    };

    return (
        <section className="hidden lg:block py-20 mb-8">
            <div className="max-w-5xl mx-auto px-4">
                <div className="grid grid-cols-3 gap-10">
                    {highlights.map((item, index) => {
                        const colors = colorClasses[item.color];
                        return (
                            <div
                                key={index}
                                className={`${colors.bg} text-center group p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 ${item.animClass}`}
                            >
                                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${colors.iconBg} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                                    {item.icon}
                                </div>
                                <div className="text-3xl font-bold text-gray-800 mb-2">{item.title}</div>
                                <div className="text-gray-500 text-sm">{item.subtitle}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

const shuffledTestimonials = shuffleArray(ALL_TESTIMONIALS);
const halfLength = Math.ceil(shuffledTestimonials.length / 2);
const TESTIMONIALS_1 = shuffledTestimonials.slice(0, halfLength);
const TESTIMONIALS_2 = shuffledTestimonials.slice(halfLength);

const calculateTodaysBase = () => {
    const date = new Date();
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date as any) - (start as any);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return 250 + (dayOfYear * 37 % 100);
};

const calculateCurrentGenerated = (base: number) => {
    const now = new Date();
    const hour = now.getHours();

    if (hour < 0) return base;

    const startOfDayCount = new Date();
    startOfDayCount.setHours(9, 0, 0, 0);

    const endOfDayCount = new Date();
    endOfDayCount.setHours(19, 0, 0, 0);

    if (hour < 9) return base;
    if (now > endOfDayCount) {
        const totalSecondsInWorkDay = (endOfDayCount.getTime() - startOfDayCount.getTime()) / 1000;
        return base + Math.floor(totalSecondsInWorkDay / 20);
    }

    const secondsElapsed = Math.floor((now.getTime() - startOfDayCount.getTime()) / 1000);
    return base + Math.floor(secondsElapsed / 20);
};

interface PixPaymentData {
    qrCodeUrl: string;
    copyPasteCode: string;
    paymentId: string;
}

const TestimonialCard: React.FC<{ item: typeof ALL_TESTIMONIALS[0], ariaHidden?: boolean }> = ({ item, ariaHidden = false }) => {
    // Extrai nome e cargo do autor (formato: "- Nome S. - Cargo")
    const authorParts = item.author.replace(/^-\s*/, '').split(' - ');
    const authorName = authorParts[0] || 'Usuário';
    const authorRole = authorParts[1] || '';
    const initial = authorName.charAt(0).toUpperCase();

    // Remove aspas extras do texto se existirem
    const cleanText = item.text.replace(/^["'""]|["'""]$/g, '');

    return (
        <li
            className="flex flex-col flex-shrink-0 w-72 md:w-80 bg-white p-6 rounded-2xl shadow-md hover:shadow-lg border border-gray-100/80 transition-all duration-300"
            aria-hidden={ariaHidden}
        >
            {/* Ícone de Aspas */}
            <svg className="w-10 h-10 text-blue-500 mb-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>

            {/* Texto do Depoimento */}
            <div className="flex-grow mb-4">
                <p className="text-gray-600 leading-relaxed text-sm md:text-base">{cleanText}</p>
            </div>

            {/* Avatar + Autor */}
            <div className="flex items-center pt-4 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                    <span className="text-white font-bold text-sm">{initial}</span>
                </div>
                <div className="ml-3 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{authorName}</p>
                    {authorRole && <p className="text-xs text-gray-500 truncate">{authorRole}</p>}
                </div>
            </div>
        </li>
    );
};

const TestimonialsSection = React.memo(() => {
    return (
        <section id="avaliacoes" className="py-20 bg-gradient-to-b from-white to-gray-50">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Feito para quem precisa de <span className="gradient-text">resultados</span></h2>
                <p className="text-lg text-gray-600">Veja o que nossos usuários estão dizendo.</p>
            </div>

            <div className="space-y-4">
                <div className="scroller px-4 py-4" data-animated="true">
                    <ul className="scroller__inner list-none p-0">
                        {TESTIMONIALS_1.map((item, index) => <TestimonialCard key={index} item={item} />)}
                        {TESTIMONIALS_1.map((item, index) => <TestimonialCard key={`dupe-${index}`} item={item} ariaHidden={true} />)}
                    </ul>
                </div>
                <div className="scroller px-4 py-4" data-direction="right" data-animated="true">
                    <ul className="scroller__inner list-none p-0">
                        {TESTIMONIALS_2.map((item, index) => <TestimonialCard key={index} item={item} />)}
                        {TESTIMONIALS_2.map((item, index) => <TestimonialCard key={`dupe-${index}`} item={item} ariaHidden={true} />)}
                    </ul>
                </div>
            </div>
        </section>
    );
});

// COMPONENTE PRINCIPAL
const AppContent: React.FC = () => {
    // --- HOOK DE FEEDBACK ---
    const { status, triggerFeedback } = useFeedback();

    // --- CÓDIGO DO SITE NORMAL ABAIXO ---
    const isPixTestMode = false;

    const [resumeData, setResumeData] = useState<ResumeData>(DEMO_DATA);

    // Dados para o Header
    const userData = {
        name: resumeData?.personalInfo?.name || '',
        email: resumeData?.personalInfo?.email || ''
    };

    const [paginatedData, setPaginatedData] = useState<PageData[]>([DEMO_DATA]);
    const [isDemoMode, setIsDemoMode] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [deletionTarget, setDeletionTarget] = useState<{ id: string, type: 'experience' | 'education' | 'course' | 'language' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [resumesGenerated, setResumesGenerated] = useState(() => calculateCurrentGenerated(calculateTodaysBase()));
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [pixPaymentData, setPixPaymentData] = useState<PixPaymentData | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(5.00);
    const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
    const [isMyResumesModalOpen, setIsMyResumesModalOpen] = useState(false);

    // --- NOVO: ESTADOS DO MODAL DE IMPORTAÇÃO ---
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);

    const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
    const [hasPaidInSession, setHasPaidInSession] = useState(false);

    // --- ESTADOS DO SISTEMA DE CUPONS ---
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, type: 'fixed' | 'percentage', value: number, discount: number } | null>(null);
    const [couponError, setCouponError] = useState('');
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // Controla o Loading Overlay
    const [isLoading, setIsLoading] = useState(true);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [generatingStatus, setGeneratingStatus] = useState<string>('');

    // --- ESTADOS DE DESENVOLVEDOR ---
    const [isDevModeActive, setIsDevModeActive] = useState(false);
    const [devClickCount, setDevClickCount] = useState(0);
    const [showDevModal, setShowDevModal] = useState(false);
    const [devPassword, setDevPassword] = useState('');

    // --- ESTADO PARA O GREETING DO HEADER ---
    const [showLogo, setShowLogo] = useState(true);
    const [headerMessage, setHeaderMessage] = useState('');
    const [hasGreeted, setHasGreeted] = useState(false);
    const [hasMotivatedEducation, setHasMotivatedEducation] = useState(false);

    const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);
    const [pendingSavedData, setPendingSavedData] = useState<any>(null);

    // CORREÇÃO: Usamos 'any' aqui pois ResumePreviewRef não é exportado no componente atualizado
    const previewRef = useRef<any>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

    // --- NOVO STATE: Controle de Escala Inteligente (Smart Shrink) ---
    const [contentScale, setContentScale] = useState(1);

    // --- NOVO STATE: Controle de Fade-in Inteligente do Preview ---
    // Começa false para esconder o preview "cortado" até que a escala esteja calculada
    const [isPreviewReady, setIsPreviewReady] = useState(false);

    // --- NOVO STATE: Controle de Fade-out dos Placeholders ---
    // Após 5 segundos no passo 2+, os placeholders "(Vazio)" desaparecem com fade-out
    const [hidePlaceholders, setHidePlaceholders] = useState(false);

    // Flag para saber se o primeiro cálculo de escala já foi feito
    const isScaleCalculatedRef = useRef(false);

    // --- HOOK DE NAVEGAÇÃO POR SWIPE ---
    // Permite arrastar/swipe horizontal para navegar entre páginas do currículo
    const { handlers: swipeHandlers, swipeStyle } = useSwipeNavigation(
        paginatedData.length,
        currentPage,
        setCurrentPage
    );

    // --- LÓGICA DE OVERFLOW INTELIGENTE (Smart Shrink) ---
    // Monitora se o conteúdo + PhantomSpacer estourou a página e ajusta a escala
    const checkOverflow = useCallback(() => {
        // Tenta obter o elemento via método imperativo (se exposto) ou direto
        const getTarget = () => previewRef.current?.getElement ? previewRef.current.getElement() : previewRef.current;
        const element = getTarget();

        if (!element) return;

        const A4_HEIGHT = 1123; // Altura fixa A4 em pixels (96 DPI)

        // Verifica overflow com uma pequena tolerância de segurança (2px)
        // O scrollHeight aqui JÁ INCLUI a altura do PhantomSpacer inserido no ResumePreview
        const hasOverflow = element.scrollHeight > A4_HEIGHT + 2;

        if (hasOverflow) {
            // Reduz a escala suavemente (passos de 1%) até um limite mínimo de segurança (0.65)
            setContentScale(prev => Math.max(0.65, prev - 0.01));
        } else {
            // Lógica de recuperação suave (Histerese)
            // Só tenta aumentar a escala se tiver uma folga considerável (ex: 20px) para evitar o efeito "flicker"
            if (contentScale < 1 && element.scrollHeight < A4_HEIGHT - 20) {
                setContentScale(prev => Math.min(1, prev + 0.01));
            }
        }

        // CORREÇÃO: Marca que o primeiro checkOverflow rodou (movido para FORA do else)
        // Isso garante que o preview apareça mesmo quando há overflow inicial
        if (!isScaleCalculatedRef.current) {
            isScaleCalculatedRef.current = true;
            // Pequeno delay para garantir que a renderização está completa
            setTimeout(() => {
                setIsPreviewReady(true);
            }, 150);
        }
    }, [contentScale]);

    // --- RESIZE OBSERVER PARA O PREVIEW ---
    // Monitora mudanças físicas no DOM do PREVIEW para acionar o ajuste de escala
    useEffect(() => {
        const getTarget = () => previewRef.current?.getElement ? previewRef.current.getElement() : previewRef.current;
        const element = getTarget();

        if (!element) return;

        const resizeObserver = new ResizeObserver(() => {
            // Usa requestAnimationFrame para sincronizar com a renderização do browser (Debounce nativo)
            window.requestAnimationFrame(checkOverflow);
        });

        // Observa o container principal
        resizeObserver.observe(element);

        // Observa também o primeiro filho para garantir detecção de mudanças internas de layout
        if (element.firstElementChild) {
            resizeObserver.observe(element.firstElementChild);
        }

        // Trigger inicial
        checkOverflow();

        return () => resizeObserver.disconnect();
    }, [checkOverflow, resumeData, currentPage]); // Recalcula se dados ou página mudarem

    // --- FALLBACK: Se após 2 segundos ainda não tiver mostrado, força a exibição ---
    // Isso é um safety net para casos extremos onde o cálculo pode não completar
    useEffect(() => {
        if (!isLoading && !isPreviewReady) {
            const fallbackTimer = setTimeout(() => {
                if (!isPreviewReady) {
                    setIsPreviewReady(true);
                }
            }, 2000);
            return () => clearTimeout(fallbackTimer);
        }
    }, [isLoading, isPreviewReady]);

    // --- LÓGICA DE VISIBILIDADE DOS PLACEHOLDERS ---
    // Placeholders são escondidos em 2 cenários:
    // 1. IMEDIATO: Se isDemoMode é false (dados importados ou restaurados)
    // 2. COM TIMER: Se usuário está no passo 2+ por mais de 5 segundos
    useEffect(() => {
        // Se não está em modo demo (dados foram carregados/importados), esconde imediatamente
        if (!isDemoMode && !hidePlaceholders) {
            setHidePlaceholders(true);
            return;
        }

        // Se está no passo 2 ou além (ainda em demo mode), aguarda 5 segundos
        if (currentStep >= 1 && !hidePlaceholders) {
            const placeholderTimer = setTimeout(() => {
                setHidePlaceholders(true);
            }, 5000); // 5 segundos

            return () => clearTimeout(placeholderTimer);
        }
    }, [currentStep, hidePlaceholders, isDemoMode]);

    // INICIALIZAÇÃO E MONITORAMENTO
    useEffect(() => {
        runAutoSetup();
        trackVisitor();
    }, []);

    // --- LEITURA DE CUPOM DA URL ---
    // Extrai o cupom do hash: #/?cupom=CODIGO ou #/cupom=CODIGO
    useEffect(() => {
        try {
            const hash = window.location.hash;
            // Aceita formatos: #/?cupom=CODE ou #/cupom=CODE
            const match = hash.match(/[?&]cupom=([^&]+)/i);
            if (match && match[1]) {
                const couponFromUrl = decodeURIComponent(match[1]).toUpperCase().trim();
                if (couponFromUrl && !appliedCoupon) {
                    console.log("Cupom detectado na URL:", couponFromUrl);
                    setCouponCode(couponFromUrl);
                    // Limpa o parâmetro da URL para evitar reprocessamento
                    window.history.replaceState(null, '', '/#/');
                    // Mostra toast informando que o cupom foi preenchido
                    setTimeout(() => {
                        setToast({ message: `Cupom "${couponFromUrl}" preenchido! Complete seus dados para aplicar.`, type: 'success' });
                        setTimeout(() => setToast(null), 5000);
                    }, 2500); // Aguarda o loading inicial
                }
            }
        } catch (error) {
            console.error("Erro ao ler cupom da URL:", error);
        }
    }, []);

    // --- RESTAURAÇÃO INTELIGENTE DE SESSÃO PIX (COM HIERARQUIA) ---
    useEffect(() => {
        try {
            // VERIFICA SE EXISTE PROGRESSO PENDENTE (Hierarquia 1)
            const savedProgress = localStorage.getItem('inProgressResume');
            const hasPendingProgress = !!savedProgress;

            const savedSession = localStorage.getItem(PIX_SESSION_KEY);
            if (savedSession) {
                const parsedSession = JSON.parse(savedSession);
                const now = Date.now();

                // Janela de 15 minutos para tolerância
                if (now - parsedSession.timestamp < 900000) {
                    setPixPaymentData(parsedSession.data);

                    // INTELIGÊNCIA AQUI:
                    // Se existe um progresso pendente (modal de "Continuar"), NÃO abrimos o PIX agora.
                    // Deixamos ele carregado, mas invisível.
                    if (!hasPendingProgress) {
                        setIsPixModalOpen(true);
                        console.log("Sessão PIX restaurada automaticamente.");
                    } else {
                        console.log("Sessão PIX carregada em background (Aguardando decisão do usuário).");
                        setIsPixModalOpen(false);
                    }
                } else {
                    localStorage.removeItem(PIX_SESSION_KEY);
                }
            }
        } catch (error) {
            console.error("Falha ao restaurar sessão PIX:", error);
        }
    }, []);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 5000);
    };

    // --- CORREÇÃO DE PROPORÇÃO MOBILE: TROCA RÁPIDA DE TEMPLATE ---
    // Força um recálculo das dimensões do preview trocando temporariamente o template.
    // Isso resolve o problema de "corte" visual que ocorre devido ao delay no cálculo inicial.
    // IMPORTANTE: Recebe os dados como parâmetro para evitar dependência de resumeData (que causava loops)
    const performTemplateRefresh = useCallback(async (targetTemplate?: string) => {
        const currentTemplate = targetTemplate || 'template-modern';
        const tempTemplate = currentTemplate === 'template-modern' ? 'template-classic' : 'template-modern';

        // Troca temporária para forçar recálculo
        setResumeData(prev => ({
            ...prev,
            style: { ...prev.style, template: tempTemplate }
        }));

        // Aguarda React processar a mudança (aumentado para celulares mais lentos)
        await new Promise(resolve => setTimeout(resolve, 150));

        // Volta para o template original
        setResumeData(prev => ({
            ...prev,
            style: { ...prev.style, template: currentTemplate }
        }));

        // Aguarda estabilização e recálculo de layout (aumentado para garantia)
        await new Promise(resolve => setTimeout(resolve, 200));

        // CORREÇÃO CRÍTICA: Marca que o cálculo foi feito e exibe o preview
        // Isso acontece DEPOIS de toda a troca de template, garantindo 100% de consistência
        isScaleCalculatedRef.current = true;
        setIsPreviewReady(true);
    }, []); // SEM dependências - função estável

    const previewWrapperRef = useRef<HTMLDivElement>(null);
    const measurementRootRef = useRef<any>(null);
    const measurementContainerRef = useRef<HTMLDivElement | null>(null);

    // --- LÓGICA DE CARREGAMENTO INICIAL COM SOBREPOSIÇÃO ---
    useEffect(() => {
        const loadResources = async () => {
            try {
                await document.fonts.ready;
                setFontsLoaded(true);
            } catch (error) {
                console.error("Failed to load fonts:", error);
                setFontsLoaded(true);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));

            // CORREÇÃO MOBILE: Força recálculo de proporção antes de mostrar
            // Usa o template padrão 'template-modern' (DEMO_DATA usa esse)
            await performTemplateRefresh('template-modern');

            setIsLoading(false);
        };
        loadResources();
    }, []); // SEM dependências - executa apenas uma vez no mount

    useEffect(() => {
        const interval = setInterval(() => {
            setResumesGenerated(calculateCurrentGenerated(calculateTodaysBase()));
        }, 5000);
        return () => clearInterval(interval);
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
                if (document.body.contains(measurementNode)) {
                    document.body.removeChild(measurementNode);
                }
                measurementContainerRef.current = null;
            }, 0);
        };
    }, []);

    useEffect(() => {
        try {
            const savedProgress = localStorage.getItem('inProgressResume');
            if (savedProgress) {
                const parsedProgress = JSON.parse(savedProgress);
                setPendingSavedData(parsedProgress);
                setIsContinueModalOpen(true);
            }

            const storedResumes = localStorage.getItem('savedResumes');
            if (storedResumes) {
                setSavedResumes(JSON.parse(storedResumes));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage:", error);
        }
    }, []);

    useEffect(() => {
        if (isDemoMode) return;
        try {
            const progress = { resumeData, currentStep, isFinished };
            localStorage.setItem('inProgressResume', JSON.stringify(progress));
        } catch (error) {
            console.error("Failed to save progress to localStorage:", error);
        }
    }, [resumeData, currentStep, isFinished, isDemoMode]);

    useEffect(() => {
        if (currentStep > 1 && resumeData.personalInfo.name.trim().length > 0 && !hasGreeted) {
            const timer = setTimeout(() => {
                const firstName = resumeData.personalInfo.name.split(' ')[0] || "Visitante";
                setHeaderMessage(`Olá, ${firstName}!`);
                setShowLogo(false);
                setTimeout(() => {
                    setHeaderMessage("Foco no objetivo.");
                    setTimeout(() => {
                        setShowLogo(true);
                        setHasGreeted(true);
                    }, 5000);
                }, 5000);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentStep, resumeData.personalInfo.name, hasGreeted]);

    useEffect(() => {
        if (currentStep === 3 && !hasMotivatedEducation) {
            const timer = setTimeout(() => {
                setHeaderMessage("Falta pouco agora!");
                setShowLogo(false);
                setTimeout(() => {
                    setShowLogo(true);
                    setHasMotivatedEducation(true);
                }, 5000);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentStep, hasMotivatedEducation]);

    const handleContinueProgress = async () => {
        if (pendingSavedData) {
            const { resumeData: savedData, currentStep: savedStep, isFinished: savedIsFinished } = pendingSavedData;

            // CORREÇÃO MOBILE: Esconde preview durante recalculo para evitar "flash" de corte
            setIsPreviewReady(false);
            isScaleCalculatedRef.current = false;

            setResumeData(savedData);
            setCurrentStep(savedStep);
            setIsFinished(savedIsFinished);
            setIsDemoMode(false);
            // Ao recarregar, reseta a escala
            setContentScale(1);

            // CORREÇÃO MOBILE: Força recálculo de proporção após carregar dados
            await performTemplateRefresh(savedData.style?.template);

            // INTELIGÊNCIA: Se o usuário confirmou continuar, E temos um PIX salvo, AGORA abrimos ele.
            if (pixPaymentData) {
                setIsPixModalOpen(true);
            }
        }
        setIsContinueModalOpen(false);
        setPendingSavedData(null);
    };

    const handleStartNew = async () => {
        try {
            localStorage.removeItem('inProgressResume');
            // INTELIGÊNCIA: Se o usuário quer começar do zero, o PIX antigo NÃO serve mais.
            localStorage.removeItem(PIX_SESSION_KEY);
        } catch (error) {
            console.error("Error removing localStorage item", error);
        }

        // CORREÇÃO CRÍTICA: Esconde preview PRIMEIRO antes de qualquer mudança
        setIsPreviewReady(false);
        isScaleCalculatedRef.current = false;

        setIsContinueModalOpen(false);
        setPendingSavedData(null);
        setPixPaymentData(null); // Limpa estado visual também
        setIsPixModalOpen(false);
        setContentScale(1); // Reseta escala

        // CORREÇÃO MOBILE: Força recálculo de proporção ANTES de abrir o modal
        // O performTemplateRefresh agora define isPreviewReady = true ao final
        await performTemplateRefresh('template-modern');

        // Abre o modal de escolha APÓS o preview estar pronto
        setIsImportModalOpen(true);
    };

    // CORREÇÃO: Função modificada para preservar o estilo (template) ao reiniciar
    const handleStartEditing = async () => {
        // 1. Capturamos o estilo (template e cor) que o usuário escolheu visualmente na etapa 0
        const currentStyle = resumeData.style;

        // CORREÇÃO CRÍTICA: Esconde preview PRIMEIRO
        setIsPreviewReady(false);
        isScaleCalculatedRef.current = false;

        setIsDemoMode(false);

        // 2. Ao resetar os dados, preservamos o 'style' capturado
        setResumeData({
            ...INITIAL_DATA,
            style: currentStyle
        });

        setCurrentStep(0);
        setIsFinished(false);
        setHasPaidInSession(false);
        setEditingResumeId(null);
        setPixPaymentData(null); // Limpa PIX antigo
        setIsPixModalOpen(false);
        setContentScale(1); // Reseta escala
        // Fecha o modal de Importação se estiver aberto (caso venha do fluxo de Import)
        setIsImportModalOpen(false);

        try {
            localStorage.removeItem('inProgressResume');
            // INTELIGÊNCIA: Limpa PIX antigo também ao reiniciar no meio do processo
            localStorage.removeItem(PIX_SESSION_KEY);
        } catch (error) {
            console.error("Failed to remove in-progress resume from localStorage:", error);
        }

        // CORREÇÃO MOBILE: Força recálculo de proporção para evitar corte visual
        await performTemplateRefresh(currentStyle.template);

        // Scroll suave para o formulário
        document.getElementById('form-wizard')?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- LÓGICA DE IMPORTAÇÃO COM IA ---
    const handleImportResume = async (file: File) => {
        setIsAnalyzingFile(true);
        try {
            // Chama o serviço inteligente que detecta PDF/DOCX/Imagem
            const extractedData = await analyzeResumePDF(file);

            // VALIDAÇÃO INTELIGENTE: Verifica se pelo menos dados básicos foram extraídos
            const hasName = extractedData.personalInfo?.name && extractedData.personalInfo.name.trim().length > 2;
            const hasExperiences = extractedData.experiences && extractedData.experiences.length > 0;
            const hasEducation = extractedData.education && extractedData.education.length > 0;
            const hasUsefulData = hasName || hasExperiences || hasEducation;

            // Mescla os dados extraídos com o estado inicial para garantir estrutura
            setResumeData(prev => ({
                ...prev,
                ...extractedData,
                // Mantém o estilo atual selecionado
                style: prev.style
            }));

            // CORREÇÃO: Esconde preview durante recalculo para evitar "flash" de corte
            setIsPreviewReady(false);
            isScaleCalculatedRef.current = false;

            setIsDemoMode(false);
            setCurrentStep(0); // Vai para o passo de Dados Pessoais para revisão
            setIsImportModalOpen(false);
            setContentScale(1); // Reseta escala

            // CORREÇÃO: Força recálculo de proporção após importar dados
            // Usamos resumeData.style.template pois preservamos prev.style acima
            await performTemplateRefresh(resumeData.style?.template || 'template-modern');

            // Mostra mensagem apropriada baseada nos dados extraídos
            if (hasUsefulData) {
                showToast("Currículo importado com sucesso! Revise os dados.", "success");
            } else {
                showToast("Não conseguimos extrair dados válidos. Preencha os campos manualmente.", "warning");
            }

            // Scroll para o formulário
            setTimeout(() => {
                document.getElementById('form-wizard')?.scrollIntoView({ behavior: 'smooth' });
            }, 500);

        } catch (error) {
            console.error("Erro na importação:", error);
            showToast("Falha ao ler o arquivo. Tente um formato diferente ou preencha manualmente.", "error");
        } finally {
            setIsAnalyzingFile(false);
        }
    };

    const handleRequestDelete = (target: { id: string; type: 'experience' | 'education' | 'course' | 'language' }) => {
        setDeletionTarget(target);
    };

    const handleConfirmDelete = () => {
        if (!deletionTarget) return;
        const { type, id } = deletionTarget;

        const keyMap = {
            experience: 'experiences',
            education: 'education',
            course: 'courses',
            language: 'languages',
        } as const;

        const key = keyMap[type];

        setResumeData(prev => ({
            ...prev,
            [key]: prev[key].filter((item: any) => item.id !== id),
        }));

        setDeletionTarget(null);
    };

    useEffect(() => {
        if (currentPage > paginatedData.length) {
            setCurrentPage(paginatedData.length > 0 ? paginatedData.length : 1);
        }
    }, [paginatedData, currentPage]);

    // --- CORREÇÃO CRÍTICA: RENDERIZAÇÃO DE MEDIÇÃO ---
    // Adicionamos uma 'key' baseada nos dados para forçar o React a recriar o componente
    // sempre que os dados mudarem (incluindo Drag & Drop). Isso garante que as alturas
    // medidas sejam sempre frescas e não baseadas em um estado anterior do DOM.
    useEffect(() => {
        if (measurementRootRef.current) {
            const timer = setTimeout(() => {
                measurementRootRef.current.render(
                    <ResumePreview
                        // A CHAVE MESTRA: Força recriação do DOM de medição
                        key={JSON.stringify(resumeData)}
                        data={resumeData}
                        isDemoMode={isDemoMode}
                        isFirstPage={true}
                        isMeasurement={true}
                    />
                );
            }, 100); // Aumentado levemente para garantir que o Drag & Drop terminou
            return () => clearTimeout(timer);
        }
    }, [resumeData, isDemoMode]);

    useEffect(() => {
        if (!measurementContainerRef.current) return;

        let debounceTimer: NodeJS.Timeout;

        const handleResize = (entries: ResizeObserverEntry[]) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                calculatePagination(resumeData);
            }, 100);
        };

        const ro = new ResizeObserver(handleResize);
        ro.observe(measurementContainerRef.current);

        return () => {
            ro.disconnect();
            clearTimeout(debounceTimer);
        };
    }, [resumeData]);

    const calculatePagination = useCallback(async (dataToPaginate: ResumeData) => {
        const container = measurementContainerRef.current;
        if (!container || !container.firstChild) {
            setPaginatedData([dataToPaginate]);
            return;
        }

        const previewEl = container.firstChild as HTMLElement;
        const A4_HEIGHT = 1123;
        const MARGIN_BOTTOM = 50;

        const templateKey = dataToPaginate.style.template || 'template-modern';
        // @ts-ignore
        const qrConfig = QR_CONFIG.positions[templateKey] || QR_CONFIG.positions['template-modern'];
        const qrPosition = qrConfig;

        // @ts-ignore
        const currentSpacerDims = qrConfig.overrideSpacer || QR_CONFIG.spacer;
        const qrHeight = currentSpacerDims.height;

        // --- REVERTIDO: ZONA DE SEGURANÇA PADRÃO ---
        // Voltamos para o valor padrão (40) conforme solicitado.
        const qrPadding = qrConfig.safetyPadding !== undefined ? qrConfig.safetyPadding : 40;

        // --- CORREÇÃO CRÍTICA: BUFFER DE CÁLCULO ---
        // Adicionamos um buffer extra de 50px APENAS no cálculo da zona de perigo.
        // Isso faz com que a paginação seja "pessimista", quebrando a página ANTES
        // do conteúdo realmente tocar no QR Code. Isso resolve o problema do Drag & Drop
        // sem precisar aumentar a margem visual real.
        const CALCULATION_BUFFER = 50;
        const dangerZoneStart = A4_HEIGHT - qrPosition.bottom - qrHeight - qrPadding - CALCULATION_BUFFER;

        const headerEl = previewEl.querySelector('header') as HTMLElement;
        const mainEl = previewEl.querySelector('main') as HTMLElement;

        if (!headerEl || !mainEl) { setPaginatedData([dataToPaginate]); return; }

        const getElementHeight = (element: HTMLElement) => {
            if (!element) return 0;
            const style = window.getComputedStyle(element);
            const marginTop = parseFloat(style.marginTop) || 0;
            const marginBottom = parseFloat(style.marginBottom) || 0;
            return element.offsetHeight + marginTop + marginBottom;
        };

        const headerHeight = getElementHeight(headerEl);
        const mainMarginTop = parseFloat(window.getComputedStyle(mainEl).marginTop) || 0;

        interface ContentBlock {
            id: string;
            type: keyof ResumeData;
            data: any;
            height: number;
        }

        const blocks: ContentBlock[] = [];

        const extractBlocks = (sectionId: string, dataKey: keyof ResumeData, listId?: string) => {
            const sectionEl = previewEl.querySelector(`#${sectionId}`) as HTMLElement;
            if (!sectionEl) return;

            const titleEl = sectionEl.querySelector('.section-title') as HTMLElement;
            if (titleEl) {
                blocks.push({
                    id: `${dataKey}-title`,
                    type: dataKey,
                    data: null,
                    height: getElementHeight(titleEl) + 10,
                });
            }

            if (dataKey === 'summary') {
                const summaryEl = sectionEl.querySelector('#resume-summary') as HTMLElement;
                if (summaryEl) {
                    blocks.push({
                        id: 'summary-text',
                        type: 'summary',
                        data: dataToPaginate.summary,
                        height: getElementHeight(summaryEl),
                    });
                }
            } else if (listId) {
                const listContainer = sectionEl.querySelector(`#${listId}`);
                if (!listContainer) return;

                const items = Array.from(listContainer.children) as HTMLElement[];
                const dataList = dataToPaginate[dataKey] as any[];

                items.forEach((itemEl, index) => {
                    const itemData = dataList[index];
                    if (itemData) {
                        blocks.push({
                            id: itemData.id,
                            type: dataKey,
                            data: itemData,
                            height: getElementHeight(itemEl),
                        });
                    }
                });
            } else if (dataKey === 'skills' || dataKey === 'languages') {
                const contentDiv = sectionEl.querySelector(dataKey === 'skills' ? '#resume-skills' : '#resume-languages-list') as HTMLElement;
                if (contentDiv) {
                    blocks.push({
                        id: `${dataKey}-block`,
                        type: dataKey,
                        data: dataToPaginate[dataKey],
                        height: getElementHeight(contentDiv),
                    });
                }
            }
        };

        if (dataToPaginate.summary) extractBlocks('summary-section', 'summary');
        if (dataToPaginate.experiences.length > 0) extractBlocks('experience-section', 'experiences', 'resume-experience-list');
        if (dataToPaginate.education.length > 0) extractBlocks('education-section', 'education', 'resume-education-list');
        if (dataToPaginate.courses.length > 0) extractBlocks('courses-section', 'courses', 'resume-courses-list');
        if (dataToPaginate.languages.length > 0) extractBlocks('languages-section', 'languages');
        if (dataToPaginate.skills.length > 0) extractBlocks('skills-section', 'skills');

        const pages: PageData[] = [];
        let currentPageData: PageData = {
            personalInfo: dataToPaginate.personalInfo,
            style: dataToPaginate.style,
            experiences: [], education: [], courses: [], languages: [], skills: [],
            qrCodeOffsets: {}
        };

        let currentY = 50 + headerHeight + mainMarginTop;
        let currentPageIndex = 0;

        const createNewPage = () => {
            pages.push(currentPageData);
            currentPageData = {
                style: dataToPaginate.style,
                experiences: [], education: [], courses: [], languages: [], skills: [],
                qrCodeOffsets: {}
            };
            currentPageIndex++;
            currentY = 50 + 30;
        };

        let pendingTitleHeight = 0;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const hasQr = (dataToPaginate.style.showQRCode || dataToPaginate.style.showLinkedinQr);
            const overlapsDangerZone = currentPageIndex === 0 && hasQr && (currentY + block.height > dangerZoneStart);
            let effectiveHeight = block.height;

            if (overlapsDangerZone) {
                if (!currentPageData.qrCodeOffsets) currentPageData.qrCodeOffsets = {};
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
                pendingTitleHeight = effectiveHeight;
                continue;
            }

            if (effectiveHeight > available) {
                createNewPage();
                effectiveHeight = block.height;

                if (block.type === 'summary') {
                    currentPageData.summary = block.data;
                } else if (block.type === 'skills' || block.type === 'languages') {
                    currentPageData[block.type] = block.data;
                } else if (Array.isArray(currentPageData[block.type])) {
                    (currentPageData[block.type] as any[]).push(block.data);
                }

                const titleHeight = pendingTitleHeight > 0 ? pendingTitleHeight : 40;
                currentY += titleHeight + effectiveHeight;
                pendingTitleHeight = 0;
            } else {
                if (block.type === 'summary') {
                    currentPageData.summary = block.data;
                } else if (block.type === 'skills' || block.type === 'languages') {
                    currentPageData[block.type] = block.data;
                } else if (Array.isArray(currentPageData[block.type])) {
                    (currentPageData[block.type] as any[]).push(block.data);
                }
                currentY += effectiveHeight;
                pendingTitleHeight = 0;
            }
        }

        if (Object.keys(currentPageData).length > 0) {
            pages.push(currentPageData);
        }

        const finalPages = pages.filter(p => {
            const hasData = p.summary ||
                (p.experiences && p.experiences.length > 0) ||
                (p.education && p.education.length > 0) ||
                (p.courses && p.courses.length > 0) ||
                (p.skills && p.skills.length > 0);
            return hasData || (p.personalInfo && pages.indexOf(p) === 0);
        });

        setPaginatedData(finalPages);
    }, [isDemoMode]);

    const scalePreview = useCallback(() => {
        const previewColumn = previewWrapperRef.current?.parentElement;
        const previewElement = previewRef.current?.getElement ? previewRef.current.getElement() : previewRef.current;

        if (!previewColumn || !previewElement) return;

        // Force A4 dimensions on the inner element to ensure layout is correct before scaling
        previewElement.style.width = '794px';
        previewElement.style.minWidth = '794px';
        previewElement.style.height = '1123px';
        previewElement.style.minHeight = '1123px';
        previewElement.style.transformOrigin = 'top left';

        const baseWidth = 794;
        const baseHeight = 1123;

        // Calculate available width
        let availableWidth = previewColumn.offsetWidth;

        // Mobile adjustment: Ensure we don't exceed screen width even if container says so
        if (window.innerWidth < 1024) {
            const screenPadding = 32; // 16px left + 16px right
            const maxMobileWidth = window.innerWidth - screenPadding;
            if (availableWidth > maxMobileWidth) {
                availableWidth = maxMobileWidth;
            }
        } else {
            // DESKTOP: Limitar altura máxima para caber na viewport
            const maxViewportHeight = window.innerHeight - 200; // 200px para header e margem
            const heightBasedScale = maxViewportHeight / baseHeight;
            const widthBasedScale = availableWidth / baseWidth;
            // Usar a MENOR escala para garantir que caiba tanto em largura quanto altura
            const scale = Math.min(widthBasedScale, heightBasedScale);

            previewElement.style.transform = `scale(${scale})`;

            if (previewWrapperRef.current) {
                previewWrapperRef.current.style.height = `${baseHeight * scale}px`;
                previewWrapperRef.current.style.width = `${baseWidth * scale}px`;
                previewWrapperRef.current.style.overflow = 'hidden';
            }
            return;
        }

        if (availableWidth <= 0) return;

        const scale = availableWidth / baseWidth;

        // Apply transform
        previewElement.style.transform = `scale(${scale})`;

        // Update wrapper height to match scaled height
        if (previewWrapperRef.current) {
            previewWrapperRef.current.style.height = `${baseHeight * scale}px`;
            // Also constraint the wrapper width to avoid horizontal scroll on the parent if needed
            previewWrapperRef.current.style.width = `${availableWidth}px`;
            previewWrapperRef.current.style.overflow = 'hidden';
        }
    }, [isDemoMode]);

    useEffect(() => {
        if (fontsLoaded) {
            scalePreview();
            window.addEventListener('resize', scalePreview);
            return () => window.removeEventListener('resize', scalePreview);
        }
    }, [scalePreview, paginatedData, fontsLoaded]);

    // --- FUNÇÃO EXPORT TO PDF OTIMIZADA (COMPRESSÃO JPEG) ---
    const exportToPdf = useCallback(async (dataToExport: ResumeData) => {
        setIsPaymentProcessing(true);
        setGeneratingStatus('Preparando documento...');
        trackResumeGenerated(dataToExport);

        // Garante que as fontes estão carregadas para evitar layout shift
        if (document.fonts) {
            await document.fonts.ready;
        }

        const printArea = document.getElementById('print-area');
        if (!printArea) {
            console.error("Print area not found");
            setIsPaymentProcessing(false);
            return;
        }

        // Pequeno delay para garantir renderização do DOM (especialmente QR Codes e Imagens)
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            setGeneratingStatus('Gerando imagens otimizadas...');
            const pages = Array.from(printArea.querySelectorAll('.resume-page')) as HTMLElement[];

            if (pages.length === 0) throw new Error("Nenhuma página encontrada.");

            // 1. Configuração do jsPDF com compressão ativada
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true // ATIVADO: Comprime a estrutura interna do PDF
            });

            const pdfWidth = 210;
            const pdfHeight = 297;

            for (let i = 0; i < pages.length; i++) {
                const pageEl = pages[i];

                // Força dimensões exatas antes da captura
                pageEl.style.height = '1123px';
                pageEl.style.minHeight = '1123px';
                pageEl.style.width = '794px';

                let imgData;
                try {
                    // 2. MUDANÇA CRÍTICA: Usar toJpeg com qualidade controlada
                    // quality: 0.85 -> Excelente equilíbrio (quase indistinguível de 1.0, mas muito menor)
                    // pixelRatio: 2 -> Mantém a nitidez do texto (Retina quality)
                    imgData = await toJpeg(pageEl, {
                        quality: 0.85,
                        pixelRatio: 2,
                        backgroundColor: '#ffffff', // OBRIGATÓRIO: JPEG não tem transparência
                        width: 794,
                        height: 1123,
                        style: {
                            width: '794px',
                            height: '1123px',
                            minWidth: '794px',
                            minHeight: '1123px',
                            transform: 'none',
                            margin: '0',
                            padding: '0',
                            backgroundColor: '#ffffff' // Reforço de segurança
                        },
                        // CacheBust removido para evitar problemas de CORS com imagens de perfil externas
                    });
                } catch (firstError) {
                    console.warn("Falha na alta qualidade, tentando fallback...", firstError);

                    // Fallback: Reduz pixelRatio se falhar (ex: falta de memória no mobile)
                    imgData = await toJpeg(pageEl, {
                        quality: 0.75,
                        pixelRatio: 1.5,
                        backgroundColor: '#ffffff',
                        width: 794,
                        height: 1123,
                        style: {
                            width: '794px',
                            height: '1123px',
                            minWidth: '794px',
                            minHeight: '1123px',
                            transform: 'none',
                            margin: '0',
                            padding: '0',
                            backgroundColor: '#ffffff'
                        }
                    });
                }

                if (i > 0) pdf.addPage();

                // 3. Adiciona como JPEG (Fast & Small)
                // O último parâmetro 'FAST' ou 'MEDIUM' pode otimizar ainda mais a renderização no visualizador
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }

            setGeneratingStatus('Finalizando PDF...');
            const fileName = `curriculo-${dataToExport.personalInfo.name.replace(/\s+/g, '-').toLowerCase() || 'profissional'}.pdf`;

            pdf.save(fileName);
            triggerFeedback();

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            showToast("Erro ao gerar PDF. Tente usar um computador se persistir.", "error");
        } finally {
            setIsPaymentProcessing(false);
            setGeneratingStatus('');
        }

    }, [triggerFeedback]);

    // --- FUNÇÃO DE VALIDAÇÃO DE CUPOM ---
    const handleValidateCoupon = async (codeToValidate: string): Promise<boolean> => {
        const cleanCode = codeToValidate.trim().toUpperCase();
        if (!cleanCode) {
            setCouponError('Digite um código de cupom');
            return false;
        }

        setIsValidatingCoupon(true);
        setCouponError('');

        try {
            // Busca o cupom no Firestore
            const couponRef = doc(db, 'coupons', cleanCode);
            const couponSnap = await getDoc(couponRef);

            if (!couponSnap.exists()) {
                setCouponError('Cupom não encontrado');
                setAppliedCoupon(null);
                return false;
            }

            const couponData = couponSnap.data();

            // Verifica se está ativo
            if (!couponData.isActive) {
                setCouponError('Este cupom não está mais ativo');
                setAppliedCoupon(null);
                return false;
            }

            // Verifica limite de usos total
            if (couponData.usageCount >= couponData.maxUses) {
                setCouponError('Este cupom atingiu o limite de usos');
                setAppliedCoupon(null);
                return false;
            }

            // Verifica se o email já atingiu o limite de usos por usuário
            const userEmail = resumeData.personalInfo.email?.toLowerCase().trim();
            const maxUsesPerUser = couponData.maxUsesPerUser || 1; // Default: 1 uso por usuário

            if (userEmail && couponData.usedBy && Array.isArray(couponData.usedBy)) {
                // Conta quantas vezes este email aparece no array usedBy
                const userUsageCount = couponData.usedBy.filter((email: string) => email === userEmail).length;

                if (userUsageCount >= maxUsesPerUser) {
                    if (maxUsesPerUser === 1) {
                        setCouponError('Você já utilizou este cupom');
                    } else {
                        setCouponError(`Você já utilizou este cupom ${userUsageCount} vez(es). Limite: ${maxUsesPerUser}`);
                    }
                    setAppliedCoupon(null);
                    return false;
                }
            }

            // Cupom válido - calcula o desconto
            const basePrice = 5.00;
            let discountAmount = 0;

            if (couponData.type === 'fixed') {
                discountAmount = Math.min(couponData.value, basePrice - 0.01); // Mínimo 1 centavo
            } else if (couponData.type === 'percentage') {
                discountAmount = basePrice * (couponData.value / 100);
                discountAmount = Math.min(discountAmount, basePrice - 0.01);
            }

            const finalDiscount = parseFloat(discountAmount.toFixed(2));

            setAppliedCoupon({
                code: cleanCode,
                type: couponData.type,
                value: couponData.value,
                discount: finalDiscount
            });

            showToast(`Cupom aplicado! Desconto de R$ ${finalDiscount.toFixed(2)}`, 'success');
            return true;

        } catch (error) {
            console.error('Erro ao validar cupom:', error);
            setCouponError('Erro ao validar cupom. Tente novamente.');
            setAppliedCoupon(null);
            return false;
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    // --- FUNÇÃO PARA REMOVER CUPOM APLICADO ---
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
    };

    const handlePaymentRequest = async () => {
        // --- VALIDAÇÃO DE CAMPOS CRÍTICOS ---
        const { name, email } = resumeData.personalInfo;
        if (!name?.trim()) {
            showToast("Preencha seu nome antes de finalizar", "warning");
            return;
        }
        if (!email?.trim() || !email.includes('@')) {
            showToast("Preencha um email válido antes de finalizar", "warning");
            return;
        }
        // --- FIM DA VALIDAÇÃO ---

        if (hasPaidInSession) {
            exportToPdf(resumeData);
            return;
        }

        setIsPaymentProcessing(true);

        // Calcula o preço final com base no cupom aplicado
        const basePrice = 5.00;
        const discountAmount = appliedCoupon?.discount || 0;
        const currentAmount = Math.max(0.01, basePrice - discountAmount);
        setPaymentAmount(currentAmount);

        if (isPixTestMode) {
            setTimeout(() => {
                setPixPaymentData({
                    qrCodeUrl: 'https://files.catbox.moe/5n52e5.png',
                    copyPasteCode: '00020126360014br.gov.bcb.pix0114+55119999999995204000053039865802BR5913Test_User_Name6009SAO_PAULO62070503***6304E2A4',
                    paymentId: `pi_test_${Date.now()}`,
                });
                setIsPixModalOpen(true);
                setIsPaymentProcessing(false);
            }, 1000);
            return;
        }

        try {
            const backendUrl = '/.netlify/functions/create-pix-payment';

            // Envia o cupom aplicado para o backend validar novamente
            const payload = {
                coupon: appliedCoupon?.code || null,
                email: resumeData.personalInfo.email,
                firstName: resumeData.personalInfo.name.split(' ')[0],
                lastName: resumeData.personalInfo.name.split(' ').slice(1).join(' ')
            };

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.paymentId) {
                throw new Error(data.message || 'Falha ao iniciar o pagamento Pix.');
            }

            // Atualiza o valor real retornado pelo backend
            if (data.amount) {
                setPaymentAmount(data.amount);
            }

            setPixPaymentData(data);
            setIsPixModalOpen(true);
        } catch (error) {
            console.error("Erro ao solicitar pagamento Pix:", error);
            alert((error as Error).message);
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    const handlePaymentSuccess = () => {
        setIsPixModalOpen(false);
        setPixPaymentData(null);
        setHasPaidInSession(true);

        if (pixPaymentData?.paymentId) {
            trackSale(paymentAmount, resumeData.personalInfo.name || "Cliente", pixPaymentData.paymentId);
        }

        const newSavedResume: SavedResume = {
            ...resumeData,
            savedAt: new Date().toISOString()
        };

        setSavedResumes(prevResumes => {
            const updatedResumes = editingResumeId
                ? prevResumes.map(r => r.savedAt === editingResumeId ? newSavedResume : r)
                : [...prevResumes, newSavedResume];

            try {
                localStorage.setItem('savedResumes', JSON.stringify(updatedResumes));
            } catch (error) {
                console.error("Failed to save resumes to localStorage:", error);
            }
            return updatedResumes;
        });

        setEditingResumeId(null);

        try {
            localStorage.removeItem('inProgressResume');
        } catch (error) {
            console.error("Failed to remove in-progress resume from localStorage:", error);
        }

        setTimeout(() => {
            exportToPdf(resumeData);
        }, 300);
    };

    const handleEditResume = async (savedAt: string) => {
        const resumeToEdit = savedResumes.find(r => r.savedAt === savedAt);
        if (resumeToEdit) {
            // CORREÇÃO MOBILE: Esconde preview durante recalculo para evitar "flash" de corte
            setIsPreviewReady(false);
            isScaleCalculatedRef.current = false;

            setResumeData(resumeToEdit);
            setIsDemoMode(false);
            setIsMyResumesModalOpen(false);
            setEditingResumeId(savedAt);
            setHasPaidInSession(false);
            setContentScale(1); // Reseta a escala ao editar

            // CORREÇÃO MOBILE: Força recálculo de proporção após carregar dados
            await performTemplateRefresh(resumeToEdit.style?.template);
        }
    };

    const handleDeleteSavedResume = (savedAt: string) => {
        const updatedResumes = savedResumes.filter(r => r.savedAt !== savedAt);
        setSavedResumes(updatedResumes);
        try {
            localStorage.setItem('savedResumes', JSON.stringify(updatedResumes));
        } catch (error) {
            console.error("Failed to update saved resumes in localStorage:", error);
        }
    };

    const handleExportJson = async () => {
        const json = JSON.stringify(resumeData, null, 2);
        try {
            await navigator.clipboard.writeText(json);
            alert("JSON do currículo copiado para a área de transferência!");
        } catch {
            // Fallback para Safari e navegadores antigos
            const textArea = document.createElement('textarea');
            textArea.value = json;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (success) {
                alert("JSON do currículo copiado para a área de transferência!");
            } else {
                alert("Erro ao copiar JSON. Tente selecionar manualmente.");
            }
        }
    };

    const handleFillDemoData = () => {
        const deepCopy = JSON.parse(JSON.stringify(DEMO_DATA));
        setResumeData(deepCopy);
        setIsDemoMode(false);
        setHasPaidInSession(false);
        setEditingResumeId(null);
        setContentScale(1); // Reseta a escala
        showToast("Dados de DEMO preenchidos com sucesso!", "success");
    };

    const handleFooterLogoClick = () => {
        if (isDevModeActive) return;
        const newCount = devClickCount + 1;
        setDevClickCount(newCount);
        if (newCount === 5) {
            setShowDevModal(true);
            setDevClickCount(0);
        }
    };

    const handleDevLogin = () => {
        if (devPassword === '2707') {
            setIsDevModeActive(true);
            setShowDevModal(false);
            setDevPassword('');
            alert("Modo Desenvolvedor Ativado!");
        } else {
            alert("Senha incorreta.");
            setDevPassword('');
        }
    };

    return (
        // CORREÇÃO: Usando 'clip' em vez de 'hidden' para não quebrar position: sticky
        <div style={{ overflowX: 'clip', width: '100%', minHeight: '100vh' }}>
            {/* LOADING OVERLAY - ATUALIZADO: h-screen -> h-[100dvh] para iPhone */}
            {isLoading && (
                <div className="fixed inset-0 w-screen h-[100dvh] z-[200] bg-white flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center m-auto animate-fade-in-scale px-4">
                        <img
                            src="/logo-azul.png"
                            alt="Vel Currículo"
                            className="w-48 md:w-56 mx-auto mb-2 object-contain"
                        />
                        <p className="text-gray-500 font-medium text-sm md:text-base text-center leading-relaxed">
                            Feito para quem precisa de <br /> resultados
                        </p>
                    </div>
                    <div className="absolute bottom-32 left-0 right-0 flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="text-gray-400 text-xs font-medium">Carregando editor...</p>
                    </div>
                </div>
            )}

            {/* MODAL DEV */}
            {showDevModal && (
                <div className="fixed inset-0 z-[300] bg-black bg-opacity-70 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs animate-fade-in-scale">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Acesso Dev</h3>
                        <input
                            type="password"
                            placeholder="Senha"
                            value={devPassword}
                            onChange={(e) => setDevPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setShowDevModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition">Cancelar</button>
                            <button onClick={handleDevLogin} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition">Entrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT CONTAINER (Hidden) */}
            {/* CORREÇÃO CRÍTICA: Força largura fixa para evitar colapso em mobile */}
            <div id="print-container" style={{ position: 'fixed', top: 0, left: '-9999px', width: '794px', height: '1123px', zIndex: -1, overflow: 'visible' }}>
                <div id="print-area" style={{ width: '794px', minWidth: '794px' }}>
                    {paginatedData.map((pageData, index) => (
                        <div key={index} className="resume-page" style={{ height: '1123px', minHeight: '1123px', width: '794px', minWidth: '794px' }}>
                            <ResumePreview
                                data={pageData}
                                isDemoMode={false}
                                isFirstPage={index === 0}
                                isMeasurement={false}
                                isPrint={true}
                                hideEmptySections={true}
                                enableProtection={!hasPaidInSession} // Mantém proteção no print se não pagou
                                contentScale={1} // CORREÇÃO: Força escala 100% para o PDF, ignorando o zoom da tela
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* TOASTS - Modernizado */}
            {toast && (
                <div className="fixed top-28 inset-x-0 z-[101] flex justify-center px-4 animate-fade-in-scale">
                    <div role="alert" className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl font-medium transition-all duration-300 backdrop-blur-lg border max-w-md text-center ${toast.type === 'success'
                        ? 'bg-emerald-500/95 text-white border-white/20 shadow-emerald-500/30'
                        : toast.type === 'error'
                            ? 'bg-red-500/95 text-white border-white/20 shadow-red-500/30'
                            : 'bg-amber-500/95 text-gray-900 border-amber-600/20 shadow-amber-500/30'
                        }`}>
                        {/* Ícone */}
                        <span className="shrink-0">
                            {toast.type === 'success' && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            )}
                            {toast.type === 'error' && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            )}
                            {toast.type === 'warning' && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            )}
                        </span>
                        {/* Mensagem */}
                        <span className="text-base font-semibold">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* MODAIS DIVERSOS */}
            <ContinueProgressModal isOpen={isContinueModalOpen} onContinue={handleContinueProgress} onStartNew={handleStartNew} />
            {isPixModalOpen && pixPaymentData && (
                <PixModal isOpen={isPixModalOpen} onClose={() => setIsPixModalOpen(false)} paymentData={pixPaymentData} onPaymentSuccess={handlePaymentSuccess} isTestMode={isPixTestMode} amount={paymentAmount} />
            )}

            <MyResumesModal isOpen={isMyResumesModalOpen} onClose={() => setIsMyResumesModalOpen(false)} resumes={savedResumes} onEdit={handleEditResume} onDownload={exportToPdf} onDelete={handleDeleteSavedResume} />

            {/* NOVO: MODAL DE IMPORTAÇÃO */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportResume}
                onStartFromScratch={handleStartEditing}
                isAnalyzing={isAnalyzingFile}
            />

            {deletionTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-800">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mt-2">Tem a certeza que deseja remover este item? Esta ação não pode ser desfeita.</p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setDeletionTarget(null)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">Remover</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTÕES FLUTUANTES DEV */}
            {isDevModeActive && (
                <>
                    <button type="button" onClick={handleExportJson} className="fixed bottom-5 left-5 z-[100] bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 focus:outline-none transition-transform hover:scale-105" title="Exportar JSON"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg></button>
                    <button type="button" onClick={handleFillDemoData} className="fixed bottom-5 left-20 z-[100] bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none transition-transform hover:scale-105" title="Preencher Demo"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button type="button" onClick={() => exportToPdf(resumeData)} className="fixed bottom-5 right-5 z-[100] bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-transform hover:scale-105" title="Baixar PDF Teste"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2" /><path d="M8.5 2h7" /><path d="M14.5 16h-5" /></svg></button>
                </>
            )}

            {/* --- HEADER NOVO --- */}
            <FeedbackHeader
                userData={userData}
                headerMessage={headerMessage}
                showLogo={showLogo}
                // Passamos a função para abrir o modal de currículos
                onOpenMyResumes={() => setIsMyResumesModalOpen(true)}
            />

            <main className="container mx-auto p-4 lg:p-8 pt-28 lg:pt-40">
                {/* NOVA SEÇÃO HERO - Layout 2 colunas com Card 3D */}
                <section id="intro" className="mt-4 lg:mt-24 mb-16 lg:mb-24">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        {/* Coluna de Texto */}
                        <div className="text-center lg:text-left order-2 lg:order-1">
                            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-4">
                                <span className="text-gray-800">Seu Futuro,</span>
                                <br />
                                <span className="gradient-text">Desenhado Hoje.</span>
                            </h1>

                            <p className="text-lg text-gray-600 mb-6 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                Não é apenas um currículo. É a sua história profissional em um formato premiado.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="inline-flex items-center justify-center btn-primary text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
                                >
                                    Começar Agora
                                </button>
                                <a
                                    href="#como-funciona"
                                    className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                                >
                                    Como funciona
                                </a>
                            </div>

                            {/* Prova Social */}
                            <div className="flex items-center justify-center lg:justify-start gap-3">
                                <div className="flex -space-x-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                                        <img src="/p1.png" className="w-full h-full object-cover" alt="Usuário" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                                        <img src="/p2.jpg" className="w-full h-full object-cover" alt="Usuário" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                                        <img src="/p3.png" className="w-full h-full object-cover" alt="Usuário" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs text-white font-bold shadow-md">
                                        +1200
                                    </div>
                                </div>
                                <p className="text-gray-500 text-sm">Profissionais contratados usam VelCurrículo.</p>
                            </div>
                        </div>

                        {/* Coluna do Card 3D */}
                        <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                            <Hero3DCard className="h-[380px] md:h-[460px] lg:h-[520px]" isLoaded={!isLoading} />
                        </div>
                    </div>
                </section>


                {/* SEÇÃO DE DESTAQUES - Apenas Desktop com Animação de Scroll Reveal */}
                <HighlightsSection />

                <section id="gerador" className="mb-16 scroll-mt-24">
                    <div id="form-layout" className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
                        <ResumeForm
                            data={resumeData}
                            setData={setResumeData}
                            isDemoMode={isDemoMode}
                            onStartEditing={handleStartEditing}
                            onRequestPayment={handlePaymentRequest}
                            isPaymentProcessing={isPaymentProcessing}
                            onRequestDelete={handleRequestDelete}
                            hasPaidInSession={hasPaidInSession}
                            isEditing={!!editingResumeId}
                            currentStep={currentStep}
                            setCurrentStep={setCurrentStep}
                            isFinished={isFinished}
                            setIsFinished={setIsFinished}
                            onRequestImport={() => setIsImportModalOpen(true)}
                            showToast={showToast}
                            // Props do sistema de cupom
                            couponCode={couponCode}
                            setCouponCode={setCouponCode}
                            appliedCoupon={appliedCoupon}
                            couponError={couponError}
                            isValidatingCoupon={isValidatingCoupon}
                            onValidateCoupon={handleValidateCoupon}
                            onRemoveCoupon={handleRemoveCoupon}
                            paymentAmount={paymentAmount}
                        />
                        <div className="w-full lg:w-2/3 lg:sticky lg:top-28">
                            <div
                                ref={previewWrapperRef}
                                className={`w-full transition-opacity duration-500 ${isPreviewReady ? 'opacity-100' : 'opacity-0'}`}
                                style={{
                                    boxShadow: '0 10px 40px -10px rgba(0, 46, 158, 0.15)',
                                    borderRadius: '8px',
                                    touchAction: 'pan-y', // Permite scroll vertical, captura horizontal
                                    userSelect: 'none',   // Evita seleção de texto durante arraste
                                    overflow: 'hidden',   // CORREÇÃO: Evita que o swipe estique o container
                                    ...swipeStyle         // Aplica transform e cursor dinâmicos
                                }}
                                {...swipeHandlers}        // Aplica todos os handlers de swipe
                            >
                                {paginatedData.length > 0 && paginatedData[currentPage - 1] && (
                                    <ErrorBoundary>
                                        <ResumePreview
                                            ref={previewRef}
                                            data={paginatedData[currentPage - 1]}
                                            isDemoMode={isDemoMode}
                                            isFirstPage={currentPage === 1}
                                            hideEmptySections={paginatedData.length > 1}
                                            // ATIVAÇÃO DAS PROTEÇÕES: Se não pagou, ativa.
                                            enableProtection={!hasPaidInSession}
                                            contentScale={contentScale} // APLICA O SMART SHRINK AQUI
                                            hidePlaceholders={hidePlaceholders} // FADE-OUT DOS PLACEHOLDERS
                                        />
                                    </ErrorBoundary>
                                )}
                            </div>
                            {paginatedData.length > 1 && (
                                <div className="pagination-controls">
                                    {paginatedData.map((_, index) => (
                                        <button key={index} onClick={() => setCurrentPage(index + 1)} className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}>{index + 1}</button>
                                    ))}
                                </div>
                            )}

                            {/* REMOVIDO: Indicador visual de ajuste automático (Opcional, para debug visual) */}
                            {/* O usuário pediu para remover */}

                        </div>
                    </div>
                </section>

                {/* SEÇÃO DE FEATURES - Design Premium */}
                <section id="features" className="py-20 bg-gradient-to-b from-gray-50 to-white">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                                Poderoso. Simples. <span className="gradient-text">Inteligente.</span>
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                                Nossa tecnologia analisa padrões de currículos aprovados para garantir que o seu siga os formatos que recrutadores e sistemas (ATS) procuram.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Card 1: IA */}
                            <div className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Escrita com IA</h3>
                                <p className="text-gray-600 text-sm">Nossa IA gera descrições de cargos impactantes, otimizadas para palavras-chave.</p>
                            </div>

                            {/* Card 2: ATS */}
                            <div className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all duration-300 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white text-xl mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">100% ATS Friendly</h3>
                                <p className="text-gray-600 text-sm">Estrutura legível por qualquer sistema de recrutamento automático.</p>
                            </div>

                            {/* Card 3: Tempo Real */}
                            <div className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Edição em Tempo Real</h3>
                                <p className="text-gray-600 text-sm">Veja as mudanças instantaneamente enquanto você digita.</p>
                            </div>

                            {/* Card 4: PDF */}
                            <div className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-orange-200 transition-all duration-300 hover:-translate-y-1">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xl mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Exportação PDF</h3>
                                <p className="text-gray-600 text-sm">Baixe em PDF de alta qualidade, pronto para impressão ou envio digital.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SEÇÃO COMO FUNCIONA - Design Melhorado */}
                <section id="como-funciona" className="py-20 bg-white overflow-hidden">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {/* Lado Esquerdo: Texto e Passos */}
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800 text-center md:text-left">
                                    Tão fácil quanto<br />preencher um <span className="gradient-text">formulário</span>.
                                </h2>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                                            1
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-800 mb-1">Escolha um Modelo</h4>
                                            <p className="text-gray-600">Templates profissionais criados por especialistas em RH.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold shrink-0 group-hover:border-blue-500 transition-colors">
                                            2
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-800 mb-1">Preencha seus Dados</h4>
                                            <p className="text-gray-600">Nossa IA sugere o que escrever em cada campo.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 group">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-bold shrink-0 group-hover:border-blue-500 transition-colors">
                                            3
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-gray-800 mb-1">Baixe e Aplique</h4>
                                            <p className="text-gray-600">Seu currículo pronto em menos de 10 minutos.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Lado Direito: Mockup Visual */}
                            <div className="relative">
                                <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
                                    {/* Header do Mockup */}
                                    <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-3 gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                    </div>
                                    {/* Body do Mockup */}
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                            <div className="h-3 bg-gray-200/80 rounded w-full"></div>
                                            <div className="h-3 bg-gray-200/80 rounded w-5/6"></div>
                                            {/* Typing Animation Input */}
                                            <div className="h-20 bg-white rounded border border-gray-300 flex flex-col p-2 mt-4 shadow-inner">
                                                <span className="text-[10px] text-gray-400 mb-1">Seu Nome</span>
                                                <TypingAnimationMockup />
                                            </div>
                                        </div>
                                        <div className="bg-white rounded shadow-lg p-3 transform hover:scale-105 transition-transform">
                                            <div className="space-y-2">
                                                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                                                <div className="h-2 bg-gray-200 rounded w-full"></div>
                                                <div className="h-2 bg-gray-200 rounded w-full"></div>
                                                <div className="h-12 bg-gray-100 rounded w-full mt-2"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Shadow Effect */}
                                <div className="absolute -inset-4 bg-blue-100 rounded-xl blur-2xl -z-10"></div>
                            </div>
                        </div>
                    </div>
                </section>

                <TestimonialsSection />

                {/* CTA FINAL - Design Limpo */}
                <section id="final" className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">

                    <div className="container mx-auto px-4 max-w-4xl text-center relative z-10">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
                            Pronto para o <span className="gradient-text">próximo nível</span>?
                        </h2>

                        <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                            Junte-se a mais de <span className="text-gray-800 font-bold">1.000 profissionais</span> que já criaram currículos de sucesso com o VelCurrículo.
                        </p>

                        {/* Prova Social: Avatares */}
                        <div className="flex justify-center items-center gap-3 mb-8">
                            <div className="flex -space-x-3">
                                <div className="w-11 h-11 rounded-full overflow-hidden border-[3px] border-white shadow-lg">
                                    <img src="/p1.png" className="w-full h-full object-cover" alt="Usuário" />
                                </div>
                                <div className="w-11 h-11 rounded-full overflow-hidden border-[3px] border-white shadow-lg">
                                    <img src="/p2.jpg" className="w-full h-full object-cover" alt="Usuário" />
                                </div>
                                <div className="w-11 h-11 rounded-full overflow-hidden border-[3px] border-white shadow-lg">
                                    <img src="/p3.png" className="w-full h-full object-cover" alt="Usuário" />
                                </div>
                                <div className="w-11 h-11 rounded-full border-[3px] border-white bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs text-white font-bold shadow-lg">
                                    +1200
                                </div>
                            </div>
                            <span className="text-gray-500 text-sm ml-1">currículos gerados</span>
                        </div>

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="btn-primary text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
                        >
                            Criar meu Currículo
                        </button>

                        <p className="mt-4 text-sm text-gray-400">Sem cartão de crédito necessário para começar.</p>
                    </div>
                </section>
            </main>

            {/* FOOTER ATUALIZADO: padding extra para home indicator (pb-12 -> pb-16 no mobile) */}
            <footer className="bg-gray-900 text-white py-10 md:py-12 pb-16 md:pb-12">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="mb-6 md:mb-0 text-center md:text-left">
                            <div className="mb-4 mx-auto md:mx-0 cursor-pointer select-none" style={{ width: 'fit-content' }} onClick={handleFooterLogoClick}>
                                <img src="https://i.postimg.cc/D0pp6j3q/Subcabe-alho-39.png" alt="Vel Sites Logo Rodapé" className="footer-logo" />
                            </div>
                            <p className="text-gray-400 max-w-md">A Vel nasceu pra quem não espera, pra quem resolve. Se você move o mundo com seu ofício, a gente move sua marca no digital.</p>
                        </div>
                        <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-12 text-center md:text-left">
                            <div>
                                {/* ATUALIZADO: "Contacto" -> "Contato" */}
                                <h4 className="font-bold text-lg mb-4">Contato</h4>
                                <ul className="space-y-2">
                                    {/* ATUALIZADO: Telefone atualizado */}
                                    <li className="text-gray-400">(37) 98411-6034</li>
                                    <li className="text-gray-400">contato@velsites.com.br</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-4">Siga-nos</h4>
                                <div className="flex space-x-4 justify-center md:justify-start">
                                    <a href="https://www.instagram.com/velcurriculo/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center footer-social-icon">
                                        <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-700 text-center text-gray-400">
                        <p>&copy; {new Date().getFullYear()} Vel Sites. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// === ROUTER: Sempre montado para capturar hashchange ===
const Router: React.FC = () => {
    const [currentRoute, setCurrentRoute] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => {
            console.log("Navegação detectada para:", window.location.hash);
            setCurrentRoute(window.location.hash);
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Se a rota for admin
    if (currentRoute === '#/admin' || currentRoute === '#admin' || currentRoute === '#/admin/') {
        return <AdminDashboard />;
    }

    // Se a rota for meus-cupons
    if (currentRoute === '#/meus-cupons' || currentRoute === '#meus-cupons' || currentRoute === '#/meus-cupons/') {
        return <MyCouponsPage />;
    }

    // Rota padrão: site principal (envolvido pelo FeedbackProvider)
    return (
        <FeedbackProvider>
            <AppContent />
        </FeedbackProvider>
    );
};

const App: React.FC = () => {
    return <Router />;
};

export default App;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore
import { toPng } from 'html-to-image';
// @ts-ignore
import { jsPDF } from 'jspdf';
import ResumeForm from './components/ResumeForm';
// IMPORTANTE: Importamos QR_CONFIG e usamos 'any' para o ref para evitar erros de tipagem
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
// IMPORTA O PAINEL ADMINISTRATIVO
import AdminDashboard from './components/AdminDashboard';
// IMPORTA O NOVO HEADER E CONTEXTO
import { FeedbackProvider, useFeedback } from './contexts/FeedbackContext';
import FeedbackHeader from './components/FeedbackHeader';

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

const TestimonialCard: React.FC<{ item: typeof ALL_TESTIMONIALS[0], ariaHidden?: boolean }> = ({ item, ariaHidden = false }) => (
    <li className="flex flex-col flex-shrink-0 w-80 bg-white p-6 rounded-lg shadow-lg" aria-hidden={ariaHidden}>
        <div className="flex-grow">
            <p className="text-gray-700">{item.text}</p>
        </div>
        <p className="font-semibold text-right mt-4 text-gray-800">{item.author}</p>
    </li>
);

const TestimonialsSection = React.memo(() => {
    return (
        <section id="avaliacoes" className="my-24">
            <h2 className="text-3xl font-bold text-center text-gray-800">Feito para quem precisa de resultados</h2>
            <p className="text-lg text-center text-gray-600 mt-2 mb-12">Veja o que os nossos usuários estão a dizer.</p>

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
    // --- LÓGICA DE ROTEAMENTO (ATUALIZADA) ---
    const [currentRoute, setCurrentRoute] = useState(window.location.hash);

    // --- HOOK DE FEEDBACK ---
    const { status, triggerFeedback } = useFeedback();

    useEffect(() => {
        const handleHashChange = () => {
            console.log("Navegação detectada para:", window.location.hash);
            setCurrentRoute(window.location.hash);
        }
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // DEBUG: Mostra no console qual rota está ativa
    console.log("Rota Atual do App:", currentRoute);

    // Se a rota for admin (aceita #/admin, #admin ou #/admin/), mostra o Dashboard
    if (currentRoute === '#/admin' || currentRoute === '#admin' || currentRoute === '#/admin/') {
        return <AdminDashboard />;
    }

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

    // INICIALIZAÇÃO E MONITORAMENTO
    useEffect(() => {
        runAutoSetup();
        trackVisitor();
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
            setIsLoading(false);
        };
        loadResources();
    }, []);

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

    const handleContinueProgress = () => {
        if (pendingSavedData) {
            const { resumeData: savedData, currentStep: savedStep, isFinished: savedIsFinished } = pendingSavedData;
            setResumeData(savedData);
            setCurrentStep(savedStep);
            setIsFinished(savedIsFinished);
            setIsDemoMode(false);
            // Ao recarregar, reseta a escala
            setContentScale(1);
            
            // INTELIGÊNCIA: Se o usuário confirmou continuar, E temos um PIX salvo, AGORA abrimos ele.
            if (pixPaymentData) {
                setIsPixModalOpen(true);
            }
        }
        setIsContinueModalOpen(false);
        setPendingSavedData(null);
    };

    const handleStartNew = () => {
        try {
            localStorage.removeItem('inProgressResume');
            // INTELIGÊNCIA: Se o usuário quer começar do zero, o PIX antigo NÃO serve mais.
            localStorage.removeItem(PIX_SESSION_KEY);
        } catch (error) {
            console.error("Error removing localStorage item", error);
        }
        setIsContinueModalOpen(false);
        setPendingSavedData(null);
        setPixPaymentData(null); // Limpa estado visual também
        setIsPixModalOpen(false);
        setContentScale(1); // Reseta escala
        // Abre o modal de escolha ao começar novo, se desejar
        setIsImportModalOpen(true);
    };

    // CORREÇÃO: Função modificada para preservar o estilo (template) ao reiniciar
    const handleStartEditing = () => {
        // 1. Capturamos o estilo (template e cor) que o usuário escolheu visualmente na etapa 0
        const currentStyle = resumeData.style;

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
        
        // Scroll suave para o formulário
        document.getElementById('form-wizard')?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // --- LÓGICA DE IMPORTAÇÃO COM IA ---
    const handleImportResume = async (file: File) => {
        setIsAnalyzingFile(true);
        try {
            // Chama o serviço inteligente que detecta PDF/DOCX/Imagem
            const extractedData = await analyzeResumePDF(file);
            
            // Mescla os dados extraídos com o estado inicial para garantir estrutura
            setResumeData(prev => ({
                ...prev,
                ...extractedData,
                // Mantém o estilo atual selecionado
                style: prev.style 
            }));
            
            setIsDemoMode(false);
            setCurrentStep(0); // Vai para o passo de Dados Pessoais para revisão
            setIsImportModalOpen(false);
            setContentScale(1); // Reseta escala
            showToast("Currículo importado com sucesso! Revise os dados.", "success");
            
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
                    if(contentDiv) {
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
                const nextBlock = blocks[i+1];
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
        const previewElement = previewRef.current?.getElement();
        
        if (!previewColumn || !previewElement) return;

        let columnWidth = previewColumn.offsetWidth;
        const baseWidth = 794;
        const baseHeight = 1123;

        if (isDemoMode) {
             const screenWidth = window.innerWidth;
             if (columnWidth < 300) {
                 columnWidth = screenWidth >= 1024 ? screenWidth * 0.5 : screenWidth - 40;
             }
        }
        
        if (columnWidth <= 0) return;
        
        const scale = columnWidth / baseWidth;
        
        previewElement.style.transform = `scale(${scale})`;
        
        if (previewWrapperRef.current) {
          previewWrapperRef.current.style.height = `${baseHeight * scale}px`;
        }
    }, [isDemoMode]);

    useEffect(() => {
        if(fontsLoaded){ 
            scalePreview();
            window.addEventListener('resize', scalePreview);
            return () => window.removeEventListener('resize', scalePreview);
        }
    }, [scalePreview, paginatedData, fontsLoaded]);
    
    // --- FUNÇÃO EXPORT TO PDF CORRIGIDA (SEM CACHE BUST) ---
    const exportToPdf = useCallback(async (dataToExport: ResumeData) => {
        setIsPaymentProcessing(true);
        setGeneratingStatus('Preparando documento...');
        trackResumeGenerated(dataToExport);

        if (document.fonts) {
            await document.fonts.ready;
        }

        const printArea = document.getElementById('print-area');
        if (!printArea) {
            console.error("Print area not found");
            setIsPaymentProcessing(false);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            setGeneratingStatus('Gerando imagens...');
            const pages = Array.from(printArea.querySelectorAll('.resume-page')) as HTMLElement[];
            
            if (pages.length === 0) throw new Error("Nenhuma página encontrada.");

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = 210;
            const pdfHeight = 297;

            for (let i = 0; i < pages.length; i++) {
                const pageEl = pages[i];
                pageEl.style.height = '1123px';
                pageEl.style.minHeight = '1123px';

                let imgData;
                try {
                    // CONFIGURAÇÃO SEGURA: CacheBust removido para evitar CORS e Network Error
                    imgData = await toPng(pageEl, {
                        quality: 0.95,
                        pixelRatio: 2,
                        backgroundColor: '#ffffff',
                        height: 1123, 
                        width: 794,
                        // CORREÇÃO CRÍTICA PARA MOBILE: Força o estilo do elemento capturado
                        // para garantir que ele tenha a largura correta, ignorando o viewport do celular.
                        style: {
                            width: '794px',
                            height: '1123px',
                            minWidth: '794px',
                            minHeight: '1123px',
                            transform: 'none', // Remove qualquer escala responsiva
                            margin: '0',
                            padding: '0'
                        },
                        // FORÇA DIMENSÕES DO CANVAS
                        canvasWidth: 794 * 2, // Multiplicado pelo pixelRatio
                        canvasHeight: 1123 * 2
                        // REMOVIDO: cacheBust: true
                    });
                } catch (firstError) {
                    console.warn("Falha na alta qualidade, tentando qualidade padrão (Mobile Fallback)...");
                    imgData = await toPng(pageEl, {
                        quality: 0.9,
                        pixelRatio: 1, 
                        backgroundColor: '#ffffff',
                        height: 1123,
                        width: 794,
                        style: {
                            width: '794px',
                            height: '1123px',
                            minWidth: '794px',
                            minHeight: '1123px',
                            transform: 'none',
                            margin: '0',
                            padding: '0'
                        },
                        canvasWidth: 794,
                        canvasHeight: 1123
                    });
                }
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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

    const handlePaymentRequest = async () => {
        if(hasPaidInSession) {
            exportToPdf(resumeData);
            return;
        }

        setIsPaymentProcessing(true);
        const currentAmount = !!editingResumeId ? 2.50 : 5.00;
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
            
            // 🔒 ATUALIZAÇÃO DE SEGURANÇA (Passo 1.2)
            const payload = {
                coupon: !!editingResumeId ? 'PROMO_LANCAMENTO' : null,
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

    const handleEditResume = (savedAt: string) => {
        const resumeToEdit = savedResumes.find(r => r.savedAt === savedAt);
        if (resumeToEdit) {
            setResumeData(resumeToEdit);
            setIsDemoMode(false);
            setIsMyResumesModalOpen(false);
            setEditingResumeId(savedAt);
            setHasPaidInSession(false);
            setContentScale(1); // Reseta a escala ao editar
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
    
    const handleExportJson = () => {
        const json = JSON.stringify(resumeData, null, 2);
        navigator.clipboard.writeText(json)
            .then(() => alert("JSON do currículo copiado para a área de transferência!"))
            .catch(err => alert("Erro ao copiar JSON: " + err));
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
        <>
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

        {/* TOASTS */}
        {toast && (
            <div role="alert" className={`fixed top-20 right-5 z-[101] p-4 rounded-lg shadow-2xl text-white font-semibold transition-all duration-300 animate-fade-in-scale max-w-sm ${{success: 'bg-green-500', error: 'bg-red-600', warning: 'bg-yellow-500 text-gray-900'}[toast.type]}`}>{toast.message}</div>
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
                <button type="button" onClick={handleExportJson} className="fixed bottom-5 left-5 z-[100] bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 focus:outline-none transition-transform hover:scale-105" title="Exportar JSON"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></button>
                <button type="button" onClick={handleFillDemoData} className="fixed bottom-5 left-20 z-[100] bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none transition-transform hover:scale-105" title="Preencher Demo"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                <button type="button" onClick={() => exportToPdf(resumeData)} className="fixed bottom-5 right-5 z-[100] bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 transition-transform hover:scale-105" title="Baixar PDF Teste"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5h0c-1.4 0-2.5-1.1-2.5-2.5V2"/><path d="M8.5 2h7"/><path d="M14.5 16h-5"/></svg></button>
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

        <main className="container mx-auto p-4 lg:p-8 pt-28 lg:pt-36">
            <section id="intro" className="text-center mt-8 lg:mt-24 mb-16">
                <h1 className="text-4xl lg:text-5xl font-bold gradient-text">
                    Faça seu Currículo Profissional por Apenas R$5<span className="text-4xl lg:text-5xl font-bold">,00</span>
                </h1>
                <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">Destaque-se em qualquer seleção com um currículo moderno, profissional e pronto para te garantir aquela vaga.</p>
                <div className="mt-4 flex items-center justify-center gap-2 bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full w-fit mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>+{resumesGenerated} currículos gerados!</span>
                </div>
                <div className="mt-8 flex flex-col items-center gap-4">
                    {/* BOTÃO ALTERADO: Agora abre o modal de importação */}
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-block btn-primary text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
                    >
                        Criar meu Currículo
                    </button>
                </div>
            </section>
            
            <section id="gerador" className="mb-16 scroll-mt-24">
                 <div className="my-8 flex justify-center">
                    <img src="https://files.catbox.moe/aid7gz.png" alt="Visualização dos modelos de currículo" className="max-w-full md:max-w-sm rounded-lg" />
                </div>
                <div id="form-wizard" className="flex flex-col lg:flex-row gap-8">
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
                        onRequestImport={() => setIsImportModalOpen(true)} // Atalho caso precise
                        showToast={showToast}
                    />
                    <div className="w-full lg:w-2/3">
                        <div ref={previewWrapperRef} className="w-full">
                           {paginatedData.length > 0 && paginatedData[currentPage - 1] && (
                             <ResumePreview
                                ref={previewRef}
                                data={paginatedData[currentPage - 1]}
                                isDemoMode={isDemoMode}
                                isFirstPage={currentPage === 1}
                                hideEmptySections={paginatedData.length > 1}
                                // ATIVAÇÃO DAS PROTEÇÕES: Se não pagou, ativa.
                                enableProtection={!hasPaidInSession}
                                contentScale={contentScale} // APLICA O SMART SHRINK AQUI
                             />
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
            
            <section id="como-funciona" className="text-center my-24">
                <h2 className="text-3xl font-bold text-gray-800">Simples, Rápido e Eficaz</h2>
                <p className="text-lg text-gray-600 mt-2 max-w-2xl mx-auto">Criar um currículo de destaque nunca foi tão fácil. Siga apenas 3 passos:</p>
                <div className="mt-12 grid md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full btn-primary text-white text-2xl font-bold mb-4">1</div>
                        <h3 className="text-xl font-semibold mb-2">Preencha</h3>
                        <p className="text-gray-600">Insira as suas informações nos campos guiados. A nossa IA pode ajudar a refinar os textos.</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full btn-primary text-white text-2xl font-bold mb-4">2</div>
                        <h3 className="text-xl font-semibold mb-2">Personalize</h3>
                        <p className="text-gray-600">Escolha entre templates modernos e ajuste a cor para combinar com o seu estilo.</p>
                    </div>
                    <div className="flex flex-col items-center">
                         <div className="flex items-center justify-center w-16 h-16 rounded-full btn-primary text-white text-2xl font-bold mb-4">3</div>
                        <h3 className="text-xl font-semibold mb-2">Exporte</h3>
                        <p className="text-gray-600">Pague uma taxa simbólica e baixe o seu novo currículo em formato PDF, pronto para ser enviado.</p>
                    </div>
                </div>
            </section>
            <TestimonialsSection />
            <section id="final" className="text-center my-24 bg-white p-12 rounded-lg shadow-md">
                 <h2 className="text-3xl font-bold gradient-text">Pronto para dar o próximo passo na sua carreira?</h2>
                 <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">A sua jornada profissional merece um currículo à altura. Comece agora e crie um documento que abre portas.</p>
                 {/* BOTÃO ALTERADO: Agora abre o modal de importação */}
                 <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="mt-8 inline-block btn-primary text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 hover:scale-105"
                 >
                    Criar meu Currículo
                 </button>
            </section>
        </main>
        
        {/* FOOTER ATUALIZADO: padding extra para home indicator (pb-12 -> pb-16 no mobile) */}
        <footer className="bg-gray-900 text-white py-10 md:py-12 pb-16 md:pb-12">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-6 md:mb-0 text-center md:text-left">
                        <div className="mb-4 mx-auto md:mx-0 cursor-pointer select-none" style={{width: 'fit-content'}} onClick={handleFooterLogoClick}>
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
        </>
    );
};

const App: React.FC = () => {
    return (
        <FeedbackProvider>
            <AppContent />
        </FeedbackProvider>
    );
};

export default App;
```

### 2. Arquivo `ResumePreview.tsx` Corrigido

```tsx
import React, { useEffect, forwardRef, useImperativeHandle, useRef, useMemo, useState } from 'react';
import type { PageData } from '../types';
import QRCodeComponent from './QRCode';

// CONFIGURAÇÃO DE POSIÇÃO E SEGURANÇA
export const QR_CONFIG = {
    spacer: { width: 230, height: 160 }, 
    
    positions: {
        'template-modern': { 
            bottom: 15, 
            right: 0,
            safetyPadding: 15,
            // CONTROLE MANUAL DE ALTURA PARA O TEMPLATE MODERNO
            // Altere o 'height' aqui para ajustar o raio da área protegida (Ex: 80, 100, 120)
            overrideSpacer: { width: 230, height: 100 }
        },
        'template-classic': { 
            bottom: 35, 
            right: 25,
            safetyPadding: 29, 
            overrideSpacer: { width: 230, height: 100 }
        },
        'template-minimalist': { 
            bottom: 30, 
            right: 25,
            safetyPadding: 40, 
            overrideSpacer: { width: 230, height: 100 }
        },
    }
};

// Componente visual para secções vazias (Ocupa pouco espaço)
const CollapsedPlaceholder = ({ label }: { label: string }) => (
    <div className="w-full py-1.5 my-1 border border-dashed border-gray-300 rounded bg-gray-50/50 flex items-center justify-center select-none group hover:bg-gray-100 transition-colors">
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider group-hover:text-gray-500">
            {label} (Vazio)
        </span>
    </div>
);

// Interface atualizada com enableProtection
interface ResumePreviewProps {
  data: PageData;
  isDemoMode?: boolean;
  isFirstPage?: boolean;
  isMeasurement?: boolean;
  hideEmptySections?: boolean;
  isPrint?: boolean;
  enableProtection?: boolean;
  contentScale?: number; // Adicionado para receber a escala do App.tsx
}

const ResumePreview = forwardRef<any, ResumePreviewProps>(({ data, isDemoMode, isFirstPage, isMeasurement, hideEmptySections, isPrint, enableProtection = false, contentScale = 1 }, ref) => {
  const safeData = data || {};
  const { personalInfo, summary, experiences, education, courses, languages, skills = [], style, qrCodeOffsets } = safeData;
  
  const previewRef = useRef<HTMLDivElement>(null);
  
  // --- INÍCIO DA EDIÇÃO: Estado para imagem segura ---
  const [safeProfilePic, setSafeProfilePic] = useState<string | null>(null);
  // --- FIM DA EDIÇÃO ---

  // Estados para controle de segurança
  const [isHidingContent, setIsHidingContent] = useState(false); // Para Key Logger (PrintScreen)
  const [isBlurred, setIsBlurred] = useState(false); // Para Anti-Snipping (Perda de foco)

  useImperativeHandle(ref, () => ({
    getElement: () => previewRef.current,
  }));

  useEffect(() => {
    if (style?.color) {
        document.documentElement.style.setProperty('--theme-color', style.color);
    }
  }, [style?.color]);

  // --- INÍCIO DA EDIÇÃO: Processamento da Imagem para Base64 (Correção CORS) ---
  useEffect(() => {
    const processProfilePic = async () => {
        if (!personalInfo?.profilePicture) {
            setSafeProfilePic(null);
            return;
        }

        // Se já for base64 (começa com data:), usa direto
        if (personalInfo.profilePicture.startsWith('data:')) {
            setSafeProfilePic(personalInfo.profilePicture);
            return;
        }

        // Tenta converter URL externa para Base64 para evitar erro de CORS no PDF
        try {
            const response = await fetch(personalInfo.profilePicture);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setSafeProfilePic(reader.result);
                }
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.warn("Não foi possível converter a imagem para Base64 (CORS restrito). Usando URL original.", error);
            // Fallback: usa a URL original se der erro no fetch (pelo menos tenta mostrar na tela)
            setSafeProfilePic(personalInfo.profilePicture);
        }
    };

    processProfilePic();
  }, [personalInfo?.profilePicture]);
  // --- FIM DA EDIÇÃO ---

  // --- IMPLEMENTAÇÃO DAS CAMADAS DE SEGURANÇA ---
  useEffect(() => {
    if (!enableProtection) return;

    // 1. Camada de Teclado (Key Logger para PrintScreen)
    const handleKeyDown = (e: KeyboardEvent) => {
        // Detecta PrintScreen e combinações comuns de captura (Win+Shift+S, Cmd+Shift+3/4)
        if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4'))) {
            setIsHidingContent(true);
            // Mantém escondido por um tempo suficiente para frustrar o print e mostra o alerta
            setTimeout(() => {
                alert("A captura de tela está desabilitada nesta versão.");
                setIsHidingContent(false);
            }, 500); 
        }
    };

    // 2. Camada de Foco (Anti-Snipping Tool)
    // Se a janela perder o foco (ex: usuário clicou na ferramenta de recorte), borra a tela.
    const handleBlur = () => {
        setIsBlurred(true);
    };

    const handleFocus = () => {
        setIsBlurred(false);
    };

    // Bloqueia menu de contexto (botão direito) para dificultar "Salvar Imagem"
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    // Adiciona listener no documento para garantir captura do context menu
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enableProtection]);

  const templateKey = style?.template || 'template-modern';
  // @ts-ignore
  const qrPosition = QR_CONFIG.positions[templateKey] || QR_CONFIG.positions['template-modern'];
  
  // --- INÍCIO DA LÓGICA DINÂMICA (OPÇÃO 1) ---
  
  // 1. Recupera as dimensões base do template (altura é a prioridade aqui)
  // @ts-ignore
  const configSpacer = qrPosition.overrideSpacer || QR_CONFIG.spacer;

  // 2. Verifica quantos QR Codes estão realmente ativos (têm dados E estão habilitados)
  const hasWhatsapp = !!personalInfo?.phone && !!style?.showQRCode;
  // LinkedIn é opcional no type, então assumimos true se undefined para manter compatibilidade, mas checamos se existe link
  const hasLinkedin = !!personalInfo?.linkedin && (style?.showLinkedinQr ?? true);
  
  const activeQrCount = (hasWhatsapp ? 1 : 0) + (hasLinkedin ? 1 : 0);

  // 3. Define a largura dinâmica:
  // Se tiver APENAS 1 QR Code, reduzimos para 130px.
  // Caso contrário (2 códigos ou nenhum), mantemos a largura original do template (230px).
  const dynamicWidth = activeQrCount === 1 ? 130 : configSpacer.width;

  // 4. Cria o objeto final de dimensões que será usado nos espaçadores
  const activeSpacer = {
      width: dynamicWidth,
      height: configSpacer.height
  };
  
  // --- FIM DA LÓGICA DINÂMICA ---

  // Espaçador que empurra o texto para o lado
  const getLocalSpacer = (itemId: string) => {
      if (qrCodeOffsets && qrCodeOffsets[itemId] !== undefined) {
          const marginTop = qrCodeOffsets[itemId];
          return (
              <div 
                key={`spacer-${itemId}`}
                style={{ 
                    float: 'right', 
                    clear: 'right',
                    // Usa as dimensões dinâmicas calculadas acima
                    width: `${activeSpacer.width}px`, 
                    height: `${activeSpacer.height}px`, 
                    marginTop: `${marginTop}px`,
                    pointerEvents: 'none',
                }} 
              />
          );
      }
      return null;
  };

  const processedSkills = useMemo(() => {
      if (!skills || !Array.isArray(skills)) return [];
      try {
          return skills
              .map(skill => {
                  if (typeof skill !== 'string') return '';
                  const trimmed = skill.trim();
                  if (!trimmed) return '';
                  return trimmed.replace(/([a-z])([A-Z])/g, '$1 $2');
              })
              .filter(skill => skill.length > 0);
      } catch (e) {
          console.error("Erro ao processar skills:", e);
          return [];
      }
  }, [skills]);

  const shouldShowSection = (content: any, isArray = false) => {
      const hasContent = isArray 
          ? (Array.isArray(content) && content.length > 0)
          : (content && typeof content === 'string' && content.trim().length > 0);

      if (hideEmptySections) return hasContent;
      if (isMeasurement) return true;
      if (!isFirstPage) return hasContent;
      return true; 
  };

  // Verificadores de conteúdo para decidir entre Renderizar Full vs Placeholder
  const hasSummary = summary && summary.trim().length > 0;
  const hasExperiences = experiences && experiences.length > 0;
  const hasEducation = education && education.length > 0;
  const hasCourses = courses && courses.length > 0;
  const hasLanguages = languages && languages.length > 0;
  const hasSkills = processedSkills && processedSkills.length > 0;

  const isModern = style?.template === 'template-modern';

  // --- INÍCIO DA EDIÇÃO: Uso de safeProfilePic na lógica visual ---
  // Usamos a presença de safeProfilePic (ou personalInfo.profilePicture como fallback lógico inicial)
  // Mas para o render da imagem, usaremos safeProfilePic
  const hasActivePhoto = !!safeProfilePic || !!personalInfo?.profilePicture;
  
  const headerNameWidthStyle = (hasActivePhoto && isModern) 
      ? { maxWidth: 'calc(100% - 170px)' } 
      : { maxWidth: '100%' };
  // --- FIM DA EDIÇÃO ---

  const getMainStyle = () => {
      if (isFirstPage) {
          if (style?.template === 'template-minimalist') {
              return { marginTop: '28px' };
          }
          return { marginTop: isModern ? '0' : '4px' };
      }
      if (isModern) return { paddingTop: '60px' };
      return { marginTop: '0px', paddingTop: '30px' };
  };

  const containerClasses = [
      'resume-preview bg-white text-gray-900',
      style?.template,
      (!isMeasurement || isPrint) ? 'h-[1123px] min-h-[1123px] overflow-hidden relative' : '',
      (!isMeasurement && !isPrint) ? 'rounded-lg shadow-xl' : '',
      // Aplica o filtro blur se a proteção estiver ativa e a janela perder o foco
      (isBlurred && enableProtection) ? 'blur-xl transition-all duration-300' : 'transition-all duration-300',
  ].filter(Boolean).join(' ');

  const showQR = style?.showQRCode || style?.showLinkedinQr;

  return (
    <div 
        id="resume-preview" 
        ref={previewRef} 
        className={containerClasses}
        // APLICAÇÃO DA ESCALA INTELIGENTE (Smart Shrink)
        // O transform-origin top left garante que o encolhimento aconteça a partir do topo
        style={{ 
            // CORREÇÃO: Só aplica transform se a escala for diferente de 1
            transform: contentScale !== 1 ? `scale(${contentScale})` : undefined, 
            transformOrigin: contentScale !== 1 ? 'top left' : undefined,
            // Se estiver escalando, precisamos garantir que a altura do container compense
            // para não ficar espaço branco excessivo embaixo, embora o overflow hidden corte.
            height: isPrint ? '1123px' : undefined 
        }}
    >
      
      {/* --- CAMADA 3: BLOQUEIO DE IMPRESSÃO (CSS) --- */}
      <style>{`
        @media print {
            ${enableProtection ? `
                body {
                    visibility: hidden !important;
                    background: white !important;
                }
                body:before {
                    content: "Visualização protegida. Para baixar o PDF, finalize o pagamento no site.";
                    visibility: visible !important;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 20px;
                    font-weight: bold;
                    color: #333;
                    text-align: center;
                    width: 100%;
                }
                .resume-preview {
                    display: none !important;
                }
            ` : ''}
        }
      `}</style>

      {/* --- CAMADA 1: BLOQUEIO VISUAL (KEY LOGGER) --- */}
      {isHidingContent && enableProtection && (
          <div className="absolute inset-0 z-[100] bg-gray-100 flex flex-col items-center justify-center text-center p-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <h3 className="text-xl font-bold text-gray-800">Proteção Ativa</h3>
              <p className="text-gray-600 mt-2">O recurso de captura de tela está desabilitado na versão de demonstração.</p>
          </div>
      )}

      {isFirstPage && personalInfo && (
        <>
            <div id="profile-pic-container" className={hasActivePhoto ? 'visible' : ''}>
                {/* --- INÍCIO DA EDIÇÃO: Uso do safeProfilePic no src --- */}
                {hasActivePhoto && <img id="profile-pic-img" src={safeProfilePic || personalInfo.profilePicture || ''} alt="Foto de Perfil" />}
                {/* --- FIM DA EDIÇÃO --- */}
            </div>
            <header className={`pb-4 ${(style?.template === 'template-minimalist' || style?.template === 'template-modern' || style?.template === 'template-classic') && hasActivePhoto ? 'has-photo' : ''}`}>
                <div className="flex justify-between items-start">
                    <div className="pr-4" style={headerNameWidthStyle}>
                        <h1 id="resume-name" className="font-bold">{personalInfo.name || (isDemoMode ? '' : 'Seu Nome')}</h1>
                        <h2 id="resume-job-title" className="font-medium text-gray-600 mt-1">{personalInfo.jobTitle || (isDemoMode ? '' : 'Cargo Desejado')}</h2>
                    </div>
                </div>

                <div id="contact-info" className="mt-3">
                    {personalInfo.email && <a href={`mailto:${personalInfo.email}`} id="resume-email-container" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span id="resume-email" className="leading-none pt-0.5">{personalInfo.email}</span></a>}
                    {personalInfo.phone && <a href={`tel:${personalInfo.phone}`} id="resume-phone-container" className="text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span id="resume-phone" className="leading-none pt-0.5">{personalInfo.phone}</span></a>}
                    {personalInfo.address && <div id="resume-address-container" className="text-gray-700 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span id="resume-address" className="leading-none pt-0.5">{personalInfo.address}</span></div>}
                    {personalInfo.age && <div id="resume-age-container" className="text-gray-700 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg><span id="resume-age" className="leading-none pt-0.5">{personalInfo.age} anos</span></div>}
                    {personalInfo.maritalStatus && <div id="resume-marital-status-container" className="text-gray-700 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span id="resume-marital-status" className="leading-none pt-0.5">{personalInfo.maritalStatus}</span></div>}
                    {personalInfo.cnh && personalInfo.cnh !== 'Não possuo' && <div id="resume-cnh-container" className="text-gray-700 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9L1 16v5c0 .6.4 1 1 1h3c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1zM2 16l1.5-4.5h11L16 16H2zm13 1v-1H5v1h10zm-1-4h.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H14v1z"/></svg><span id="resume-cnh" className="leading-none pt-0.5">CNH: {personalInfo.cnh}</span></div>}
                </div>
            </header>
        </>
      )}
      
      <main className="space-y-4" style={getMainStyle()}>
        {shouldShowSection(summary) && (
            hasSummary ? (
                <section id="summary-section">
                    <h3 className="section-title">Resumo Profissional</h3>
                    <div className="relative block">
                        {getLocalSpacer('summary-text')}
                        <div id="resume-summary" className="text-gray-700 leading-relaxed block text-justify">
                            {summary}
                        </div>
                    </div>
                </section>
            ) : (
                <CollapsedPlaceholder label="Resumo Profissional" />
            )
        )}

        {shouldShowSection(experiences, true) && (
            hasExperiences ? (
                <section id="experience-section">
                    <h3 className="section-title">Experiência Profissional</h3>
                    <div id="resume-experience-list" className="space-y-4">
                        {experiences.map(exp => (
                            <div key={exp.id} className="w-full relative block">
                                <div className="flex justify-between items-baseline flex-wrap">
                                    <div className="pr-4">
                                        <h4 className="font-semibold">{exp.jobTitle || 'Cargo'}</h4>
                                        <p className="text-gray-700">{exp.company || 'Empresa'} {exp.location ? `• ${exp.location}` : ''}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 text-right whitespace-nowrap">{exp.startDate} {exp.startDate && exp.endDate ? ' - ' : ''} {exp.endDate}</p>
                                </div>
                                
                                {exp.description && (
                                    <div className="relative block">
                                        {getLocalSpacer(exp.id)}
                                        <p className="mt-1 text-gray-600 leading-relaxed text-justify whitespace-pre-line">
                                            {exp.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <CollapsedPlaceholder label="Experiência Profissional" />
            )
        )}

        {shouldShowSection(education, true) && (
            hasEducation ? (
                <section id="education-section">
                    <h3 className="section-title">Formação Acadêmica</h3>
                    <div id="resume-education-list" className="space-y-2">
                        {education.map(edu => (
                            <div key={edu.id} className="w-full relative block">
                                {getLocalSpacer(edu.id)}
                                <div className="flex justify-between items-baseline flex-wrap">
                                    <div className="pr-4">
                                        <h4 className="font-semibold">{edu.degree || 'Curso/Formação'}</h4>
                                        {edu.institution && (
                                            <p className="text-gray-700">{edu.institution}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 text-right whitespace-nowrap">{edu.startDate} {edu.startDate && edu.endDate ? ' - ' : ''} {edu.endDate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <CollapsedPlaceholder label="Formação Acadêmica" />
            )
        )}

        {shouldShowSection(courses, true) && (
            hasCourses ? (
                <section id="courses-section" className="w-full">
                    <h3 className="section-title">Cursos Complementares</h3>
                    <div id="resume-courses-list" className="space-y-2">
                        {courses.map(course => (
                            <div key={course.id} className="w-full relative block">
                                {getLocalSpacer(course.id)}
                                <div className="flex justify-between items-baseline flex-wrap">
                                    <div className="pr-4">
                                        <h4 className="font-semibold">{course.name || 'Nome do Curso'}</h4>
                                        {course.institution && (
                                            <p className="text-gray-700">{course.institution}</p>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 text-right whitespace-nowrap">{course.completionDate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <CollapsedPlaceholder label="Cursos Complementares" />
            )
        )}

        {shouldShowSection(languages, true) && (
            hasLanguages ? (
                <section id="languages-section">
                    <h3 className="section-title">Idiomas</h3>
                    <div id="resume-languages-list" className="w-full relative block">
                        {getLocalSpacer('languages-block')}
                        {languages.map(lang => (
                            <div key={lang.id} className="inline-block mr-4 mb-2">
                                <span className="font-semibold">{lang.language || 'Idioma'}:&nbsp;</span>
                                <span className="text-gray-700">{lang.proficiency || 'Nível'}</span>
                            </div>
                        ))}
                    </div>
                </section>
            ) : (
                <CollapsedPlaceholder label="Idiomas" />
            )
        )}
        
        {shouldShowSection(processedSkills, true) && (
            hasSkills ? (
                <section id="skills-section">
                    <h3 className="section-title">Habilidades e Competências</h3>
                    <div id="resume-skills" className="w-full relative block">
                        {getLocalSpacer('skills-block')}
                        {(style?.template === 'template-classic' || style?.template === 'template-minimalist') ? (
                            <div className="text-gray-700 text-sm leading-relaxed">
                                {processedSkills.map((skill, index) => (
                                    <span key={index} className="inline-block">
                                        {skill}
                                        {index < processedSkills.length - 1 && (
                                            <span className="mx-2 font-bold text-gray-400">•</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="block">
                                {processedSkills.map((skill, index) => (
                                    <span 
                                        key={index} 
                                        className="bg-gray-200 text-gray-800 text-sm font-semibold px-4 py-1 rounded-full inline-block mb-1 mr-2"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            ) : (
                <CollapsedPlaceholder label="Habilidades e Competências" />
            )
        )}

        {/* --- PHANTOM SPACER (ESPAÇADOR FANTASMA) --- */}
        {/* Este bloco invisível garante que o texto "sinta" a presença do QR Code no fluxo do documento. */}
        {/* Se o texto crescer demais, ele empurra este bloco para baixo, estourando a altura da página */}
        {/* e acionando a lógica de "Smart Shrink" no App.tsx. */}
        {isFirstPage && showQR && (
            <div 
                className="phantom-spacer"
                style={{
                    width: '100%',
                    // Altura = Altura do QR + Posição Bottom + Padding de Segurança
                    height: `${activeSpacer.height + (qrPosition.bottom || 0) + (qrPosition.safetyPadding || 0)}px`,
                    clear: 'both', // Garante que fique abaixo de qualquer float
                    visibility: 'hidden', // Invisível visualmente
                    pointerEvents: 'none', // Não interfere em cliques
                    display: 'block' // Ocupa espaço físico
                }}
            />
        )}
        
      </main>
      
      {/* POSICIONAMENTO ABSOLUTO DO QR CODE (VISUAL) */}
      {isFirstPage && personalInfo && showQR && (
          <div style={{
              position: 'absolute',
              bottom: `${qrPosition.bottom}px`,
              right: `${qrPosition.right}px`,
              // USO DA LARGURA DINÂMICA
              width: `${activeSpacer.width}px`, 
              zIndex: 50, 
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'flex-end', 
              alignItems: 'flex-end',
              backgroundColor: 'white', 
              padding: '10px 0 0 10px', 
              borderTopLeftRadius: '8px'
          }}>
              <QRCodeComponent phone={personalInfo.phone} show={style.showQRCode} linkedin={personalInfo.linkedin} showLinkedin={style.showLinkedinQr ?? true} />
          </div>
      )}
    </div>
  );
});

export default ResumePreview;

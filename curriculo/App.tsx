import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore
import { toPng } from 'html-to-image';
// @ts-ignore
import { jsPDF } from 'jspdf';
import ResumeForm from './components/ResumeForm';
import ResumePreview, { ResumePreviewRef } from './components/ResumePreview';
import PixModal from './components/PixModal';
import MyResumesModal from './components/MyResumesModal';
import ContinueProgressModal from './components/ContinueProgressModal';
import type { ResumeData } from './types';

interface PageData extends Partial<ResumeData> {
    continuation?: {
        [itemId: string]: {
            offset: number;
            totalHeight: number;
            visibleHeight?: number;
        };
    };
    restrictedBlockIds?: string[];
}

interface SavedResume extends ResumeData {
  savedAt: string;
}

// DADOS DE DEMONSTRAÇÃO (MANTIDOS)
const DEMO_DATA: ResumeData = {
    personalInfo: {
        name: 'Marcos MJ Santos',
        jobTitle: 'Desenvolvedor Full Stack & Criador de Soluções',
        email: 'marcos@velsites.com.br',
        phone: '(37) 92707-2025',
        address: 'Nova Serrana, MG',
        age: '22',
        maritalStatus: 'Casado',
        cnh: 'A',
        linkedin: 'linkedin.com/in/marcos-mj-santos-aa696a233',
        profilePicture: 'https://i.postimg.cc/c4k45kS3/Gemini-Generated-Image-igzfl4igzfl4igzf.png'
    },
    summary: 'Desenvolvedor Full Stack. Transformo ideias em projetos que comunicam de verdade. Especialista no ecossistema React, TypeScript e arquitetura Serverless. Aos 22 anos, uno agilidade técnica e visão de produto, com foco em criar experiências de usuário fluidas, sistemas escaláveis e soluções que geram valor real para o usuário final.',
    experiences: [
        { 
            id: '1', 
            jobTitle: 'Fundador & Desenvolvedor Lead', 
            company: 'Vel Sites / VelCurrículo', 
            location: 'Nova Serrana, MG', 
            startDate: 'Jan 2023', 
            endDate: 'Atual', 
            description: 'Fundador e desenvolvedor responsável pela criação da plataforma VelCurrículo. Atuo do início ao fim do projeto, cuidando da estrutura do sistema, integrações externas e da experiência do usuário, com foco em soluções simples, funcionais e que resolvem problemas reais.' 
        },
        { 
            id: '2', 
            jobTitle: 'Desenvolvedor Front-End Pleno', 
            company: 'Tech Solutions (Remoto)', 
            location: 'Divinópolis, MG', 
            startDate: 'Mar 2021', 
            endDate: 'Dez 2022', 
            description: 'Desenvolvedor Front-End atuando no desenvolvimento e manutenção de interfaces para sistemas de gestão (ERP), com foco em usabilidade e clareza. Participei da modernização de sistemas antigos, padronização visual dos projetos e trabalho colaborativo em equipe ágil.' 
        },
        { 
            id: '3', 
            jobTitle: 'Freelancer Full Stack', 
            company: 'Autônomo', 
            location: 'Minas Gerais', 
            startDate: 'Jan 2020', 
            endDate: 'Fev 2021', 
            description: 'Atuação como desenvolvedor freelancer, criando sites e lojas virtuais para pequenos negócios. Cuido desde a parte técnica até a entrega final, com atenção à performance, presença online e soluções simples para facilitar o contato com clientes.' 
        }
    ],
    education: [
        { 
            id: '1', 
            degree: 'Análise e Desenvolvimento de Sistemas', 
            institution: 'Faculdade Tecnológica', 
            startDate: '2021', 
            endDate: '2023' 
        }
    ],
    courses: [
        { id: '1', name: 'Arquitetura de Software e Cloud Computing', institution: 'AWS Training', completionDate: '2024' },
        { id: '2', name: 'Domínio de React, Redux e Next.js', institution: 'Code Academy', completionDate: '2023' },
        { id: '3', name: 'Integrações de API e Microsserviços', institution: 'Alura', completionDate: '2022' },
        { id: '4', name: 'UX/UI Design para Desenvolvedores', institution: 'Origamid', completionDate: '2021' }
    ],
    languages: [
        { id: '1', language: 'Português', proficiency: 'Fluente' },
        { id: '2', language: 'Inglês', proficiency: 'Avançado (Leitura Técnica)' }
    ],
    skills: [
        'React.js', 'TypeScript', 'Node.js', 'Netlify Functions', 
        'Google Gemini AI', 'Tailwind CSS', 'Integração de Pagamentos', 
        'Git/GitHub', 'Arquitetura Serverless', 'UI/UX Design', 
        'Resolução de Problemas', 'Liderança Técnica'
    ],
    style: {
        template: 'template-modern',
        color: '#002e9e',
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

const ALL_TESTIMONIALS = [
    { text: '"Ferramenta incrível! Consegui criar um currículo super profissional em 10 minutos. A ajuda da IA para o resumo foi a cereja no topo do bolo."', author: '- Mariana S. - Marketing Digital' },
    { text: '"Para quem está a começar a carreira, como eu, este site é uma mão na roda. Templates limpos e muito fáceis de usar. 10/10!"', author: '- João P. - Estudante' },
    { text: '"Finalmente um gerador de currículos que não tenta vender-me um plano premium a cada clique. Gratuito e de alta qualidade. Recomendo!"', author: '- Carlos F. - Desenvolvedor Jr.' },
    { text: '"O design minimalista era exatamente o que eu procurava. Consegui a minha primeira entrevista com o currículo que fiz aqui."', author: '- Ana L. - Designer Gráfica' },
    { text: '"A funcionalidade de IA para melhorar as descrições é fantástica. Poupa imenso tempo e o resultado fica muito mais profissional."', author: '- Ricardo G. - Gerente de Projetos' },
    { text: '"Usei a ferramenta para atualizar o meu currículo antigo e a diferença é notória. A interface é super intuitiva e o resultado final é excelente."', author: '- Sofia B. - Advogada' },
    { text: '"Como assistente administrativo, precisava de algo rápido e profissional. Este site entregou tudo! A IA ajudou a organizar minhas tarefas de forma clara."', author: '- Lucas M. - Assistente Administrativo' },
    { text: '"Trabalho como caixa e não sabia como montar um currículo. Foi tudo muito fácil e o resultado ficou ótimo, bem mais do que eu esperava."', author: '- Camila R. - Operadora de Caixa' },
    { text: '"Simplesmente o melhor que já usei. Em poucos passos, meu currículo de \'ajudante geral\' ficou com cara de especialista. Muito obrigado!"', author: '- Fernando T. - Ajudante Geral' },
    { text: '"Estava a procurar o meu primeiro emprego e não tinha experiência para listar. As sugestões de habilidades e o editor de resumo foram essenciais!"', author: '- Beatriz C. - Jovem Aprendiz' },
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

const App: React.FC = () => {
    const isPixTestMode = false;
    const [resumeData, setResumeData] = useState<ResumeData>(DEMO_DATA);
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
    const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
    const [hasPaidInSession, setHasPaidInSession] = useState(false);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [generatingStatus, setGeneratingStatus] = useState<string>('');
    const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);
    const [pendingSavedData, setPendingSavedData] = useState<any>(null);

    const previewRef = useRef<ResumePreviewRef>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };
    
    const previewWrapperRef = useRef<HTMLDivElement>(null);
    const measurementRootRef = useRef<any>(null);
    const measurementContainerRef = useRef<HTMLDivElement | null>(null);
    
    useEffect(() => {
        const loadFonts = async () => {
            try { await document.fonts.ready; } catch (e) { console.error(e); } finally { setFontsLoaded(true); }
        };
        loadFonts();
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
    
    useEffect(() => {
        try {
            const savedProgress = localStorage.getItem('inProgressResume');
            if (savedProgress) {
                const parsedProgress = JSON.parse(savedProgress);
                setPendingSavedData(parsedProgress);
                setIsContinueModalOpen(true);
            }
            const storedResumes = localStorage.getItem('savedResumes');
            if (storedResumes) setSavedResumes(JSON.parse(storedResumes));
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        if (!isDemoMode) { 
            try {
                const progress = { resumeData, currentStep, isFinished };
                localStorage.setItem('inProgressResume', JSON.stringify(progress));
            } catch (e) { console.error(e); }
        }
    }, [resumeData, currentStep, isFinished, isDemoMode]);

    const handleContinueProgress = () => {
        if (pendingSavedData) {
            const { resumeData: savedData, currentStep: savedStep, isFinished: savedIsFinished } = pendingSavedData;
            setResumeData(savedData);
            setCurrentStep(savedStep);
            setIsFinished(savedIsFinished);
            setIsDemoMode(false);
        }
        setIsContinueModalOpen(false);
        setPendingSavedData(null);
    };

    const handleStartNew = () => {
        localStorage.removeItem('inProgressResume');
        setIsContinueModalOpen(false);
        setPendingSavedData(null);
    };

    const handleStartEditing = () => {
        setIsDemoMode(false);
        setResumeData(INITIAL_DATA);
        setCurrentStep(0);
        setIsFinished(false);
        setHasPaidInSession(false);
        setEditingResumeId(null);
        localStorage.removeItem('inProgressResume');
    };

    const handleRequestDelete = (target: { id: string; type: 'experience' | 'education' | 'course' | 'language' }) => {
        setDeletionTarget(target);
    };

    const handleConfirmDelete = () => {
        if (!deletionTarget) return;
        const { type, id } = deletionTarget;
        const keyMap = { experience: 'experiences', education: 'education', course: 'courses', language: 'languages' } as const;
        const key = keyMap[type];
        setResumeData(prev => ({ ...prev, [key]: prev[key].filter((item: any) => item.id !== id) }));
        setDeletionTarget(null);
    };
    
    useEffect(() => {
        if (currentPage > paginatedData.length) {
          setCurrentPage(paginatedData.length > 0 ? paginatedData.length : 1);
        }
    }, [paginatedData, currentPage]);
    
    const paginateResume = useCallback(async (dataToPaginate: ResumeData) => {
        if (!measurementRootRef.current || !measurementContainerRef.current) return [dataToPaginate];
        const onRenderComplete = new Promise<HTMLElement>(async (resolve, reject) => {
            const container = measurementContainerRef.current;
            const timeout = setTimeout(() => reject(new Error("Timeout")), 6000);
            const checkRender = async () => {
                const previewEl = container?.firstChild as HTMLElement;
                if (!previewEl) { requestAnimationFrame(checkRender); return; }
                const images = Array.from(previewEl.querySelectorAll('img'));
                await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(res => img.onload = res)));
                await new Promise(r => setTimeout(r, 80));
                clearTimeout(timeout);
                resolve(previewEl);
            };
            measurementRootRef.current.render(<ResumePreview key={Date.now()} data={dataToPaginate} isDemoMode={isDemoMode} isFirstPage={true} isMeasurement={true} />);
            requestAnimationFrame(checkRender);
        });
        
        try {
            if (document.fonts) await document.fonts.ready;
            const previewEl = await onRenderComplete;
            const A4_HEIGHT = 1123; 
            const MARGIN_TOP = 50, MARGIN_BOTTOM = 50; 
            const QR_CODE_START_Y = 930; 
            const getElementHeight = (element: HTMLElement) => {
                if (!element) return 0;
                const style = window.getComputedStyle(element);
                return element.offsetHeight + parseFloat(style.marginTop || '0') + parseFloat(style.marginBottom || '0');
            };
            const headerEl = previewEl.querySelector('header') as HTMLElement;
            const mainEl = previewEl.querySelector('main') as HTMLElement;
            if (!mainEl) return [dataToPaginate];
            const headerHeight = getElementHeight(headerEl);
            const mainMarginTop = parseFloat(window.getComputedStyle(mainEl).marginTop || '0');

            interface ContentBlock { id: string; type: keyof ResumeData; data: any; height: number; node: HTMLElement; }
            const blocks: ContentBlock[] = [];
            const extractBlocks = (sectionId: string, dataKey: keyof ResumeData, listId?: string) => {
                const sectionEl = previewEl.querySelector(`#${sectionId}`) as HTMLElement;
                if (!sectionEl) return;
                const titleEl = sectionEl.querySelector('.section-title') as HTMLElement;
                if (titleEl) blocks.push({ id: `${dataKey}-title`, type: dataKey, data: null, height: getElementHeight(titleEl) + 10, node: titleEl });
                if (dataKey === 'summary') {
                    const pEl = sectionEl.querySelector('p') as HTMLElement;
                    if (pEl) blocks.push({ id: 'summary-text', type: 'summary', data: dataToPaginate.summary, height: getElementHeight(pEl), node: pEl });
                } else if (listId) {
                    const listContainer = sectionEl.querySelector(`#${listId}`);
                    if (!listContainer) return;
                    const items = Array.from(listContainer.children) as HTMLElement[];
                    items.forEach((itemEl, idx) => {
                        const itemData = (dataToPaginate[dataKey] as any[])[idx];
                        if (itemData) blocks.push({ id: itemData.id, type: dataKey, data: itemData, height: getElementHeight(itemEl), node: itemEl });
                    });
                } else if (dataKey === 'skills' || dataKey === 'languages') {
                     const div = sectionEl.querySelector(dataKey === 'skills' ? '#resume-skills' : '#resume-languages-list') as HTMLElement;
                     if(div) blocks.push({ id: `${dataKey}-block`, type: dataKey, data: dataToPaginate[dataKey], height: getElementHeight(div), node: div });
                }
            };

            if (dataToPaginate.summary) extractBlocks('summary-section', 'summary');
            if (dataToPaginate.experiences.length > 0) extractBlocks('experience-section', 'experiences', 'resume-experience-list');
            if (dataToPaginate.education.length > 0) extractBlocks('education-section', 'education', 'resume-education-list');
            if (dataToPaginate.courses.length > 0) extractBlocks('courses-section', 'courses', 'resume-courses-list');
            if (dataToPaginate.languages.length > 0) extractBlocks('languages-section', 'languages');
            if (dataToPaginate.skills.length > 0) extractBlocks('skills-section', 'skills');

            const pages: PageData[] = [];
            let currentPageData: PageData = { personalInfo: dataToPaginate.personalInfo, style: dataToPaginate.style, experiences: [], education: [], courses: [], languages: [], skills: [], restrictedBlockIds: [] };
            let currentY = MARGIN_TOP + headerHeight + mainMarginTop;
            let currentPageIndex = 0;
            const createNewPage = () => {
                pages.push(currentPageData);
                currentPageData = { style: dataToPaginate.style, experiences: [], education: [], courses: [], languages: [], skills: [], restrictedBlockIds: [] };
                currentPageIndex++;
                currentY = MARGIN_TOP + 30; 
            };
            const dangerZoneStart = QR_CODE_START_Y;
            let pendingTitleHeight = 0;

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const hasQr = (dataToPaginate.style.showQRCode || dataToPaginate.style.showLinkedinQr);
                let effectiveHeight = block.height;
                let shouldRestrict = false;

                // --- LÓGICA DE DETECÇÃO CORRIGIDA ---
                if (currentPageIndex === 0 && hasQr) {
                    const blockEnd = currentY + block.height;
                    const safeLimit = dangerZoneStart - 10;
                    if (blockEnd > safeLimit) {
                        // Se começou já no rodapé, encolhe largura
                        if (currentY > (dangerZoneStart - 60)) {
                            shouldRestrict = true;
                            effectiveHeight = block.height * 1.7; 
                        } else {
                            // Se começou no topo mas bateria no QR, joga para página 2
                            effectiveHeight = A4_HEIGHT;
                        }
                    }
                }

                const available = (A4_HEIGHT - MARGIN_BOTTOM) - currentY;
                if (block.id.endsWith('-title')) {
                    const next = blocks[i+1];
                    const nextH = next ? next.height : 40;
                    if (available < (effectiveHeight + nextH)) { createNewPage(); effectiveHeight = block.height; }
                    currentY += effectiveHeight; pendingTitleHeight = effectiveHeight; continue;
                }
                if (effectiveHeight > available) {
                    createNewPage();
                    effectiveHeight = block.height; shouldRestrict = false;
                    if (block.type === 'summary') currentPageData.summary = block.data;
                    else if (block.type === 'skills' || block.type === 'languages') currentPageData[block.type] = block.data;
                    else if (Array.isArray(currentPageData[block.type])) (currentPageData[block.type] as any[]).push(block.data);
                    currentY += (pendingTitleHeight > 0 ? pendingTitleHeight : 40) + effectiveHeight; pendingTitleHeight = 0;
                } else {
                    if (shouldRestrict) { if(!currentPageData.restrictedBlockIds) currentPageData.restrictedBlockIds = []; currentPageData.restrictedBlockIds.push(block.id); }
                    if (block.type === 'summary') currentPageData.summary = block.data;
                    else if (block.type === 'skills' || block.type === 'languages') currentPageData[block.type] = block.data;
                    else if (Array.isArray(currentPageData[block.type])) (currentPageData[block.type] as any[]).push(block.data);
                    currentY += effectiveHeight; pendingTitleHeight = 0;
                }
            }
            if (Object.keys(currentPageData).length > 0) pages.push(currentPageData);
            setPaginatedData(pages.filter(p => p.summary || p.experiences?.length || p.education?.length || p.personalInfo));
            return pages;
        } catch (e) { console.error(e); setPaginatedData([dataToPaginate]); return [dataToPaginate]; }
    }, [isDemoMode]);

    const scalePreview = useCallback(() => {
        const previewColumn = previewWrapperRef.current?.parentElement;
        const previewElement = previewRef.current?.getElement();
        if (!previewColumn || !previewElement) return;
        const scale = previewColumn.offsetWidth / 794;
        previewElement.style.transform = `scale(${scale})`;
        if (previewWrapperRef.current) previewWrapperRef.current.style.height = `${1123 * scale}px`;
    }, []);

    useEffect(() => {
        const h = setTimeout(() => fontsLoaded && paginateResume(resumeData), 300);
        return () => clearTimeout(h);
    }, [resumeData, paginateResume, fontsLoaded]);

    useEffect(() => {
        if(fontsLoaded){ 
            scalePreview(); window.addEventListener('resize', scalePreview);
            return () => window.removeEventListener('resize', scalePreview);
        }
    }, [scalePreview, paginatedData, fontsLoaded]);
    
    const exportToPdf = useCallback(async (dataToExport: ResumeData) => {
        setIsPaymentProcessing(true); setGeneratingStatus('Preparando...');
        if (document.fonts) await document.fonts.ready;
        const printArea = document.getElementById('print-area');
        if (!printArea) { setIsPaymentProcessing(false); return; }
        await new Promise(r => setTimeout(r, 1000));
        try {
            const pages = Array.from(printArea.querySelectorAll('.resume-page')) as HTMLElement[];
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            for (let i = 0; i < pages.length; i++) {
                const img = await toPng(pages[i], { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff', height: 1123, width: 794 });
                if (i > 0) pdf.addPage(); pdf.addImage(img, 'PNG', 0, 0, 210, 297);
            }
            pdf.save(`curriculo-${dataToExport.personalInfo.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        } catch (e) { console.error(e); showToast("Erro ao gerar PDF."); } finally { setIsPaymentProcessing(false); setGeneratingStatus(''); }
    }, []);

    const handlePaymentRequest = async () => {
        if(hasPaidInSession) { exportToPdf(resumeData); return; }
        setIsPaymentProcessing(true);
        const amount = !!editingResumeId ? 2.50 : 5.00; setPaymentAmount(amount);
        try {
            const res = await fetch('/.netlify/functions/create-pix-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isDiscounted: !!editingResumeId }) });
            const data = await res.json();
            if (!res.ok || !data.paymentId) throw new Error('Erro no Pix');
            setPixPaymentData(data); setIsPixModalOpen(true);
        } catch (e) { alert((e as Error).message); } finally { setIsPaymentProcessing(false); }
    };

    const handlePaymentSuccess = () => {
        setIsPixModalOpen(false); setPixPaymentData(null); setHasPaidInSession(true);
        const newResume: SavedResume = { ...resumeData, savedAt: new Date().toISOString() };
        setSavedResumes(prev => {
            const updated = editingResumeId ? prev.map(r => r.savedAt === editingResumeId ? newResume : r) : [...prev, newResume];
            localStorage.setItem('savedResumes', JSON.stringify(updated)); return updated;
        });
        setEditingResumeId(null); localStorage.removeItem('inProgressResume');
        setTimeout(() => exportToPdf(resumeData), 300);
    };
    
    const handleEditResume = (savedAt: string) => {
        const resume = savedResumes.find(r => r.savedAt === savedAt);
        if (resume) { setResumeData(resume); setCurrentStep(0); setIsFinished(false); setEditingResumeId(savedAt); setIsDemoMode(false); setIsMyResumesModalOpen(false); }
    };

    const handleDeleteSavedResume = (savedAt: string) => {
        setSavedResumes(prev => {
            const updated = prev.filter(r => r.savedAt !== savedAt);
            localStorage.setItem('savedResumes', JSON.stringify(updated)); return updated;
        });
    };

    if (!fontsLoaded) return <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-[200]">Carregando...</div>;

    return (
        <>
        <div id="print-container">
             <div id="print-area">
                {paginatedData.map((p, i) => (
                    <div key={i} className="resume-page" style={{ height: '1123px', minHeight: '1123px' }}>
                        <ResumePreview data={p} isDemoMode={false} isFirstPage={i === 0} isPrint={true} hideEmptySections={true} />
                    </div>
                ))}
             </div>
        </div>
        {toast && <div className={`fixed top-20 right-5 z-[101] p-4 rounded bg-red-600 text-white`}>{toast.message}</div>}
        <ContinueProgressModal isOpen={isContinueModalOpen} onContinue={handleContinueProgress} onStartNew={handleStartNew} />
        {isPixModalOpen && pixPaymentData && <PixModal isOpen={isPixModalOpen} onClose={() => setIsPixModalOpen(false)} paymentData={pixPaymentData} onPaymentSuccess={handlePaymentSuccess} amount={paymentAmount} />}
        {isMyResumesModalOpen && <MyResumesModal isOpen={isMyResumesModalOpen} onClose={() => setIsMyResumesModalOpen(false)} resumes={savedResumes} onEdit={handleEditResume} onDownload={exportToPdf} onDelete={handleDeleteSavedResume} />}
        {deletionTarget && <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded shadow-xl"><h3 className="font-bold">Remover item?</h3><div className="mt-6 flex justify-end gap-3"><button onClick={() => setDeletionTarget(null)}>Cancelar</button><button onClick={handleConfirmDelete} className="bg-red-600 text-white p-2 px-4 rounded">Remover</button></div></div>
        </div>}
        <button type="button" onClick={() => exportToPdf(resumeData)} className="fixed bottom-5 right-5 z-[100] bg-orange-500 text-white p-3 rounded-full shadow-lg">Baixar PDF</button>
        <header className="fixed top-6 left-6 right-6 bg-blue-800/80 backdrop-blur-lg z-50 rounded-full p-3 px-6 text-white flex justify-between">
            <img src="https://i.postimg.cc/yNWrvPQJ/Subcabe-alho-76.png" className="h-5" alt="Logo" />
            <nav><a href="https://velsites.com.br/">Início</a></nav>
        </header>
        <main className="container mx-auto p-4 pt-28">
            <section className="text-center my-12">
                <h1 className="text-4xl font-bold">Faça seu Currículo Profissional por R$5,00</h1>
                <p className="mt-4">+{resumesGenerated} currículos gerados!</p>
                <button onClick={handleStartEditing} className="mt-8 bg-blue-600 text-white p-3 px-8 rounded-full">Criar meu Currículo</button>
            </section>
            <section id="gerador" className="flex flex-col lg:flex-row gap-8">
                <ResumeForm data={resumeData} setData={setResumeData} isDemoMode={isDemoMode} onStartEditing={handleStartEditing} onRequestPayment={handlePaymentRequest} isPaymentProcessing={isPaymentProcessing} onRequestDelete={handleRequestDelete} currentStep={currentStep} setCurrentStep={setCurrentStep} isFinished={isFinished} setIsFinished={setIsFinished} showToast={showToast} />
                <div className="w-full lg:w-2/3">
                    <div ref={previewWrapperRef} className="w-full">
                        {paginatedData[currentPage - 1] && <ResumePreview ref={previewRef} data={paginatedData[currentPage - 1]} isDemoMode={isDemoMode} isFirstPage={currentPage === 1} hideEmptySections={paginatedData.length > 1} />}
                    </div>
                    {paginatedData.length > 1 && <div className="mt-4 flex gap-2">{paginatedData.map((_, i) => <button key={i} onClick={() => setCurrentPage(i+1)} className={currentPage === i+1 ? 'font-bold' : ''}>{i+1}</button>)}</div>}
                </div>
            </section>
            <TestimonialsSection />
        </main>
        <footer className="bg-gray-900 text-white p-12 text-center">
            <img src="https://i.postimg.cc/D0pp6j3q/Subcabe-alho-39.png" className="h-8 mx-auto mb-6" alt="Footer Logo" />
            <p>&copy; {new Date().getFullYear()} Vel Sites. Todos os direitos reservados.</p>
        </footer>
        </>
    );
};
export default App;

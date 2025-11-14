import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import ResumeForm from './components/ResumeForm';
import ResumePreview, { ResumePreviewRef } from './components/ResumePreview';
import PixModal from './components/PixModal';
import MyResumesModal from './components/MyResumesModal';
import type { ResumeData } from './types';

interface PageData extends Partial<ResumeData> {
    continuation?: {
        [itemId: string]: {
            offset: number;
            totalHeight: number;
            visibleHeight?: number;
        };
    };
}

interface SavedResume extends ResumeData {
  savedAt: string;
}

const DEMO_DATA: ResumeData = {
    personalInfo: {
        name: 'Ana Maria Silva',
        jobTitle: 'Desenvolvedora Front-End',
        email: 'ana.silva@email.com',
        phone: '(11) 98765-4321',
        address: 'São Paulo, SP',
        age: '',
        maritalStatus: '',
        cnh: '',
        profilePicture: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IiM5Q0EzQUYiIGNsYXNzPSJ3LWZ1bGwgaC1mdWxsIHBhZGRpbmciPjxwYXRoIGQ9Ik0xMiAxMmMyLjIxIDAgNC0xLjc5IDQtNHMtMS43OS00LTQtNC00IDEuNzktNCA0IDEuNzkgNCA0IDR6bTAgMmMtMi42NyAwLTggMS4zNC04IDR2MmgxNnYtMmMwLTIuNjYtNS4zMy00LTgtNHoiLz48L3N2Zz4='
    },
    summary: 'Desenvolvedora front-end proativa com 3+ anos de experiência na criação de interfaces de usuário responsivas e performáticas com React e Vue.js. Apaixonada por design limpo e em busca de novos desafios para aplicar minhas habilidades em UI/UX. Histórico comprovado na otimização de performance, resultando em melhorias significativas no Core Web Vitals e na satisfação do cliente. Proficiente em metodologias ágeis e ferramentas de versionamento como Git.',
    experiences: [
        { id: '1', jobTitle: 'Desenvolvedora Front-End Pleno', company: 'Tech Solutions', location: 'São Paulo, SP', startDate: 'Jan 2022', endDate: 'Atual', description: 'Liderança no desenvolvimento do novo portal do cliente usando React, resultando em um aumento de 25% na retenção de usuários. Otimização de performance (Core Web Vitals) e mentoria de desenvolvedores júnior. Colaboração com equipes de UI/UX para garantir a fidelidade do design e a melhor experiência do usuário. Implementação de testes unitários e de integração para garantir a qualidade e a estabilidade do código.' },
        { id: '2', jobTitle: 'Desenvolvedora Front-End Júnior', company: 'Web Agil', location: 'Remoto', startDate: 'Mar 2020', endDate: 'Dez 2021', description: 'Desenvolvimento e manutenção de landing pages e e-commerces em Vue.js, garantindo total responsividade e acessibilidade (WCAG).' }
    ],
    education: [
        { id: '1', degree: 'Análise e Desenvolvimento de Sistemas', institution: 'Universidade Estácio de Sá', startDate: '2018', endDate: '2020' }
    ],
    courses: [
        { id: '1', name: 'React Avançado', institution: 'Udemy', completionDate: '2023' },
        { id: '2', name: 'UI/UX Design Principles', institution: 'Coursera', completionDate: '2022' }
    ],
    languages: [
        { id: '1', language: 'Português', proficiency: 'Fluente' },
        { id: '2', language: 'Inglês', proficiency: 'Avançado' }
    ],
    skills: ['React', 'JavaScript (ES6+)', 'TypeScript', 'Vue.js', 'Tailwind CSS', 'Metodologias Ágeis'],
    style: {
        template: 'template-modern',
        color: '#002e9e',
        showQRCode: true
    }
};

const INITIAL_DATA: ResumeData = {
    personalInfo: { name: '', jobTitle: '', email: '', phone: '', address: '', age: '', maritalStatus: '', cnh: '', profilePicture: '' },
    summary: '',
    experiences: [],
    education: [],
    courses: [],
    languages: [],
    skills: [],
    style: { template: 'template-modern', color: '#002e9e', showQRCode: true }
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

const shuffleArray = (array: any[]) => {
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
  
  // Antes das 9h, exibe apenas o número base do dia.
  if (hour < 9) return base;
  
  const startOfDayCount = new Date();
  startOfDayCount.setHours(9, 0, 0, 0);
  
  const endOfDayCount = new Date();
  endOfDayCount.setHours(19, 0, 0, 0);
  
  // Após as 19h, exibe o total do dia (10 horas de contagem).
  if (now > endOfDayCount) {
    const totalSecondsInWorkDay = (endOfDayCount.getTime() - startOfDayCount.getTime()) / 1000;
    return base + Math.floor(totalSecondsInWorkDay / 20);
  }
  
  // Durante o dia (9h às 19h), calcula com base no tempo decorrido.
  const secondsElapsed = Math.floor((now.getTime() - startOfDayCount.getTime()) / 1000);
  return base + Math.floor(secondsElapsed / 20);
};

interface PixPaymentData {
    qrCodeUrl: string;
    copyPasteCode: string;
    paymentIntentId: string;
}

const App: React.FC = () => {
    // --- PRODUCTION MODE ---
    // This is now set to 'false' to use the real Stripe API.
    const isPixTestMode = false;
    // ------------------------

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
    const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
    const [isMyResumesModalOpen, setIsMyResumesModalOpen] = useState(false);
    const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
    const [hasPaidInSession, setHasPaidInSession] = useState(false);

    const previewRef = useRef<ResumePreviewRef>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
        setToast({ message, type });
        setTimeout(() => {
            setToast(null);
        }, 5000);
    };
    
    const previewWrapperRef = useRef<HTMLDivElement>(null);
    const measurementRootRef = useRef<any>(null);
    
    useEffect(() => {
        const interval = setInterval(() => {
            // Recalcula o valor com base na hora atual para garantir que todos os usuários vejam o mesmo número.
            setResumesGenerated(calculateCurrentGenerated(calculateTodaysBase()));
        }, 5000); // Atualiza a cada 5 segundos para uma sensação mais "ao vivo".
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const measurementNode = document.createElement('div');
        measurementNode.style.position = 'absolute';
        measurementNode.style.left = '-9999px';
        measurementNode.style.top = '0px';
        measurementNode.style.zIndex = '-1';
        document.body.appendChild(measurementNode);
        measurementRootRef.current = ReactDOM.createRoot(measurementNode);
    
        return () => {
            measurementRootRef.current?.unmount();
            if (document.body.contains(measurementNode)) {
                document.body.removeChild(measurementNode);
            }
        };
    }, []);
    
    // Load data from localStorage on initial render
    useEffect(() => {
        try {
            // Load in-progress resume
            const savedProgress = localStorage.getItem('inProgressResume');
            if (savedProgress) {
                const { resumeData: savedData, currentStep: savedStep, isFinished: savedIsFinished } = JSON.parse(savedProgress);
                setResumeData(savedData);
                setCurrentStep(savedStep);
                setIsFinished(savedIsFinished);
                setIsDemoMode(false);
            }

            // Load saved (paid) resumes
            const storedResumes = localStorage.getItem('savedResumes');
            if (storedResumes) {
                setSavedResumes(JSON.parse(storedResumes));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage:", error);
        }
    }, []);

    // Save progress to localStorage whenever it changes
    useEffect(() => {
        if (!isDemoMode) { // Don't save if in demo mode
            try {
                const progress = { resumeData, currentStep, isFinished };
                localStorage.setItem('inProgressResume', JSON.stringify(progress));
            } catch (error) {
                console.error("Failed to save progress to localStorage:", error);
            }
        }
    }, [resumeData, currentStep, isFinished, isDemoMode]);


    const handleStartEditing = () => {
        setIsDemoMode(false);
        setResumeData(INITIAL_DATA);
        setCurrentStep(0);
        setIsFinished(false);
        setHasPaidInSession(false);
        setEditingResumeId(null);
        try {
            localStorage.removeItem('inProgressResume');
        } catch (error) {
            console.error("Failed to remove in-progress resume from localStorage:", error);
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
    
    const paginateResume = useCallback(async (dataToPaginate: ResumeData) => {
        if (!measurementRootRef.current) return [dataToPaginate];
    
        const onRenderComplete = new Promise<HTMLElement>(async (resolve, reject) => {
            const root = measurementRootRef.current;
            const timeout = setTimeout(() => reject(new Error("Pagination render timeout")), 3000);
    
            const checkRender = async () => {
                const previewEl = root._internalRoot?.containerInfo?.firstChild as HTMLElement;
                if (!previewEl) {
                    requestAnimationFrame(checkRender); return;
                }
    
                const images = Array.from(previewEl.querySelectorAll('img'));
                const imagePromises = images.map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(res => { img.onload = res; img.onerror = res; });
                });
    
                await Promise.all(imagePromises);
                clearTimeout(timeout);
                resolve(previewEl);
            };
            
            measurementRootRef.current.render(
                <ResumePreview data={dataToPaginate} isDemoMode={isDemoMode} isFirstPage={true} isMeasurement={true} />
            );
            requestAnimationFrame(checkRender);
        });
        
        try {
            if (document.fonts) await document.fonts.ready;
            const previewEl = await onRenderComplete;
            
            if (previewEl.scrollHeight <= 1123) {
                setPaginatedData([dataToPaginate]);
                return [dataToPaginate];
            }

            const A4_PIXEL_HEIGHT = 1123;
            const BOTTOM_MARGIN = 56;
            const TOP_MARGIN_P2 = 56;
            const CONTENT_HEIGHT_LIMIT = A4_PIXEL_HEIGHT - BOTTOM_MARGIN;
            const MIN_SPLIT_HEIGHT = 50;

            const getElementFullHeight = (element: Element | null): number => {
                if (!element) return 0;
                const style = window.getComputedStyle(element);
                const marginTop = parseFloat(style.marginTop) || 0;
                const marginBottom = parseFloat(style.marginBottom) || 0;
                return (element as HTMLElement).offsetHeight + marginTop + marginBottom;
            };

            interface ContentBlock {
                id: string; type: keyof ResumeData; data: any; height: number; marginTop: number; isSplittable: boolean; isTitle?: boolean;
            }

            const blocks: ContentBlock[] = [];
            const mainEl = previewEl.querySelector('main');
            if (!mainEl) { setPaginatedData([dataToPaginate]); return [dataToPaginate]; }
            
            Array.from(mainEl.children as HTMLCollectionOf<HTMLElement>).forEach(sectionEl => {
                const sectionId = sectionEl.id || '';
                let key = sectionId.replace('-section', '') as keyof ResumeData | 'experience';
                if (key === 'experience') key = 'experiences';
                
                const data = dataToPaginate[key as keyof ResumeData];
                if (!data || (Array.isArray(data) && data.length === 0)) return;

                const sectionMarginTop = parseFloat(window.getComputedStyle(sectionEl).marginTop) || 0;
                const titleEl = sectionEl.querySelector<HTMLElement>('.section-title');
                if (titleEl) {
                    blocks.push({ id: `${key}-title`, type: key, data: null, height: getElementFullHeight(titleEl), marginTop: sectionMarginTop, isSplittable: false, isTitle: true });
                }

                if (key === 'summary') {
                    const contentEl = sectionEl.querySelector<HTMLElement>('#resume-summary');
                    if (contentEl) blocks.push({ id: 'summary', type: 'summary', data: dataToPaginate.summary, height: getElementFullHeight(contentEl), marginTop: 0, isSplittable: true });
                } else if (key === 'experiences') {
                    const itemEls = Array.from(sectionEl.querySelectorAll<HTMLElement>(`#resume-experience-list > div`));
                    dataToPaginate.experiences.forEach((exp, index) => {
                        const itemEl = itemEls[index];
                        if (!itemEl) return;
                        const itemMarginTop = parseFloat(window.getComputedStyle(itemEl).marginTop) || 0;
                        const headerEl = itemEl.querySelector(':scope > div:first-child') as HTMLElement;
                        const descEl = itemEl.querySelector('p') as HTMLElement;
                        if(headerEl) blocks.push({ id: `${exp.id}-header`, type: 'experiences', data: exp, height: getElementFullHeight(headerEl), marginTop: itemMarginTop, isSplittable: false});
                        if(descEl) blocks.push({ id: exp.id, type: 'experiences', data: exp, height: getElementFullHeight(descEl), marginTop: 0, isSplittable: true});
                    });
                } else {
                    blocks.push({ id: key, type: key, data, height: sectionEl.offsetHeight - (titleEl?.offsetHeight || 0), marginTop: 0, isSplittable: false });
                }
            });

            const pages: PageData[] = [];
            let currentPageData: PageData = { personalInfo: dataToPaginate.personalInfo, style: dataToPaginate.style };
            const headerHeight = getElementFullHeight(previewEl.querySelector('header'));
            const mainMarginTop = parseInt(window.getComputedStyle(mainEl).marginTop, 10) || 0;
            let currentHeight = headerHeight + mainMarginTop;

            const startNewPage = () => {
                pages.push(currentPageData);
                currentPageData = { style: dataToPaginate.style };
                currentHeight = TOP_MARGIN_P2;
            };

            const addDataToPage = (page: PageData, block: ContentBlock) => {
                if (block.isTitle) return;
                const { type, data } = block;
                if (Array.isArray((dataToPaginate as any)[type])) {
                    if (!(page as any)[type]) (page as any)[type] = [];
                    if (!(page as any)[type].some((i: any) => i.id === data.id)) (page as any)[type].push(data);
                } else {
                    (page as any)[type] = data;
                }
            };
            
            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const blockTotalHeight = block.height + block.marginTop;

                if (block.isTitle) {
                    const nextBlock = blocks[i + 1];
                    if (nextBlock && nextBlock.type === block.type && !nextBlock.isTitle) {
                        const spaceNeeded = blockTotalHeight + nextBlock.marginTop + (nextBlock.isSplittable ? MIN_SPLIT_HEIGHT : nextBlock.height);
                        if (currentHeight + spaceNeeded > CONTENT_HEIGHT_LIMIT) {
                            startNewPage();
                        }
                    }
                }
                
                if (currentHeight + blockTotalHeight <= CONTENT_HEIGHT_LIMIT) {
                    addDataToPage(currentPageData, block);
                    currentHeight += blockTotalHeight;
                } else {
                    const remainingSpace = CONTENT_HEIGHT_LIMIT - currentHeight;
                    const spaceForBlockContent = remainingSpace - block.marginTop;

                    if (block.isSplittable && spaceForBlockContent >= MIN_SPLIT_HEIGHT) {
                        const visibleHeightOnPage1 = spaceForBlockContent;
                        addDataToPage(currentPageData, block);
                        if (!currentPageData.continuation) currentPageData.continuation = {};
                        currentPageData.continuation[block.id] = { offset: 0, totalHeight: block.height, visibleHeight: visibleHeightOnPage1 };
                        
                        startNewPage();
                        
                        addDataToPage(currentPageData, block);
                        if (!currentPageData.continuation) currentPageData.continuation = {};
                        currentPageData.continuation[block.id] = { offset: visibleHeightOnPage1, totalHeight: block.height };
                        
                        currentHeight += (block.height - visibleHeightOnPage1);
                    } else {
                        startNewPage();
                        addDataToPage(currentPageData, block);
                        currentHeight += blockTotalHeight;
                    }
                }
            }

            if (Object.keys(currentPageData).length > 1) {
               pages.push(currentPageData);
            }
            
            const finalPages = pages.filter(p => Object.keys(p).some(k => k !== 'style' && k !== 'continuation' && (!Array.isArray((p as any)[k]) || (p as any)[k].length > 0)));
            setPaginatedData(finalPages);
            return finalPages;

        } catch (error) {
            console.error("Pagination failed:", error);
            setPaginatedData([dataToPaginate]);
            return [dataToPaginate];
        }
    }, [isDemoMode]);

    const scalePreview = useCallback(() => {
        const previewColumn = previewWrapperRef.current?.parentElement;
        const previewElement = previewRef.current?.getElement();
        
        if (!previewColumn || !previewElement) return;

        const columnWidth = previewColumn.offsetWidth;
        const baseWidth = 794;
        const baseHeight = 1123;
        
        const scale = columnWidth / baseWidth;
        
        previewElement.style.transform = `scale(${scale})`;
        
        if (previewWrapperRef.current) {
          previewWrapperRef.current.style.height = `${baseHeight * scale}px`;
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            paginateResume(resumeData);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [resumeData, paginateResume]);


    useEffect(() => {
        scalePreview();
        window.addEventListener('resize', scalePreview);
        return () => window.removeEventListener('resize', scalePreview);
    }, [scalePreview, paginatedData]);
    
    useEffect(() => {
        const scrollers = document.querySelectorAll(".scroller");

        const addAnimation = () => {
            scrollers.forEach((scroller) => {
                scroller.setAttribute("data-animated", "true");
                const scrollerInner = scroller.querySelector(".scroller__inner");
                if (scrollerInner) {
                    const scrollerContent = Array.from(scrollerInner.children);
                    scrollerContent.forEach((item) => {
                        const duplicatedItem = item.cloneNode(true) as HTMLElement;
                        duplicatedItem.setAttribute("aria-hidden", "true");
                        scrollerInner.appendChild(duplicatedItem);
                    });
                }
            });
        }
        
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            addAnimation();
        }
    }, []);

    const exportToPdf = useCallback(async (dataToExport: ResumeData) => {
        setIsPaymentProcessing(true);
        if (document.fonts) await document.fonts.ready;
        
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;
    
        if (!jsPDF || !html2canvas) {
            console.error("PDF generation dependencies not found.");
            setIsPaymentProcessing(false);
            return;
        }
    
        const pagesToExport = await paginateResume(dataToExport);
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.zIndex = '-1';
        document.body.appendChild(tempContainer);
    
        try {
            const tempRoot = ReactDOM.createRoot(tempContainer);
    
            for (let i = 0; i < pagesToExport.length; i++) {
                const pageData = pagesToExport[i];
    
                await new Promise<void>(resolve => {
                    tempRoot.render(
                        <ResumePreview data={pageData} isDemoMode={false} isFirstPage={i === 0} />
                    );
                    setTimeout(resolve, 300);
                });
    
                const resumeElement = tempContainer.querySelector('.resume-preview') as HTMLElement;
                if (!resumeElement) continue;
    
                const canvas = await html2canvas(resumeElement, { scale: 2, useCORS: true, logging: false });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
    
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }
    
            const fileName = `${dataToExport.personalInfo.name.replace(/\s/g, '_') || 'curriculo'}.pdf`;
            pdf.save(fileName);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
        } finally {
            document.body.removeChild(tempContainer);
            setIsPaymentProcessing(false);
            paginateResume(resumeData);
        }
    }, [paginateResume, resumeData, isDemoMode]);

    const handlePaymentRequest = async () => {
        if(hasPaidInSession) {
            exportToPdf(resumeData);
            return;
        }

        setIsPaymentProcessing(true);

        if (isPixTestMode) {
            console.log("Entering Pix Test Mode...");
            setTimeout(() => {
                setPixPaymentData({
                    qrCodeUrl: 'https://files.catbox.moe/5n52e5.png',
                    copyPasteCode: '00020126360014br.gov.bcb.pix0114+55119999999995204000053039865802BR5913Test_User_Name6009SAO_PAULO62070503***6304E2A4',
                    paymentIntentId: `pi_test_${Date.now()}`,
                });
                setIsPixModalOpen(true);
                setIsPaymentProcessing(false);
            }, 1000);
            return;
        }

        try {
            const backendUrl = '/.netlify/functions/create-pix-payment';

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDiscounted: !!editingResumeId })
            });
    
            const data = await response.json();
    
            if (!response.ok || !data.paymentIntentId) {
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
            setCurrentStep(0);
            setIsFinished(false);
            setEditingResumeId(savedAt);
            setIsDemoMode(false);
            setHasPaidInSession(false);
            setIsMyResumesModalOpen(false);
            // Scroll to form
            document.getElementById('form-wizard')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleDeleteSavedResume = (savedAt: string) => {
        setSavedResumes(prev => {
            const updated = prev.filter(r => r.savedAt !== savedAt);
            localStorage.setItem('savedResumes', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <>
        {toast && (
            <div
                role="alert"
                className={`fixed top-20 right-5 z-[101] p-4 rounded-lg shadow-2xl text-white font-semibold transition-all duration-300 animate-fade-in-scale max-w-sm ${
                {
                    success: 'bg-green-500',
                    error: 'bg-red-600',
                    warning: 'bg-yellow-500 text-gray-900',
                }[toast.type]
                }`}
            >
                {toast.message}
            </div>
        )}
        {isPixModalOpen && pixPaymentData && (
            <PixModal
                isOpen={isPixModalOpen}
                onClose={() => setIsPixModalOpen(false)}
                paymentData={pixPaymentData}
                onPaymentSuccess={handlePaymentSuccess}
                isTestMode={isPixTestMode}
            />
        )}
        {isMyResumesModalOpen && (
            <MyResumesModal
                isOpen={isMyResumesModalOpen}
                onClose={() => setIsMyResumesModalOpen(false)}
                resumes={savedResumes}
                onEdit={handleEditResume}
                onDownload={exportToPdf}
                onDelete={handleDeleteSavedResume}
            />
        )}
        {deletionTarget && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
                    <h3 className="text-lg font-semibold text-gray-800">Confirmar Exclusão</h3>
                    <p className="text-gray-600 mt-2">Tem a certeza que deseja remover este item? Esta ação não pode ser desfeita.</p>
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={() => setDeletionTarget(null)} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleConfirmDelete} className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        )}
        <header className="fixed top-6 left-6 right-6 bg-blue-800/80 backdrop-blur-lg z-50 border border-white/10 rounded-full shadow-lg">
            <div className="px-6 py-3 flex justify-between items-center">
                <a href="https://velsites.com.br/" className="flex items-center">
                    <img src="https://i.postimg.cc/yNWrvPQJ/Subcabe-alho-76.png" alt="Vel Sites Logo" className="h-5 mr-3" />
                </a>
                <nav>
                    <a href="https://velsites.com.br/" className="text-white hover:text-blue-200 font-medium transition">Início</a>
                </nav>
            </div>
        </header>

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
                    <a href="#form-wizard" onClick={handleStartEditing} className="inline-block btn-primary text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300">
                        Criar meu Currículo
                    </a>
                    {savedResumes.length > 0 && (
                        <button onClick={() => setIsMyResumesModalOpen(true)} className="text-sm font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 py-2 px-6 rounded-full transition-all">
                            Meus Currículos
                        </button>
                    )}
                </div>
            </section>
            
            <section id="gerador" className="mb-16 scroll-mt-24">
                 <div className="my-8 flex justify-center">
                    <img src="https://files.catbox.moe/aid7gz.png" alt="Visualização dos modelos de currículo" className="max-w-full md:max-w-sm rounded-lg" />
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
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
                             />
                           )}
                        </div>
                        {paginatedData.length > 1 && (
                            <div className="pagination-controls">
                                {paginatedData.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentPage(index + 1)}
                                        className={`pagination-btn ${currentPage === index + 1 ? 'active' : ''}`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                        )}
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

            <section id="avaliacoes" className="my-24">
                <h2 className="text-3xl font-bold text-center text-gray-800">Feito para quem precisa de resultados</h2>
                <p className="text-lg text-center text-gray-600 mt-2 mb-12">Veja o que os nossos usuários estão a dizer.</p>

                <div className="space-y-4">
                    <div className="scroller px-4 py-4">
                        <ul className="scroller__inner list-none p-0">
                            {TESTIMONIALS_1.map((item, index) => (
                                <li key={index} className="flex flex-col flex-shrink-0 w-80 bg-white p-6 rounded-lg shadow-lg">
                                    <div className="flex-grow">
                                        <p className="text-gray-700">{item.text}</p>
                                    </div>
                                    <p className="font-semibold text-right mt-4 text-gray-800">{item.author}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="scroller px-4 py-4" data-direction="right">
                         <ul className="scroller__inner list-none p-0">
                            {TESTIMONIALS_2.map((item, index) => (
                                <li key={index} className="flex flex-col flex-shrink-0 w-80 bg-white p-6 rounded-lg shadow-lg">
                                    <div className="flex-grow">
                                        <p className="text-gray-700">{item.text}</p>
                                    </div>
                                    <p className="font-semibold text-right mt-4 text-gray-800">{item.author}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
             <section id="final" className="text-center my-24 bg-white p-12 rounded-lg shadow-md">
                 <h2 className="text-3xl font-bold gradient-text">Pronto para dar o próximo passo na sua carreira?</h2>
                 <p className="text-lg text-gray-600 mt-4 max-w-3xl mx-auto">A sua jornada profissional merece um currículo à altura. Comece agora e crie um documento que abre portas.</p>
                 <a href="#form-wizard" onClick={handleStartEditing} className="mt-8 inline-block btn-primary text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300">Criar meu Currículo</a>
            </section>
        </main>
        
        <footer className="bg-gray-900 text-white py-10 md:py-12">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-6 md:mb-0 text-center md:text-left">
                        <div className="mb-4 mx-auto md:mx-0" style={{width: 'fit-content'}}>
                            <img src="https://i.postimg.cc/D0pp6j3q/Subcabe-alho-39.png" alt="Vel Sites Logo Rodapé" className="footer-logo" />
                        </div>
                        <p className="text-gray-400 max-w-md">A Vel nasceu pra quem não espera, pra quem resolve. Se você move o mundo com seu ofício, a gente move sua marca no digital.</p>
                    </div>
                    <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-12 text-center md:text-left">
                        <div>
                            <h4 className="font-bold text-lg mb-4">Contacto</h4>
                            <ul className="space-y-2">
                                <li className="text-gray-400">(37) 98416-9386</li>
                                <li className="text-gray-400">contato@velsites.com.br</li>
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-bold text-lg mb-4">Siga-nos</h4>
                            <div className="flex space-x-4 justify-center md:justify-start">
                                <a href="https://www.instagram.com/velsites.com.br/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center footer-social-icon"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353-.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zM12 15a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg></a>
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

export default App;

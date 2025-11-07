import React, { useState, useRef, useEffect } from 'react';
import type { ResumeData, Experience, Education, Course, Language } from '../types';
import { enhanceText, suggestSkills, analyzeWorkExperiencePDF } from '../services/geminiService';
import CharacterCounter from './CharacterCounter';

interface ResumeFormProps {
  data: ResumeData;
  setData: React.Dispatch<React.SetStateAction<ResumeData>>;
  isDemoMode: boolean;
  onStartEditing: () => void;
  onRequestPayment: () => void;
  isPaymentProcessing: boolean;
  onRequestDelete: (target: { id: string, type: 'experience' | 'education' | 'course' | 'language' }) => void;
  hasPaidInSession: boolean;
  isEditing: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  isFinished: boolean;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
}

const WIZARD_STEPS = [
  "Estilo e Design",
  "Informações Pessoais",
  "Resumo Profissional",
  "Experiência Profissional",
  "Formação Acadêmica",
  "Cursos Complementares",
  "Idiomas",
  "Habilidades e Competências",
];

const SKILL_SUGGESTIONS = [
    "Pacote Office", "Excel Avançado", "Comunicação Efetiva", "Trabalho em Equipa",
    "Liderança", "Proatividade", "Organização", "Atendimento ao Cliente", "Gestão de Tempo"
];

const LANGUAGE_SUGGESTIONS = ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Japonês'];

const EDUCATION_SHORTCUTS = [
    "Ensino Médio Completo", "Ensino Médio Incompleto", "Ensino Fundamental"
];

const MARITAL_STATUS_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'];
const CNH_OPTIONS = ['Não possuo', 'A', 'B', 'A+B', 'C', 'D', 'E'];
const PROFICIENCY_LEVELS: Language['proficiency'][] = ['Básico', 'Intermediário', 'Avançado', 'Fluente'];

const SUMMARY_SUGGESTIONS = [
    {
        title: "Para começar:",
        suggestions: [
            "Profissional dedicado e proativo com experiência em...",
            "Recém-formado em [Curso] buscando oportunidade para aplicar meus conhecimentos em...",
            "Com [X] anos de experiência na área de [Área], desenvolvi fortes habilidades em...",
        ],
    },
    {
        title: "Para destacar habilidades:",
        suggestions: [
            "Habilidade em liderar equipes e gerenciar projetos complexos.",
            "Experiência com as ferramentas [Ferramenta 1] e [Ferramenta 2].",
            "Foco em otimização de processos e melhoria contínua.",
            "Excelente comunicação interpessoal e capacidade de trabalhar em equipe.",
        ],
    },
    {
        title: "Para falar de objetivos:",
        suggestions: [
            "Busco uma posição desafiadora onde eu possa contribuir para o crescimento da empresa.",
            "Meu objetivo é desenvolver minha carreira em um ambiente dinâmico.",
            "Disponível para contribuir ativamente com os objetivos da equipe e da organização.",
        ],
    },
];

const CHAR_LIMITS = {
  personalInfo: {
    name: 70,
    jobTitle: 70,
    email: 100,
    address: 100,
  },
  summary: 1000,
  experience: {
    jobTitle: 70,
    company: 50,
    location: 50,
    date: 20,
    description: 1500,
  },
  education: {
    degree: 100,
    institution: 70,
  },
  course: {
    name: 100,
    institution: 70,
  },
  language: {
    language: 30,
  },
  skills: 500,
};

const formatPhoneNumber = (value: string) => {
    let v = value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    } else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,4})$/, '($1) $2');
    } else if (v.length > 0) {
        v = v.replace(/^(\d{0,2})$/, '($1');
    }
    return v;
};

const capitalizeName = (value: string): string => {
  if (!value) return '';
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const ResumeForm: React.FC<ResumeFormProps> = ({ data, setData, isDemoMode, onStartEditing, onRequestPayment, isPaymentProcessing, onRequestDelete, hasPaidInSession, isEditing, showToast, currentStep, setCurrentStep, isFinished, setIsFinished }) => {
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [openAccordion, setOpenAccordion] = useState<{ experience: string | null; education: string | null; course: string | null; language: string | null; }>({ experience: null, education: null, course: null, language: null });
  const [aiSkillSuggestions, setAiSkillSuggestions] = useState<string[]>([]);
  const [experiencePdf, setExperiencePdf] = useState<File | null>(null);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isFinished && stepsContainerRef.current) {
        const activeStepNode = stepRefs.current[currentStep];
        if (activeStepNode) {
            stepsContainerRef.current.style.height = `${activeStepNode.scrollHeight}px`;
        }
    }
  }, [currentStep, isFinished, data.experiences, data.education, data.courses, data.languages, openAccordion, aiSkillSuggestions, data.summary]);
  
  const addCourse = () => {
    const newId = Date.now().toString();
    const newCourse: Course = { id: newId, name: '', institution: '', completionDate: '' };
    handleDataChange('courses', [...data.courses, newCourse]);
    setOpenAccordion(prev => ({...prev, course: newId}));
  };

  useEffect(() => {
    // When user gets to "Cursos Complementares" step, if there are no courses, add one automatically.
    if (currentStep === 5 && data.courses.length === 0) {
      addCourse();
    }
  }, [currentStep]);


  const handleNext = () => {
    if (isDemoMode && currentStep === 0) {
      onStartEditing();
      setCurrentStep(currentStep + 1);
      return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if(isFinished) {
      setIsFinished(false);
      return;
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDataChange = <T extends keyof ResumeData>(section: T, value: ResumeData[T]) => {
    setData(prev => ({ ...prev, [section]: value }));
  };

  const handlePersonalInfoChange = (field: keyof ResumeData['personalInfo'], value: string) => {
    handleDataChange('personalInfo', { ...data.personalInfo, [field]: value });
  };
  
  const handleStyleChange = (field: keyof ResumeData['style'], value: any) => {
    handleDataChange('style', { ...data.style, [field]: value });
  };
  
  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handlePersonalInfoChange('profilePicture', event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePic = () => {
    handlePersonalInfoChange('profilePicture', '');
  };

  const addExperience = () => {
    const newId = Date.now().toString();
    const newExp: Experience = { id: newId, jobTitle: '', company: '', location: '', startDate: '', endDate: '', description: '' };
    handleDataChange('experiences', [...data.experiences, newExp]);
    setOpenAccordion(prev => ({...prev, experience: newId}));
  };
  
  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    handleDataChange('experiences', data.experiences.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };
  
  const addEducation = () => {
    const newId = Date.now().toString();
    const newEdu: Education = { id: newId, degree: '', institution: '', startDate: '', endDate: '' };
    handleDataChange('education', [...data.education, newEdu]);
    setOpenAccordion(prev => ({...prev, education: newId}));
  };
  
  const updateEducation = (id: string, field: keyof Education, value: string) => {
    handleDataChange('education', data.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu));
  };

  const updateCourse = (id: string, field: keyof Course, value: string) => {
    handleDataChange('courses', data.courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addLanguage = () => {
    const newId = Date.now().toString();
    const newLang: Language = { id: newId, language: '', proficiency: '' };
    handleDataChange('languages', [...data.languages, newLang]);
    setOpenAccordion(prev => ({...prev, language: newId}));
  };

  const updateLanguage = (id: string, field: keyof Language, value: string) => {
    handleDataChange('languages', data.languages.map(l => l.id === id ? { ...l, [field]: value } : l));
  };
  
  const handleEducationShortcut = (degree: string) => {
     const newId = Date.now().toString();
     const newEdu: Education = { id: newId, degree, institution: '', startDate: '', endDate: '' };
     handleDataChange('education', [newEdu]);
     setOpenAccordion(prev => ({...prev, education: newId}));
  };
  
  const handleAddLanguageSuggestion = (languageName: string) => {
    if (data.languages.some(l => l.language.toLowerCase() === languageName.toLowerCase())) {
      return;
    }
    const newId = Date.now().toString();
    const newLang: Language = { id: newId, language: languageName, proficiency: '' };
    handleDataChange('languages', [...data.languages, newLang]);
    setOpenAccordion(prev => ({...prev, language: newId}));
  };

  const handleAccordionToggle = (type: 'experience' | 'education' | 'course' | 'language', id: string) => {
    setOpenAccordion(prev => ({
        ...prev,
        [type]: prev[type] === id ? null : id
    }));
  };

  const handleAddSkill = (skill: string) => {
    if (!data.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase())) {
        handleDataChange('skills', [...data.skills, skill]);
    }
  };

  const handleSkillsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    handleDataChange('skills', skillsArray);
  };
  
  const handleAddSummarySuggestion = (suggestion: string) => {
      const textarea = document.getElementById('summary-textarea') as HTMLTextAreaElement;
      setData(prev => {
          const currentSummary = prev.summary.trim();
          const newSummary = currentSummary ? `${currentSummary} ${suggestion}` : `${suggestion}`;
          return { ...prev, summary: newSummary.substring(0, CHAR_LIMITS.summary) };
      });
      // Focus and scroll to the end of textarea
      if (textarea) {
        textarea.focus();
        setTimeout(() => {
            textarea.scrollTop = textarea.scrollHeight;
        }, 0);
      }
  };

  const handleEnhanceSummary = async () => {
    if (!data.summary.trim()) return;
    setAiLoading({ ...aiLoading, summary: true });
    try {
      const prompt = `Reescreva o seguinte resumo profissional para ser mais conciso e impactante, destacando as principais qualidades: "${data.summary}"`;
      const enhanced = await enhanceText(prompt);
      setData(prev => ({...prev, summary: enhanced.substring(0, CHAR_LIMITS.summary) }));
    } catch(e) {
      console.error(e);
      showToast((e as Error).message || "Ocorreu um erro ao aprimorar o texto.");
    } finally {
      setAiLoading({ ...aiLoading, summary: false });
    }
  };

  const handleEnhanceExperience = async (exp: Experience) => {
    if (!exp.description.trim()) return;
    setAiLoading({ ...aiLoading, [exp.id]: true });
    try {
      const prompt = `Considerando o cargo de "${exp.jobTitle}", reescreva a seguinte descrição de experiência profissional usando verbos de ação e focando em conquistas, de forma profissional e sucinta: "${exp.description}"`;
      const enhanced = await enhanceText(prompt);
      updateExperience(exp.id, 'description', enhanced.substring(0, CHAR_LIMITS.experience.description));
    } catch(e) {
      console.error(e);
      showToast((e as Error).message || "Ocorreu um erro ao aprimorar o texto.");
    } finally {
      setAiLoading({ ...aiLoading, [exp.id]: false });
    }
  };

  const handleSuggestSkills = async () => {
    if (!data.personalInfo.jobTitle.trim()) {
        showToast("Preencha o seu 'Cargo Desejado' para receber sugestões.", 'warning');
        return;
    }
    setAiLoading(prev => ({ ...prev, skills: true }));
    setAiSkillSuggestions([]);
    try {
        const combinedExperience = data.experiences.map(exp => `${exp.jobTitle}: ${exp.description}`).join('\n');
        const suggestions = await suggestSkills(data.personalInfo.jobTitle, combinedExperience);
        const newSuggestions = suggestions.filter(s => 
            !data.skills.map(ds => ds.toLowerCase()).includes(s.toLowerCase()) && 
            !SKILL_SUGGESTIONS.map(ss => ss.toLowerCase()).includes(s.toLowerCase())
        );
        setAiSkillSuggestions(newSuggestions);
    } catch (e) {
        console.error(e);
        showToast((e as Error).message || "Ocorreu um erro ao sugerir habilidades.");
    } finally {
        setAiLoading(prev => ({ ...prev, skills: false }));
    }
  };
  
  const handleAnalyzeExperiencePdf = async () => {
    if (!experiencePdf) {
      showToast("Por favor, selecione um arquivo PDF para analisar.", 'warning');
      return;
    }
    setIsAnalyzingPdf(true);
    try {
      const extractedExperiences = await analyzeWorkExperiencePDF(experiencePdf);

      const newExperiences: Experience[] = extractedExperiences.map((exp) => ({
        ...exp,
        id: `${Date.now()}-${Math.random()}`,
        description: "",
      }));

      if (newExperiences.length > 0) {
        handleDataChange("experiences", [...data.experiences, ...newExperiences]);
        setOpenAccordion((prev) => ({ ...prev, experience: newExperiences[0].id }));
      } else {
        showToast("Nenhuma experiência encontrada no PDF. Tente outro arquivo.", 'warning');
      }
    } catch (error) {
      console.error("Error analyzing experience PDF:", error);
      showToast((error as Error).message);
    } finally {
      setExperiencePdf(null);
      setIsAnalyzingPdf(false);
      const fileInput = document.getElementById('experience-pdf-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const renderStepContent = () => {
    return WIZARD_STEPS.map((_, index) => {
        let content;
        switch (index) {
          case 0:
            content = (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Template</label>
                  <div id="template-selector" className="flex flex-col gap-3">
                    <div onClick={() => handleStyleChange('template', 'template-modern')} className={`template-option cursor-pointer border-2 rounded-lg p-2 flex items-center gap-4 ${data.style.template === 'template-modern' ? 'border-blue-600' : 'border-gray-300'}`}>
                        <svg viewBox="0 0 100 140" className="w-16 h-auto rounded-md pointer-events-none bg-gray-100 p-1 border"><rect x="10" y="10" width="25" height="120" rx="3" fill="#cbd5e1"></rect><rect x="45" y="10" width="45" height="15" rx="3" fill="#cbd5e1"></rect><rect x="45" y="35" width="45" height="5" rx="2" fill="#e2e8f0"></rect><rect x="45" y="45" width="35" height="5" rx="2" fill="#e2e8f0"></rect><rect x="45" y="65" width="45" height="8" rx="3" fill="#cbd5e1"></rect><rect x="45" y="80" width="40" height="5" rx="2" fill="#e2e8f0"></rect></svg>
                        <span className="font-semibold text-sm text-gray-800">Moderno</span>
                    </div>
                    <div onClick={() => handleStyleChange('template', 'template-classic')} className={`template-option cursor-pointer border-2 rounded-lg p-2 flex items-center gap-4 ${data.style.template === 'template-classic' ? 'border-blue-600' : 'border-gray-300'}`}>
                        <svg viewBox="0 0 100 140" className="w-16 h-auto rounded-md pointer-events-none bg-gray-100 p-1 border"><rect x="10" y="10" width="80" height="15" rx="3" fill="#cbd5e1"></rect><rect x="10" y="35" width="80" height="5" rx="2" fill="#e2e8f0"></rect><rect x="10" y="45" width="60" height="5" rx="2" fill="#e2e8f0"></rect><rect x="10" y="65" width="80" height="8" rx="3" fill="#cbd5e1"></rect><rect x="10" y="80" width="70" height="5" rx="2" fill="#e2e8f0"></rect><rect x="10" y="90" width="80" height="5" rx="2" fill="#e2e8f0"></rect><rect x="10" y="100" width="50" height="5" rx="2" fill="#e2e8f0"></rect></svg>
                        <span className="font-semibold text-sm text-gray-800">Clássico</span>
                    </div>
                     <div onClick={() => handleStyleChange('template', 'template-minimalist')} className={`template-option cursor-pointer border-2 rounded-lg p-2 flex items-center gap-4 ${data.style.template === 'template-minimalist' ? 'border-blue-600' : 'border-gray-300'}`}>
                        <svg viewBox="0 0 100 140" className="w-16 h-auto rounded-md pointer-events-none bg-gray-100 p-1 border"><rect x="10" y="10" width="80" height="10" rx="3" fill="#cbd5e1"></rect><rect x="10" y="30" width="40" height="5" rx="2" fill="#e2e8f0"></rect><line x1="10" y1="50" x2="90" y2="50" stroke="#e2e8f0" strokeWidth="2"></line><rect x="10" y="65" width="80" height="8" rx="3" fill="#cbd5e1"></rect><rect x="10" y="80" width="70" height="5" rx="2" fill="#e2e8f0"></rect></svg>
                        <span className="font-semibold text-sm text-gray-800">Minimalista</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Escolha uma Cor de Destaque</label>
                  <div id="color-palette" className="flex gap-3">
                    {['#002e9e', '#0078e8', '#374151', '#065f46'].map(color => (
                        <div key={color}
                             onClick={() => handleStyleChange('color', color)}
                             className={`color-option w-8 h-8 rounded-full cursor-pointer border-4 ${data.style.color === color ? 'border-blue-600' : 'border-white'}`}
                             style={{ backgroundColor: color }}
                             data-color={color}></div>
                    ))}
                  </div>
                </div>
              </>
            );
            break;
          case 1:
            content = (
              <div className="space-y-4">
                <input type="text" placeholder="Nome Completo" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" 
                    value={data.personalInfo.name} 
                    onChange={e => handlePersonalInfoChange('name', capitalizeName(e.target.value))}
                    maxLength={CHAR_LIMITS.personalInfo.name} />
                <input type="text" placeholder="Cargo Desejado" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" 
                    value={data.personalInfo.jobTitle} 
                    onChange={e => handlePersonalInfoChange('jobTitle', e.target.value)}
                    maxLength={CHAR_LIMITS.personalInfo.jobTitle} />
                <input type="email" placeholder="E-mail" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" value={data.personalInfo.email} onChange={e => handlePersonalInfoChange('email', e.target.value)} maxLength={CHAR_LIMITS.personalInfo.email} />
                <input type="tel" placeholder="Telefone" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" value={data.personalInfo.phone} onChange={e => handlePersonalInfoChange('phone', formatPhoneNumber(e.target.value))} maxLength={15} />
                <div className="flex items-center justify-between mt-2">
                    <label htmlFor="show-whatsapp-qr" className="text-sm font-medium text-gray-700 pl-1">Exibir QR Code</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="show-whatsapp-qr" className="sr-only peer" checked={data.style.showQRCode} onChange={e => handleStyleChange('showQRCode', e.target.checked)} />
                        <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-indigo-600 transition-colors duration-200"></div>
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5"></div>
                    </label>
                </div>
                <input type="text" placeholder="Endereço (Ex: Cidade, Bairro)" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" value={data.personalInfo.address} onChange={e => handlePersonalInfoChange('address', e.target.value)} maxLength={CHAR_LIMITS.personalInfo.address} />
                <input type="tel" placeholder="Idade" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" value={data.personalInfo.age} onChange={e => handlePersonalInfoChange('age', e.target.value.replace(/\D/g, '').substring(0, 2))} maxLength={2} />
                <select className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" value={data.personalInfo.maritalStatus} onChange={e => handlePersonalInfoChange('maritalStatus', e.target.value)}>
                  <option value="">Estado Civil</option>
                  {MARITAL_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <select className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900" value={data.personalInfo.cnh} onChange={e => handlePersonalInfoChange('cnh', e.target.value)}>
                  <option value="">CNH</option>
                  {CNH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="mt-4">
                    {!data.personalInfo.profilePicture ? (
                        <label htmlFor="profile-pic-upload" className="inline-flex items-center justify-center gap-2 w-full bg-indigo-100 text-indigo-700 font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-indigo-200 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            Carregar Foto
                        </label>
                    ) : (
                        <div className="flex gap-3">
                            <label htmlFor="profile-pic-upload" className="flex-1 inline-flex items-center justify-center gap-2 w-full bg-indigo-100 text-indigo-700 font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-indigo-200 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
                                Alterar
                            </label>
                            <button type="button" onClick={handleRemoveProfilePic} className="flex-1 inline-flex items-center justify-center gap-2 w-full bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-red-200 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                Remover
                            </button>
                        </div>
                    )}
                    <input type="file" id="profile-pic-upload" accept="image/png, image/jpeg" onChange={handleProfilePicUpload} style={{ display: 'none' }} />
                    <p className="text-xs text-gray-500 mt-1 text-center">PNG ou JPG (Recomendado: 1:1)</p>
                </div>
              </div>
            );
            break;
          case 2:
            content = (
              <>
                <textarea id="summary-textarea" placeholder="Fale sobre sua carreira, objetivos e qualificações..." className="w-full p-2 border rounded-md h-32 bg-white border-gray-300 text-gray-900" 
                    value={data.summary} 
                    onChange={e => setData(prev => ({...prev, summary: e.target.value.substring(0, CHAR_LIMITS.summary)}))}
                    maxLength={CHAR_LIMITS.summary}></textarea>
                <CharacterCounter current={data.summary.length} max={CHAR_LIMITS.summary} />
                
                <div className="mt-4 space-y-4">
                    {SUMMARY_SUGGESTIONS.map((group, index) => (
                        <div key={index}>
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">{group.title}</h4>
                            <div className="flex flex-wrap gap-2">
                                {group.suggestions.map((suggestion, sIndex) => (
                                    <button
                                        key={sIndex}
                                        type="button"
                                        onClick={() => handleAddSummarySuggestion(suggestion)}
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all bg-indigo-100 text-indigo-800 hover:bg-indigo-200 hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span className="text-left">{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button type="button" onClick={handleEnhanceSummary} disabled={aiLoading.summary} className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-full hover:bg-indigo-700 transition-colors disabled:bg-indigo-400">
                    {aiLoading.summary ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>}
                    {aiLoading.summary ? 'Escrevendo...' : 'Aprimorar com IA'}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">Escreva um pouco sobre você e use as sugestões ou a IA para melhorar.</p>
              </>
            );
            break;
          case 3:
            content = (
                <>
                    <div className="mb-6 p-4 border border-dashed rounded-lg bg-indigo-50/50">
                        <h4 className="font-semibold text-gray-800 mb-2">Preenchimento Automático com IA</h4>
                        <p className="text-sm text-gray-600 mb-1">
                            Anexe o PDF da sua Carteira de Trabalho Digital para preencher suas experiências automaticamente.
                        </p>
                         <button type="button" onClick={() => setIsTutorialModalOpen(true)} className="text-xs font-semibold text-indigo-600 hover:underline mb-3">
                            Como baixar o PDF?
                        </button>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <label htmlFor="experience-pdf-upload" className="flex-1 inline-flex items-center justify-center gap-2 w-full bg-indigo-100 text-indigo-700 font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-indigo-200 transition-all text-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                {experiencePdf ? experiencePdf.name : 'Selecionar PDF'}
                            </label>
                             <input 
                                type="file" 
                                id="experience-pdf-upload" 
                                accept="application/pdf"
                                className="hidden"
                                onChange={e => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        setExperiencePdf(e.target.files[0]);
                                    }
                                }}
                            />
                            <button 
                                type="button" 
                                onClick={handleAnalyzeExperiencePdf}
                                disabled={isAnalyzingPdf || !experiencePdf}
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
                            >
                                {isAnalyzingPdf ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-line"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>}
                                {isAnalyzingPdf ? 'Analisando...' : 'Analisar PDF'}
                            </button>
                        </div>
                    </div>
                    <div id="experience-list" className="space-y-4">
                        {data.experiences.map(exp => {
                            const isOpen = openAccordion.experience === exp.id;
                            return (
                                <div key={exp.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-4 flex justify-between items-center cursor-pointer bg-gray-50" onClick={() => handleAccordionToggle('experience', exp.id)}>
                                        <h4 className="font-semibold text-gray-800">{exp.jobTitle || 'Nova Experiência'}</h4>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete({ id: exp.id, type: 'experience' }); }} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                                            <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="p-4 border-t border-gray-200 space-y-3">
                                            <input type="text" placeholder="Cargo" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={exp.jobTitle} onChange={e => updateExperience(exp.id, 'jobTitle', e.target.value)} maxLength={CHAR_LIMITS.experience.jobTitle} />
                                            <input type="text" placeholder="Empresa" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)} maxLength={CHAR_LIMITS.experience.company} />
                                            <input type="text" placeholder="Local (Ex: São Paulo, SP)" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={exp.location} onChange={e => updateExperience(exp.id, 'location', e.target.value)} maxLength={CHAR_LIMITS.experience.location}/>
                                            <div className="flex gap-3">
                                                <input type="text" placeholder="Início (Ex: Jan 2020)" className="w-1/2 p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={exp.startDate} onChange={e => updateExperience(exp.id, 'startDate', e.target.value)} maxLength={CHAR_LIMITS.experience.date} />
                                                <input type="text" placeholder="Fim (Ex: Atual)" className="w-1/2 p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={exp.endDate} onChange={e => updateExperience(exp.id, 'endDate', e.target.value)} maxLength={CHAR_LIMITS.experience.date} />
                                            </div>
                                            <div>
                                                <textarea placeholder="Principais responsabilidades e conquistas..." className="w-full p-2 border rounded-lg h-24 bg-white border-gray-300 text-gray-900" 
                                                    value={exp.description} 
                                                    onChange={e => updateExperience(exp.id, 'description', e.target.value.substring(0, CHAR_LIMITS.experience.description))}
                                                    maxLength={CHAR_LIMITS.experience.description}></textarea>
                                                <CharacterCounter current={exp.description.length} max={CHAR_LIMITS.experience.description} />
                                            </div>
                                            <button type="button" onClick={() => handleEnhanceExperience(exp)} disabled={aiLoading[exp.id]} className="mt-2 w-full flex items-center justify-center gap-2 bg-indigo-100 text-indigo-700 font-semibold py-2 px-4 rounded-full hover:bg-indigo-200 transition-colors text-sm disabled:bg-indigo-50">
                                                {aiLoading[exp.id] ? '...' : 'Escrever com IA'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <button type="button" onClick={addExperience} className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Adicionar mais
                    </button>
                </>
            );
            break;
          case 4:
            content = (
                <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preenchimento Rápido</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {EDUCATION_SHORTCUTS.map(degree => (
                            <button key={degree} type="button" onClick={() => handleEducationShortcut(degree)}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all bg-indigo-100 text-indigo-700 hover:bg-indigo-200`}>
                                {degree}
                            </button>
                        ))}
                    </div>
                    <div id="education-list" className="space-y-4">
                        {data.education.map(edu => {
                            const isOpen = openAccordion.education === edu.id;
                            return (
                                <div key={edu.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-4 flex justify-between items-center cursor-pointer bg-gray-50" onClick={() => handleAccordionToggle('education', edu.id)}>
                                        <h4 className="font-semibold text-gray-800">{edu.degree || 'Nova Formação'}</h4>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete({ id: edu.id, type: 'education' }); }} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                                            <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="p-4 border-t border-gray-200 space-y-3">
                                            <input type="text" placeholder="Curso/Formação" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={edu.degree} onChange={e => updateEducation(edu.id, 'degree', e.target.value)} maxLength={CHAR_LIMITS.education.degree} />
                                            <input type="text" placeholder="Instituição de Ensino" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={edu.institution} onChange={e => updateEducation(edu.id, 'institution', e.target.value)} maxLength={CHAR_LIMITS.education.institution} />
                                            <div className="flex gap-3">
                                                <input type="tel" placeholder="Início (Ex: 2016)" className="w-1/2 p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={edu.startDate} onChange={e => updateEducation(edu.id, 'startDate', e.target.value.replace(/\D/g, '').substring(0, 4))} maxLength={4} />
                                                <input type="tel" placeholder="Fim (Ex: 2020)" className="w-1/2 p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={edu.endDate} onChange={e => updateEducation(edu.id, 'endDate', e.target.value.replace(/\D/g, '').substring(0, 4))} maxLength={4} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                     <button type="button" onClick={addEducation} className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Adicionar mais
                    </button>
                </>
            );
            break;
          case 5:
            content = (
                <>
                    <div id="course-list" className="space-y-4">
                        {data.courses.map(course => {
                            const isOpen = openAccordion.course === course.id;
                            return (
                                <div key={course.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-4 flex justify-between items-center cursor-pointer bg-gray-50" onClick={() => handleAccordionToggle('course', course.id)}>
                                        <h4 className="font-semibold text-gray-800">{course.name || 'Novo Curso'}</h4>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete({ id: course.id, type: 'course' }); }} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                                            <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="p-4 border-t border-gray-200 space-y-3">
                                            <input type="text" placeholder="Nome do Curso" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={course.name} onChange={e => updateCourse(course.id, 'name', e.target.value)} maxLength={CHAR_LIMITS.course.name} />
                                            <input type="text" placeholder="Instituição" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={course.institution} onChange={e => updateCourse(course.id, 'institution', e.target.value)} maxLength={CHAR_LIMITS.course.institution} />
                                            <input type="tel" placeholder="Conclusão (Ex: 2023)" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={course.completionDate} onChange={e => updateCourse(course.id, 'completionDate', e.target.value.replace(/\D/g, '').substring(0, 4))} maxLength={4} />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                     <button type="button" onClick={addCourse} className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Adicionar mais
                    </button>
                </>
            );
            break;
          case 6:
            content = (
                <>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sugestões (clique para adicionar):</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {LANGUAGE_SUGGESTIONS.map(lang => (
                            <button key={lang} type="button" onClick={() => handleAddLanguageSuggestion(lang)}
                                disabled={data.languages.some(l => l.language.toLowerCase() === lang.toLowerCase())}
                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed`}>
                                {lang}
                            </button>
                        ))}
                    </div>
                    <div id="language-list" className="space-y-4">
                        {data.languages.map(lang => {
                            const isOpen = openAccordion.language === lang.id;
                            return (
                                <div key={lang.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-4 flex justify-between items-center cursor-pointer bg-gray-50" onClick={() => handleAccordionToggle('language', lang.id)}>
                                        <h4 className="font-semibold text-gray-800">{lang.language || 'Novo Idioma'}</h4>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete({ id: lang.id, type: 'language' }); }} className="text-gray-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                                            <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </div>
                                    </div>
                                    {isOpen && (
                                        <div className="p-4 border-t border-gray-200 space-y-3">
                                            <input type="text" placeholder="Idioma (Ex: Inglês)" className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={lang.language} onChange={e => updateLanguage(lang.id, 'language', e.target.value)} maxLength={CHAR_LIMITS.language.language} />
                                            <select className="w-full p-2 border rounded-lg bg-white border-gray-300 text-gray-900" value={lang.proficiency} onChange={e => updateLanguage(lang.id, 'proficiency', e.target.value as Language['proficiency'])}>
                                                <option value="">Nível de Proficiência</option>
                                                {PROFICIENCY_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                     <button type="button" onClick={addLanguage} className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        Adicionar mais
                    </button>
                </>
            );
            break;
          case 7:
            content = (
                <>
                    <input type="text" placeholder="Ex: HTML, CSS, Liderança" className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900"
                        value={data.skills.join(', ')}
                        onChange={handleSkillsInputChange} 
                        maxLength={CHAR_LIMITS.skills}
                        />
                    <p className="text-xs text-gray-500 mt-1">Separe as habilidades por vírgula.</p>
                    
                    <div className="mt-4 mb-2">
                      <label className="block text-sm font-medium text-gray-700">Sugestões:</label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {SKILL_SUGGESTIONS.map(skill => (
                            <button key={skill} type="button"
                                onClick={() => handleAddSkill(skill)}
                                disabled={data.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase())}
                                className="py-1 px-3 rounded-full text-xs font-medium transition-all bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                {skill}
                            </button>
                        ))}
                    </div>

                    {aiSkillSuggestions.length > 0 && (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">Sugestões da IA (clique para adicionar):</label>
                        <div className="flex flex-wrap gap-2">
                            {aiSkillSuggestions.map(skill => (
                                <button key={skill} type="button"
                                    onClick={() => handleAddSkill(skill)}
                                    disabled={data.skills.map(s => s.toLowerCase()).includes(skill.toLowerCase())}
                                    className="py-1 px-3 rounded-full text-xs font-medium transition-all bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {skill}
                                </button>
                            ))}
                        </div>
                      </>
                    )}

                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        {aiSkillSuggestions.length > 0 && (
                            <button 
                                type="button" 
                                onClick={handleSuggestSkills} 
                                disabled={aiLoading.skills || !data.personalInfo.jobTitle}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm"
                                title={!data.personalInfo.jobTitle ? "Preencha o seu Cargo Desejado primeiro" : "Buscar novas sugestões"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                                Atualizar
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={handleSuggestSkills} 
                            disabled={aiLoading.skills || !data.personalInfo.jobTitle}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-full hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                            title={!data.personalInfo.jobTitle ? "Preencha o seu Cargo Desejado primeiro" : "Sugerir habilidades com Inteligência Artificial"}
                        >
                            {aiLoading.skills ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                            )}
                            {aiSkillSuggestions.length > 0 ? 'Sugerir Mais' : 'Sugerir com IA'}
                        </button>
                    </div>
                </>
            );
            break;
          default:
            content = null;
        }
        return <div key={index} ref={el => { if(el) stepRefs.current[index] = el }} className={`wizard-step p-4 ${currentStep === index ? 'step-active' : ''}`}>{content}</div>
    });
  };

  const getFinalButtonText = () => {
    if (hasPaidInSession) return "Baixar Novamente";
    if (isEditing) return "Pagar R$2,50 e Baixar";
    return "Pagar R$5,00 e Baixar";
  };

  return (
    <React.Fragment>
      {isTutorialModalOpen && (
          <div 
              role="dialog" 
              aria-modal="true" 
              aria-labelledby="tutorial-title"
              className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" 
              onClick={() => setIsTutorialModalOpen(false)}
          >
              <div 
                  className="bg-white rounded-lg shadow-xl w-full max-w-lg transform animate-fade-in-scale" 
                  onClick={e => e.stopPropagation()}
              >
                  <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                      <h3 id="tutorial-title" className="text-xl font-bold gradient-text">Como Baixar seu Histórico de Trabalho</h3>
                      <button 
                          onClick={() => setIsTutorialModalOpen(false)} 
                          className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
                          aria-label="Fechar"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                  </div>
                  
                  <div className="p-6">
                      <ol className="space-y-5 text-gray-700">
                          <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</div>
                              <p className="font-medium text-gray-800 pt-1">Abra o App "Carteira de Trabalho Digital".</p>
                          </li>
                          <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</div>
                              <p className="font-medium text-gray-800 pt-1">Na tela inicial, toque em <strong className="font-bold">"Enviar Carteira de Trabalho Digital"</strong>.</p>
                          </li>
                          <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</div>
                              <p className="font-medium text-gray-800 pt-1">Selecione os contratos de trabalho que deseja usar.</p>
                          </li>
                          <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">4</div>
                              <p className="font-medium text-gray-800 pt-1">Toque no ícone de <strong className="font-bold">PDF</strong> no canto inferior direito.</p>
                          </li>
                          <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">5</div>
                              <p className="font-medium text-gray-800 pt-1">Salve o arquivo PDF no seu celular ou computador.</p>
                          </li>
                          <li className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">6</div>
                              <p className="font-medium text-gray-800 pt-1">Anexe o arquivo salvo aqui.</p>
                          </li>
                      </ol>
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-right rounded-b-lg">
                      <button 
                          onClick={() => setIsTutorialModalOpen(false)}
                          className="btn-primary text-white font-semibold py-2 px-6 rounded-full"
                      >
                          Entendi
                      </button>
                  </div>
              </div>
          </div>
      )}
      <div id="form-wizard" style={{scrollMarginTop: '9rem'}} className="w-full lg:w-1/3 bg-white p-6 rounded-lg shadow-md form-container">
        {!isFinished && (
          <div id="wizard-header" className="mb-4 text-center">
            <p id="wizard-step-info" className="text-sm font-medium text-gray-500 mb-1">
              Passo {currentStep + 1} de {WIZARD_STEPS.length}
            </p>
            <h3 id="wizard-step-title" className="gradient-text text-xl font-bold">
              {WIZARD_STEPS[currentStep]}
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div id="wizard-progress-bar" className="btn-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}></div>
            </div>
          </div>
        )}

        <div className="flex-grow flex flex-col overflow-hidden">
          {isFinished ? (
                <div className="text-center p-8 flex flex-col justify-center items-center flex-grow">
                  <svg className="w-24 h-24 text-green-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <h3 className="text-2xl font-bold text-gray-800 mt-6">Seu currículo está pronto!</h3>
                  <p className="text-gray-600 mt-2">Pague a taxa para fazer o download do seu PDF.</p>
              </div>
          ) : (
            <div id="wizard-steps-container" ref={stepsContainerRef}>
                {renderStepContent()}
            </div>
          )}
        </div>

        <div id="wizard-nav" className="mt-auto flex justify-between gap-4 p-6">
          <button type="button" onClick={handlePrev} disabled={currentStep === 0 && !isFinished} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-full hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isFinished ? 'Voltar' : 'Anterior'}
          </button>
          {isFinished ? (
               <button type="button" onClick={onRequestPayment} disabled={isPaymentProcessing} className="btn-primary text-white font-semibold py-2 px-4 rounded-full transition-all flex-grow flex items-center justify-center gap-2">
                  {isPaymentProcessing ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                      hasPaidInSession 
                          ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  )}
                  {isPaymentProcessing ? 'Processando...' : getFinalButtonText()}
              </button>
          ) : (
              <button type="button" onClick={handleNext} className="btn-primary text-white font-semibold py-2 px-4 rounded-full transition-all flex-grow">
                {(isDemoMode && currentStep === 0) ? 'Começar' : (currentStep === WIZARD_STEPS.length - 1 ? 'Concluir' : 'Próximo')}
              </button>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

export default ResumeForm;
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import QRCodeComponent from './QRCode';
import type { ResumeData } from '../types';

interface ResumePreviewProps {
    data: ResumeData;
    isDemoMode: boolean;
    isFirstPage?: boolean;
    isMeasurement?: boolean;
    isPrint?: boolean;
    hideEmptySections?: boolean;
}

export interface ResumePreviewRef {
    getElement: () => HTMLDivElement | null;
}

const ResumePreview = forwardRef<ResumePreviewRef, ResumePreviewProps>(({ data, isDemoMode, isFirstPage = true, isMeasurement = false, isPrint = false, hideEmptySections = false }, ref) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    useImperativeHandle(ref, () => ({
        getElement: () => previewRef.current,
    }));

    useEffect(() => {
      if (isMeasurement) {
          setIsReady(true);
          return;
      }
      
      const timer = setTimeout(() => {
        setIsReady(true);
      }, isPrint ? 1000 : 500); 

      return () => clearTimeout(timer);
    }, [isMeasurement, isPrint, data]);


    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        if (dateString.toLowerCase() === 'atual') return 'Atual';
        try {
            const [year, month] = dateString.split('-');
            if (!year || !month) return dateString;
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    const ModernTemplate: React.FC = () => {
        const isRestricted = (blockId: string) => {
            return (data as any).restrictedBlockIds?.includes(blockId);
        };

        return (
            <div className={`font-sans text-gray-800 h-full bg-white relative ${isMeasurement ? 'overflow-hidden' : ''}`}>
                {isFirstPage && (
                    <header className="bg-gray-100 p-8 flex items-center border-b-4 border-blue-500" style={{ borderColor: data.style.color }}>
                        {data.personalInfo.profilePicture && (
                            <img
                                src={data.personalInfo.profilePicture}
                                alt="Foto de Perfil"
                                className="w-24 h-24 rounded-full mr-6 object-cover border-2 border-white shadow-md"
                                style={{ borderColor: data.style.color }}
                            />
                        )}
                        <div className="flex-grow">
                            <h1 className="text-3xl font-extrabold uppercase tracking-wide" style={{ color: data.style.color }}>{data.personalInfo.name}</h1>
                            <p className="text-lg font-semibold text-gray-600 mt-1">{data.personalInfo.jobTitle}</p>
                        </div>
                    </header>
                 )}

                <main className={`p-8 relative ${!isFirstPage ? 'pt-8' : ''}`}>
                    {isFirstPage && (
                        <section className="mb-6 flex flex-wrap text-sm text-gray-600 border-b border-gray-200 pb-6">
                            {data.personalInfo.email && (
                                <div className="flex items-center mr-4 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    {data.personalInfo.email}
                                </div>
                            )}
                            {data.personalInfo.phone && (
                                <div className="flex items-center mr-4 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-3a15.3 15.3 0 01-6-6z" /></svg>
                                    {data.personalInfo.phone}
                                </div>
                            )}
                            {data.personalInfo.address && (
                                <div className="flex items-center mr-4 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {data.personalInfo.address}
                                </div>
                            )}
                             {data.personalInfo.linkedin && (
                                <div className="flex items-center mr-4 mb-2">
                                   <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    {data.personalInfo.linkedin.replace(/(https?:\/\/)?(www\.)?linkedin\.com\/in\//, '')}
                                </div>
                            )}
                             {(data.personalInfo.age || data.personalInfo.maritalStatus || data.personalInfo.cnh) && (
                                <div className="flex items-center mr-4 mb-2 text-gray-500">
                                    <span>
                                        {data.personalInfo.age && `${data.personalInfo.age} anos`}
                                        {data.personalInfo.age && data.personalInfo.maritalStatus && ' | '}
                                        {data.personalInfo.maritalStatus}
                                        {(data.personalInfo.age || data.personalInfo.maritalStatus) && data.personalInfo.cnh && ' | '}
                                        {data.personalInfo.cnh && `CNH: ${data.personalInfo.cnh}`}
                                    </span>
                                </div>
                            )}
                        </section>
                    )}

                    {data.summary && (
                        <section id="summary-section" className={`mb-6 ${hideEmptySections && !data.summary ? 'hidden' : ''}`}>
                            <h2 className="section-title text-xl font-bold text-gray-800 mb-3 border-b-2 border-blue-500 pb-2" style={{ color: data.style.color, borderColor: data.style.color }}>Resumo Profissional</h2>
                            <p className="text-gray-700 leading-relaxed text-justify">{data.summary}</p>
                        </section>
                    )}

                    {data.experiences.length > 0 && (
                        <section id="experience-section" className={`mb-6 ${hideEmptySections && data.experiences.length === 0 ? 'hidden' : ''}`}>
                            <h2 className="section-title text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2" style={{ color: data.style.color, borderColor: data.style.color }}>Experiência Profissional</h2>
                             <div id="resume-experience-list" className="space-y-5">
                                {data.experiences.map((exp) => (
                                    <div key={exp.id} className={`relative ${isRestricted(exp.id) ? 'break-inside-avoid' : ''}`}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-lg font-bold text-gray-800" style={{ color: data.style.color }}>{exp.jobTitle}</h3>
                                            <span className="text-sm text-gray-600 font-medium whitespace-nowrap ml-4">
                                                {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-sm text-gray-600 mb-2">
                                             <span className="font-semibold mr-2">{exp.company}</span>
                                             {exp.location && (
                                                 <>
                                                     <span>|</span>
                                                     <span className="ml-2">{exp.location}</span>
                                                 </>
                                             )}
                                        </div>
                                        {exp.description && <p className="text-gray-700 text-sm leading-relaxed text-justify whitespace-pre-line">{exp.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {data.education.length > 0 && (
                        <section id="education-section" className={`mb-6 ${hideEmptySections && data.education.length === 0 ? 'hidden' : ''}`}>
                            <h2 className="section-title text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2" style={{ color: data.style.color, borderColor: data.style.color }}>Formação Acadêmica</h2>
                            <div id="resume-education-list" className="space-y-4">
                                {data.education.map((edu) => (
                                    <div key={edu.id} className={`relative ${isRestricted(edu.id) ? 'break-inside-avoid' : ''}`}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="text-lg font-bold text-gray-800" style={{ color: data.style.color }}>{edu.degree}</h3>
                                            <span className="text-sm text-gray-600 font-medium whitespace-nowrap ml-4">
                                                {edu.startDate} - {edu.endDate}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 font-medium">{edu.institution}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                    
                    {data.courses.length > 0 && (
                        <section id="courses-section" className={`mb-6 ${hideEmptySections && data.courses.length === 0 ? 'hidden' : ''}`}>
                             <h2 className="section-title text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2" style={{ color: data.style.color, borderColor: data.style.color }}>Cursos e Certificações</h2>
                             <div id="resume-courses-list" className="space-y-3">
                                {data.courses.map((course) => (
                                    <div key={course.id} className={`relative flex justify-between items-baseline ${isRestricted(course.id) ? 'break-inside-avoid' : ''}`}>
                                        <div>
                                             <h3 className="text-base font-bold text-gray-800" style={{ color: data.style.color }}>{course.name}</h3>
                                             <p className="text-sm text-gray-600">{course.institution}</p>
                                        </div>
                                        <span className="text-sm text-gray-600 font-medium whitespace-nowrap ml-4">{course.completionDate}</span>
                                    </div>
                                ))}
                             </div>
                        </section>
                    )}

                    {data.languages.length > 0 && (
                        <section id="languages-section" className={`mb-6 ${hideEmptySections && data.languages.length === 0 ? 'hidden' : ''}`}>
                            <h2 className="section-title text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2" style={{ color: data.style.color, borderColor: data.style.color }}>Idiomas</h2>
                            <div id="resume-languages-list" className="grid grid-cols-2 gap-y-2 gap-x-4">
                                {data.languages.map((lang) => (
                                    <div key={lang.id} className="flex justify-between items-center border-b border-gray-100 pb-1">
                                        <span className="text-gray-800 font-medium">{lang.language}</span>
                                        <span className="text-sm text-gray-600">{lang.proficiency}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {data.skills.length > 0 && (
                        <section id="skills-section" className={`mb-6 ${hideEmptySections && data.skills.length === 0 ? 'hidden' : ''}`}>
                             <h2 className="section-title text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2" style={{ color: data.style.color, borderColor: data.style.color }}>Habilidades e Competências</h2>
                             <div id="resume-skills" className="flex flex-wrap gap-2">
                                {data.skills.map((skill, index) => (
                                    <span 
                                        key={index}
                                        className="bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg"
                                        style={{ display: 'inline-block' }} 
                                    >
                                        {skill}
                                    </span>
                                ))}
                             </div>
                        </section>
                    )}
                </main>
                
                 {/* QR Code Usando Componente Existente do Projeto */}
                 {isFirstPage && (
                    <QRCodeComponent 
                        phone={data.personalInfo.phone} 
                        show={data.style.showQRCode} 
                        linkedin={data.personalInfo.linkedin} 
                        showLinkedin={data.style.showLinkedinQr} 
                    />
                )}
            </div>
        );
    };

    // Placeholder for other templates if they were implemented
    const ClassicTemplate: React.FC = () => <div className="p-8 text-center">Template Clássico (Em desenvolvimento)</div>;
    const MinimalistTemplate: React.FC = () => <div className="p-8 text-center">Template Minimalista (Em desenvolvimento)</div>;

    let TemplateComponent = ModernTemplate;
    if (data.style.template === 'template-classic') TemplateComponent = ClassicTemplate;
    if (data.style.template === 'template-minimalist') TemplateComponent = MinimalistTemplate;

    return (
        <div 
            ref={previewRef} 
            className={`resume-preview-container bg-gray-200 mx-auto rounded-lg shadow-2xl overflow-hidden origin-top ${!isReady && !isMeasurement ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            style={{ 
                width: '210mm', 
                minHeight: '297mm',
                height: isPrint ? '297mm' : 'auto',
                transform: isMeasurement ? 'scale(1)' : undefined 
            }}
        >
            <TemplateComponent />
            {isDemoMode && !isPrint && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <p className="text-4xl font-bold text-gray-300 opacity-20 transform -rotate-45 select-none">PREVISÃO DE DEMONSTRAÇÃO</p>
                </div>
            )}
        </div>
    );
});

export default ResumePreview;

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

const CollapsedPlaceholder = ({ label }: { label: string }) => (
    <div className="w-full py-1.5 my-1 border border-dashed border-gray-300 rounded bg-gray-50/50 flex items-center justify-center select-none group hover:bg-gray-100 transition-colors">
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider group-hover:text-gray-500">
            {label} (Vazio)
        </span>
    </div>
);

interface ResumePreviewProps {
  data: PageData;
  isDemoMode?: boolean;
  isFirstPage?: boolean;
  isMeasurement?: boolean;
  hideEmptySections?: boolean;
  isPrint?: boolean;
  enableProtection?: boolean;
  contentScale?: number;
  scale?: number; // NOVA PROP: Escala da tela (responsividade)
}

const ResumePreview = forwardRef<any, ResumePreviewProps>(({ 
    data, 
    isDemoMode, 
    isFirstPage, 
    isMeasurement, 
    hideEmptySections, 
    isPrint, 
    enableProtection = false, 
    contentScale = 1,
    scale = 1 // Valor padrão 1 (tamanho real)
}, ref) => {
  const safeData = data || {};
  const { personalInfo, summary, experiences, education, courses, languages, skills = [], style, qrCodeOffsets } = safeData;
  
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [safeProfilePic, setSafeProfilePic] = useState<string | null>(null);
  const [isHidingContent, setIsHidingContent] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);

  useImperativeHandle(ref, () => ({
    getElement: () => previewRef.current,
  }));

  useEffect(() => {
    if (style?.color) {
        document.documentElement.style.setProperty('--theme-color', style.color);
    }
  }, [style?.color]);

  useEffect(() => {
    const processProfilePic = async () => {
        if (!personalInfo?.profilePicture) {
            setSafeProfilePic(null);
            return;
        }

        if (personalInfo.profilePicture.startsWith('data:')) {
            setSafeProfilePic(personalInfo.profilePicture);
            return;
        }

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
            setSafeProfilePic(personalInfo.profilePicture);
        }
    };

    processProfilePic();
  }, [personalInfo?.profilePicture]);

  useEffect(() => {
    if (!enableProtection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4'))) {
            setIsHidingContent(true);
            setTimeout(() => {
                alert("A captura de tela está desabilitada nesta versão.");
                setIsHidingContent(false);
            }, 500); 
        }
    };

    const handleBlur = () => {
        setIsBlurred(true);
    };

    const handleFocus = () => {
        setIsBlurred(false);
    };

    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
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
  
  // @ts-ignore
  const configSpacer = qrPosition.overrideSpacer || QR_CONFIG.spacer;

  const hasWhatsapp = !!personalInfo?.phone && !!style?.showQRCode;
  const hasLinkedin = !!personalInfo?.linkedin && (style?.showLinkedinQr ?? true);
  
  const activeQrCount = (hasWhatsapp ? 1 : 0) + (hasLinkedin ? 1 : 0);

  const dynamicWidth = activeQrCount === 1 ? 130 : configSpacer.width;

  const activeSpacer = {
      width: dynamicWidth,
      height: configSpacer.height
  };
  
  const getLocalSpacer = (itemId: string) => {
      if (qrCodeOffsets && qrCodeOffsets[itemId] !== undefined) {
          const marginTop = qrCodeOffsets[itemId];
          return (
              <div 
                key={`spacer-${itemId}`}
                style={{ 
                    float: 'right', 
                    clear: 'right',
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

  const hasSummary = summary && summary.trim().length > 0;
  const hasExperiences = experiences && experiences.length > 0;
  const hasEducation = education && education.length > 0;
  const hasCourses = courses && courses.length > 0;
  const hasLanguages = languages && languages.length > 0;
  const hasSkills = processedSkills && processedSkills.length > 0;

  const isModern = style?.template === 'template-modern';

  const hasActivePhoto = !!safeProfilePic || !!personalInfo?.profilePicture;
  
  const headerNameWidthStyle = (hasActivePhoto && isModern) 
      ? { maxWidth: 'calc(100% - 170px)' } 
      : { maxWidth: '100%' };

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
      (isBlurred && enableProtection) ? 'blur-xl transition-all duration-300' : 'transition-all duration-300',
  ].filter(Boolean).join(' ');

  const showQR = style?.showQRCode || style?.showLinkedinQr;

  // CÁLCULO DA ESCALA FINAL COMBINADA
  // Multiplicamos a escala da tela (responsividade) pela escala do conteúdo (smart shrink)
  const finalScale = scale * contentScale;

  return (
    <div 
        id="resume-preview" 
        ref={previewRef} 
        className={containerClasses}
        style={{ 
            // APLICAÇÃO DA ESCALA UNIFICADA
            transform: finalScale !== 1 ? `scale(${finalScale})` : undefined, 
            transformOrigin: 'top left',
            // Força largura fixa para garantir que o layout interno (A4) não quebre
            width: '794px',
            minWidth: '794px',
            // Se for impressão, altura fixa. Se não, altura controlada pelo wrapper no App.tsx
            height: isPrint ? '1123px' : undefined 
        }}
    >
      
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
                {hasActivePhoto && <img id="profile-pic-img" src={safeProfilePic || personalInfo.profilePicture || ''} alt="Foto de Perfil" />}
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

        {isFirstPage && showQR && (
            <div 
                className="phantom-spacer"
                style={{
                    width: '100%',
                    height: `${activeSpacer.height + (qrPosition.bottom || 0) + (qrPosition.safetyPadding || 0)}px`,
                    clear: 'both', 
                    visibility: 'hidden', 
                    pointerEvents: 'none', 
                    display: 'block' 
                }}
            />
        )}
        
      </main>
      
      {isFirstPage && personalInfo && showQR && (
          <div style={{
              position: 'absolute',
              bottom: `${qrPosition.bottom}px`,
              right: `${qrPosition.right}px`,
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

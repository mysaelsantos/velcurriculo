import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import type { ResumeData } from '../types';
import QRCode from './QRCode';

interface ResumePreviewProps {
  data: ResumeData;
  isDemoMode: boolean;
  isFirstPage?: boolean;
  hideEmptySections?: boolean;
  isMeasurement?: boolean;
  isPrint?: boolean; 
}

export interface ResumePreviewRef {
  getElement: () => HTMLDivElement | null;
}

const ResumePreview = forwardRef<ResumePreviewRef, ResumePreviewProps>(({ data, isDemoMode, isFirstPage = true, hideEmptySections = false, isMeasurement = false, isPrint = false }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getElement: () => containerRef.current
  }));

  const { personalInfo, style } = data;
  const { template, color } = style;

  // Corrigido para garantir espaçamento consistente
  const renderSectionTitle = (title: string) => {
    switch (template) {
      case 'template-modern':
        return (
          <h3 className="text-xl font-bold uppercase mb-3 border-b-2 pb-1" style={{ color: color, borderColor: color }}>
            {title}
          </h3>
        );
      case 'template-minimalist':
        return (
          // Adicionado mt-6 para aumentar o espaço acima do título no template minimalista
          // Mantido mb-4 para espaço abaixo
          <h3 className="text-lg font-medium tracking-wide uppercase mb-4 mt-6" style={{ color: '#374151' }}>
            {title}
          </h3>
        );
      default: // Classic
        return (
          <h3 className="text-xl font-bold mb-3 pb-1 border-b" style={{ color: color, borderColor: '#e5e7eb' }}>
            {title}
          </h3>
        );
    }
  };

  const hasData = (section: any[]) => {
      if (!section) return false;
      return section.length > 0;
  }

  const showSection = (sectionData: any[] | string, sectionName: string) => {
      // Se for modo de medição ou impressão e tivermos a flag para esconder vazios
      if ((isMeasurement || isPrint || hideEmptySections) && (!sectionData || (Array.isArray(sectionData) && sectionData.length === 0) || (typeof sectionData === 'string' && !sectionData.trim()))) {
          return false;
      }
      // Se for o modo de edição na tela (não print/medição), SEMPRE mostramos os placeholders para guiar o usuário
      return true;
  };

  const getBlurClass = (text: string) => {
      return isDemoMode && !text ? 'blur-sm select-none opacity-50' : '';
  };

  const getPlaceholderText = (field: string, placeholder: string) => {
      if (isDemoMode && !field) return placeholder;
      return field || '';
  };

  return (
    <div ref={containerRef} className={`bg-white shadow-lg mx-auto overflow-hidden relative text-left ${template}`} style={{ width: '794px', minHeight: '1123px', transformOrigin: 'top left' }}>
      
      {/* Header */}
      {isFirstPage && (
          <header className={`p-8 ${template === 'template-modern' ? 'text-white' : 'text-gray-800'}`} style={{ backgroundColor: template === 'template-modern' ? color : 'white' }}>
            <div className="flex justify-between items-start">
              <div className="flex-grow pr-4">
                <h1 className={`text-4xl font-bold mb-2 ${getBlurClass(personalInfo.name)}`} style={{ color: template === 'template-modern' ? 'white' : color }}>
                  {getPlaceholderText(personalInfo.name, "Seu Nome Completo")}
                </h1>
                <h2 className={`text-xl ${template === 'template-modern' ? 'text-blue-100' : 'text-gray-600'} mb-4 font-medium ${getBlurClass(personalInfo.jobTitle)}`}>
                  {getPlaceholderText(personalInfo.jobTitle, "Seu Cargo Desejado")}
                </h2>
                
                <div className={`text-sm space-y-1 ${template === 'template-modern' ? 'text-blue-50' : 'text-gray-600'}`}>
                   {(showSection(personalInfo.email, 'email') || showSection(personalInfo.phone, 'phone')) && (
                      <p className="flex items-center gap-2">
                        {personalInfo.email && <span>{personalInfo.email}</span>}
                        {personalInfo.email && personalInfo.phone && <span>|</span>}
                        {personalInfo.phone && <span>{personalInfo.phone}</span>}
                      </p>
                   )}
                   {(showSection(personalInfo.address, 'address') || showSection(personalInfo.age, 'age')) && (
                      <p className="flex items-center gap-2">
                        {personalInfo.address && <span>{personalInfo.address}</span>}
                        {personalInfo.address && (personalInfo.age || personalInfo.maritalStatus) && <span>|</span>}
                        {personalInfo.age && <span>{personalInfo.age} anos</span>}
                        {personalInfo.age && personalInfo.maritalStatus && <span>|</span>}
                        {personalInfo.maritalStatus && <span>{personalInfo.maritalStatus}</span>}
                      </p>
                   )}
                   {(personalInfo.linkedin || personalInfo.cnh) && (
                       <p className="flex items-center gap-2">
                           {personalInfo.linkedin && <span>{personalInfo.linkedin.replace(/^https?:\/\//, '')}</span>}
                           {personalInfo.linkedin && personalInfo.cnh && personalInfo.cnh !== 'Não possuo' && <span>|</span>}
                           {personalInfo.cnh && personalInfo.cnh !== 'Não possuo' && <span>CNH: {personalInfo.cnh}</span>}
                       </p>
                   )}
                </div>
              </div>

              {/* QR Codes and Photo */}
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                 {personalInfo.profilePicture && (
                    <img 
                      src={personalInfo.profilePicture} 
                      alt="Foto de Perfil" 
                      className={`w-24 h-24 object-cover rounded-full border-2 ${template === 'template-modern' ? 'border-white' : 'border-gray-200'}`}
                    />
                 )}
                 <div className="flex gap-3">
                    {style.showQRCode && personalInfo.phone && (
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-1 rounded">
                                <QRCode value={`https://wa.me/55${personalInfo.phone.replace(/\D/g, '')}`} size={56} />
                            </div>
                            <span className={`text-[10px] mt-1 ${template === 'template-modern' ? 'text-white' : 'text-gray-500'}`}>WhatsApp</span>
                        </div>
                    )}
                    {style.showLinkedinQr && personalInfo.linkedin && (
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-1 rounded">
                                <QRCode value={personalInfo.linkedin} size={56} />
                            </div>
                            <span className={`text-[10px] mt-1 ${template === 'template-modern' ? 'text-white' : 'text-gray-500'}`}>LinkedIn</span>
                        </div>
                    )}
                 </div>
              </div>
            </div>
          </header>
      )}

      {/* Main Content - Adicionado mt-8 especificamente para o template minimalista para afastar da linha/header */}
      <main className={`p-8 ${template === 'template-minimalist' ? 'mt-4' : ''}`}>
        
        {/* Linha Divisória Minimalista - Ajustada a margem top e bottom */}
        {template === 'template-minimalist' && isFirstPage && (
            <hr className="border-t-2 border-gray-200 mb-8 mt-2" />
        )}

        {/* Summary Section */}
        {showSection(data.summary, 'summary') && (data.summary || isDemoMode) && (
            <section className="mb-6" id="summary-section">
                {renderSectionTitle("Resumo Profissional")}
                <p className={`text-gray-700 leading-relaxed text-sm text-justify ${getBlurClass(data.summary)}`}>
                    {getPlaceholderText(data.summary, "Seu resumo profissional aparecerá aqui. Descreva suas principais qualificações e objetivos de carreira.")}
                </p>
            </section>
        )}

        {/* Experience Section */}
        {showSection(data.experiences, 'experiences') && (
            <section className="mb-6" id="experience-section">
                {renderSectionTitle("Experiência Profissional")}
                <div className="space-y-4" id="resume-experience-list">
                    {hasData(data.experiences) ? (
                        data.experiences.map((exp) => (
                            <div key={exp.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-gray-800">{exp.jobTitle}</h4>
                                    <span className="text-sm text-gray-600 whitespace-nowrap ml-4">
                                        {exp.startDate} {exp.endDate && `- ${exp.endDate}`}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-gray-700 mb-1">
                                    {exp.company}{exp.location && ` | ${exp.location}`}
                                </div>
                                {exp.description && (
                                    <p className="text-sm text-gray-600 whitespace-pre-line text-justify leading-relaxed">
                                        {exp.description}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : isDemoMode && (
                        <div className={`p-4 border border-dashed border-gray-300 rounded text-center text-gray-400 text-sm ${getBlurClass('')}`}>
                            Sua experiência profissional aparecerá aqui.
                        </div>
                    )}
                </div>
            </section>
        )}

        {/* Education Section */}
        {showSection(data.education, 'education') && (
            <section className="mb-6" id="education-section">
                {renderSectionTitle("Formação Acadêmica")}
                <div className="space-y-3" id="resume-education-list">
                    {hasData(data.education) ? (
                        data.education.map((edu) => (
                            <div key={edu.id} className="break-inside-avoid">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="font-bold text-gray-800">{edu.degree}</h4>
                                    <span className="text-sm text-gray-600 whitespace-nowrap ml-4">
                                        {edu.startDate} {edu.endDate && `- ${edu.endDate}`}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">{edu.institution}</p>
                            </div>
                        ))
                    ) : isDemoMode && (
                        <div className={`p-4 border border-dashed border-gray-300 rounded text-center text-gray-400 text-sm ${getBlurClass('')}`}>
                            Sua formação acadêmica aparecerá aqui.
                        </div>
                    )}
                </div>
            </section>
        )}

        {/* Courses Section */}
        {showSection(data.courses, 'courses') && (
            <section className="mb-6" id="courses-section">
                {renderSectionTitle("Cursos Complementares")}
                <div className="space-y-2" id="resume-courses-list">
                    {hasData(data.courses) ? (
                        data.courses.map((course) => (
                            <div key={course.id} className="flex justify-between text-sm break-inside-avoid">
                                <div>
                                    <span className="font-semibold text-gray-800">{course.name}</span>
                                    {course.institution && <span className="text-gray-600"> - {course.institution}</span>}
                                </div>
                                {course.completionDate && <span className="text-gray-600 whitespace-nowrap ml-4">{course.completionDate}</span>}
                            </div>
                        ))
                    ) : isDemoMode && (
                        <div className={`p-4 border border-dashed border-gray-300 rounded text-center text-gray-400 text-sm ${getBlurClass('')}`}>
                            Seus cursos aparecerão aqui.
                        </div>
                    )}
                </div>
            </section>
        )}

        {/* Two Columns for Languages and Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showSection(data.languages, 'languages') && (
                <section id="languages-section">
                    {renderSectionTitle("Idiomas")}
                    <div id="resume-languages-list">
                      {hasData(data.languages) ? (
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                              {data.languages.map((lang) => (
                                  <li key={lang.id}>
                                      <span className="font-medium">{lang.language}</span>
                                      {lang.proficiency && <span className="text-gray-500"> - {lang.proficiency}</span>}
                                  </li>
                              ))}
                          </ul>
                      ) : isDemoMode && (
                          <div className={`p-4 border border-dashed border-gray-300 rounded text-center text-gray-400 text-sm ${getBlurClass('')}`}>
                              Seus idiomas.
                          </div>
                      )}
                    </div>
                </section>
            )}

            {showSection(data.skills, 'skills') && (
                <section id="skills-section">
                    {renderSectionTitle("Habilidades")}
                    <div id="resume-skills">
                        {hasData(data.skills) ? (
                            <div className="flex flex-wrap gap-2">
                                {data.skills.map((skill, index) => (
                                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        ) : isDemoMode && (
                            <div className={`p-4 border border-dashed border-gray-300 rounded text-center text-gray-400 text-sm ${getBlurClass('')}`}>
                                Suas habilidades.
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
      </main>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';

export default ResumePreview;

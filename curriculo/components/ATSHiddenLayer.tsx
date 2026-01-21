import React from 'react';
import type { ResumeData } from '../types';

/**
 * Camada ATS Invisível
 * 
 * Este componente injeta todo o conteúdo do currículo em texto puro,
 * formatado de forma estruturada para ser lido pelos robôs ATS.
 * 
 * O texto é renderizado em cor branca com fonte de 1px, tornando-o
 * invisível para humanos mas legível para parsers de texto de PDF.
 */
const ATSHiddenLayer = ({ data }: { data: Partial<ResumeData> }) => {
    const { personalInfo, summary, experiences, education, courses, languages, skills } = data;

    // Formata as experiências em texto estruturado
    const formatExperiences = () => {
        if (!experiences || experiences.length === 0) return '';
        return experiences.map(exp =>
            `${exp.jobTitle || ''} na empresa ${exp.company || ''} ${exp.location ? `em ${exp.location}` : ''} de ${exp.startDate || ''} até ${exp.endDate || 'Atual'}. ${exp.description || ''}`
        ).join(' ');
    };

    // Formata a educação em texto estruturado
    const formatEducation = () => {
        if (!education || education.length === 0) return '';
        return education.map(edu =>
            `${edu.degree || ''} na instituição ${edu.institution || ''} de ${edu.startDate || ''} até ${edu.endDate || ''}`
        ).join(' ');
    };

    // Formata os cursos em texto estruturado
    const formatCourses = () => {
        if (!courses || courses.length === 0) return '';
        return courses.map(course =>
            `${course.name || ''} na instituição ${course.institution || ''} ${course.year ? `em ${course.year}` : ''}`
        ).join(' ');
    };

    // Formata os idiomas em texto estruturado
    const formatLanguages = () => {
        if (!languages || languages.length === 0) return '';
        return languages.map(lang =>
            `${lang.language || ''} nível ${lang.proficiency || ''}`
        ).join(', ');
    };

    // Formata as habilidades em texto estruturado
    const formatSkills = () => {
        if (!skills || skills.length === 0) return '';
        return skills.join(', ');
    };

    // Monta o texto completo ATS-friendly
    const atsText = `
        DADOS PESSOAIS:
        Nome Completo: ${personalInfo?.name || ''}
        Cargo Pretendido: ${personalInfo?.jobTitle || ''}
        Email: ${personalInfo?.email || ''}
        Telefone: ${personalInfo?.phone || ''}
        Endereço: ${personalInfo?.address || ''}
        Idade: ${personalInfo?.age || ''}
        Estado Civil: ${personalInfo?.maritalStatus || ''}
        CNH: ${personalInfo?.cnh || ''}
        LinkedIn: ${personalInfo?.linkedin || ''}
        
        RESUMO PROFISSIONAL:
        ${summary || ''}
        
        EXPERIÊNCIA PROFISSIONAL:
        ${formatExperiences()}
        
        FORMAÇÃO ACADÊMICA:
        ${formatEducation()}
        
        CURSOS E CERTIFICAÇÕES:
        ${formatCourses()}
        
        IDIOMAS:
        ${formatLanguages()}
        
        HABILIDADES E COMPETÊNCIAS:
        ${formatSkills()}
    `.replace(/\s+/g, ' ').trim(); // Remove espaços extras

    return (
        <div
            aria-hidden="true"
            data-ats-layer="true"
            style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                height: '1px',
                overflow: 'hidden',
                color: '#FFFFFF',           // Texto branco (invisível)
                backgroundColor: 'transparent',
                fontSize: '1px',            // Tamanho mínimo mas ainda legível por parsers
                lineHeight: '1px',
                letterSpacing: '0px',
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: -1,
                opacity: 0.01,              // Quase invisível mas mantém no DOM
            }}
        >
            {atsText}
        </div>
    );
};

export default ATSHiddenLayer;

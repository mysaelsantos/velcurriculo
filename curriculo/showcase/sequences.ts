/**
 * Sequências pré-definidas para diferentes cenários de gravação
 * Cada sequência é uma demonstração completa de um aspecto do VelCurrículo
 */

import { ShowcaseSequence } from '../hooks/useShowcaseTimeline';
import * as anim from './animations';

/**
 * SEQUÊNCIA 1: Marketing Intro
 * Uma apresentação geral do aplicativo para vídeos de marketing
 */
export const marketingIntro: ShowcaseSequence = {
    id: 'marketing-intro',
    name: 'Introdução Marketing',
    description: 'Apresentação geral do VelCurrículo para vídeos promocionais',
    actions: [
        // Começa no topo
        anim.scrollToTop(500),
        anim.wait(1000, 'Pausa inicial'),

        // Zoom no header
        anim.zoomTo('#header-logo', 1.3, { duration: 800, label: 'Destacar logo' }),
        anim.wait(1500),
        anim.zoomReset(600),

        // Scroll suave para área principal
        anim.scrollTo('#main-content', { duration: 1500, offset: -50 }),
        anim.wait(800),

        // Destaque nos destaques
        anim.highlight('.highlights-section', { duration: 2000, pulse: true }),
        anim.wait(500),

        // Scroll para o formulário
        anim.scrollTo('#form-wizard', { duration: 2000 }),
        anim.wait(1000),

        // Zoom no preview
        anim.zoomTo('#resume-preview', 1.2, { duration: 1000 }),
        anim.wait(2000),
        anim.zoomReset(800),

        // Scroll para depoimentos
        anim.scrollTo('#testimonials', { duration: 1500 }),
        anim.wait(2000),

        // Voltar ao topo
        anim.scrollToTop(1500),
    ],
};

/**
 * SEQUÊNCIA 2: Demo de Preenchimento
 * Demonstra o preenchimento do formulário com dados de exemplo
 */
export const formDemo: ShowcaseSequence = {
    id: 'form-demo',
    name: 'Demo do Formulário',
    description: 'Demonstração interativa do preenchimento de currículo',
    actions: [
        // Preparação
        anim.scrollToTop(500),
        anim.wait(500),

        // Ir para o formulário
        anim.scrollTo('#form-wizard', { duration: 1500, offset: -100 }),
        anim.wait(800),

        // Preencher nome
        anim.moveCursor('input[name="name"]', { duration: 600 }),
        anim.click('input[name="name"]'),
        anim.wait(300),
        anim.typeText('input[name="name"]', 'Maria Silva Santos', { speed: 70 }),
        anim.wait(500),

        // Preencher cargo
        anim.moveCursor('input[name="jobTitle"]', { duration: 500 }),
        anim.click('input[name="jobTitle"]'),
        anim.typeText('input[name="jobTitle"]', 'Desenvolvedora Full Stack', { speed: 65 }),
        anim.wait(500),

        // Preencher email
        anim.moveCursor('input[name="email"]', { duration: 500 }),
        anim.click('input[name="email"]'),
        anim.typeText('input[name="email"]', 'maria.silva@email.com', { speed: 60 }),
        anim.wait(500),

        // Preencher telefone
        anim.moveCursor('input[name="phone"]', { duration: 500 }),
        anim.click('input[name="phone"]'),
        anim.typeText('input[name="phone"]', '(11) 99999-8888', { speed: 60 }),
        anim.wait(800),

        // Focar no preview
        anim.scrollBy(-200, 800),
        anim.zoomTo('#resume-preview', 1.3, { duration: 1000 }),
        anim.highlight('#resume-preview', { duration: 2500, color: '#10b981' }),
        anim.wait(1000),
        anim.zoomReset(800),
    ],
};

/**
 * SEQUÊNCIA 3: Preview em Tempo Real
 * Demonstra a funcionalidade de preview em tempo real
 */
export const previewFocus: ShowcaseSequence = {
    id: 'preview-focus',
    name: 'Preview em Tempo Real',
    description: 'Destaca a funcionalidade de preview instantâneo',
    actions: [
        anim.scrollTo('#resume-preview', { duration: 1200, offset: -50 }),
        anim.wait(500),

        // Zoom no preview
        anim.zoomTo('#resume-preview', 1.4, { duration: 1000 }),
        anim.wait(1000),

        // Highlight nas seções do preview
        anim.highlight('.preview-header', { duration: 1500 }),
        anim.wait(300),
        anim.highlight('.preview-summary', { duration: 1500 }),
        anim.wait(300),
        anim.highlight('.preview-experience', { duration: 1500 }),
        anim.wait(300),
        anim.highlight('.preview-education', { duration: 1500 }),
        anim.wait(1000),

        // Reset
        anim.zoomReset(800),
        anim.wait(500),
    ],
};

/**
 * SEQUÊNCIA 4: Showcase de Templates
 * Mostra os diferentes templates disponíveis
 */
export const templateShowcase: ShowcaseSequence = {
    id: 'template-showcase',
    name: 'Templates Disponíveis',
    description: 'Apresenta os diferentes modelos de currículo',
    actions: [
        anim.scrollTo('#template-selector', { duration: 1200 }),
        anim.wait(500),

        anim.zoomTo('#template-selector', 1.3, { duration: 800 }),
        anim.wait(800),

        // Clicar em cada template
        anim.moveCursor('.template-modern', { duration: 500 }),
        anim.click('.template-modern'),
        anim.wait(1500),
        anim.highlight('#resume-preview', { duration: 1000 }),

        anim.moveCursor('.template-classic', { duration: 500 }),
        anim.click('.template-classic'),
        anim.wait(1500),
        anim.highlight('#resume-preview', { duration: 1000 }),

        anim.moveCursor('.template-minimal', { duration: 500 }),
        anim.click('.template-minimal'),
        anim.wait(1500),
        anim.highlight('#resume-preview', { duration: 1000 }),

        anim.zoomReset(800),
    ],
};

/**
 * SEQUÊNCIA 5: Feature de IA
 * Demonstra as funcionalidades de inteligência artificial
 */
export const iaFeature: ShowcaseSequence = {
    id: 'ia-feature',
    name: 'IA Integrada',
    description: 'Demonstra as funcionalidades de IA do VelCurrículo',
    actions: [
        anim.scrollTo('#summary-section', { duration: 1200, offset: -100 }),
        anim.wait(500),

        // Highlight no botão de IA
        anim.zoomTo('#ia-button', 1.5, { duration: 800 }),
        anim.highlight('#ia-button', { duration: 2000, pulse: true, color: '#8b5cf6' }),
        anim.wait(1000),

        // Clicar no botão
        anim.moveCursor('#ia-button', { duration: 600 }),
        anim.click('#ia-button'),
        anim.wait(2000),

        // Mostrar resultado
        anim.zoomTo('#summary-textarea', 1.3, { duration: 800 }),
        anim.highlight('#summary-textarea', { duration: 2500, color: '#10b981' }),
        anim.wait(1000),

        anim.zoomReset(800),
    ],
};

/**
 * SEQUÊNCIA 6: Completa (Full Demo)
 * Uma demonstração completa do início ao fim
 */
export const fullDemo: ShowcaseSequence = {
    id: 'full-demo',
    name: 'Demonstração Completa',
    description: 'Walkthrough completo de todas as funcionalidades',
    actions: [
        // Intro
        ...marketingIntro.actions.slice(0, 5),

        // Formulário
        ...formDemo.actions.slice(2),

        // Preview
        anim.wait(1000),
        ...previewFocus.actions.slice(0, 6),

        // Templates
        ...templateShowcase.actions.slice(0, 5),

        // Finalização
        anim.scrollToTop(1500),
        anim.wait(1000),
    ],
};

// Exportar todas as sequências em um objeto
export const sequences = {
    marketingIntro,
    formDemo,
    previewFocus,
    templateShowcase,
    iaFeature,
    fullDemo,
};

export const sequenceList = Object.values(sequences);

export default sequences;

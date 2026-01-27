/**
 * Showcase Module - Exports
 * 
 * Sistema de gravação profissional para criar vídeos de marketing
 * com animações cinematográficas pré-programadas.
 */

// Componentes
export { default as ShowcasePage } from './ShowcasePage';
export { default as ShowcaseControls } from './ShowcaseControls';
export { default as ShowcaseCursor, useShowcaseCursor } from './ShowcaseCursor';
export { default as ShowcaseHighlight, useShowcaseHighlight } from './ShowcaseHighlight';

// Re-exports de hooks
export { default as useShowcaseTimeline } from '../../hooks/useShowcaseTimeline';
export { default as useAutoScroll } from '../../hooks/useAutoScroll';
export { default as useAutoType } from '../../hooks/useAutoType';
export { default as useZoom } from '../../hooks/useZoom';

// Re-exports de animações e sequências
export * from '../../showcase/animations';
export * from '../../showcase/sequences';
export * from '../../showcase/easings';

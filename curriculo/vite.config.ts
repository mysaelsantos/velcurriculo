import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// REMOVEMOS A CHAVE DE API DAQUI.
// Ela não deve ser exposta no frontend.
// Ela será usada apenas no backend (netlify/functions)
// e configurada no painel do Netlify.

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      
      // --- INÍCIO DA CORREÇÃO PDF.JS ---
      // Configuração necessária para versão 4.x funcionar com Vite
      optimizeDeps: {
        esbuildOptions: {
          target: 'esnext',
        },
        exclude: ['pdfjs-dist'] // Impede otimização incorreta da lib
      },
      build: {
        target: 'esnext', // Garante suporte a recursos modernos (Top-Level Await)
      },
      // --- FIM DA CORREÇÃO ---

      // O 'define' que injetava a API_KEY foi removido.
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});

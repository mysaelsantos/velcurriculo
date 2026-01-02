import React from 'react';
import { X, ShieldCheck, ScrollText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50 rounded-t-xl">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Termos de Uso e Privacidade</h2>
            <p className="text-sm text-gray-500">Leia atentamente as condições de tratamento dos seus dados</p>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto custom-scrollbar text-gray-700 leading-relaxed text-sm space-y-4">
          
          <section>
            <h3 className="font-bold text-gray-900 mb-1">1. Aceitação dos Termos</h3>
            <p>Ao utilizar a plataforma <strong>VelCurrículo</strong>, você concorda integralmente com os presentes termos e condições. Caso não concorde com qualquer disposição, recomendamos que não prossiga com a utilização do serviço.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-1">2. Coleta de Dados Pessoais</h3>
            <p>Para a finalidade de criação e gestão do seu currículo, coletamos as informações inseridas voluntariamente por você, que podem incluir, mas não se limitam a: nome completo, dados de contato (telefone, e-mail), endereço, histórico profissional, formação acadêmica e foto de perfil.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-1">3. Finalidade e Tratamento dos Dados</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Formatação e geração do documento do currículo em PDF.</li>
              <li>Armazenamento local no seu dispositivo para futuras edições.</li>
              <li>Análise e melhoria do conteúdo através de ferramentas de inteligência artificial integradas à plataforma.</li>
            </ul>
          </section>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg my-4">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <ScrollText className="w-4 h-4" />
              4. Compartilhamento com Empresas (Importante)
            </h3>
            <p className="text-blue-900 font-medium">
              Ao aceitar estes termos, você autoriza expressamente que o seu currículo e os dados nele contidos sejam disponibilizados, acessados e visualizados por empresas locais e recrutadores parceiros da plataforma VelCurrículo.
            </p>
            <p className="text-blue-800 mt-2 text-xs">
              Esta autorização tem como objetivo exclusivo aumentar as suas chances de recolocação profissional, permitindo que estas empresas entrem em contato diretamente com você para agendamento de entrevistas.
            </p>
          </div>

          <section>
            <h3 className="font-bold text-gray-900 mb-1">5. Responsabilidade sobre as Informações</h3>
            <p>O usuário declara que todas as informações fornecidas são verdadeiras e assume total responsabilidade pela veracidade dos dados inseridos no currículo. A plataforma não se responsabiliza por dados incorretos ou falsos que possam prejudicar processos seletivos.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-1">6. Armazenamento e Segurança</h3>
            <p>A plataforma adota medidas de segurança para proteger seus dados. Grande parte das informações permanece salva localmente no seu navegador/dispositivo. Ao utilizar funcionalidades de envio ou compartilhamento, os dados trafegam de forma segura.</p>
          </section>

          <section>
            <h3 className="font-bold text-gray-900 mb-1">7. Direitos do Usuário</h3>
            <p>Você tem o direito de, a qualquer momento, editar, baixar ou excluir os seus currículos salvos na plataforma, revogando assim a disponibilidade dos seus dados para futuras consultas.</p>
          </section>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
          >
            Entendi e Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

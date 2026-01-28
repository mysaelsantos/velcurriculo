import React, { useState, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- ÍCONES ---
const Icons = {
    X: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
    Bug: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" /></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
};

interface BugReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: { name: string; email: string };
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, userData, showToast }) => {
    const [description, setDescription] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_IMAGES = 3;
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const remainingSlots = MAX_IMAGES - images.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                showToast(`Imagem "${file.name}" excede 2MB`, 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                setImages(prev => [...prev, base64]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!description.trim() || description.trim().length < 10) {
            showToast('Descreva o bug com pelo menos 10 caracteres', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            await addDoc(collection(db, 'bugReports'), {
                description: description.trim(),
                images: images,
                userName: userData.name || 'Anônimo',
                userEmail: userData.email || 'sem-email',
                userAgent: navigator.userAgent,
                url: window.location.href,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            setIsSuccess(true);
            showToast('Bug reportado com sucesso!', 'success');

            // Reset após 2 segundos e fechar
            setTimeout(() => {
                setDescription('');
                setImages([]);
                setIsSuccess(false);
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Erro ao enviar bug report:', error);
            showToast('Erro ao enviar. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setDescription('');
            setImages([]);
            setIsSuccess(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                                <Icons.Bug />
                            </div>
                            <div>
                                <h2 className="text-lg font-poppins font-bold text-gray-800">Relatar Bug</h2>
                                <p className="text-xs text-gray-500">Nos ajude a melhorar o VelCurrículo</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isSubmitting}
                        >
                            <Icons.X />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {isSuccess ? (
                            <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
                                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                                    <Icons.Check />
                                </div>
                                <h3 className="text-xl font-poppins font-bold text-gray-800 mb-2">Obrigado!</h3>
                                <p className="text-gray-500 text-center">Seu relatório foi enviado com sucesso. Vamos analisar e corrigir o mais rápido possível.</p>
                            </div>
                        ) : (
                            <>
                                {/* Descrição */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Descreva o problema <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Ex: Quando clico no botão de gerar PDF, aparece uma mensagem de erro..."
                                        className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none placeholder-gray-400 transition-all"
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Mínimo 10 caracteres</p>
                                </div>

                                {/* Upload de Imagens */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Anexar imagens (opcional)
                                    </label>

                                    {/* Preview das imagens */}
                                    {images.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            {images.map((img, index) => (
                                                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                                                    <img src={img} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeImage(index)}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Icons.Trash />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Botão de upload */}
                                    {images.length < MAX_IMAGES && (
                                        <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-colors">
                                            <Icons.Upload />
                                            <span className="text-sm text-gray-500">Clique para adicionar ({images.length}/{MAX_IMAGES})</span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleImageUpload}
                                                disabled={isSubmitting}
                                            />
                                        </label>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">Máximo 3 imagens, 2MB cada</p>
                                </div>

                                {/* Info do dispositivo */}
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500">
                                        <strong>Informações automáticas:</strong> Navegador, dispositivo e página atual serão anexados ao relatório.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!isSuccess && (
                        <div className="p-5 border-t border-gray-100">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || description.trim().length < 10}
                                className={`w-full py-3.5 rounded-xl font-poppins font-bold flex items-center justify-center gap-2 transition-all ${description.trim().length >= 10 && !isSubmitting
                                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 active:translate-y-0'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Send />
                                        Enviar Relatório
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default BugReportModal;

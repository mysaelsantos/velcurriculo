
import React, { useEffect, useState } from 'react';

declare const QRCode: any;

interface QRCodeProps {
  phone: string;
  show: boolean;
  linkedin?: string;
  showLinkedin?: boolean;
}

const QRCodeComponent: React.FC<QRCodeProps> = ({ phone, show, linkedin, showLinkedin }) => {
  const [whatsappQrUrl, setWhatsappQrUrl] = useState<string | null>(null);
  const [linkedinQrUrl, setLinkedinQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateWhatsappQR = async () => {
      if (!show || typeof QRCode === 'undefined') {
        setWhatsappQrUrl(null);
        return;
      }

      const cleanedPhone = phone.replace(/\D/g, '');
      
      if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
        setWhatsappQrUrl(null);
        return;
      }

      const finalPhone = `55${cleanedPhone}`;
      const whatsappLink = `https://wa.me/${finalPhone}`;

      try {
        const dataUrl = await QRCode.toDataURL(whatsappLink, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 80,
        });
        setWhatsappQrUrl(dataUrl);
      } catch (err) {
        console.error('Error generating WhatsApp QR Code:', err);
        setWhatsappQrUrl(null);
      }
    };

    const generateLinkedinQR = async () => {
        if (!showLinkedin || !linkedin || typeof QRCode === 'undefined') {
            setLinkedinQrUrl(null);
            return;
        }

        let link = linkedin.trim();
        if(!link.startsWith('http')) {
            link = `https://${link}`;
        }

        try {
            const dataUrl = await QRCode.toDataURL(link, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 80,
            });
            setLinkedinQrUrl(dataUrl);
        } catch (err) {
            console.error('Error generating LinkedIn QR Code:', err);
            setLinkedinQrUrl(null);
        }
    };

    generateWhatsappQR();
    generateLinkedinQR();
  }, [phone, show, linkedin, showLinkedin]);

  if (!whatsappQrUrl && !linkedinQrUrl) return null;

  return (
    <div id="whatsapp-qr-code-container" style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'flex-end' }}>
       {linkedinQrUrl && (
          <div className="flex flex-col items-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="Ícone do LinkedIn" className="h-8 mb-2" />
              <img id="qr-code-linkedin-img" alt="QR Code do LinkedIn" className="w-20 h-20" src={linkedinQrUrl} />
          </div>
       )}
       {whatsappQrUrl && (
          <div className="flex flex-col items-center">
              <img src="https://files.catbox.moe/cvyrae.svg" alt="Ícone do WhatsApp" className="h-8 mb-2" />
              <img id="qr-code-img" alt="QR Code do WhatsApp" className="w-20 h-20" src={whatsappQrUrl} />
          </div>
      )}
    </div>
  );
};

export default QRCodeComponent;
import { QRCodeSVG } from 'qrcode.react';
import { CONFIG } from '@/constants/config';

interface QRCodeProps {
  size?: number;
  className?: string;
}

export function QRCode({ size = 100, className = '' }: QRCodeProps) {
  return (
    <div
      className={`bg-white p-3 rounded-xl inline-block ${className}`}
    >
      <QRCodeSVG
        value={CONFIG.appStoreUrl}
        size={size}
        bgColor="white"
        fgColor="#0A0A0A"
        level="M"
      />
    </div>
  );
}

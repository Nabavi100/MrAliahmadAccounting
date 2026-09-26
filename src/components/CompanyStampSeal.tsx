import React from 'react';
import { useAccounting } from '../context/AccountingContext';

interface CompanyStampSealProps {
  className?: string;
  size?: number;
  stampUrl?: string;
  companyName?: string;
  commercialCode?: string;
  color?: 'blue' | 'red' | 'navy';
  tilt?: boolean;
}

export const CompanyStampSeal: React.FC<CompanyStampSealProps> = ({
  className = '',
  size: propSize,
  stampUrl: propStampUrl,
  companyName: propCompanyName,
  commercialCode: propCommercialCode,
  color: propColor,
  tilt = true,
}) => {
  const { companySettings } = useAccounting();

  const size = propSize !== undefined ? propSize : (companySettings?.stampSize || 56);
  const activeStampUrl = propStampUrl !== undefined ? propStampUrl : companySettings?.stampUrl;
  const activeCompanyName = propCompanyName || companySettings?.name || 'شرکت تجارتی برادران نبوی';
  const activeCode = propCommercialCode || companySettings?.commercialCode || '1';
  const activeColor = propColor || companySettings?.stampColor || 'navy';

  const colorPalettes = {
    navy: {
      primary: '#1E3A8A',
      secondary: '#2563EB',
      accent: '#1D4ED8',
      text: '#1E3A8A',
      badgeBg: '#EFF6FF',
    },
    blue: {
      primary: '#0284C7',
      secondary: '#0369A1',
      accent: '#0EA5E9',
      text: '#0369A1',
      badgeBg: '#F0F9FF',
    },
    red: {
      primary: '#B91C1C',
      secondary: '#DC2626',
      accent: '#991B1B',
      text: '#B91C1C',
      badgeBg: '#FEF2F2',
    },
  };

  const palette = colorPalettes[activeColor] || colorPalettes.navy;
  const tiltClass = tilt ? '-rotate-3 sm:-rotate-6' : '';

  // If a custom image was uploaded, render that image with high fidelity
  if (activeStampUrl) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 select-none ${tiltClass} transition-transform ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={activeStampUrl}
          alt={`مهر رسمی ${activeCompanyName}`}
          style={{ width: size, height: size }}
          className="w-full h-full object-contain filter contrast-110 drop-shadow-2xs opacity-90 pointer-events-none"
        />
      </div>
    );
  }

  // Otherwise, render an authentic vector circular official trade seal
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${tiltClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xs opacity-90"
      >
        {/* Outer concentric solid and dashed circles */}
        <circle cx="50" cy="50" r="47.5" stroke={palette.primary} strokeWidth="2.2" />
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke={palette.secondary}
          strokeWidth="0.9"
          strokeDasharray="2.5 1.5"
        />
        <circle cx="50" cy="50" r="39" stroke={palette.primary} strokeWidth="1.4" />

        {/* Small decorative stars */}
        <polygon points="13,50 15,46 19,46 16,49 17,53 13,50" fill={palette.accent} />
        <polygon points="87,50 85,46 81,46 84,49 83,53 87,50" fill={palette.accent} />

        {/* Top curved text: Company Name */}
        <path id="stampPathTop" d="M 17 50 A 33 33 0 0 1 83 50" fill="none" stroke="none" />
        <text
          fill={palette.primary}
          fontSize="5.8"
          fontWeight="bold"
          fontFamily="sans-serif"
          className="select-none font-bold"
        >
          <textPath href="#stampPathTop" startOffset="50%" textAnchor="middle">
            {activeCompanyName}
          </textPath>
        </text>

        {/* Bottom curved text: Official approval & Code */}
        <path id="stampPathBottom" d="M 83 50 A 33 33 0 0 1 17 50" fill="none" stroke="none" />
        <text
          fill={palette.secondary}
          fontSize="5"
          fontWeight="700"
          letterSpacing="0.6"
          fontFamily="sans-serif"
          className="select-none"
        >
          <textPath href="#stampPathBottom" startOffset="50%" textAnchor="middle">
            ★ مهر رسمی و معتبر تجارتی ★
          </textPath>
        </text>

        {/* Center Box / Star & Management Title */}
        <g transform="translate(50, 50)">
          {/* Inner ring */}
          <circle cx="0" cy="0" r="23" stroke={palette.secondary} strokeWidth="0.8" strokeDasharray="1.5 1.5" />
          <circle cx="0" cy="0" r="21" stroke={palette.primary} strokeWidth="0.8" />

          {/* Central Logo/Text */}
          <text
            x="0"
            y="-7"
            fill={palette.primary}
            fontSize="5.2"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            تأیید شد
          </text>
          <line x1="-14" y1="-3" x2="14" y2="-3" stroke={palette.secondary} strokeWidth="0.8" />

          <text
            x="0"
            y="4"
            fill={palette.primary}
            fontSize="5.5"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            مدیریت عامله
          </text>

          <text
            x="0"
            y="11"
            fill={palette.accent}
            fontSize="4.2"
            fontWeight="600"
            textAnchor="middle"
            fontFamily="monospace"
          >
            کد: {activeCode}
          </text>
        </g>
      </svg>
    </div>
  );
};

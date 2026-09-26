import React from 'react';
import { useAccounting } from '../context/AccountingContext';

interface CompanySealLogoProps {
  className?: string;
  size?: number;
  logoUrl?: string;
  companyName?: string;
}

export const CompanySealLogo: React.FC<CompanySealLogoProps> = ({
  className = 'w-12 h-12',
  size = 48,
  logoUrl: propLogoUrl,
  companyName: propCompanyName,
}) => {
  const { companySettings } = useAccounting();

  const activeLogoUrl = propLogoUrl !== undefined ? propLogoUrl : companySettings?.logoUrl;
  const activeCompanyName = propCompanyName || companySettings?.name || 'شرکت تجارتی برادران نبوی';

  if (activeLogoUrl) {
    return (
      <img
        src={activeLogoUrl}
        alt={activeCompanyName}
        style={{ width: size, height: size }}
        className={`shrink-0 select-none object-contain rounded-full border border-slate-200 bg-white p-0.5 shadow-2xs ${className}`}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      {/* Outer Circle */}
      <circle cx="50" cy="50" r="47" stroke="#1E3A8A" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="43.5" stroke="#2563EB" strokeWidth="1" strokeDasharray="2 1.5" />
      <circle cx="50" cy="50" r="38" stroke="#1E3A8A" strokeWidth="1.5" />

      {/* Decorative Stars */}
      <polygon points="14,50 16,46 20,46 17,49 18,53 14,50" fill="#2563EB" />
      <polygon points="86,50 84,46 80,46 83,49 82,53 86,50" fill="#2563EB" />

      {/* Curved Text Path Top */}
      <path
        id="textPathTop"
        d="M 18 50 A 32 32 0 0 1 82 50"
        fill="none"
        stroke="none"
      />
      <text fill="#1E3A8A" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">
        <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
          {activeCompanyName}
        </textPath>
      </text>

      {/* Curved Text Path Bottom */}
      <path
        id="textPathBottom"
        d="M 82 50 A 32 32 0 0 1 18 50"
        fill="none"
        stroke="none"
      />
      <text fill="#2563EB" fontSize="5" fontWeight="600" letterSpacing="0.8" fontFamily="sans-serif">
        <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
          • NABAWI BROTHERS TRADING •
        </textPath>
      </text>

      {/* Inner Central Emblem: Cargo Vessel & Compass Wheel */}
      <g transform="translate(50, 50)">
        {/* Ocean Waves */}
        <path
          d="M -22 13 Q -15 9 -8 13 Q 0 17 8 13 Q 15 9 22 13"
          stroke="#3B82F6"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M -20 18 Q -13 14 -6 18 Q 2 22 10 18 Q 16 14 20 18"
          stroke="#60A5FA"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Cargo / Container Ship Hull */}
        <path
          d="M -18 9 L -13 15 L 13 15 L 18 9 Z"
          fill="#1E3A8A"
        />

        {/* Containers on Deck */}
        <rect x="-12" y="3" width="7" height="6" rx="0.5" fill="#2563EB" />
        <rect x="-4" y="2" width="8" height="7" rx="0.5" fill="#3B82F6" />
        <rect x="5" y="4" width="6" height="5" rx="0.5" fill="#1D4ED8" />

        {/* Ship Superstructure / Bridge */}
        <rect x="7" y="-5" width="5" height="9" rx="0.5" fill="#1E3A8A" />
        <rect x="8" y="-3" width="3" height="2" fill="#93C5FD" />
        <line x1="9.5" y1="-5" x2="9.5" y2="-9" stroke="#1E3A8A" strokeWidth="1" />

        {/* Forward Cargo Crane / Mast */}
        <line x1="-8" y1="3" x2="-8" y2="-7" stroke="#1E3A8A" strokeWidth="1.2" />
        <line x1="-8" y1="-5" x2="2" y2="-1" stroke="#2563EB" strokeWidth="0.8" />

        {/* Guiding Compass Star / Sun */}
        <circle cx="-13" cy="-9" r="2.5" fill="#F59E0B" />
        <path d="M -13 -13 L -13 -5 M -17 -9 L -9 -9" stroke="#F59E0B" strokeWidth="0.8" />
      </g>
    </svg>
  );
};

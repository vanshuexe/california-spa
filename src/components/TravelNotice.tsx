import React from 'react';
import { TRAVEL_NOTICE } from '../data/siteData';

interface Props {
  className?: string;
  compact?: boolean;
}

// Travel charges are not part of the service fee. Shown wherever prices are shown.
export const TravelNotice: React.FC<Props> = ({ className = '', compact = false }) => (
  <div className={`bg-[#fff3cd] border border-[#a28321] rounded-lg p-3 text-left ${className}`}>
    <div className={`font-bold text-[#5a0101] ${compact ? 'text-xs' : 'text-sm'}`}>🛺 Travel charges are not included</div>
    <p className={`m-0 mt-1 text-[#5a0101] leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>{TRAVEL_NOTICE}</p>
  </div>
);

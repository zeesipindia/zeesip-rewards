'use client';

import React from 'react';
import { CameraIcon } from '@/components/Icons';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none animate-fadeIn"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[320px] bg-white rounded-[24px] p-[28px] shadow-2xl flex flex-col items-center text-center relative cursor-default"
      >
        {/* X Close Button Top-Right Corner */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFF5F3] text-[#3D0B0E] hover:bg-[#FCE4E1] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* a. Camera icon SVG (48px, brand-red color) */}
        <div className="text-[#B92429] mb-3 mt-1">
          <CameraIcon size={48} />
        </div>

        {/* b. "COMING SOON" in brand-red Anton font, 28px */}
        <h3 className="font-anton text-[28px] text-[#B92429] uppercase leading-tight mb-2">
          COMING SOON
        </h3>

        {/* c. "Bottle scanning will be available in a future update. Stay tuned!" in muted text (#7A4547), 14px, centered */}
        <p className="text-[14px] font-bold text-[#7A4547] text-center leading-snug mb-6">
          Bottle scanning will be available in a future update. Stay tuned!
        </p>

        {/* d. "GOT IT" button (brand-red bg, white text, full width, h-[50px]) */}
        <button
          type="button"
          onClick={onClose}
          className="w-full h-[50px] bg-[#B92429] hover:bg-[#9E1B20] active:scale-[0.98] text-white font-anton text-[18px] uppercase rounded-[16px] shadow-md transition-all cursor-pointer flex items-center justify-center"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
};

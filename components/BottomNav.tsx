import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComingSoonModal } from '@/components/ComingSoonModal';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  return (
    <>
      <ComingSoonModal isOpen={isComingSoonOpen} onClose={() => setIsComingSoonOpen(false)} />
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-[#F4D2CF] px-3 py-2 flex items-end justify-around z-40 shadow-lg">
        {/* Home */}
        <Link
          href="/home"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] ${
            pathname === '/home' ? 'text-[#B92429]' : 'text-[#7A4547]'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">Home</span>
        </Link>

        {/* Play */}
        <Link
          href="/play"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] ${
            pathname === '/play' ? 'text-[#B92429]' : 'text-[#7A4547]'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">Play</span>
        </Link>

        {/* Raised Centre Button: Verify */}
        <div className="relative -top-4 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsComingSoonOpen(true)}
            className="w-14 h-14 rounded-full bg-[#FFC93C] text-[#3D0B0E] border-4 border-white shadow-xl flex items-center justify-center font-black active:scale-95 transition-transform cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </button>
          <span className="text-[10px] font-extrabold text-[#3D0B0E] mt-0.5">Verify</span>
        </div>

        {/* Rewards */}
        <Link
          href="/rewards"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] ${
            pathname === '/rewards' ? 'text-[#B92429]' : 'text-[#7A4547]'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">Rewards</span>
        </Link>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] ${
            pathname === '/profile' ? 'text-[#B92429]' : 'text-[#7A4547]'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">Profile</span>
        </Link>
      </nav>
    </>
  );
};

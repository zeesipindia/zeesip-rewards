'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CameraIcon } from '@/components/Icons';
import { ComingSoonModal } from '@/components/ComingSoonModal';

export default function VerifyPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push('/home');
  };

  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative">
      <ComingSoonModal isOpen={isOpen} onClose={handleClose} />

      <div>
        <Header variant="red" />

        <div className="px-5 pt-4 flex flex-col gap-6 items-center text-center">
          <div className="w-20 h-20 rounded-[24px] bg-[#B92429] text-white flex items-center justify-center shadow-lg my-2">
            <CameraIcon size={44} />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-[36px] font-anton text-[#B92429] leading-none uppercase">
              SCAN A BOTTLE
            </h1>
            <p className="text-[14px] font-bold text-[#7A4547] max-w-xs">
              Bottle verification is unlocking in Phase 2! Scan the QR code on any Zee Sip bottle to instantly earn 25 Sip Coins.
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

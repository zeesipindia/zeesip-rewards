'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CameraIcon } from '@/components/Icons';

export default function VerifyPage() {
  return (
    <main className="min-h-[100dvh] w-full bg-[#FFF5F3] text-[#3D0B0E] flex flex-col justify-between pb-24 select-none">
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

          <div className="w-full bg-white rounded-[22px] p-5 border border-[#F4D2CF] shadow-sm flex flex-col gap-3">
            <span className="font-anton text-[18px] text-[#B92429] uppercase">
              HOW BOTTLE VERIFICATION WORKS
            </span>
            <div className="flex flex-col gap-2 text-left text-[12px] font-bold text-[#3D0B0E]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FFC93C] font-anton flex items-center justify-center text-[12px]">1</span>
                <span>Buy any ₹20 Zee Sip bottle (Mango or Pineapple)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FFC93C] font-anton flex items-center justify-center text-[12px]">2</span>
                <span>Scan the unique QR code on the back of the bottle</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#FFC93C] font-anton flex items-center justify-center text-[12px]">3</span>
                <span>Get +25 Sip Coins credited to your account instantly!</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}

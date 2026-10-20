import React from 'react';
import Link from 'next/link';

export default function SipSlicePage() {
  return (
    <main className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="flex flex-col items-center max-w-sm w-full mx-auto">
        {/* Zee Sip Logo */}
        <div className="w-28 h-16 relative mb-6 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/zeesip-logo.png"
            alt="Zee Sip"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Fun Fruit Emoji Section */}
        <div className="text-5xl mb-4 tracking-widest flex items-center justify-center gap-3">
          <span>🍍</span>
          <span>🥭</span>
        </div>

        {/* Title */}
        <h1
          className="font-anton text-[40px] text-[#B92429] uppercase leading-none tracking-wide mb-2"
        >
          SIP SLICE
        </h1>

        {/* Subtitle */}
        <p className="text-[20px] font-bold text-[#666666] mb-2 font-['Montserrat',sans-serif]">
          Coming Soon!
        </p>

        {/* Short line below */}
        <p className="text-[14px] text-[#888888] mb-8 font-medium font-['Montserrat',sans-serif]">
          Get ready to slice &amp; win Sip Coins!
        </p>

        {/* Back to Games Link */}
        <Link
          href="/play"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#FFF5F3] hover:bg-[#FCE4E1] text-[#B92429] font-bold text-[14px] border border-[#F4D2CF] transition-colors shadow-xs"
        >
          ← Back to Games
        </Link>
      </div>
    </main>
  );
}

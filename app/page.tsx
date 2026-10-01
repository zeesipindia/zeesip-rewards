'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { SpinWheel } from '@/components/SpinWheel';
import { CoinIcon } from '@/components/CoinIcon';
import { Sparkle } from '@/components/Sparkles';
import { createClient } from '@/lib/supabase/client';

export default function LandingPage() {
  const router = useRouter();
  const [viewState, setViewState] = useState<'landing' | 'spinning' | 'win'>('landing');
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [wonAmount, setWonAmount] = useState<number>(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Check auth session on load
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.push('/home');
      }
    });

    // Log QR_LANDING analytics event
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'QR_LANDING' }),
    }).catch(() => {});
  }, [router]);

  // Handle SPIN NOW click
  const handleSpinClick = async () => {
    if (viewState !== 'landing') return;

    setErrorMsg(null);
    setViewState('spinning');

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Spin failed. Please try again.');
        setViewState('landing');
        return;
      }

      setWonAmount(data.value || 50);
      setTargetIndex(data.segment_index);
    } catch {
      setErrorMsg('Connection error. Please try again.');
      setViewState('landing');
    }
  };

  // Called when wheel spin animation completes
  const handleSpinComplete = () => {
    setTimeout(() => {
      setViewState('win');
    }, 500);
  };

  // Handle Google Login / Save Coins click
  const handleGoogleAuth = async () => {
    setIsAuthLoading(true);
    setErrorMsg(null);

    // Log GOOGLE_AUTH_STARTED event
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'GOOGLE_AUTH_STARTED' }),
    }).catch(() => {});

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const redirectTo = `${siteUrl.replace(/\/+$/, '')}/auth/callback`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setIsAuthLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full flex flex-col justify-between bg-[#B92429] text-white relative overflow-hidden select-none">
      {/* Sparkles Background Decorations */}
      <Sparkle color="white" size={18} className="absolute top-36 left-6 opacity-85 z-0" />
      <Sparkle color="gold" size={24} className="absolute top-44 right-5 opacity-90 z-0" />
      <Sparkle color="white" size={14} className="absolute top-[420px] left-4 opacity-75 z-0" />
      <Sparkle color="gold" size={20} className="absolute top-[480px] right-6 opacity-85 z-0" />

      {/* WIN SCREEN OVERLAY (State on /) */}
      {viewState === 'win' ? (
        <div className="min-h-[100dvh] w-full flex flex-col justify-between items-center px-6 py-6 bg-[#B92429] relative z-30 animate-fadeIn">
          {/* Faint Sunburst Rays Background */}
          <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-[500px] h-[500px] animate-spin-slow">
              {Array.from({ length: 12 }).map((_, i) => (
                <path
                  key={i}
                  d={`M100 100 L${100 + 100 * Math.cos((i * 30 * Math.PI) / 180)} ${
                    100 + 100 * Math.sin((i * 30 * Math.PI) / 180)
                  } A100 100 0 0 1 ${
                    100 + 100 * Math.cos(((i * 30 + 15) * Math.PI) / 180)
                  } ${100 + 100 * Math.sin(((i * 30 + 15) * Math.PI) / 180)} Z`}
                  fill="#FFFFFF"
                />
              ))}
            </svg>
          </div>

          <Sparkle color="gold" size={26} className="absolute top-10 left-8 opacity-90" />
          <Sparkle color="white" size={20} className="absolute top-16 right-8 opacity-85" />
          <Sparkle color="gold" size={18} className="absolute bottom-28 left-6 opacity-85" />

          {/* Top Badge */}
          <div className="pt-6 z-10">
            <span className="inline-block px-6 py-1.5 rounded-full bg-[#CDEE1C] text-[#3D0B0E] font-anton text-lg tracking-wider shadow-md">
              YOU WON
            </span>
          </div>

          {/* Winning Amount Hero */}
          <div className="flex flex-col items-center z-10 my-auto">
            <div className="mb-2 transform hover:scale-105 transition-transform">
              <CoinIcon size={130} />
            </div>
            <h1 className="text-[120px] font-anton leading-none text-[#FFC93C] tracking-tight drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
              +{wonAmount}
            </h1>
            <p className="text-[32px] font-anton text-white tracking-wide uppercase -mt-2">
              SIP COINS
            </p>
          </div>

          {/* Progress Card & Save CTA */}
          <div className="w-full max-w-xs flex flex-col items-center gap-4 z-10 pb-4">
            {/* White Card */}
            <div className="w-full bg-white rounded-[22px] p-4 text-[#3D0B0E] shadow-xl flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-[#7A4547] tracking-wider uppercase">
                  FREE ZEE SIP
                </span>
                <span className="font-anton text-xl text-[#3D0B0E]">
                  {wonAmount} / 250
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-3.5 bg-[#FCE4E1] rounded-full overflow-hidden border border-[#F4D2CF]">
                <div
                  className="h-full bg-[#B92429] rounded-full transition-all duration-1000"
                  style={{ width: `${(wonAmount / 250) * 100}%` }}
                />
              </div>
              <p className="text-[11px] font-extrabold text-[#7A4547] text-center mt-0.5">
                {250 - wonAmount} more coins to unlock it
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs font-bold text-amber-200 bg-black/40 px-3 py-1.5 rounded-lg text-center">
                {errorMsg}
              </p>
            )}

            {/* CTA Button: SAVE MY 50 COINS */}
            <button
              onClick={handleGoogleAuth}
              disabled={isAuthLoading}
              className="w-full h-[64px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[24px] uppercase rounded-[18px] shadow-[0_10px_22px_rgba(255,201,60,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isAuthLoading ? (
                <span>SAVING COINS...</span>
              ) : (
                <>
                  <span>SAVE MY {wonAmount} COINS</span>
                </>
              )}
            </button>

            <p className="text-[12px] font-bold text-white/90 text-center">
              Guest coins are lost if you leave without saving.
            </p>
          </div>
        </div>
      ) : (
        /* LANDING PAGE & SPIN WHEEL */
        <div className="min-h-[100dvh] w-full flex flex-col justify-between items-center relative z-10 pb-4">
          {/* Top Yellow Band (~130px) */}
          <div className="w-full bg-[#FFC93C] text-[#3D0B0E] flex flex-col justify-between pt-1 pb-3 px-1 border-b-4 border-[#3D0B0E]">
            {/* Header: ZEESIP ——— REWARDS + Log in link */}
            <Header
              variant="yellow"
              rightElement={
                <button
                  onClick={handleGoogleAuth}
                  className="font-extrabold text-[12px] text-[#B92429] underline underline-offset-2 hover:text-[#7A1418] cursor-pointer"
                >
                  Log in
                </button>
              }
            />

            {/* Headline: FIRST SPIN */}
            <div className="px-5 mt-1">
              <h1 className="text-[64px] sm:text-[72px] font-anton text-[#B92429] leading-[0.85] tracking-tight uppercase">
                FIRST SPIN
              </h1>
            </div>
          </div>

          {/* Headline Below Yellow Band: IS ON US */}
          <div className="w-full px-5 pt-3 text-left">
            <h2 className="text-[64px] sm:text-[72px] font-anton text-white leading-[0.85] tracking-tight uppercase">
              IS ON US
            </h2>
          </div>

          {/* Centered Spin Wheel */}
          <div className="my-auto py-2">
            <SpinWheel
              targetIndex={targetIndex}
              isSpinning={viewState === 'spinning'}
              onSpinComplete={handleSpinComplete}
              disabled={viewState === 'spinning'}
            />
          </div>

          {/* Bottom Actions & Info Bar */}
          <div className="w-full max-w-xs px-4 flex flex-col items-center gap-3">
            {errorMsg && (
              <p className="text-xs font-bold text-amber-200 bg-black/40 px-3 py-1.5 rounded-lg text-center">
                {errorMsg}
              </p>
            )}

            {/* SPIN NOW Button */}
            <button
              onClick={handleSpinClick}
              disabled={viewState === 'spinning'}
              className="w-full h-[64px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[26px] uppercase rounded-[18px] shadow-[0_10px_22px_rgba(255,201,60,0.35)] transition-all flex items-center justify-center cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {viewState === 'spinning' ? 'SPINNING...' : 'SPIN NOW'}
            </button>

            <p className="text-[14px] font-extrabold text-white text-center">
              No sign-up needed to play
            </p>

            {/* Soft Info Bar */}
            <div className="w-full bg-white/15 backdrop-blur-md rounded-[16px] px-3.5 py-2.5 flex items-center justify-center gap-2 border border-white/20 mt-1">
              <CoinIcon size={22} />
              <span className="text-[12px] font-bold text-white text-center leading-tight">
                Collect 250 Sip Coins and unlock a free Zee Sip
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

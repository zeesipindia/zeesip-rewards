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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Check auth session on load & prefetch routes
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.push('/home');
      }
    });

    // Prefetch routes for instant navigation
    router.prefetch('/home');
    router.prefetch('/profile');

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
    setViewState('win');
  };

  // Handle Google Login / Save Coins click
  const handleGoogleAuth = async () => {
    if (isAuthLoading) return;
    setIsAuthLoading(true);
    setErrorMsg(null);

    // Yield execution briefly to force React to paint disabled state and spinner
    setTimeout(async () => {
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
    }, 10);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  return (
    <main className="min-h-[100dvh] w-full flex flex-col justify-between bg-[#B92429] text-white relative overflow-hidden select-none">
      {/* Toast Notification Popup */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-[#3D0B0E] text-[#FFC93C] font-['Montserrat',sans-serif] font-bold text-xs px-5 py-3 rounded-full shadow-2xl border border-[#FFC93C]/40 animate-bounce text-center max-w-[340px]">
          {toastMsg}
        </div>
      )}

      {/* Sparkles Background Decorations */}
      <Sparkle color="white" size={18} className="absolute top-36 left-6 opacity-85 z-0" />
      <Sparkle color="gold" size={24} className="absolute top-44 right-5 opacity-90 z-0" />
      <Sparkle color="white" size={14} className="absolute top-[420px] left-4 opacity-75 z-0" />
      <Sparkle color="gold" size={20} className="absolute top-[480px] right-6 opacity-85 z-0" />

      {/* FIX 4: GUEST FIRST SPIN RESULT OVERLAY POPUP */}
      {viewState === 'win' && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
          {/* FIXED TOP-RIGHT CLOSE BUTTON WITH WARNING TOAST */}
          <button
            type="button"
            onClick={() => {
              showToast('Your coins will be lost if you leave without saving');
            }}
            style={{
              position: 'fixed',
              top: '16px',
              right: '16px',
              zIndex: 9999,
              width: '48px',
              height: '48px',
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>

          {/* Center Card */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center relative overflow-hidden border-4 border-[#FFC93C] cursor-default"
          >
            {/* Background Floating Sparkle Stars */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[
                { left: '10%', delay: '0s', size: 18, color: '#FFC93C' },
                { left: '25%', delay: '0.3s', size: 14, color: '#B92429' },
                { left: '45%', delay: '0.1s', size: 22, color: '#FFC93C' },
                { left: '65%', delay: '0.5s', size: 16, color: '#B92429' },
                { left: '82%', delay: '0.2s', size: 20, color: '#FFC93C' },
                { left: '35%', delay: '0.7s', size: 14, color: '#B92429' },
                { left: '75%', delay: '0.4s', size: 24, color: '#FFC93C' },
              ].map((s, idx) => (
                <div
                  key={idx}
                  className="absolute animate-floatUp opacity-70"
                  style={{
                    left: s.left,
                    bottom: '-30px',
                    animationDelay: s.delay,
                    animationDuration: '2.5s',
                  }}
                >
                  <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill={s.color}>
                    <path d="M12 0C12 8 16 12 24 12C16 12 12 16 12 24C12 16 8 12 0 12C8 12 12 8 12 0Z" />
                  </svg>
                </div>
              ))}
            </div>

            {/* YOU WON text */}
            <span className="text-[14px] font-extrabold text-[#B92429] uppercase tracking-widest font-['Montserrat',sans-serif]">
              YOU WON
            </span>

            {/* Large 80px Gold Coin SVG with scaleUp */}
            <div className="my-3 animate-scaleUp">
              <svg width="80" height="80" viewBox="0 0 24 24" className="drop-shadow-[0_8px_16px_rgba(61,11,14,0.3)]">
                <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                <path
                  d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                  fill="#B92429"
                />
              </svg>
            </div>

            {/* Huge +50 amount in gold Anton font 96px */}
            <h2 className="font-anton text-[96px] text-[#FFC93C] leading-none tracking-tight drop-shadow-[0_4px_12px_rgba(61,11,14,0.35)] -my-2">
              +{wonAmount}
            </h2>

            {/* SIP COINS */}
            <span className="font-anton text-[24px] text-[#B92429] uppercase tracking-wide">
              SIP COINS
            </span>

            {/* Progress Card */}
            <div className="w-full bg-[#FFF5F3] rounded-[16px] p-3 my-4 border border-[#F4D2CF] flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[12px] font-extrabold text-[#7A4547]">
                <span>FREE ZEE SIP</span>
                <span>{wonAmount} / 250</span>
              </div>
              <div className="w-full h-3 bg-[#FCE4E1] rounded-full overflow-hidden border border-[#F4D2CF]">
                <div
                  className="h-full bg-[#B92429] rounded-full transition-all duration-700"
                  style={{ width: `${(wonAmount / 250) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-[#7A4547] mt-0.5">
                {250 - wonAmount} more coins to unlock it
              </span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs font-bold text-[#B92429] bg-[#FFF5F3] p-2 rounded-lg text-center mb-2">
                {errorMsg}
              </p>
            )}

            {/* SAVE MY 50 COINS button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isAuthLoading}
              className="w-full h-[56px] bg-[#FFC93C] hover:bg-[#FFE14D] active:scale-[0.98] text-[#3D0B0E] font-anton text-[22px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isAuthLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-[#3D0B0E] border-t-transparent rounded-full animate-spin" />
                  <span>CONNECTING...</span>
                </div>
              ) : (
                <span>SAVE MY {wonAmount} COINS</span>
              )}
            </button>

            {/* Sign in to keep your coins subtext */}
            <span className="text-[12px] font-bold text-[#7A4547] mt-2">
              Sign in to keep your coins
            </span>
          </div>
        </div>
      )}

      {/* LANDING PAGE & SPIN WHEEL */}
      <div className="min-h-[100dvh] w-full flex flex-col justify-between items-center relative z-10 pb-4">
        {/* Top Yellow Band (~130px) */}
        <div className="w-full bg-[#FFC93C] text-[#3D0B0E] flex flex-col justify-between pt-1 pb-3 px-1 border-b-4 border-[#3D0B0E]">
          {/* Header: ZEESIP ——— REWARDS + Log in link */}
          <Header
            variant="yellow"
            rightElement={
              <button
                onClick={handleGoogleAuth}
                disabled={isAuthLoading}
                className="font-extrabold text-[12px] text-[#B92429] underline underline-offset-2 hover:text-[#7A1418] cursor-pointer disabled:opacity-75 flex items-center gap-1.5"
              >
                {isAuthLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#B92429] border-t-transparent rounded-full animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  'Log in'
                )}
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
            {viewState === 'spinning' ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-3 border-[#3D0B0E] border-t-transparent rounded-full animate-spin" />
                <span>SPINNING...</span>
              </div>
            ) : (
              'SPIN NOW'
            )}
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
    </main>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CoinIcon } from '@/components/CoinIcon';
import { Sparkle } from '@/components/Sparkles';
import { CheckIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [savedPhone, setSavedPhone] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [waitingCoins, setWaitingCoins] = useState<number>(30);

  // Form & User States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Celebration Overlay State
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 3000);
  };

  const formatPhoneNumber = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return val ? (val.startsWith('+91') ? val : `+91 ${val}`) : '';
  };

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      // Display Google user info (read-only)
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setUserEmail(user.email || '');
      setDisplayName(metaName || user.email?.split('@')[0] || 'Zee Sipper');
      setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);

      // Fetch current balance
      fetch('/api/balance')
        .then((res) => res.json())
        .then((data) => {
          if (data.balance !== undefined) {
            setCurrentBalance(data.balance);
          }
        })
        .catch(() => {});

      // Check profile in Supabase
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            if (profile.display_name) {
              setDisplayName(profile.display_name);
            }
            if (profile.phone_number) {
              setSavedPhone(profile.phone_number);
              setPhone(profile.phone_number);
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          } else {
            setIsEditing(true);
          }
        });
    });

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Validate phone number: exactly 10 digits
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Save phone number to profiles
      const profileRes = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: cleanedPhone,
          display_name: displayName,
        }),
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json().catch(() => ({}));
        setErrorMsg(errData.error || 'Something went wrong saving your phone number.');
        setIsSubmitting(false);
        return;
      }

      // 2. Transfer guest coins if any pending
      const pendingGuestId = typeof window !== 'undefined' ? localStorage.getItem('guest_session_id') : null;
      let transferredCoins = 30;

      if (pendingGuestId) {
        try {
          const claimRes = await fetch('/api/claim-guest-coins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guest_session_id: pendingGuestId,
              phone_number: cleanedPhone,
            }),
          });
          const claimData = await claimRes.json();
          if (claimData.claimedCoins) {
            transferredCoins = claimData.claimedCoins;
          }
          localStorage.removeItem('guest_session_id');
        } catch {
          // Ignore network glitch on guest claim
        }
      }

      setWaitingCoins(transferredCoins);

      if (!savedPhone) {
        // First-time completion: show celebration overlay & redirect after 2s
        setSavedPhone(cleanedPhone);
        setShowCelebration(true);
        redirectTimerRef.current = setTimeout(() => {
          router.push('/home');
        }, 2000);
      } else {
        // Returning user editing: switch back to display view and show toast
        setSavedPhone(cleanedPhone);
        setIsEditing(false);
        setIsSubmitting(false);
        showToast('Saved!');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleLogOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#B92429] text-white flex flex-col justify-between pb-24 select-none relative overflow-x-hidden shadow-2xl">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] bg-[#3D0B0E] text-[#FFC93C] font-['Montserrat',sans-serif] font-bold text-xs px-5 py-3 rounded-full shadow-2xl border border-[#FFC93C]/40 animate-bounce text-center max-w-[340px]">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div>
        <Header variant="red" />

        <div className="px-5 pt-1 pb-4 flex flex-col items-center">
          {/* VIEW 1: CLEAN DISPLAY VIEW (When phone is already saved and not in edit mode) */}
          {savedPhone && !isEditing ? (
            <div className="w-full flex flex-col items-center">
              {/* White Card */}
              <div className="w-full bg-white rounded-[28px] p-6 shadow-2xl flex flex-col gap-4 text-left border-4 border-[#FFC93C]">
                {/* Google Avatar & Display Info */}
                <div className="flex items-center gap-3.5 pb-2">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-[60px] h-[60px] rounded-full object-cover border-2 border-[#B92429] shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-[60px] h-[60px] rounded-full bg-[#B92429] text-white font-anton text-[26px] flex items-center justify-center border-2 border-[#3D0B0E] flex-shrink-0">
                      {displayName.slice(0, 1).toUpperCase() || 'Z'}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[20px] font-anton text-[#3D0B0E] leading-tight uppercase truncate">
                      {displayName || 'Zee Sipper'}
                    </span>
                    <span className="text-[12px] font-bold text-[#7A4547] truncate">
                      {userEmail}
                    </span>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="h-[1px] bg-[#F4D2CF] w-full" />

                {/* WhatsApp Number Clean Display */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-extrabold text-[#7A4547] uppercase tracking-wider font-['Montserrat',sans-serif]">
                    WHATSAPP NUMBER
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-anton text-[22px] text-[#3D0B0E] tracking-wide">
                      {formatPhoneNumber(savedPhone)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhone(savedPhone);
                        setIsEditing(true);
                      }}
                      className="text-[13px] font-extrabold text-[#B92429] hover:underline cursor-pointer px-2 py-1"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>

              {/* LOG OUT button at the bottom (secondary style) */}
              <button
                type="button"
                onClick={handleLogOut}
                className="w-full h-[48px] rounded-[16px] border-2 border-white/40 hover:bg-white/10 text-white font-bold text-[14px] uppercase transition-all cursor-pointer mt-4"
              >
                LOG OUT
              </button>
            </div>
          ) : (
            /* VIEW 2: EDIT / FIRST TIME VIEW */
            <div className="w-full flex flex-col items-center">
              {/* "30 COINS WAITING" BADGE (first time only) */}
              {!savedPhone && (
                <div className="mb-4 inline-flex items-center gap-2 bg-[#FFC93C] text-[#3D0B0E] px-4 py-2 rounded-full shadow-lg border-2 border-[#3D0B0E] animate-bounce">
                  <CoinIcon size={20} />
                  <span className="font-anton text-[16px] tracking-wide uppercase">
                    {waitingCoins} COINS WAITING
                  </span>
                </div>
              )}

              {/* Form with White Card */}
              <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                {/* White Card */}
                <div className="w-full bg-white rounded-[28px] p-6 shadow-2xl flex flex-col gap-4 text-left border-4 border-[#FFC93C]">
                  {/* Google Avatar & Email (Read-Only) */}
                  <div className="flex items-center gap-3.5 pb-3 border-b border-[#F4D2CF]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-[60px] h-[60px] rounded-full object-cover border-2 border-[#B92429] shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-[60px] h-[60px] rounded-full bg-[#B92429] text-white font-anton text-[26px] flex items-center justify-center border-2 border-[#3D0B0E] flex-shrink-0">
                        {displayName.slice(0, 1).toUpperCase() || 'Z'}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[20px] font-anton text-[#3D0B0E] leading-tight uppercase truncate">
                        {displayName || 'Zee Sipper'}
                      </span>
                      <span className="text-[12px] font-bold text-[#7A4547] truncate">
                        {userEmail}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Number Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase font-['Montserrat',sans-serif]">
                      YOUR WHATSAPP NUMBER
                    </label>
                    <div className="flex items-center w-full h-[54px] rounded-[16px] border-2 border-[#B92429] bg-[#FFF5F3] overflow-hidden focus-within:ring-2 focus-within:ring-[#B92429]/30">
                      <span className="px-4 font-bold text-[15px] text-[#7A4547] bg-[#FCE4E1] h-full flex items-center border-r-2 border-[#B92429]">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210"
                        className="w-full h-full px-3.5 outline-none font-bold text-[16px] text-[#3D0B0E] bg-transparent"
                        autoFocus
                      />
                    </div>
                    {/* Error message in red below input */}
                    {errorMsg && (
                      <p className="text-[12px] font-bold text-[#B92429] bg-[#FFF5F3] p-2.5 rounded-xl border border-[#F4D2CF] leading-snug">
                        {errorMsg}
                      </p>
                    )}
                  </div>

                  {/* RED WARNING BOX below phone */}
                  <div
                    style={{
                      backgroundColor: '#7A1418',
                      color: '#FFFFFF',
                      borderRadius: '14px',
                      padding: '12px',
                    }}
                    className="flex items-start gap-3 shadow-md"
                  >
                    {/* Yellow Warning Triangle SVG */}
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                      <path d="M12 2L1 21H23L12 2Z" fill="#FFC93C" />
                      <path d="M12 9V14" stroke="#7A1418" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="17" r="1.25" fill="#7A1418" />
                    </svg>
                    <p className="text-[11.5px] font-bold leading-snug font-['Montserrat',sans-serif]">
                      Enter your real WhatsApp number. We&apos;ll contact you here to deliver your Zee Sip reward. Wrong numbers cannot claim rewards.
                    </p>
                  </div>

                  {/* SAVE Button: "SAVE & START PLAYING" for new user, "SAVE" for editing */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full ${
                      savedPhone ? 'h-[56px] text-[20px]' : 'h-[62px] text-[22px]'
                    } bg-[#B92429] hover:bg-[#9E1B20] active:scale-[0.98] text-white font-anton uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>SAVING...</span>
                      </div>
                    ) : (
                      <span>{savedPhone ? 'SAVE' : 'SAVE & START PLAYING'}</span>
                    )}
                  </button>

                  {/* Cancel button if editing existing phone */}
                  {savedPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhone(savedPhone);
                        setIsEditing(false);
                        setErrorMsg(null);
                      }}
                      className="text-xs font-bold text-[#7A4547] text-center hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Below Button: Needed coins info (first-time only) */}
                {!savedPhone && (
                  <p className="text-center text-[12px] font-bold text-white/90 mt-3 font-['Montserrat',sans-serif]">
                    You need {Math.max(0, 500 - currentBalance)} more coins to unlock a free Zee Sip
                  </p>
                )}

                {/* For Returning Users: LOG OUT Button */}
                {savedPhone && (
                  <button
                    type="button"
                    onClick={handleLogOut}
                    className="w-full h-[48px] rounded-[16px] border-2 border-white/40 hover:bg-white/10 text-white font-bold text-[14px] uppercase transition-all cursor-pointer mt-3"
                  >
                    LOG OUT
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* FULL-SCREEN CELEBRATION OVERLAY */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-fadeIn">
          {/* Sparkles */}
          <Sparkle color="white" size={20} className="absolute top-20 left-8 opacity-80" />
          <Sparkle color="gold" size={28} className="absolute top-32 right-10 opacity-90" />
          <Sparkle color="white" size={16} className="absolute bottom-28 left-12 opacity-75" />
          <Sparkle color="gold" size={24} className="absolute bottom-36 right-8 opacity-85" />

          <div className="flex flex-col items-center gap-4 text-center my-auto animate-scaleUp">
            <div className="w-20 h-20 rounded-full bg-[#8FC31F] flex items-center justify-center border-4 border-white shadow-2xl">
              <CheckIcon size={44} className="text-white" />
            </div>

            <h2 className="font-anton text-[36px] text-white leading-tight uppercase tracking-wide drop-shadow-md">
              YOU&apos;RE ALL SET!
            </h2>

            <div className="inline-flex items-center gap-2 bg-[#FFC93C] text-[#3D0B0E] px-5 py-2.5 rounded-full shadow-lg border-2 border-[#3D0B0E]">
              <CoinIcon size={24} />
              <span className="font-anton text-[22px] tracking-wide uppercase">
                +{waitingCoins || 30} SIP COINS SAVED
              </span>
            </div>

            <p className="text-[13px] font-bold text-white/80 mt-2 font-['Montserrat',sans-serif]">
              Redirecting to home...
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}

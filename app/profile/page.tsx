/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { MangoIcon, PineappleIcon, WarningTriangleIcon, CheckIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';
import { addOptimisticCoins } from '@/lib/balanceCache';

export default function ProfilePage() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [team, setTeam] = useState<'mango' | 'pineapple' | null>(null);
  const [whatsappConsent, setWhatsappConsent] = useState<boolean>(true);

  // Delivery Address Fields
  const [deliveryName, setDeliveryName] = useState<string>('');
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [addressLine2, setAddressLine2] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('Kerala');

  // Form & User States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isReturningUser, setIsReturningUser] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Celebration Overlay State
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [celebrationTitle, setCelebrationTitle] = useState<string>("YOU'RE ALL SET!");
  const [celebrationBonus, setCelebrationBonus] = useState<number>(0);
  const [celebrationDurationMs, setCelebrationDurationMs] = useState<number>(2500);

  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      // Pre-fill immediately from Google session data (0ms latency, instant render)
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setUserEmail(user.email || '');
      setDisplayName(metaName);
      setDeliveryName(metaName);
      setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);

      // Check for pending guest session coins and claim them
      const pendingGuestId = typeof window !== 'undefined' ? localStorage.getItem('guest_session_id') : null;
      fetch('/api/claim-guest-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_session_id: pendingGuestId }),
      })
        .then((res) => res.json())
        .then(() => {
          if (pendingGuestId) {
            try {
              localStorage.removeItem('guest_session_id');
            } catch {}
          }
        })
        .catch(() => {});

      // Fetch saved profile row in background to overlay existing database details
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            if (profile.phone_number || profile.completed_tasks?.profile_completed) {
              setIsReturningUser(true);
            }
            if (profile.display_name) setDisplayName(profile.display_name);
            if (profile.pincode) setPincode(profile.pincode);
            if (profile.phone_number) setPhone(profile.phone_number);
            if (profile.team) setTeam(profile.team as 'mango' | 'pineapple');
            if (profile.whatsapp_consent !== undefined) setWhatsappConsent(profile.whatsapp_consent);
            if (profile.delivery_name) setDeliveryName(profile.delivery_name);
            if (profile.address_line1) setAddressLine1(profile.address_line1);
            if (profile.address_line2) setAddressLine2(profile.address_line2);
            if (profile.city) setCity(profile.city);
            if (profile.state) setState(profile.state);
          }
        });
    });

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg(null);

    // Validation
    if (!displayName.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }

    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
      setErrorMsg('Pincode must be exactly 6 digits');
      return;
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
    if (phone && !/^\d{10}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp phone number');
      return;
    }

    // Immediately disable button & show spinner inside
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          pincode: pincode.trim(),
          phone_number: cleanPhone,
          team,
          whatsapp_consent: whatsappConsent,
          delivery_name: deliveryName.trim() || displayName.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim(),
          city: city.trim(),
          state: state.trim() || 'Kerala',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg('Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Calculate celebration variables
      const bonusEarned = data.newlyAwardedCoins || 0;
      if (bonusEarned > 0) {
        addOptimisticCoins(bonusEarned);
      }

      const isInitialCompletion = !isReturningUser;
      const title = isInitialCompletion ? "YOU'RE ALL SET!" : 'SAVED!';
      // 2.5s for initial setup or when bonus coins earned; 1.5s for simple returning edit
      const durationMs = isInitialCompletion || bonusEarned > 0 ? 2500 : 1500;

      setCelebrationTitle(title);
      setCelebrationBonus(bonusEarned);
      setCelebrationDurationMs(durationMs);
      setShowCelebration(true);

      // Auto redirect to /home after duration
      redirectTimerRef.current = setTimeout(() => {
        router.push('/home');
      }, durationMs);
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
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-white text-[#3D0B0E] flex flex-col justify-between pb-24 select-none relative overflow-x-hidden shadow-2xl">
      <div>
        <Header variant="red" />

        {/* Profile Header Card */}
        <div className="px-5 pt-3 flex items-center gap-4 border-b border-[#F4D2CF] pb-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-16 h-16 rounded-full border-2 border-[#B92429] shadow-md object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#B92429] text-white font-anton text-[28px] flex items-center justify-center border-2 border-[#3D0B0E]">
              {displayName.slice(0, 1).toUpperCase() || 'Z'}
            </div>
          )}

          <div className="flex flex-col">
            <h1 className="text-[24px] font-anton text-[#B92429] leading-tight uppercase">
              {displayName || 'Zee Sipper'}
            </h1>
            <span className="text-[12px] font-bold text-[#7A4547] flex items-center gap-1">
              <CheckIcon size={14} className="text-[#8FC31F]" />
              {userEmail}
            </span>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="px-5 pt-5 flex flex-col gap-6">
          {/* SECTION 1: PERSONAL DETAILS */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-anton text-[#B92429] uppercase tracking-wide">
              PERSONAL DETAILS
            </h2>

            {/* Display Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                YOUR NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full h-[48px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
              />
            </div>

            {/* WhatsApp Number */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                WHATSAPP NUMBER
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 font-extrabold text-[14px] text-[#7A4547]">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full h-[48px] pl-13 pr-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                />
              </div>
            </div>

            {/* RED WARNING BOX */}
            <div className="bg-[#B92429] text-white rounded-[14px] p-3 flex items-start gap-2.5 shadow-md">
              <WarningTriangleIcon size={26} className="mt-0.5 shrink-0" />
              <p className="text-[11.5px] font-bold leading-tight">
                Use your real number. We&apos;ll contact you on WhatsApp to deliver your rewards. Wrong numbers can&apos;t claim rewards.
              </p>
            </div>

            {/* Pincode */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                PINCODE
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="673001"
                className="w-full h-[48px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
              />
            </div>
          </div>

          {/* SECTION 2: DELIVERY ADDRESS */}
          <div className="flex flex-col gap-3 pt-2 border-t border-[#F4D2CF]">
            <div className="flex flex-col">
              <h2 className="text-[18px] font-anton text-[#B92429] uppercase tracking-wide">
                DELIVERY ADDRESS
              </h2>
              <span className="text-[11px] font-bold text-[#7A4547]">
                Required to receive your Zee Sip rewards (+10 coins bonus)
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Full Name for Delivery */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                  FULL NAME FOR DELIVERY
                </label>
                <input
                  type="text"
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  placeholder="Full recipient name"
                  className="w-full h-[46px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                />
              </div>

              {/* Address Line 1 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                  ADDRESS LINE 1 (HOUSE/BUILDING/STREET)
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Flat 4B, Emerald Heights, Beach Road"
                  className="w-full h-[46px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                />
              </div>

              {/* Address Line 2 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                  ADDRESS LINE 2 (AREA/LANDMARK - OPTIONAL)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Near Calicut Beach Park"
                  className="w-full h-[46px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                />
              </div>

              {/* City & State Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                    CITY
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Kozhikode"
                    className="w-full h-[46px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                    STATE
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Kerala"
                    className="w-full h-[46px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: YOUR TEAM */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#F4D2CF]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                YOUR TEAM (+5 coins bonus)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Team Mango */}
              <button
                type="button"
                onClick={() => setTeam('mango')}
                className={`h-[68px] rounded-[20px] bg-[#CDEE1C] flex items-center justify-center gap-2 px-3 transition-all cursor-pointer ${
                  team === 'mango'
                    ? 'border-4 border-[#3D0B0E] shadow-lg scale-[1.02]'
                    : 'border-2 border-transparent opacity-85 hover:opacity-100'
                }`}
              >
                <MangoIcon size={34} />
                <div className="flex flex-col text-left">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    TEAM MANGO
                  </span>
                  <span className="text-[10px] font-extrabold text-[#3D0B0E]/80">
                    Raw & Tangy
                  </span>
                </div>
              </button>

              {/* Team Pineapple */}
              <button
                type="button"
                onClick={() => setTeam('pineapple')}
                className={`h-[68px] rounded-[20px] bg-[#FFE14D] flex items-center justify-center gap-2 px-3 transition-all cursor-pointer ${
                  team === 'pineapple'
                    ? 'border-4 border-[#3D0B0E] shadow-lg scale-[1.02]'
                    : 'border-2 border-transparent opacity-85 hover:opacity-100'
                }`}
              >
                <PineappleIcon size={34} />
                <div className="flex flex-col text-left">
                  <span className="font-anton text-[16px] text-[#3D0B0E] leading-none uppercase">
                    TEAM PINEAPPLE
                  </span>
                  <span className="text-[10px] font-extrabold text-[#3D0B0E]/80">
                    Sweet & Punchy
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Checkbox: WhatsApp Consent */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-[#F4D2CF] text-[#B92429] focus:ring-[#B92429]"
            />
            <span className="text-[11.5px] font-bold text-[#7A4547] leading-snug">
              Zee Sip can message me on WhatsApp about my coins and rewards.
            </span>
          </label>

          {/* Error Message Below Button */}
          {errorMsg && (
            <p className="text-xs font-bold text-[#B92429] bg-[#FFF5F3] p-3 rounded-[14px] border border-[#B92429]/30 text-center">
              {errorMsg}
            </p>
          )}

          {/* Primary CTA Button: START COLLECTING / SAVE CHANGES */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[60px] bg-[#B92429] hover:bg-[#7A1418] active:scale-[0.98] text-white font-anton text-[22px] uppercase rounded-[18px] shadow-md transition-all cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>SAVING...</span>
              </>
            ) : isReturningUser ? (
              'SAVE CHANGES'
            ) : (
              'START COLLECTING'
            )}
          </button>

          {/* Secondary CTA Button: LOG OUT */}
          <button
            type="button"
            onClick={handleLogOut}
            className="w-full py-3 bg-[#FFF5F3] hover:bg-[#FCE4E1] text-[#7A4547] font-bold text-[14px] uppercase rounded-[14px] border border-[#F4D2CF] transition-colors cursor-pointer mt-1"
          >
            LOG OUT
          </button>
        </form>
      </div>

      {/* FULL SCREEN SUCCESS CELEBRATION OVERLAY */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-[#B92429]/97 backdrop-blur-md flex flex-col items-center justify-between p-6 select-none overflow-hidden animate-fadeIn">
          {/* Background Floating Sparkle Stars */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { left: '12%', delay: '0s', size: 24, color: '#FFC93C' },
              { left: '28%', delay: '0.4s', size: 16, color: '#FFFFFF' },
              { left: '48%', delay: '0.2s', size: 28, color: '#FFC93C' },
              { left: '68%', delay: '0.6s', size: 20, color: '#FFFFFF' },
              { left: '84%', delay: '0.1s', size: 22, color: '#FFC93C' },
              { left: '38%', delay: '0.8s', size: 18, color: '#FFFFFF' },
              { left: '58%', delay: '0.5s', size: 26, color: '#FFC93C' },
              { left: '22%', delay: '0.7s', size: 14, color: '#FFFFFF' },
            ].map((s, idx) => (
              <div
                key={idx}
                className="absolute animate-floatUp opacity-80"
                style={{
                  left: s.left,
                  bottom: '-40px',
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

          <div className="h-4" />

          {/* Center Content */}
          <div className="flex flex-col items-center gap-4 z-10 text-center my-auto">
            {/* 80px Gold Coin SVG with 400ms Scale-Up Animation */}
            <div className="animate-scaleUp">
              <svg width="80" height="80" viewBox="0 0 24 24" className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
                <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                <path
                  d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                  fill="#B92429"
                />
              </svg>
            </div>

            {/* Heading */}
            <h2 className="font-anton text-[36px] text-white leading-none uppercase tracking-wide drop-shadow-md">
              {celebrationTitle}
            </h2>

            {/* Bonus Coins Display */}
            {celebrationBonus > 0 && (
              <div className="bg-black/30 border border-[#FFC93C]/40 px-5 py-2 rounded-full animate-bounce">
                <span className="font-anton text-[28px] text-[#FFC93C] leading-none tracking-wider">
                  +{celebrationBonus} COINS EARNED
                </span>
              </div>
            )}

            {/* Small Redirecting Text */}
            <p className="text-[14px] font-bold text-white/90 font-['Montserrat',sans-serif]">
              Redirecting to home...
            </p>
          </div>

          {/* Bottom Progress Bar & Manual Link */}
          <div className="w-full max-w-xs flex flex-col items-center gap-3 z-10 pb-6">
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/20">
              <div
                className="h-full bg-[#FFC93C] rounded-full transition-all ease-linear"
                style={{
                  width: '100%',
                  transitionDuration: `${celebrationDurationMs}ms`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => router.push('/home')}
              className="text-[14px] font-bold text-[#FFC93C] hover:text-white uppercase tracking-wider underline underline-offset-4 cursor-pointer"
            >
              GO TO HOME →
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}

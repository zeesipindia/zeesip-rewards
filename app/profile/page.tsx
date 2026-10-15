/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { MangoIcon, PineappleIcon, WarningTriangleIcon, CheckIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';

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
  const [celebrationDurationMs, setCelebrationDurationMs] = useState<number>(1500);

  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      // Pre-fill immediately from Google session data
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || '';
      setUserEmail(user.email || '');
      setDisplayName(metaName);
      setDeliveryName(metaName);
      setAvatarUrl(user.user_metadata?.avatar_url || user.user_metadata?.picture || null);

      // Check for guest phone number saved in localStorage (Task 5)
      let localPhone = '';
      if (typeof window !== 'undefined') {
        localPhone = localStorage.getItem('guest_phone_number') || '';
        if (localPhone) {
          setPhone(localPhone);
        }
      }

      // Check for pending guest session coins and claim them
      const pendingGuestId = typeof window !== 'undefined' ? localStorage.getItem('guest_session_id') : null;
      fetch('/api/claim-guest-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_session_id: pendingGuestId,
          phone_number: localPhone || undefined,
        }),
      })
        .then((res) => res.json())
        .then(() => {
          if (pendingGuestId) {
            try {
              localStorage.removeItem('guest_session_id');
            } catch {}
          }
          if (localPhone) {
            try {
              localStorage.removeItem('guest_phone_number');
            } catch {}
          }
        })
        .catch(() => {});

      // Fetch saved profile row in background
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
            if (profile.phone_number) {
              setPhone(profile.phone_number);
            } else if (localPhone) {
              setPhone(localPhone);
            }
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
    setIsSubmitting(true);
    setErrorMsg(null);

    // Validate phone number: exactly 10 digits
    const cleanedPhone = phone.replace(/\D/g, '');
    if (phone && cleanedPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp number');
      setIsSubmitting(false);
      return;
    }

    // Validate pincode if entered: exactly 6 digits
    if (pincode && pincode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit PIN code');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          pincode: pincode || null,
          phone_number: cleanedPhone || null,
          team: team || null,
          whatsapp_consent: whatsappConsent,
          delivery_name: deliveryName || displayName || null,
          address_line1: addressLine1 || null,
          address_line2: addressLine2 || null,
          city: city || null,
          state: state || 'Kerala',
        }),
      });

      if (!res.ok) {
        setErrorMsg('Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const isInitialCompletion = !isReturningUser;
      const title = isInitialCompletion ? "YOU'RE ALL SET!" : 'PROFILE SAVED!';
      const durationMs = 1500;

      setCelebrationTitle(title);
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

            {/* WhatsApp Phone Number */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                WHATSAPP NUMBER
              </label>
              <div className="flex items-center w-full h-[48px] rounded-[16px] border-2 border-[#F4D2CF] focus-within:border-[#B92429] bg-[#FFF5F3] overflow-hidden">
                <span className="px-3.5 font-bold text-[14px] text-[#7A4547] bg-[#FCE4E1] h-full flex items-center border-r border-[#F4D2CF]">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full h-full px-3.5 outline-none font-bold text-[14px] text-[#3D0B0E] bg-transparent"
                />
              </div>

              {/* Real WhatsApp Number Warning */}
              <div className="mt-1 bg-[#FFF5F3] border border-[#F4D2CF] rounded-[12px] p-2.5 flex items-start gap-2">
                <WarningTriangleIcon size={18} className="text-[#B92429] flex-shrink-0 mt-0.5" />
                <p className="text-[10.5px] font-bold text-[#7A4547] leading-tight">
                  Enter your real WhatsApp number. We will contact you here to deliver your free Zee Sip. Wrong numbers cannot claim rewards.
                </p>
              </div>
            </div>

            {/* PIN Code */}
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
                Required to receive your Zee Sip rewards
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
                YOUR TEAM
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
                    Sweet & Fiery
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 4: WHATSAPP NOTIFICATION CONSENT */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="whatsappConsent"
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="w-5 h-5 rounded-md accent-[#B92429] mt-0.5 cursor-pointer"
            />
            <label
              htmlFor="whatsappConsent"
              className="text-[12px] font-bold text-[#7A4547] leading-snug cursor-pointer"
            >
              Zee Sip can message me on WhatsApp about my coins and rewards.
            </label>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs font-bold text-[#B92429] bg-[#FFF5F3] p-3 rounded-xl text-center border border-[#F4D2CF]">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[54px] bg-[#B92429] hover:bg-[#A31D22] text-[#FFC93C] font-anton text-[20px] uppercase rounded-[18px] shadow-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-75"
            >
              {isSubmitting ? 'SAVING...' : 'SAVE PROFILE'}
            </button>

            <button
              type="button"
              onClick={handleLogOut}
              className="w-full h-[44px] bg-[#FFF5F3] hover:bg-[#FCE4E1] text-[#7A4547] font-bold text-[13px] uppercase rounded-[16px] border border-[#F4D2CF] transition-all cursor-pointer"
            >
              LOG OUT
            </button>
          </div>
        </form>
      </div>

      {/* FULL-SCREEN CELEBRATION OVERLAY */}
      {showCelebration && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-6 select-none animate-fadeIn">
          <div className="h-4" />

          {/* Center Content */}
          <div className="flex flex-col items-center gap-4 z-10 text-center my-auto">
            <div className="w-20 h-20 rounded-full bg-[#8FC31F] flex items-center justify-center border-4 border-white shadow-2xl animate-scaleUp">
              <CheckIcon size={44} className="text-white" />
            </div>

            {/* Heading */}
            <h2 className="font-anton text-[36px] text-white leading-none uppercase tracking-wide drop-shadow-md">
              {celebrationTitle}
            </h2>

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

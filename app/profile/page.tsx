'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { MangoIcon, PineappleIcon, WarningTriangleIcon, CheckIcon } from '@/components/Icons';
import { createClient } from '@/lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [team, setTeam] = useState<'mango' | 'pineapple' | null>(null);
  const [whatsappConsent, setWhatsappConsent] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      setUserEmail(user.email || '');
      setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || '');

      // Check if profile already exists
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            if (profile.display_name) setDisplayName(profile.display_name);
            if (profile.pincode) setPincode(profile.pincode);
            if (profile.phone_number) setPhone(profile.phone_number);
            if (profile.team) setTeam(profile.team as 'mango' | 'pineapple');
            if (profile.whatsapp_consent !== undefined) setWhatsappConsent(profile.whatsapp_consent);

            // If profile is already fully complete, redirect to home
            if (profile.phone_number && profile.team && profile.pincode) {
              router.push('/home');
              return;
            }
          }
          setIsLoading(false);
        });
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!displayName.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      setErrorMsg('Pincode must be exactly 6 digits');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp phone number');
      return;
    }

    if (!team) {
      setErrorMsg('Please pick your team (Team Mango or Team Pineapple)');
      return;
    }

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update profile');
        setIsSubmitting(false);
        return;
      }

      router.push('/home');
    } catch {
      setErrorMsg('Connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#B92429] border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] w-full bg-white text-[#3D0B0E] flex flex-col justify-between pb-6 select-none">
      {/* Top Header */}
      <div>
        <Header variant="red" />

        {/* Top Badges */}
        <div className="px-5 pt-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CDEE1C] text-[#3D0B0E] text-[11px] font-extrabold shadow-sm">
            <CheckIcon size={14} className="text-[#3D0B0E]" />
            <span>{userEmail || 'Google Verified'}</span>
          </div>
          <span className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase">
            LAST STEP
          </span>
        </div>

        {/* Title & Subtext */}
        <div className="px-5 pt-3">
          <h1 className="text-[44px] font-anton text-[#B92429] leading-none tracking-tight uppercase">
            MAKE IT YOURS
          </h1>
          <p className="text-[13px] font-bold text-[#7A4547] mt-1">
            Your 50 coins are safe. Just a few details.
          </p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="px-5 pt-4 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 rounded-[12px] bg-[#B92429]/10 border border-[#B92429]/30 text-[#B92429] text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* 2-Column Grid: YOUR NAME + PINCODE */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 flex flex-col gap-1">
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

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
                PINCODE
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="673001"
                required
                className="w-full h-[48px] px-3.5 rounded-[16px] border-2 border-[#F4D2CF] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3]"
              />
            </div>
          </div>

          {/* WHATSAPP NUMBER FIELD */}
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
                required
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

          {/* PICK YOUR TEAM */}
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase">
              PICK YOUR TEAM
            </label>
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
                    Raw & Tangy 🥭
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
                    Sweet & Punchy 🍍
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Checkbox: WhatsApp Consent */}
          <label className="flex items-start gap-2.5 mt-1 cursor-pointer select-none">
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

          {/* Primary CTA Button: START COLLECTING */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[62px] bg-[#B92429] hover:bg-[#7A1418] active:scale-[0.98] text-white font-anton text-[24px] uppercase rounded-[18px] shadow-[0_10px_22px_rgba(185,36,41,0.3)] transition-all mt-2 cursor-pointer disabled:opacity-75"
          >
            {isSubmitting ? 'SAVING PROFILE...' : 'START COLLECTING'}
          </button>
        </form>
      </div>
    </main>
  );
}

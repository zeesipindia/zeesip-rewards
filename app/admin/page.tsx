'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !accessCode.trim()) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: accessCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Wrong code');
        setIsLoading(false);
        return;
      }

      router.push('/admin/dashboard');
    } catch {
      setErrorMsg('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F5F5] font-['Montserrat',sans-serif] select-none">
      {/* MOBILE BLOCK (< 768px) */}
      <div className="flex md:hidden min-h-screen w-full items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[12px] p-8 shadow-sm border border-[#E0E0E0] max-w-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#FFF5F3] text-[#B92429] flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h2 className="font-anton text-[22px] text-[#B92429] uppercase mb-2">
            DESKTOP ONLY
          </h2>
          <p className="text-[14px] font-bold text-[#7A4547] leading-relaxed">
            Admin panel is designed for desktop. Please open on a laptop or computer.
          </p>
        </div>
      </div>

      {/* DESKTOP CONTENT (>= 768px) */}
      <div className="hidden md:flex min-h-screen w-full items-center justify-center p-8">
        <div className="w-full max-w-[420px] bg-white rounded-[12px] p-8 shadow-sm border border-[#E0E0E0] flex flex-col items-center text-center">
          {/* Logo */}
          <div className="w-[64px] h-[64px] rounded-full overflow-hidden shadow-sm border-2 border-[#B92429] relative mb-2">
            <Image
              src="/zeesip-logo.png"
              alt="Zee Sip Logo"
              width={64}
              height={64}
              className="object-cover w-full h-full"
              priority
            />
          </div>

          {/* Heading */}
          <h1 className="font-anton text-[30px] text-[#B92429] uppercase tracking-wide mt-2 mb-6 leading-none">
            ZEESIP ADMIN
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div className="flex flex-col text-left">
              <label className="text-[12px] font-extrabold text-[#7A4547] tracking-wider uppercase mb-1.5">
                ACCESS CODE
              </label>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code"
                required
                autoFocus
                className="w-full h-[48px] px-4 rounded-[8px] border border-[#E0E0E0] focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3] transition-colors"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-extrabold text-[#B92429] text-left">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[48px] bg-[#B92429] hover:bg-[#9E1B20] active:scale-[0.99] text-white font-anton text-[18px] uppercase rounded-[8px] shadow-sm transition-all cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2 mt-1"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>LOGGING IN...</span>
                </div>
              ) : (
                'LOGIN'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

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
    <main className="min-h-[100dvh] w-full bg-white flex items-center justify-center p-4 font-['Montserrat',sans-serif] select-none">
      <div className="w-full max-w-[400px] bg-white rounded-[24px] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden shadow-md border-2 border-[#B92429] relative">
          <Image
            src="/zeesip-logo.png"
            alt="Zee Sip Logo"
            width={60}
            height={60}
            className="object-cover w-full h-full"
            priority
          />
        </div>

        {/* Heading */}
        <h1 className="font-anton text-[28px] text-[#B92429] uppercase tracking-wide mt-3 mb-6 leading-none">
          ADMIN
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col text-left">
            <label className="text-[11px] font-extrabold text-[#7A4547] tracking-wider uppercase mb-1">
              ACCESS CODE
            </label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
              required
              autoFocus
              className="w-full h-[48px] px-4 rounded-[14px] border-2 border-gray-200 focus:border-[#B92429] outline-none font-bold text-[14px] text-[#3D0B0E] bg-[#FFF5F3] transition-colors"
            />
          </div>

          {errorMsg && (
            <p className="text-xs font-extrabold text-[#B92429] text-left mt-0.5">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[48px] bg-[#B92429] hover:bg-[#9E1B20] active:scale-[0.98] text-white font-anton text-[18px] uppercase rounded-[14px] shadow-md transition-all cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2 mt-2"
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
    </main>
  );
}

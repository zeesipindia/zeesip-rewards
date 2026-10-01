'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { createClient } from '@/lib/supabase/client';
import { playScratchSound, playWinSound, playJackpotSound, playLoseSound } from '@/lib/sound';

interface ScratchResult {
  coins_won: number;
  prize_label: string;
  next_available: string;
}

export default function ScratchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ScratchResult | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);
  const [scratchedPercent, setScratchedPercent] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const apiFetched = useRef(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      fetchScratchResult();
    }
    checkAuth();
  }, [router]);

  async function fetchScratchResult() {
    if (apiFetched.current) return;
    apiFetched.current = true;

    try {
      const res = await fetch('/api/games/scratch', { method: 'POST' });
      const data = await res.json();

      if (res.status === 409) {
        setAlreadyPlayed(true);
        setNextAvailable(data.next_available);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to initialize scratch card.');
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    } catch {
      setErrorMsg('Network error. Please try again.');
      setLoading(false);
    }
  }

  // Draw initial canvas top layer
  useEffect(() => {
    if (loading || alreadyPlayed || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw background texture
    ctx.fillStyle = '#B92429';
    ctx.fillRect(0, 0, width, height);

    // Decorative pattern on canvas
    ctx.fillStyle = '#991B1F';
    for (let i = 0; i < width; i += 20) {
      for (let j = 0; j < height; j += 20) {
        ctx.beginPath();
        ctx.arc(i + 10, j + 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Border inner line
    ctx.strokeStyle = '#FFC93C';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Surface text on canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Anton", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH TO REVEAL', width / 2, height / 2 - 6);

    ctx.fillStyle = '#FFC93C';
    ctx.font = '13px "Montserrat", sans-serif';
    ctx.fillText('Scratch with finger or mouse to reveal', width / 2, height / 2 + 22);
  }, [loading, alreadyPlayed]);

  // Calculate scratch percentage
  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentCount = 0;

    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) {
        transparentCount++;
      }
    }

    const totalSampled = pixels.length / 16;
    const percent = Math.round((transparentCount / totalSampled) * 100);
    setScratchedPercent(percent);

    if (percent >= 50 && !isRevealed) {
      setIsRevealed(true);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (result) {
        if (result.coins_won >= 50) {
          playJackpotSound();
        } else if (result.coins_won > 0) {
          playWinSound();
        } else {
          playLoseSound();
        }
      }
    }
  };

  const scratch = (clientX: number, clientY: number) => {
    if (isRevealed || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    playScratchSound();
    checkScratchPercentage();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    isDrawing.current = false;
  };

  // Countdown timer for next available play
  useEffect(() => {
    if (!nextAvailable) return;

    const updateTimer = () => {
      const target = new Date(nextAvailable).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, target - now);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextAvailable]);

  return (
    <div className="min-h-screen bg-[#B92429] text-white flex flex-col font-['Montserrat',sans-serif] pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[430px] mx-auto px-4 pt-4 flex flex-col items-center">
        {/* Back Link */}
        <div className="w-full flex items-center justify-between mb-4">
          <Link
            href="/play"
            className="flex items-center text-white/80 hover:text-white text-sm font-semibold transition-colors uppercase tracking-wider"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Games
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="font-['Anton',sans-serif] text-3xl tracking-wide uppercase text-white drop-shadow-md">
            SCRATCH YOUR SIP
          </h1>
          <p className="text-white/80 text-xs mt-1">
            Scratch the ticket to test your luck!
          </p>
        </div>

        {loading ? (
          <div className="w-full max-w-[340px] h-[220px] bg-black/20 rounded-[24px] flex flex-col items-center justify-center border border-white/10">
            <div className="w-8 h-8 border-3 border-white/20 border-t-[#FFC93C] rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-white/70">Preparing your card...</p>
          </div>
        ) : errorMsg ? (
          <div className="w-full max-w-[340px] p-6 bg-black/30 rounded-[24px] text-center border border-white/10">
            <p className="text-red-300 font-semibold mb-4 text-sm">{errorMsg}</p>
            <button
              onClick={() => {
                setErrorMsg(null);
                setLoading(true);
                apiFetched.current = false;
                fetchScratchResult();
              }}
              className="px-6 py-2 bg-[#FFC93C] text-[#B92429] font-['Anton',sans-serif] rounded-full uppercase tracking-wider text-sm hover:brightness-110 active:scale-95 transition-transform"
            >
              Retry
            </button>
          </div>
        ) : alreadyPlayed ? (
          <div className="w-full max-w-[340px] p-6 bg-black/30 rounded-[24px] text-center border border-white/15 backdrop-blur-sm shadow-xl">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#FFC93C]/20 border border-[#FFC93C]/40 flex items-center justify-center text-[#FFC93C]">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-['Anton',sans-serif] text-xl text-[#FFC93C] uppercase tracking-wide">
              ALREADY PLAYED TODAY
            </h2>
            <p className="text-white/80 text-xs mt-2 mb-4">
              You get 1 free scratch card every day! Next scratch unlocks in:
            </p>

            {timeLeft && (
              <div className="flex justify-center items-center gap-2 font-['Anton',sans-serif] text-2xl text-white bg-black/40 py-3 rounded-xl border border-white/10 mb-5">
                <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                <span className="text-[#FFC93C]">:</span>
                <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                <span className="text-[#FFC93C]">:</span>
                <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
              </div>
            )}

            <Link
              href="/play"
              className="inline-block w-full py-3 bg-[#FFC93C] text-[#B92429] font-['Anton',sans-serif] text-base uppercase tracking-wider rounded-full hover:brightness-110 active:scale-95 transition-transform"
            >
              Play Other Games
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {/* Scratch Card Outer Frame */}
            <div className="relative w-full max-w-[340px] h-[220px] rounded-[24px] overflow-hidden shadow-2xl border-4 border-[#FFC93C] bg-gradient-to-br from-[#1E1E1E] to-[#2D2D2D] flex items-center justify-center">
              {/* Prize Layer (Underneath Canvas) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center select-none">
                {result && result.coins_won > 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-2 animate-bounce">
                      <svg width="40" height="40" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                        <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                        <path
                          d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                          fill="#B92429"
                        />
                      </svg>
                      <span className="font-['Anton',sans-serif] text-4xl text-[#FFC93C] tracking-wide">
                        +{result.coins_won}
                      </span>
                    </div>
                    <span className="font-['Anton',sans-serif] text-xl text-white uppercase tracking-wider">
                      {result.prize_label}
                    </span>
                    <p className="text-xs text-white/70 mt-1">Added to your balance!</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2 text-white/60">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-['Anton',sans-serif] text-2xl text-[#FFC93C] uppercase tracking-wider">
                      BETTER LUCK NEXT TIME
                    </span>
                    <p className="text-xs text-white/70 mt-1">Try again tomorrow for another scratch!</p>
                  </>
                )}
              </div>

              {/* Top Canvas Scratch Layer */}
              <canvas
                ref={canvasRef}
                width={340}
                height={220}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`absolute inset-0 w-full h-full cursor-pointer touch-none transition-opacity duration-500 ${
                  isRevealed ? 'pointer-events-none opacity-0' : 'opacity-100'
                }`}
              />

              {/* Confetti Particles on Win */}
              {isRevealed && result && result.coins_won > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full animate-ping"
                      style={{
                        backgroundColor: i % 2 === 0 ? '#FFC93C' : '#FFFFFF',
                        top: `${Math.random() * 80 + 10}%`,
                        left: `${Math.random() * 80 + 10}%`,
                        animationDuration: `${0.6 + (i % 5) * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Progress / Status below Card */}
            <div className="mt-4 text-center">
              {!isRevealed ? (
                <div className="flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full border border-white/10">
                  <div className="w-20 bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#FFC93C] h-full transition-all duration-200"
                      style={{ width: `${Math.min(100, scratchedPercent * 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white/90">
                    {scratchedPercent < 50 ? `${scratchedPercent}% Scratched` : 'Revealing...'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => router.push('/play')}
                  className="px-8 py-3 bg-[#FFC93C] text-[#B92429] font-['Anton',sans-serif] text-base uppercase tracking-wider rounded-full hover:brightness-110 active:scale-95 transition-transform shadow-lg"
                >
                  Back to Games
                </button>
              )}
            </div>
          </div>
        )}

        {/* Payout Info Table */}
        <div className="w-full max-w-[340px] mt-8 bg-black/25 rounded-2xl p-4 border border-white/10">
          <h3 className="font-['Anton',sans-serif] text-base text-[#FFC93C] uppercase tracking-wider mb-2 text-center">
            POSSIBLE PRIZES
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between bg-black/20 p-2 rounded-lg">
              <span className="text-white/80 font-semibold">Mega Win</span>
              <span className="font-bold text-[#FFC93C]">+50 Coins</span>
            </div>
            <div className="flex justify-between bg-black/20 p-2 rounded-lg">
              <span className="text-white/80 font-semibold">Big Win</span>
              <span className="font-bold text-[#FFC93C]">+25 Coins</span>
            </div>
            <div className="flex justify-between bg-black/20 p-2 rounded-lg">
              <span className="text-white/80 font-semibold">Medium Win</span>
              <span className="font-bold text-[#FFC93C]">+15 Coins</span>
            </div>
            <div className="flex justify-between bg-black/20 p-2 rounded-lg">
              <span className="text-white/80 font-semibold">Small Win</span>
              <span className="font-bold text-[#FFC93C]">+10 Coins</span>
            </div>
            <div className="flex justify-between bg-black/20 p-2 rounded-lg">
              <span className="text-white/80 font-semibold">Mini Win</span>
              <span className="font-bold text-[#FFC93C]">+5 Coins</span>
            </div>
            <div className="flex justify-between bg-black/20 p-2 rounded-lg">
              <span className="text-white/80 font-semibold">No Win</span>
              <span className="font-bold text-white/50">0 Coins</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

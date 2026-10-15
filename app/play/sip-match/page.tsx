'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CoinIcon } from '@/components/CoinIcon';
import { createClient } from '@/lib/supabase/client';
import {
  playCardFlipSound,
  playCorrectChime,
  playWrongBuzz,
  playRoundCompleteDing,
  playGameEndJingle,
} from '@/lib/sound';

interface RoundData {
  symbol: number;
  revealed: number;
  match: number;
}

// 8 Pure SVG Icons for Symbols
function SymbolIcon({ symbolId }: { symbolId: number }) {
  switch (symbolId) {
    case 0:
      // Mango Bottle (green)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <rect x="8.5" y="2" width="7" height="3" rx="1.5" fill="#FFC93C" />
          <path d="M10 5H14V7.5C14 8.5 16.5 10 17 12.5C17.7 16 16.5 21 12 21C7.5 21 6.3 16 7 12.5C7.5 10 10 8.5 10 7.5V5Z" fill="#58A727" />
          <circle cx="12" cy="14" r="3" fill="#75C838" />
          <path d="M14 3.5C15.5 2.5 17 3 17.5 4" stroke="#46881E" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 1:
      // Pineapple Bottle (yellow)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M9 2L12 4.5L15 2L13.5 5H10.5L9 2Z" fill="#4CAF50" />
          <rect x="8.5" y="4.5" width="7" height="2.5" rx="1" fill="#388E3C" />
          <path d="M9.5 7H14.5V9C15.5 10.5 17 12 17 14.5C17 18.5 15.2 21 12 21C8.8 21 7 18.5 7 14.5C7 12 8.5 10.5 9.5 9V7Z" fill="#FFC93C" />
          <line x1="9" y1="12" x2="15" y2="17" stroke="#E5A61E" strokeWidth="1" strokeDasharray="1.5 1.5" />
          <line x1="15" y1="12" x2="9" y2="17" stroke="#E5A61E" strokeWidth="1" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case 2:
      // Sip Coin (gold)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10.5" fill="#FFC93C" stroke="#D89D10" strokeWidth="1" />
          <circle cx="12" cy="12" r="7.5" fill="none" stroke="#B92429" strokeWidth="1.5" />
          <path
            d="M12 7C12.3 9.8 13.5 11 16.5 11.2C13.5 11.5 12.3 12.7 12 15.5C11.7 12.7 10.5 11.5 7.5 11.2C10.5 11 11.7 9.8 12 7Z"
            fill="#B92429"
          />
        </svg>
      );
    case 3:
      // Water Drop (blue)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.5C12 2.5 5 11.2 5 15.5C5 19.36 8.13 22 12 22C15.87 22 19 19.36 19 15.5C19 11.2 12 2.5 12 2.5Z"
            fill="#29B6F6"
          />
          <path
            d="M9.5 14C9.5 12.5 10.5 10 12 8.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 4:
      // Zee Sip Logo
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="6" fill="#B92429" />
          <text
            x="12"
            y="16.5"
            fill="#FFC93C"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            fontSize="14"
            textAnchor="middle"
          >
            Z
          </text>
        </svg>
      );
    case 5:
      // Bottle Cap (red)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#B92429" stroke="#7A1418" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6.5" fill="none" stroke="#FFC93C" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="3.5" fill="#7A1418" />
        </svg>
      );
    case 6:
      // Leaf (green)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 18C6 18 8 7 19 5C19 5 18 16 7 19L5 21"
            stroke="#4CAF50"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 16.5C10 15 15 11 18 6"
            stroke="#2E7D32"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 7:
      // Straw (red & white striped)
      return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <rect
            x="10.5"
            y="2"
            width="4.5"
            height="20"
            rx="2.25"
            transform="rotate(25 12 12)"
            fill="white"
            stroke="#B92429"
            strokeWidth="1.5"
          />
          <path d="M7 6L11 8" stroke="#B92429" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M9.5 11.5L13.5 13.5" stroke="#B92429" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M12 17L16 19" stroke="#B92429" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SipMatchPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [gameState, setGameState] = useState<'loading' | 'already_played' | 'memorize' | 'playing' | 'game_over'>('loading');

  const [gameId, setGameId] = useState<string | null>(null);
  const [grid, setGrid] = useState<number[]>([]);
  const [roundsData, setRoundsData] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [matchedSymbols, setMatchedSymbols] = useState<number[]>([]);

  // Round UI State
  const [memorizeCountdown, setMemorizeCountdown] = useState<number>(3);
  const [roundTimeLeftMs, setRoundTimeLeftMs] = useState<number>(3000);
  const [roundCoinsEarned, setRoundCoinsEarned] = useState<number>(0);
  const [totalCoinsWon, setTotalCoinsWon] = useState<number>(0);
  const [correctPairsFound, setCorrectPairsFound] = useState<number>(0);
  const [cooldownCountdown, setCooldownCountdown] = useState<string>('');
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);

  // Animation states
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [feedbackOverlay, setFeedbackOverlay] = useState<{ pos: number; type: 'correct' | 'wrong'; text?: string } | null>(null);
  const [reshufflingCards, setReshufflingCards] = useState<[number, number] | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState<boolean>(false);

  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial balance & start game
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
        return;
      }

      fetch('/api/balance')
        .then((res) => res.json())
        .then((d) => {
          if (d.balance !== undefined) setBalance(d.balance);
        })
        .catch(() => {});

      // Call start API
      fetch('/api/games/sip-match/start', { method: 'POST' })
        .then(async (res) => {
          if (res.status === 409) {
            const data = await res.json();
            setNextAvailable(data.next_available || null);
            setGameState('already_played');
            return;
          }
          if (!res.ok) {
            router.push('/play');
            return;
          }
          const data = await res.json();
          setGameId(data.game_id);
          setGrid(data.grid);
          setRoundsData(data.rounds_data);

          // Start Memorize Phase: reveal all 16 cards for 3 seconds
          setGameState('memorize');
          setRevealedPositions(Array.from({ length: 16 }, (_, i) => i));
          playCardFlipSound();

          // 3... 2... 1... countdown
          let count = 3;
          const countInterval = setInterval(() => {
            count -= 1;
            if (count > 0) {
              setMemorizeCountdown(count);
              playCardFlipSound();
            } else {
              clearInterval(countInterval);
              // Hide all cards simultaneously
              setRevealedPositions([]);
              playCardFlipSound();

              // Switch to match phase
              setTimeout(() => {
                setGameState('playing');
                startRound(0, data.rounds_data);
              }, 400);
            }
          }, 1000);
        })
        .catch(() => {
          router.push('/play');
        });
    });

    return () => {
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Cooldown countdown updater
  useEffect(() => {
    if (!nextAvailable) return;
    const interval = setInterval(() => {
      const diff = new Date(nextAvailable).getTime() - Date.now();
      if (diff <= 0) {
        setCooldownCountdown('Ready to play!');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCooldownCountdown(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextAvailable]);

  // Start a specific match round (0 to 7)
  const startRound = useCallback((roundIdx: number, currentRoundsData: RoundData[]) => {
    if (roundIdx >= 8) return;
    setCurrentRound(roundIdx);
    setIsAnswerLocked(false);
    setFeedbackOverlay(null);
    setReshufflingCards(null);

    const roundInfo = currentRoundsData[roundIdx];
    // The system automatically reveals one card of this round's pair
    setRevealedPositions([roundInfo.revealed]);
    playCardFlipSound();

    // 3-second timer bar depletes
    const startTime = Date.now();
    const duration = 3000;
    setRoundTimeLeftMs(duration);

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setRoundTimeLeftMs(remaining);
      if (remaining <= 0) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }, 50);

    // Timeout: if no tap within 3 seconds, treated as wrong
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    roundTimerRef.current = setTimeout(() => {
      handleTimeout(roundIdx);
    }, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeout = (roundIdx: number) => {
    handleAnswerSubmit(roundIdx, null);
  };

  const handleCardTap = (pos: number) => {
    if (gameState !== 'playing' || isAnswerLocked) return;
    const currentRoundInfo = roundsData[currentRound];
    if (!currentRoundInfo) return;

    // Cannot tap the already revealed card or already matched cards
    if (pos === currentRoundInfo.revealed) return;
    if (matchedSymbols.includes(grid[pos])) return;

    handleAnswerSubmit(currentRound, pos);
  };

  const handleAnswerSubmit = async (roundIdx: number, tappedPos: number | null) => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);

    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const currentRoundInfo = roundsData[roundIdx];

    if (tappedPos !== null) {
      setRevealedPositions((prev) => Array.from(new Set([...prev, tappedPos])));
      playCardFlipSound();
    }

    try {
      const res = await fetch('/api/games/sip-match/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          round: roundIdx,
          tapped_position: tappedPos,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsAnswerLocked(false);
        return;
      }

      if (data.grid) {
        setGrid(data.grid);
      }

      if (data.correct) {
        playCorrectChime();
        setRoundCoinsEarned((prev) => prev + data.coins_for_round);
        setMatchedSymbols((prev) => [...prev, currentRoundInfo.symbol]);
        setFeedbackOverlay({
          pos: tappedPos ?? currentRoundInfo.match,
          type: 'correct',
          text: `+${data.coins_for_round}`,
        });

        if (data.game_over) {
          playRoundCompleteDing();
          setTimeout(() => {
            playGameEndJingle();
            setCorrectPairsFound(data.correct_count);
            setTotalCoinsWon(data.coins_won);
            setBalance((b) => b + data.coins_won);
            setGameState('game_over');
          }, 1200);
        } else {
          setTimeout(() => {
            startRound(data.next_round, roundsData);
          }, 1000);
        }
      } else {
        // Wrong answer
        playWrongBuzz();
        setFeedbackOverlay({
          pos: tappedPos ?? currentRoundInfo.revealed,
          type: 'wrong',
        });

        // If server provided reshuffle positions, show swap animation
        if (data.reshuffle_positions) {
          setReshufflingCards(data.reshuffle_positions);
        }

        setTimeout(() => {
          // Hide revealed card again
          setRevealedPositions([]);
          setFeedbackOverlay(null);
          setReshufflingCards(null);

          if (data.game_over) {
            playGameEndJingle();
            setCorrectPairsFound(data.correct_count);
            setTotalCoinsWon(data.coins_won);
            setBalance((b) => b + data.coins_won);
            setGameState('game_over');
          } else {
            setTimeout(() => {
              startRound(data.next_round, roundsData);
            }, 500);
          }
        }, 1200);
      }
    } catch {
      setIsAnswerLocked(false);
    }
  };

  return (
    <main className="min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#B92429] text-white flex flex-col justify-between select-none relative overflow-x-hidden shadow-2xl">
      {/* HEADER */}
      <div className="w-full">
        <Header
          variant="red"
          rightElement={
            <div className="bg-white/15 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm border border-white/20">
              <CoinIcon size={18} />
              <span className="font-anton text-[14px] text-[#FFC93C]">{balance}</span>
            </div>
          }
        />

        {/* TITLE & BACK ARROW */}
        <div className="px-5 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/play"
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-all flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-[38px] font-anton text-white leading-none uppercase tracking-wide">
                SIP MATCH
              </h1>
              <p className="text-[12px] font-bold text-white/80 mt-0.5">
                Find the pairs from memory · 1 play/day
              </p>
            </div>
          </div>

          {gameState === 'playing' && (
            <div className="bg-black/30 border border-[#FFC93C]/40 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="font-anton text-[14px] text-[#FFC93C]">
                ROUND {currentRound + 1}/8 · +{roundCoinsEarned} COINS
              </span>
            </div>
          )}
        </div>
      </div>

      {/* GAMEPLAY AREA */}
      <div className="my-auto px-4 py-4 flex flex-col items-center justify-center w-full relative">
        {/* MEMORIZE COUNTDOWN OVERLAY */}
        {gameState === 'memorize' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-[24px]">
            <span className="font-anton text-[18px] text-[#FFC93C] uppercase tracking-widest mb-1">
              MEMORIZE THE CARDS!
            </span>
            <div className="font-anton text-[96px] text-white leading-none animate-ping">
              {memorizeCountdown}
            </div>
          </div>
        )}

        {/* 4x4 CARD GRID */}
        <div className="grid grid-cols-4 gap-2 w-full max-w-[340px] aspect-square p-2 bg-[#7A1418] rounded-[22px] border-2 border-white/20 shadow-2xl relative">
          {grid.map((symbolId, idx) => {
            const isMatched = matchedSymbols.includes(symbolId);
            const isFaceUp =
              gameState === 'memorize' ||
              isMatched ||
              revealedPositions.includes(idx);
            const isCurrentRevealed =
              gameState === 'playing' &&
              roundsData[currentRound]?.revealed === idx;
            const isReshuffling =
              reshufflingCards !== null &&
              (reshufflingCards[0] === idx || reshufflingCards[1] === idx);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCardTap(idx)}
                disabled={gameState !== 'playing' || isAnswerLocked || isMatched || isCurrentRevealed}
                style={{
                  perspective: '600px',
                }}
                className={`w-full h-full relative cursor-pointer outline-none transition-transform duration-300 ${
                  isReshuffling ? 'animate-bounce scale-105' : ''
                }`}
              >
                <div
                  className={`w-full h-full rounded-[12px] transition-transform duration-300 relative flex items-center justify-center shadow-md ${
                    isFaceUp ? '[transform:rotateY(180deg)]' : ''
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* CARD BACK (Face Down) */}
                  <div
                    className="absolute inset-0 rounded-[12px] bg-[#B92429] border-2 border-[#FFC93C]/40 flex items-center justify-center overflow-hidden [backface-visibility:hidden]"
                  >
                    <div className="opacity-25 font-anton text-[24px] text-[#FFC93C]">
                      Z
                    </div>
                  </div>

                  {/* CARD FRONT (Face Up) */}
                  <div
                    className={`absolute inset-0 rounded-[12px] bg-white border-2 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                      isCurrentRevealed
                        ? 'border-[#FFC93C] shadow-[0_0_12px_#FFC93C] animate-pulse'
                        : isMatched
                        ? 'border-[#4CAF50] bg-green-50'
                        : 'border-white'
                    }`}
                  >
                    <SymbolIcon symbolId={symbolId} />
                  </div>
                </div>

                {/* Feedback float */}
                {feedbackOverlay?.pos === idx && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    {feedbackOverlay.type === 'correct' ? (
                      <div className="font-anton text-[22px] text-[#4CAF50] bg-white px-2 py-0.5 rounded-full shadow-lg border border-[#4CAF50] animate-bounce">
                        {feedbackOverlay.text}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white font-anton flex items-center justify-center shadow-lg animate-ping">
                        ✕
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* TIMER BAR BELOW GRID */}
        {gameState === 'playing' && (
          <div className="w-full max-w-[340px] mt-4 flex flex-col gap-1.5">
            <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/20">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${(roundTimeLeftMs / 3000) * 100}%`,
                  backgroundColor:
                    roundTimeLeftMs > 1500 ? '#FFC93C' : roundTimeLeftMs > 800 ? '#FFA726' : '#EF5350',
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold text-white/80 px-1">
              <span>Tap matching card</span>
              <span>{(roundTimeLeftMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="px-5 pb-6 text-center text-[12px] font-extrabold text-white/70">
        Zee Sip Memory Challenge · Earn up to +12 coins
      </div>

      {/* ALREADY PLAYED TODAY OVERLAY */}
      {gameState === 'already_played' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center border-4 border-[#FFC93C]">
            <div className="w-16 h-16 rounded-full bg-[#8FC31F] flex items-center justify-center mb-3 shadow-md">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="font-anton text-[28px] text-[#B92429] leading-tight uppercase">
              DONE TODAY!
            </h2>
            <p className="text-[13px] font-bold text-[#7A4547] mt-1 mb-4">
              You have already played Sip Match today. Next game unlocks at midnight IST:
            </p>

            <div className="bg-[#FFF5F3] border border-[#F4D2CF] rounded-[16px] px-5 py-3 mb-5 w-full">
              <span className="font-anton text-[24px] text-[#B92429]">
                {cooldownCountdown || 'Calculating...'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push('/play')}
              className="w-full h-[52px] bg-[#B92429] text-[#FFC93C] font-anton text-[20px] uppercase rounded-[16px] shadow-lg cursor-pointer"
            >
              BACK TO PLAY
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER RESULT SCREEN */}
      {gameState === 'game_over' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 select-none animate-fadeIn">
          <div className="w-full max-w-[340px] bg-white rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center relative border-4 border-[#FFC93C]">
            {/* Top Close X */}
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#FFF5F3] text-[#7A4547] flex items-center justify-center font-bold text-lg hover:bg-[#FCE4E1] cursor-pointer"
            >
              ✕
            </button>

            <h2 className="font-anton text-[26px] text-[#B92429] leading-none uppercase mb-1">
              SIP MATCH COMPLETE
            </h2>

            <span className="text-[13px] font-extrabold text-[#7A4547] tracking-wider uppercase mb-3">
              {correctPairsFound}/8 PAIRS FOUND
            </span>

            {/* Coin SVG */}
            <div className="my-2 animate-scaleUp">
              <svg width="72" height="72" viewBox="0 0 24 24" className="drop-shadow-lg">
                <circle cx="12" cy="12" r="11" fill="#FFC93C" />
                <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
                <path
                  d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
                  fill="#B92429"
                />
              </svg>
            </div>

            <div className="font-anton text-[48px] text-[#FFC93C] leading-none -my-1 drop-shadow-[0_2px_4px_rgba(61,11,14,0.3)]">
              +{totalCoinsWon}
            </div>

            <span className="font-anton text-[20px] text-[#B92429] uppercase tracking-wide mb-4">
              SIP COINS
            </span>

            <button
              type="button"
              onClick={() => router.push('/play')}
              className="w-full h-[54px] bg-[#FFC93C] hover:bg-[#FFE14D] text-[#3D0B0E] font-anton text-[22px] uppercase rounded-[16px] shadow-lg transition-all cursor-pointer flex items-center justify-center"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

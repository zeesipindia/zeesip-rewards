export default function Home() {
  return (
    <main className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-6 sm:p-8 overflow-hidden bg-gradient-to-b from-amber-400 via-orange-400 to-lime-400 text-slate-950 select-none">
      {/* Radial background glow accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-yellow-300 rounded-full blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-lime-400 rounded-full blur-3xl opacity-50" />

      {/* Header section with text-based ZEE SIP wordmark */}
      <header className="relative z-10 flex flex-col items-center pt-2 sm:pt-4">
        <span className="inline-block px-3 py-1 mb-2 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-slate-950 text-amber-400 rounded-full shadow-sm">
          ₹20 Packaged Beverage
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 drop-shadow-sm flex items-center gap-2">
          <span>ZEE SIP</span>
          <span className="text-2xl sm:text-3xl animate-float">🥤</span>
        </h1>
      </header>

      {/* Main Hero & Decorative Spin Wheel */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full my-auto text-center py-4">
        {/* Badge: Coming soon 🪙 */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold bg-slate-950/90 text-amber-300 shadow-lg border border-amber-400/30 backdrop-blur-md mb-4">
          <span>Coming soon</span>
          <span className="animate-float">🪙</span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight uppercase drop-shadow-sm">
          PLAY. SIP. WIN.
        </h2>

        {/* Subtext */}
        <p className="mt-3 text-sm sm:text-base font-bold text-slate-900/90 leading-relaxed max-w-xs sm:max-w-sm px-2">
          Zee Sip Rewards is almost here. Spin, win Sip Coins and unlock free Zee Sip.
        </p>

        {/* Decorative Pure CSS / SVG Spin Wheel */}
        <div className="relative flex items-center justify-center mt-6 sm:mt-8 mb-2">
          {/* Outer glow aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-200 to-lime-300 opacity-60 blur-xl scale-110" />

          {/* Top Ticker Pin */}
          <div className="absolute -top-3.5 z-30 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-red-600 filter drop-shadow-md" />
          </div>

          {/* Rotating SVG Wheel Container */}
          <div className="relative z-20 w-56 h-56 sm:w-64 sm:h-64 animate-spin-slow">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full rounded-full shadow-2xl overflow-hidden border-4 border-white/90"
              aria-label="Zee Sip decorative spin wheel with Mango and Pineapple segments"
            >
              <defs>
                <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#fef08a" />
                </radialGradient>
              </defs>

              {/* Segment 1: Mango (0° - 45°) */}
              <path d="M100 100 L100 0 A100 100 0 0 1 170.71 29.29 Z" fill="#ff9900" />
              <text x="121" y="49" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🥭</text>

              {/* Segment 2: Pineapple (45° - 90°) */}
              <path d="M100 100 L170.71 29.29 A100 100 0 0 1 200 100 Z" fill="#84cc16" />
              <text x="151" y="79" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🍍</text>

              {/* Segment 3: Mango (90° - 135°) */}
              <path d="M100 100 L200 100 A100 100 0 0 1 170.71 170.71 Z" fill="#ff8000" />
              <text x="151" y="121" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🥭</text>

              {/* Segment 4: Pineapple (135° - 180°) */}
              <path d="M100 100 L170.71 170.71 A100 100 0 0 1 100 200 Z" fill="#65a30d" />
              <text x="121" y="151" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🍍</text>

              {/* Segment 5: Mango (180° - 225°) */}
              <path d="M100 100 L100 200 A100 100 0 0 1 29.29 170.71 Z" fill="#ff9900" />
              <text x="79" y="151" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🥭</text>

              {/* Segment 6: Pineapple (225° - 270°) */}
              <path d="M100 100 L29.29 170.71 A100 100 0 0 1 0 100 Z" fill="#84cc16" />
              <text x="49" y="121" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🍍</text>

              {/* Segment 7: Mango (270° - 315°) */}
              <path d="M100 100 L0 100 A100 100 0 0 1 29.29 29.29 Z" fill="#ff8000" />
              <text x="49" y="79" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🥭</text>

              {/* Segment 8: Pineapple (315° - 360°) */}
              <path d="M100 100 L29.29 29.29 A100 100 0 0 1 100 0 Z" fill="#65a30d" />
              <text x="79" y="49" fontSize="18" textAnchor="middle" dominantBaseline="central" className="select-none">🍍</text>

              {/* Outer boundary & Hub */}
              <circle cx="100" cy="100" r="98" fill="none" stroke="#ffffff" strokeWidth="4" />
              <circle cx="100" cy="100" r="30" fill="url(#hubGradient)" stroke="#ffffff" strokeWidth="3" />
              <text x="100" y="100" fontSize="16" textAnchor="middle" dominantBaseline="central" className="select-none">🥤</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-xs sm:text-sm font-bold text-slate-900/80 pb-2">
        © Zee Sip
      </footer>
    </main>
  );
}

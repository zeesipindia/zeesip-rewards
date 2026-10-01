import React, { useState, useEffect } from 'react';

interface SpinWheelProps {
  targetIndex?: number | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
}

const SEGMENTS = [
  { label: '+25', value: 25, color: '#FFC93C', textColor: '#3D0B0E' },
  { label: '+30', value: 30, color: '#CDEE1C', textColor: '#3D0B0E' },
  { label: '+35', value: 35, color: '#FCE4E1', textColor: '#3D0B0E' },
  { label: '+40', value: 40, color: '#FFC93C', textColor: '#3D0B0E' },
  { label: '+50', value: 50, color: '#CDEE1C', textColor: '#3D0B0E' },
  { label: 'OOPS', value: 0, color: '#3D0B0E', textColor: '#FFFFFF' },
];

export const SpinWheel: React.FC<SpinWheelProps> = ({
  targetIndex = null,
  isSpinning,
  onSpinComplete,
}) => {
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (isSpinning && targetIndex !== null && targetIndex >= 0) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      const segmentAngle = 360 / 6;
      const targetMidAngle = targetIndex * segmentAngle + segmentAngle / 2;
      const finalAngle = 360 * 5 + (360 - targetMidAngle);

      if (prefersReducedMotion) {
        setRotation(finalAngle);
        if (onSpinComplete) onSpinComplete();
      } else {
        setRotation(finalAngle);
        const timer = setTimeout(() => {
          if (onSpinComplete) onSpinComplete();
        }, 4500);
        return () => clearTimeout(timer);
      }
    }
  }, [isSpinning, targetIndex, onSpinComplete]);

  // Carnival rim bulbs (18 alternating bulbs around the rim)
  const bulbs = Array.from({ length: 18 }).map((_, i) => {
    const angle = (i * 360) / 18;
    const rad = (angle * Math.PI) / 180;
    const x = 100 + 94 * Math.cos(rad);
    const y = 100 + 94 * Math.sin(rad);
    return { x, y, color: i % 2 === 0 ? '#FFC93C' : '#B92429' };
  });

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Soft white radial glows behind wheel */}
      <div className="absolute w-[320px] h-[320px] rounded-full bg-white/20 blur-2xl pointer-events-none scale-110" />
      <div className="absolute w-[280px] h-[280px] rounded-full bg-white/30 blur-lg pointer-events-none" />

      {/* Outer Pointer Pin (Top) */}
      <div className="absolute -top-4 z-30 flex flex-col items-center">
        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-white filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]" />
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-[#3D0B0E] -mt-[22px]" />
      </div>

      {/* 300px Diameter Spin Wheel Container */}
      <div className="relative z-10 w-[300px] h-[300px]">
        <div
          className="w-full h-full rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.35)]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            willChange: 'transform',
          }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            <defs>
              <clipPath id="hubClip">
                <circle cx="100" cy="100" r="20" />
              </clipPath>
            </defs>

            {/* White Outer Rim */}
            <circle cx="100" cy="100" r="99" fill="#FFFFFF" stroke="#3D0B0E" strokeWidth="3" />
            <circle cx="100" cy="100" r="88" fill="none" stroke="#3D0B0E" strokeWidth="2" />

            {/* Decorative Bulbs */}
            {bulbs.map((b, idx) => (
              <circle key={idx} cx={b.x} cy={b.y} r="3.5" fill={b.color} stroke="#3D0B0E" strokeWidth="1" />
            ))}

            {/* 6 Wheel Segments */}
            {SEGMENTS.map((seg, i) => {
              const startAngle = (i * 60 - 90) * (Math.PI / 180);
              const endAngle = ((i + 1) * 60 - 90) * (Math.PI / 180);
              const midAngleDeg = i * 60 + 30 - 90;
              const midAngleRad = midAngleDeg * (Math.PI / 180);

              const x1 = 100 + 88 * Math.cos(startAngle);
              const y1 = 100 + 88 * Math.sin(startAngle);
              const x2 = 100 + 88 * Math.cos(endAngle);
              const y2 = 100 + 88 * Math.sin(endAngle);

              const textX = 100 + 60 * Math.cos(midAngleRad);
              const textY = 100 + 60 * Math.sin(midAngleRad);

              return (
                <g key={i}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 88 88 0 0 1 ${x2} ${y2} Z`}
                    fill={seg.color}
                    stroke="#3D0B0E"
                    strokeWidth="2.5"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill={seg.textColor}
                    fontSize={seg.label === 'OOPS' ? '20' : '22'}
                    fontFamily="var(--font-anton), 'Anton', sans-serif"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${midAngleDeg + 90}, ${textX}, ${textY})`}
                    className="font-normal tracking-wide"
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}

            {/* Centre Hub with Zee Sip Logo image (~40px diameter) */}
            <circle cx="100" cy="100" r="24" fill="#B92429" stroke="#3D0B0E" strokeWidth="3" />
            <image href="/zeesip-logo.png" x="80" y="80" width="40" height="40" clipPath="url(#hubClip)" />
          </svg>
        </div>
      </div>
    </div>
  );
};

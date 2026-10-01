/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface HeaderProps {
  variant?: 'red' | 'white' | 'yellow';
  rightElement?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  variant = 'red',
  rightElement,
  className = '',
}) => {
  const isRedBg = variant === 'red';
  const textColor = isRedBg ? 'text-white' : 'text-[#B92429]';
  const lineColor = isRedBg ? 'bg-white' : 'bg-[#B92429]';

  return (
    <header className={`w-full flex items-center justify-between gap-3 px-5 py-3 ${className}`}>
      <div className="flex-1 flex items-center gap-2">
        <img
          src="/zeesip-logo.png"
          alt="Zee Sip"
          width={28}
          height={28}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
          className="shrink-0"
        />
        <span className={`font-extrabold text-[13px] tracking-[0.06em] uppercase whitespace-nowrap ${textColor}`}>
          ZEESIP
        </span>
        <div className={`h-[1.5px] flex-1 ${lineColor}`} />
        <span className={`font-extrabold text-[13px] tracking-[0.06em] uppercase whitespace-nowrap ${textColor}`}>
          REWARDS
        </span>
      </div>
      {rightElement && <div className="shrink-0">{rightElement}</div>}
    </header>
  );
};

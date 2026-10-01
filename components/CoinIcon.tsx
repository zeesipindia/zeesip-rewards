import React from 'react';

interface CoinIconProps {
  className?: string;
  size?: number;
}

export const CoinIcon: React.FC<CoinIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      aria-label="Sip Coin"
    >
      {/* Outer gold circle */}
      <circle cx="50" cy="50" r="48" fill="#FFC93C" stroke="#3D0B0E" strokeWidth="4" />
      
      {/* Inner unfilled circle */}
      <circle cx="50" cy="50" r="35" fill="none" stroke="#3D0B0E" strokeWidth="3" strokeDasharray="none" opacity="0.85" />
      
      {/* 4-pointed star in centre */}
      <path
        d="M50 24 C50 38 38 50 24 50 C38 50 50 62 50 76 C50 62 62 50 76 50 C62 50 50 38 50 24 Z"
        fill="#3D0B0E"
      />
    </svg>
  );
};

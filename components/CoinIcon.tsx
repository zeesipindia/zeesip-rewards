/* eslint-disable @next/next/no-img-element */
import React from 'react';

interface CoinIconProps {
  className?: string;
  size?: number;
}

export const CoinIcon: React.FC<CoinIconProps> = ({ className = '', size = 24 }) => {
  return (
    <img
      src="/zeesip-logo.png"
      alt="Sip Coin"
      width={size}
      height={size}
      style={{ borderRadius: '50%', objectFit: 'cover' }}
      className={`inline-block shrink-0 ${className}`}
    />
  );
};

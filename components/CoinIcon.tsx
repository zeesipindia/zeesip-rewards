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
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      aria-label="Sip Coin"
    >
      <circle cx="12" cy="12" r="11" fill="#FFC93C" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#B92429" strokeWidth="1.6" />
      <path
        d="M12 6.5C12.35 10.2 13.8 11.65 17.5 12 13.8 12.35 12.35 13.8 12 17.5 11.65 13.8 10.2 12.35 6.5 12 10.2 11.65 11.65 10.2 12 6.5z"
        fill="#B92429"
      />
    </svg>
  );
};

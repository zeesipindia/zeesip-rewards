import React from 'react';

interface SparkleProps {
  color?: 'white' | 'gold' | 'red';
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Sparkle: React.FC<SparkleProps> = ({
  color = 'white',
  size = 20,
  className = '',
  style,
}) => {
  const fillMap = {
    white: '#FFFFFF',
    gold: '#FFC93C',
    red: '#B92429',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none ${className}`}
      style={style}
    >
      <path
        d="M20 0 C20 11.0457 11.0457 20 0 20 C11.0457 20 20 28.9543 20 40 C20 28.9543 28.9543 20 40 20 C28.9543 20 20 11.0457 20 0 Z"
        fill={fillMap[color]}
      />
    </svg>
  );
};

export const SparklesGroup: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <Sparkle color="white" size={16} className="absolute top-6 left-8 opacity-90" />
      <Sparkle color="gold" size={22} className="absolute top-12 right-6 opacity-95" />
      <Sparkle color="white" size={14} className="absolute top-36 left-4 opacity-80" />
      <Sparkle color="gold" size={18} className="absolute bottom-28 left-6 opacity-90" />
      <Sparkle color="white" size={24} className="absolute bottom-20 right-8 opacity-85" />
      <Sparkle color="gold" size={14} className="absolute top-1/2 right-4 opacity-75" />
    </div>
  );
};

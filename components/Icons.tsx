import React from 'react';

export const MangoIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Raw Mango Fruit - Green fill */}
    <path
      d="M36 12 C48 16 54 30 50 44 C46 56 30 60 18 52 C10 46 8 32 16 20 C24 8 30 10 36 12 Z"
      fill="#8FC31F"
      stroke="#3D0B0E"
      strokeWidth="3.5"
    />
    {/* Mango Leaf */}
    <path
      d="M34 14 C34 6 42 2 48 4 C44 10 40 14 34 14 Z"
      fill="#CDEE1C"
      stroke="#3D0B0E"
      strokeWidth="2.5"
    />
    {/* Highlight */}
    <path d="M24 24 C28 18 34 16 38 18" stroke="#CDEE1C" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

export const PineappleIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Pineapple Leaves */}
    <path d="M32 4 L26 18 M32 4 L32 20 M32 4 L38 18" stroke="#8FC31F" strokeWidth="4" strokeLinecap="round" />
    {/* Pineapple Body */}
    <rect x="18" y="18" width="28" height="38" rx="14" fill="#FFE14D" stroke="#3D0B0E" strokeWidth="3.5" />
    {/* Texture Grid */}
    <path d="M22 28 L42 46 M42 28 L22 46 M20 37 H44" stroke="#F5B800" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const WarningTriangleIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
    <path d="M16 3 L30 27 H2 Z" fill="#FFC93C" stroke="#3D0B0E" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M16 11 V18" stroke="#3D0B0E" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="22.5" r="1.75" fill="#3D0B0E" />
  </svg>
);

export const FireIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M12 2C12 2 15 5 15 8C15 10 17 11.5 19 12C20.5 12.5 21 14 21 16C21 19.3 17 22 12 22C7 22 3 19.3 3 16C3 12.5 6 9.5 9 7C9 9.5 11 11 12 11C12 11 12 5 12 2Z"
      fill="#FFC93C"
      stroke="#B92429"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const MiniWheelIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="16" cy="16" r="14" fill="#FFC93C" stroke="#3D0B0E" strokeWidth="2" />
    <path d="M16 2 V30 M2 16 H30 M6 6 L26 26 M6 26 L26 6" stroke="#3D0B0E" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="4" fill="#B92429" />
  </svg>
);

export const GoogleGLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const CheckIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

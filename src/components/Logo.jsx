import React from 'react';

function Logo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Noor El Alfi logo">
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="24" fill="url(#logo-gradient)" />
      <path
        d="M22,28 L22,72 M22,28 L52,72 M52,28 L52,72 M52,28 L78,28 M52,50 L72,50 M52,72 L78,72"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Logo;

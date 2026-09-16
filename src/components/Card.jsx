import React from 'react';

function Card({ className = '', children }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-brand-700 ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;

import React from 'react';

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="py-12">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default Section;

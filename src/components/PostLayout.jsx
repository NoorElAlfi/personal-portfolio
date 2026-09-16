import React from 'react';
import { Link } from 'react-router-dom';

function PostLayout({ title, subtitle, children }) {
  return (
    <article className="mx-auto max-w-3xl py-2">
      <Link to="/blog" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
        &larr; Back to Blog
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="prose-post mt-8 text-slate-700 dark:text-slate-300">{children}</div>
    </article>
  );
}

export default PostLayout;

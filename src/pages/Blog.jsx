import React from 'react';
import { Link } from 'react-router-dom';
import posts from './blog/postsMeta';

function Blog() {
  return (
    <section className="py-2">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Blog</h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">
          Technical write-ups on personal projects — approach, what broke, and what actually worked.
        </p>
      </div>
      <div className="mx-auto max-w-3xl space-y-5">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-brand-700"
          >
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
              {post.title}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">{post.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default Blog;

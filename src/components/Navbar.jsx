import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-brand-600 dark:text-brand-400'
      : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400'
  }`;

function SunIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function Navbar({ darkMode, setDarkMode }) {
  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <Link to="/" className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <span className="font-semibold text-slate-900 dark:text-white">Noor El Alfi</span>
      </Link>

      <div className="flex items-center gap-6">
        <NavLink to="/" className={navLinkClass} end>
          Home
        </NavLink>
        <NavLink to="/blog" className={navLinkClass}>
          Blog
        </NavLink>
        <a
          href="https://www.linkedin.com/in/noor-el-alfi-527a1a20a/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 sm:inline"
        >
          LinkedIn
        </a>
        <a
          href="https://github.com/NoorElAlfi"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 sm:inline"
        >
          GitHub
        </a>
        <a
          href="mailto:noor.alfi@gmail.com"
          className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 sm:inline"
        >
          Email
        </a>

        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-400"
        >
          {darkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

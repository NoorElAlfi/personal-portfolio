import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import logo from '../assets/logo.png';

const navLinkClass = ({ isActive }) =>
  `py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'text-brand-600 dark:text-brand-400'
      : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400'
  }`;

const textLinkClass =
  'hidden py-2 text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 sm:inline';

const iconButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-400';

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

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.72 0 0 .84-.28 2.75 1.05a9.4 9.4 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

const contacts = [
  { label: 'GitHub', href: 'https://github.com/NoorElAlfi', Icon: GitHubIcon, external: true },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/noor-el-alfi-527a1a20a/', Icon: LinkedInIcon, external: true },
  { label: 'Email', href: 'mailto:noor.alfi@gmail.com', Icon: MailIcon, external: false },
];

function Navbar({ darkMode, setDarkMode }) {
  return (
    <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
      <Link to="/" className="flex items-center gap-2">
        <img src={logo} alt="Noor El Alfi" width="32" height="32" className="h-8 w-8 rounded-lg" />
        <span className="hidden font-semibold text-slate-900 dark:text-white sm:inline">Noor El Alfi</span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* The logo already links home on phones, so the word "Home" only shows from sm up. */}
        <NavLink to="/" className={(state) => `hidden sm:inline ${navLinkClass(state)}`} end>
          Home
        </NavLink>
        <NavLink to="/blog" className={navLinkClass}>
          Blog
        </NavLink>

        {/* Phones: compact icon buttons so contact links are always in reach. */}
        {contacts.map(({ label, href, Icon, external }) => (
          <a
            key={`icon-${label}`}
            href={href}
            aria-label={label}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={`${iconButtonClass} sm:hidden`}
          >
            <Icon className="h-4 w-4" />
          </a>
        ))}
        {/* From sm up: the original text links. */}
        {contacts.map(({ label, href, external }) => (
          <a
            key={`text-${label}`}
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={textLinkClass}
          >
            {label}
          </a>
        ))}

        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          aria-label="Toggle dark mode"
          className={iconButtonClass}
        >
          {darkMode ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
